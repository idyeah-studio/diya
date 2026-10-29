import { screenById } from '../../components/screens/screens-data'
import { CONSENT_VERSION, MIN_FILL_MS } from '../waitlist/config'
import { emailProblem, normalizeEmail } from '../waitlist/email-address'
import type { WaitlistSender } from '../waitlist/sender'
import { formTokenAge, keyedHash } from '../waitlist/tokens'
import { IMAGE_MAX_BYTES, RATE_LIMITS, REPLIED_RETENTION_MS, UNANSWERED_RETENTION_MS } from './config'
import { screenRequestEmail } from './email'
import { imageType } from './image'
import type { RequestImage, ScreenRequestStore } from './store'
import { cleanText, textProblem } from './text'

/** One shared counter in the attempts table for every request, from everyone. */
export const GLOBAL_CAP_KEY = 'global:screen-request'

export type ScreenRequestDeps = {
  store: ScreenRequestStore
  /** The waitlist's sender: Postmark in production, a log in development. */
  sender: WaitlistSender
  /** HMAC key for rate-limit hashes, the stored IP hash and form tokens. */
  secret: string
  /** Absolute origin for links in the notification, without a trailing slash. */
  siteUrl: string
  /** Who gets each request: DIYA_REQUESTS_TO, or the public contact. */
  to: string
  now?: () => Date
}

export type ScreenRequestSubmission = {
  text: string
  email: string
  posterId: string | null
  notifyWhenReady: boolean
  image: RequestImage | null
  /** The honeypot. People never see it, so anything here means a bot. */
  website: string
  /** Issued by GET /api/screen-requests to this IP. Required. */
  formToken: string | null
}

export type RequestField = 'text' | 'email' | 'image'

export type SubmitOutcome =
  | { kind: 'accepted' }
  /** Missing, forged, or issued to another IP: the form fetches a fresh one and tries again. */
  | { kind: 'token' }
  /** Too many from this IP (an hour) or this email (a day): each gets its own message. */
  | { kind: 'rate_limited'; scope: 'ip' | 'email'; retryAfterSeconds: number }
  /** The cap on every request from everyone is reached. */
  | { kind: 'busy'; retryAfterSeconds: number }
  | { kind: 'failed' }

/** Only a poster's id is kept; anything else (a typo, a live screen) is simply left off. */
export function posterIdFrom(value: unknown) {
  const screen = typeof value === 'string' ? screenById(value) : undefined
  return screen?.status === 'poster' ? screen.id : null
}

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/** Turns an untrusted multipart form into a submission, or names the field that's wrong. */
export async function parseSubmission(form: FormData): Promise<ScreenRequestSubmission | { invalid: RequestField }> {
  const text = field(form, 'text')
  if (textProblem(text)) return { invalid: 'text' }
  const email = field(form, 'email')
  if (emailProblem(email)) return { invalid: 'email' }
  let image: RequestImage | null = null
  const file = form.get('image')
  if (file !== null && typeof file !== 'string' && file.size > 0) {
    if (file.size > IMAGE_MAX_BYTES) return { invalid: 'image' }
    const bytes = new Uint8Array(await file.arrayBuffer())
    // The real type, from the first bytes; the browser's word for it doesn't count.
    const type = imageType(bytes)
    if (!type) return { invalid: 'image' }
    image = { bytes, type }
  }
  const token = field(form, 'formToken')
  return {
    text: cleanText(text),
    email: normalizeEmail(email),
    posterId: posterIdFrom(form.get('poster')),
    notifyWhenReady: field(form, 'notify') === '1',
    image,
    website: field(form, 'website'),
    formToken: token ? token.slice(0, 64) : null,
  }
}

/**
 * One request. A bot (the honeypot, or a form sent faster than anyone could
 * type) gets an ordinary success and nothing is kept. An accepted request is
 * stored, then emailed to DIYA with its picture attached. Nothing is sent to
 * the person who asked.
 */
export async function submit(deps: ScreenRequestDeps, request: ScreenRequestSubmission, ip: string): Promise<SubmitOutcome> {
  const now = deps.now?.() ?? new Date()
  const { store, secret } = deps
  if (request.website.trim()) return { kind: 'accepted' }
  const ipHash = keyedHash(secret, 'ip', ip)
  if (!request.formToken) return { kind: 'token' }
  const age = formTokenAge(secret, request.formToken, ipHash, now.getTime())
  if (age === null) return { kind: 'token' }
  if (age < MIN_FILL_MS) return { kind: 'accepted' }

  const { ip: perIp, email: perEmail, global } = RATE_LIMITS
  if ((await store.countAttempt(keyedHash(secret, 'request-ip', ip), perIp.windowMs, now)) > perIp.max)
    return { kind: 'rate_limited', scope: 'ip', retryAfterSeconds: perIp.windowMs / 1000 }
  if ((await store.countAttempt(keyedHash(secret, 'request-email', request.email), perEmail.windowMs, now)) > perEmail.max)
    return { kind: 'rate_limited', scope: 'email', retryAfterSeconds: perEmail.windowMs / 1000 }
  if ((await store.countAttempt(GLOBAL_CAP_KEY, global.windowMs, now)) > global.max)
    return { kind: 'busy', retryAfterSeconds: 60 * 60 }

  await store.purge({
    repliedBefore: new Date(now.getTime() - REPLIED_RETENTION_MS),
    unansweredBefore: new Date(now.getTime() - UNANSWERED_RETENTION_MS),
  })
  const saved = await store.insert(
    {
      email: request.email,
      text: request.text,
      posterId: request.posterId,
      notifyWhenReady: request.notifyWhenReady,
      consentVersion: CONSENT_VERSION,
      image: request.image,
      ipHash,
    },
    now,
  )
  try {
    const message = screenRequestEmail({ request: saved, posterName: screenById(saved.posterId)?.name ?? null, siteUrl: deps.siteUrl })
    await deps.sender.send({ ...message, to: deps.to })
  } catch (error) {
    await store.remove(saved.id).catch(() => {})
    // Never the address or the words: only the error's own message, which carries neither.
    console.error('[screen-requests] could not send', error instanceof Error ? error.message : 'unknown error')
    return { kind: 'failed' }
  }
  return { kind: 'accepted' }
}
