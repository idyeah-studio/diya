import {
  CHOICES,
  CONFIRM_TOKEN_TTL_MS,
  CONSENT_VERSION,
  EMAIL_GAP_MS,
  FOUNDING_LIMIT,
  MIN_FILL_MS,
  OTHER_TEXT_MAX,
  RATE_LIMITS,
  SOURCES,
  UNCONFIRMED_RETENTION_MS,
  type Choice,
  type Source,
} from './config'
import { emailProblem, maskEmail, normalizeEmail } from './email-address'
import { alreadyOnListEmail, confirmationEmail, safeCopy, welcomeEmail, type ComposedEmail, type EmailLinks } from './emails'
import type { WaitlistSender } from './sender'
import type { ConfirmResult, Signup, WaitlistStore } from './store'
import { formTokenAge, hashToken, keyedHash, randomToken } from './tokens'

/** One shared counter in the attempts table for every email sent. */
export const SEND_CAP_KEY = 'global:send'

export type WaitlistDeps = {
  store: WaitlistStore
  sender: WaitlistSender
  /** HMAC key for rate-limit hashes and form tokens. */
  secret: string
  /** Absolute origin for links in emails, without a trailing slash. */
  siteUrl: string
  /** Where our safe copy of each email goes (safeCopy in emails.ts); none when unset. */
  copyTo?: string | null
  now?: () => Date
}

export type JoinRequest = {
  email: string
  choice: Choice | null
  otherText: string | null
  source: Source
  /** The honeypot. People never see it, so anything here means a bot. */
  website: string
  /** Issued by GET /api/waitlist to this IP. Required. */
  formToken: string | null
}

export type JoinOutcome =
  | { kind: 'accepted' }
  | { kind: 'invalid'; field: 'email' | 'choice' | 'other' | 'source' }
  /** Missing, forged, or issued to another IP: the form fetches a fresh one and tries again. */
  | { kind: 'token' }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  /** The list-wide send cap is reached. */
  | { kind: 'busy'; retryAfterSeconds: number }
  | { kind: 'failed' }

const isChoice = (value: unknown): value is Choice => CHOICES.some((c) => c.value === value)
// Control characters and line breaks have no place in a few words about a screen.
const clean = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()

/** Turns an untrusted JSON body into a JoinRequest, or names the field that's wrong. */
export function parseJoinBody(body: unknown): JoinRequest | { invalid: JoinOutcome & { kind: 'invalid' } } {
  const b = (typeof body === 'object' && body ? body : {}) as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email : ''
  if (emailProblem(email)) return { invalid: { kind: 'invalid', field: 'email' } }
  const choice = b.choice == null || b.choice === '' ? null : b.choice
  if (choice !== null && !isChoice(choice)) return { invalid: { kind: 'invalid', field: 'choice' } }
  let otherText: string | null = null
  if (choice === 'other' && typeof b.other === 'string') {
    otherText = clean(b.other)
    if ([...otherText].length > OTHER_TEXT_MAX) return { invalid: { kind: 'invalid', field: 'other' } }
    if (!otherText) otherText = null
  }
  const source = b.source
  if (!SOURCES.includes(source as Source)) return { invalid: { kind: 'invalid', field: 'source' } }
  return {
    email: normalizeEmail(email),
    choice,
    otherText,
    source: source as Source,
    website: typeof b.website === 'string' ? b.website : '',
    formToken: typeof b.formToken === 'string' && b.formToken ? b.formToken.slice(0, 64) : null,
  }
}

export function emailLinks(siteUrl: string, unsubscribeToken: string): EmailLinks {
  const token = encodeURIComponent(unsubscribeToken)
  return {
    siteUrl,
    oneClickUrl: `${siteUrl}/api/waitlist/unsubscribe?token=${token}`,
    unsubscribePageUrl: `${siteUrl}/waitlist/unsubscribe?token=${token}`,
  }
}

/** Why an attempt sends nothing, while still answering like a success. */
function emailDue(signup: Signup | null, now: Date) {
  if (!signup) return true
  if (signup.unsubscribedAt) return false
  return !signup.lastEmailAt || signup.lastEmailAt.getTime() <= now.getTime() - EMAIL_GAP_MS
}

/**
 * One signup attempt. Every outcome a person can't act on (a bot, a repeat,
 * an address already on the list, an address that left) looks exactly like a
 * first-time success. Only an attempt that sends an email changes anything
 * stored about the address, so nobody can rewrite or lock out someone else's.
 */
