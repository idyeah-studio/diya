import { neon } from '@neondatabase/serverless'
import { ATTEMPT_RETENTION_MS, type Choice, type Source } from './config'
import type { ConfirmResult, Signup, SignupInput, TokenPurpose, WaitlistStore } from './store'

type Row = Record<string, unknown>
type Statement = [text: string, params: unknown[]]

/** The two things the store needs from a Postgres driver. Tests plug in PGlite. */
export type SqlRunner = {
  query(text: string, params: unknown[]): Promise<Row[]>
  /** Runs the statements in one transaction and returns each one's rows. */
  transaction(statements: Statement[]): Promise<Row[][]>
}

export function neonRunner(databaseUrl: string): SqlRunner {
  const sql = neon(databaseUrl)
  return {
    query: (text, params) => sql(text, params) as Promise<Row[]>,
    transaction: (statements) =>
      sql.transaction(statements.map(([text, params]) => sql(text, params))) as Promise<Row[][]>,
  }
}

/**
 * Records one attempt under a hashed key and returns how many fall inside the
 * window, this one included. Prunes rows past ATTEMPT_RETENTION_MS as it goes.
 * Screen requests count in the same table, under their own keys.
 */
export async function countAttemptIn(db: SqlRunner, keyHash: string, windowMs: number, now: Date) {
  const [row] = await db.query(
    `with pruned as (delete from diya_waitlist_attempts where at < $4),
          added as (insert into diya_waitlist_attempts (key_hash, at) values ($1, $2))
     select count(*)::int + 1 as n from diya_waitlist_attempts where key_hash = $1 and at > $3`,
    [keyHash, now, new Date(now.getTime() - windowMs), new Date(now.getTime() - ATTEMPT_RETENTION_MS)],
  )
  return Number(row.n)
}

// Serialises confirmations, so two people confirming at once can't both take the 200th spot.
const FOUNDING_LOCK = 73160200

const date = (value: unknown) => (value == null ? null : value instanceof Date ? value : new Date(String(value)))

function toSignup(row: Row): Signup {
  return {
    id: String(row.id),
    email: String(row.email),
    choice: (row.choice as Choice | null) ?? null,
    otherText: (row.other_text as string | null) ?? null,
    source: row.source as Source,
    consentVersion: String(row.consent_version),
    founding: row.founding === true,
    createdAt: date(row.created_at)!,
    updatedAt: date(row.updated_at)!,
    confirmedAt: date(row.confirmed_at),
    unsubscribedAt: date(row.unsubscribed_at),
    lastEmailAt: date(row.last_email_at),
  }
}

export class NeonWaitlistStore implements WaitlistStore {
  constructor(private readonly db: SqlRunner) {}

  countAttempt(keyHash: string, windowMs: number, now: Date) {
    return countAttemptIn(this.db, keyHash, windowMs, now)
  }

  async findByEmail(email: string) {
    const [row] = await this.db.query(`select * from diya_waitlist where email = $1`, [email])
    return row ? toSignup(row) : null
  }

  async insertSignup(input: SignupInput, now: Date) {
    const [row] = await this.db.query(
      `insert into diya_waitlist (email, choice, other_text, source, consent_version, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $6)
       on conflict (email) do nothing
       returning *`,
      [input.email, input.choice, input.otherText, input.source, input.consentVersion, now],
    )
    if (row) return toSignup(row)
    // Someone else's request added it first.
    return (await this.findByEmail(input.email))!
  }

  async updatePick(signupId: string, input: Pick<SignupInput, 'choice' | 'otherText' | 'consentVersion'>, now: Date) {
    await this.db.query(
      `update diya_waitlist set
         choice = coalesce($2::text, choice),
         other_text = case when $2::text is null then other_text else $3::text end,
         consent_version = $4,
         updated_at = $5
       where id = $1`,
      [signupId, input.choice, input.otherText, input.consentVersion, now],
    )
  }

  async claimEmailSlot(signupId: string, now: Date, gapMs: number) {
    const rows = await this.db.query(
      `update diya_waitlist set last_email_at = $2
       where id = $1 and unsubscribed_at is null and (last_email_at is null or last_email_at <= $3)
       returning id`,
      [signupId, now, new Date(now.getTime() - gapMs)],
    )
    return rows.length === 1
  }

  async releaseEmailSlot(signupId: string, claimedAt: Date) {
    await this.db.query(`update diya_waitlist set last_email_at = null where id = $1 and last_email_at = $2`, [
      signupId,
      claimedAt,
    ])
  }

  async addToken(signupId: string, purpose: TokenPurpose, tokenHash: string, expiresAt: Date | null, now: Date) {
    await this.db.query(
      `insert into diya_waitlist_tokens (token_hash, signup_id, purpose, created_at, expires_at)
       values ($1, $2, $3, $4, $5)`,
      [tokenHash, signupId, purpose, now, expiresAt],
    )
  }

  async confirm(tokenHash: string, now: Date, foundingLimit: number): Promise<ConfirmResult> {
    const [found] = await this.db.query(
      `select t.signup_id, t.expires_at, t.used_at, w.confirmed_at, w.unsubscribed_at, w.founding
       from diya_waitlist_tokens t join diya_waitlist w on w.id = t.signup_id
       where t.token_hash = $1 and t.purpose = 'confirm'`,
      [tokenHash],
    )
    // People who left stay off, whatever old link they find.
    if (!found || found.unsubscribed_at != null) return { status: 'invalid' }
    const already = found.confirmed_at != null
    if (found.used_at != null) {
      return already ? { status: 'confirmed', founding: found.founding === true, already: true } : { status: 'invalid' }
    }
    const expires = date(found.expires_at)
    if (expires && expires.getTime() < now.getTime()) return { status: 'expired' }
    const results = await this.db.transaction([
      [`select pg_advisory_xact_lock($1)`, [FOUNDING_LOCK]],
      [`update diya_waitlist_tokens set used_at = $2 where token_hash = $1 and used_at is null`, [tokenHash, now]],
      [
        // Inside SET, columns still hold their old values, so founding is decided
        // only on the first confirmation and the count sees every earlier one.
        `update diya_waitlist set
           founding = founding or (confirmed_at is null and (select count(*) from diya_waitlist where founding) < $3),
           confirmed_at = coalesce(confirmed_at, $2),
           updated_at = $2
         where id = $1 and unsubscribed_at is null
         returning founding`,
        [found.signup_id, now, foundingLimit],
      ],
    ])
    const [row] = results[2]
    if (!row) return { status: 'invalid' }
    return { status: 'confirmed', founding: row.founding === true, already }
  }

  async purgeUnconfirmed(before: Date) {
    await this.db.query(
      `delete from diya_waitlist
       where confirmed_at is null and unsubscribed_at is null and coalesce(last_email_at, created_at) < $1`,
      [before],
    )
  }

  async unsubscribe(tokenHash: string, now: Date) {
    const rows = await this.db.query(
      `update diya_waitlist w
       set unsubscribed_at = coalesce(w.unsubscribed_at, $2), choice = null, other_text = null, updated_at = $2
       from diya_waitlist_tokens t
       where t.token_hash = $1 and t.purpose = 'unsubscribe' and t.signup_id = w.id
       returning w.id`,
      [tokenHash, now],
    )
    return rows.length === 1
  }
}
