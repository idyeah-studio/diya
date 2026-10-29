import { verifyStatus } from './tokens'

export type ConfirmedStatus = 'founding' | 'listed' | 'expired' | 'invalid' | 'error'
const STATUSES: ConfirmedStatus[] = ['founding', 'listed', 'expired', 'invalid', 'error']
/** A signed result stays readable this long, so a bookmarked page still makes sense. */
const STATUS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

type Params = { s?: string | string[]; t?: string | string[]; sig?: string | string[] }
const one = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '')

/**
 * What the confirmed page may say. "Founding" and "listed" must carry the
 * server's signature; anything unsigned or altered reads as an unknown link.
 * The other answers say nothing worth forging.
 */
export function readConfirmedStatus(params: Params, secret: string | null, now = Date.now()): ConfirmedStatus {
  const status = STATUSES.find((value) => value === one(params.s)) ?? 'invalid'
  if (status !== 'founding' && status !== 'listed') return status
  if (!secret) return 'error'
  return verifyStatus(secret, status, one(params.t), one(params.sig), now, STATUS_MAX_AGE_MS) ? status : 'invalid'
}
