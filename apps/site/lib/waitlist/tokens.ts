import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** A random, URL-safe token. Only its hash is ever stored. */
export function randomToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** A keyed one-way hash, so IP addresses and emails in rate-limit records can't be reversed. */
export function keyedHash(secret: string, kind: string, value: string) {
  return createHmac('sha256', secret).update(`${kind}:${value}`).digest('hex')
}

function sameSignature(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Proves when the form was handed out, and to which IP (by its keyed hash),
 * without storing anything. A token used from another IP is refused, so the
 * form fetches a fresh one and tries again.
 */
export function issueFormToken(secret: string, ipHash: string, now: number) {
  return `${now}.${keyedHash(secret, 'form', `${now}:${ipHash}`).slice(0, 32)}`
}

/** Milliseconds since the token was issued, or null when it is forged, malformed or from another IP. Old is fine. */
export function formTokenAge(secret: string, token: string, ipHash: string, now: number) {
  const [issued, signature] = token.split('.')
  if (!issued || !signature || !/^\d{10,16}$/.test(issued)) return null
  if (!sameSignature(signature, keyedHash(secret, 'form', `${issued}:${ipHash}`).slice(0, 32))) return null
  const age = now - Number(issued)
  return age < 0 ? null : age
}

/** Signs a confirmation result into the redirect, so `/waitlist/confirmed` can't be told "founding" by hand. */
export function signStatus(secret: string, status: string, now: number) {
  return { s: status, t: String(now), sig: keyedHash(secret, 'status', `${status}:${now}`).slice(0, 32) }
}

export function verifyStatus(secret: string, status: string, t: string, sig: string, now: number, maxAgeMs: number) {
  if (!/^\d{10,16}$/.test(t) || !sameSignature(sig, keyedHash(secret, 'status', `${status}:${t}`).slice(0, 32))) return false
  const age = now - Number(t)
  return age >= 0 && age <= maxAgeMs
}
