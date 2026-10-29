// Screen requests: the "Don't see your screen?" form at the end of the Screens
// gallery. Everything a person might want to change lives here: the limits,
// how long requests are kept and where they're sent.

import { CONTACT_EMAIL } from '../waitlist/config'

export const TEXT_MIN = 20
export const TEXT_MAX = 2000
/** The counter under the request appears from here on. */
export const TEXT_COUNTER_FROM = 1800

/** The picture people choose: anything bigger is refused before it's read. */
export const ORIGINAL_IMAGE_MAX_BYTES = 20 * 1024 * 1024
/** Accepted on the way in, by type and by extension (FileUpload's `accept`). */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
/** The browser shrinks every picture before it's sent: longest side, quality, and the size it aims under. */
export const SHRINK = { maxSide: 2000, quality: 0.85, targetBytes: 3 * 1024 * 1024 } as const

/** The largest picture the server keeps, after the browser has shrunk it. */
export const IMAGE_MAX_BYTES = 3.5 * 1024 * 1024
/** The whole request. Hosting refuses anything over 4.5 MB; this stays well under. */
export const BODY_MAX_BYTES = 4 * 1024 * 1024

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const RATE_LIMITS = {
  ip: { max: 5, windowMs: HOUR },
  email: { max: 3, windowMs: DAY },
  /** Every request, from everyone: a ceiling on abuse that rotates addresses, and on what the database holds. */
  global: { max: 100, windowMs: DAY },
} as const

/** Replied requests are deleted this long after the reply. Closed ones go at the next clean-up. */
export const REPLIED_RETENTION_MS = 90 * DAY
/** Requests that never get a reply are deleted this long after they arrive. */
export const UNANSWERED_RETENTION_MS = 365 * DAY
/**
 * "Also tell me when it's ready": past the times above, only the email, the
 * poster or screen name, the consent version and the dates stay, until the
 * screen ships or this long after the request, whichever comes first.
 */
export const READY_RETENTION_MS = 2 * 365 * DAY

/** Where each request is emailed: DIYA_REQUESTS_TO, or DIYA's public contact. */
export function requestsTo(env: Record<string, string | undefined> = process.env) {
  return env.DIYA_REQUESTS_TO?.trim() || CONTACT_EMAIL
}
