import { countAttemptIn, type SqlRunner } from '../waitlist/neon-store'
import type { ImageType } from './image'
import type { PurgeRule, RequestStatus, ScreenRequest, ScreenRequestInput, ScreenRequestStore } from './store'

type Row = Record<string, unknown>

const date = (value: unknown) => (value == null ? null : value instanceof Date ? value : new Date(String(value)))

/** bytea comes back as a Buffer/Uint8Array (PGlite, pg) or as `\x…` hex text (HTTP drivers). */
function bytes(value: unknown): Uint8Array | null {
  if (value == null) return null
  if (value instanceof Uint8Array) return value
  const text = String(value)
  return text.startsWith('\\x') ? Uint8Array.from(Buffer.from(text.slice(2), 'hex')) : null
}

function toRequest(row: Row): ScreenRequest {
  const image = bytes(row.image)
  return {
    id: String(row.id),
    createdAt: date(row.created_at)!,
    email: String(row.email),
    text: (row.request_text as string | null) ?? null,
    posterId: (row.poster_id as string | null) ?? null,
    screenName: (row.screen_name as string | null) ?? null,
    notifyWhenReady: row.notify_when_ready === true,
    consentVersion: String(row.consent_version),
    image: image && row.image_type ? { bytes: image, type: row.image_type as ImageType } : null,
    ipHash: (row.ip_hash as string | null) ?? null,
    status: row.status as RequestStatus,
    repliedAt: date(row.replied_at),
    shippedAt: date(row.shipped_at),
  }
}

export class NeonScreenRequestStore implements ScreenRequestStore {
  constructor(private readonly db: SqlRunner) {}

  countAttempt(keyHash: string, windowMs: number, now: Date) {
    return countAttemptIn(this.db, keyHash, windowMs, now)
  }

  async insert(input: ScreenRequestInput, now: Date) {
    const [row] = await this.db.query(
      `insert into diya_screen_requests
         (created_at, email, request_text, poster_id, notify_when_ready, consent_version, image, image_type, image_bytes, ip_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        now,
        input.email,
        input.text,
        input.posterId,
        input.notifyWhenReady,
        input.consentVersion,
        input.image?.bytes ?? null,
        input.image?.type ?? null,
        input.image?.bytes.byteLength ?? null,
        input.ipHash,
      ],
    )
    return toRequest(row)
  }

  async remove(id: string) {
    await this.db.query(`delete from diya_screen_requests where id = $1`, [id])
  }

  async purge({ repliedBefore, unansweredBefore, readySince }: PurgeRule) {
    const past = `(replied_at < $1 or (replied_at is null and created_at < $2))`
    const held = `(notify_when_ready and shipped_at is null and created_at >= $3)`
    const params = [repliedBefore, unansweredBefore, readySince]
    const [deleted, trimmed] = await this.db.transaction([
      [`delete from diya_screen_requests where status = 'closed' or (${past} and not ${held}) returning id`, params],
      [
        `update diya_screen_requests
         set request_text = null, image = null, image_type = null, image_bytes = null, ip_hash = null
         where ${past} and ${held} and request_text is not null
         returning id`,
        params,
      ],
    ])
    return { deleted: deleted.length, trimmed: trimmed.length }
  }
}