export async function join(deps: WaitlistDeps, request: JoinRequest, ip: string): Promise<JoinOutcome> {
  const now = deps.now?.() ?? new Date()
  const { store } = deps
  // The honeypot answers before anything else, token or not.
  if (request.website.trim()) return { kind: 'accepted' }
  const ipHash = keyedHash(deps.secret, 'ip', ip)
  if (!request.formToken) return { kind: 'token' }
  const age = formTokenAge(deps.secret, request.formToken, ipHash, now.getTime())
  if (age === null) return { kind: 'token' }
  // Faster than a person can read and type. An old token is fine: tabs stay open.
  if (age < MIN_FILL_MS) return { kind: 'accepted' }

  const ipHits = await store.countAttempt(ipHash, RATE_LIMITS.ip.windowMs, now)
  if (ipHits > RATE_LIMITS.ip.max) return { kind: 'rate_limited', retryAfterSeconds: RATE_LIMITS.ip.windowMs / 1000 }

  await store.purgeUnconfirmed(new Date(now.getTime() - UNCONFIRMED_RETENTION_MS))
  const email = normalizeEmail(request.email)
  const existing = await store.findByEmail(email)
  if (!emailDue(existing, now)) return { kind: 'accepted' }

  const emailHits = await store.countAttempt(keyedHash(deps.secret, 'email', email), RATE_LIMITS.email.windowMs, now)
  if (emailHits > RATE_LIMITS.email.max) return { kind: 'rate_limited', retryAfterSeconds: RATE_LIMITS.email.windowMs / 1000 }
  const sends = await store.countAttempt(SEND_CAP_KEY, RATE_LIMITS.send.windowMs, now)
  if (sends > RATE_LIMITS.send.max) return { kind: 'busy', retryAfterSeconds: 300 }

  const pick = { choice: request.choice, otherText: request.otherText, consentVersion: CONSENT_VERSION }
  const signup = existing ?? (await store.insertSignup({ email, source: request.source, ...pick }, now))
  // A concurrent request may have sent first, or the address may have just left.
  if (!(await store.claimEmailSlot(signup.id, now, EMAIL_GAP_MS))) return { kind: 'accepted' }
  if (existing) await store.updatePick(signup.id, pick, now)
  const choice = request.choice ?? signup.choice
  const compose = (links: EmailLinks, confirmUrl: string) =>
    signup.confirmedAt ? alreadyOnListEmail({ choice, links }) : confirmationEmail({ confirmUrl, choice, links })

  try {
    const unsubscribe = randomToken()
    await store.addToken(signup.id, 'unsubscribe', hashToken(unsubscribe), null, now)
    let confirmUrl = ''
    if (!signup.confirmedAt) {
      const confirm = randomToken()
      await store.addToken(signup.id, 'confirm', hashToken(confirm), new Date(now.getTime() + CONFIRM_TOKEN_TTL_MS), now)
      // A page with one button: opening the link (as mail scanners do) confirms nothing.
      confirmUrl = `${deps.siteUrl}/waitlist/confirm?token=${encodeURIComponent(confirm)}`
    }
    await deps.sender.send({ ...compose(emailLinks(deps.siteUrl, unsubscribe), confirmUrl), to: signup.email })
  } catch (error) {
    await store.releaseEmailSlot(signup.id, now).catch(() => {})
    // Never the address: only the error's own message, which carries none.
    console.error('[waitlist] could not send', error instanceof Error ? error.message : 'unknown error')
    return { kind: 'failed' }
  }
  await sendCopy(deps, compose(inertLinks(deps.siteUrl), `${deps.siteUrl}/waitlist/confirm`), signup.email)
  return { kind: 'accepted' }
}

/** Links with no token: they open the right pages, but confirm and remove nobody. */
function inertLinks(siteUrl: string): EmailLinks {
  return { siteUrl, oneClickUrl: `${siteUrl}/api/waitlist/unsubscribe`, unsubscribePageUrl: `${siteUrl}/waitlist/unsubscribe` }
}

/**
 * Our copy of an email that just went out, composed with inert links and the
 * address masked, so a click in our inbox can't confirm or remove anyone.
 * Copies follow the emails they copy one for one, so they need no cap of
 * their own, and a failed copy never touches the real send.
 */
async function sendCopy(deps: WaitlistDeps, inert: ComposedEmail, to: string) {
  if (!deps.copyTo) return
  try {
    await deps.sender.send({ ...safeCopy(inert, maskEmail(to)), to: deps.copyTo })
  } catch (error) {
    console.error('[waitlist] could not send our copy', error instanceof Error ? error.message : 'unknown error')
  }
}

export async function confirm(deps: WaitlistDeps, token: string): Promise<ConfirmResult> {
  if (!token || token.length > 200) return { status: 'invalid' }
  const now = deps.now?.() ?? new Date()
  await deps.store.purgeUnconfirmed(new Date(now.getTime() - UNCONFIRMED_RETENTION_MS))
  const result = await deps.store.confirm(hashToken(token), now, FOUNDING_LIMIT)
  if (result.status !== 'confirmed') return result
  if (result.welcome) await welcome(deps, result.welcome, result.founding, now)
  return { status: 'confirmed', founding: result.founding, already: result.already }
}

/**
 * The welcome after a first confirmation, the person's record of founding
 * status. Only a first confirmation sends it, so it can't outnumber the
 * confirmation emails already counted against the send cap, and it stands
 * apart from the day's one email. A failed send never undoes the confirmation.
 */
async function welcome(deps: WaitlistDeps, to: { signupId: string; email: string }, founding: boolean, now: Date) {
  try {
    const unsubscribe = randomToken()
    await deps.store.addToken(to.signupId, 'unsubscribe', hashToken(unsubscribe), null, now)
    const message = welcomeEmail({ founding, links: emailLinks(deps.siteUrl, unsubscribe) })
    await deps.sender.send({ ...message, to: to.email })
  } catch (error) {
    // Never the address: only the error's own message, which carries none.
    console.error('[waitlist] could not send the welcome', error instanceof Error ? error.message : 'unknown error')
    return
  }
  await sendCopy(deps, welcomeEmail({ founding, links: inertLinks(deps.siteUrl) }), to.email)
}

export async function unsubscribe(deps: WaitlistDeps, token: string) {
  if (!token || token.length > 200) return false
  return deps.store.unsubscribe(hashToken(token), deps.now?.() ?? new Date())
}
