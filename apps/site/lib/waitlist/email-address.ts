import { EMAIL_MAX } from './config'

// Conservative on purpose: plain ASCII local parts, dotted domain labels, a
// letter-only top level. No quotes, comments, brackets or IP literals, so one
// mailbox can't be dressed up as many. Gmail dots and +tags stay distinct
// addresses; the send cap is what limits variants.
const LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/
const TOP_LEVEL = /^(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{1,59})$/

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function emailProblem(value: string): 'empty' | 'malformed' | null {
  const email = value.trim()
  if (!email) return 'empty'
  if (email.length > EMAIL_MAX) return 'malformed'
  const at = email.lastIndexOf('@')
  if (at < 1 || email.indexOf('@') !== at) return 'malformed'
  const local = email.slice(0, at)
  const labels = email.slice(at + 1).split('.')
  if (local.length > 64 || !LOCAL.test(local)) return 'malformed'
  if (labels.length < 2 || !labels.every((label) => LABEL.test(label)) || !TOP_LEVEL.test(labels[labels.length - 1])) {
    return 'malformed'
  }
  return null
}

const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'googlemail.co': 'googlemail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'protonmail.co': 'protonmail.com',
  'proton.mi': 'proton.me',
}

/** The address with a common domain typo fixed, or null when nothing looks wrong. */
export function suggestEmail(value: string) {
  const email = value.trim()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const fixed = DOMAIN_TYPOS[email.slice(at + 1).toLowerCase()]
  return fixed ? `${email.slice(0, at)}@${fixed}` : null
}

/** "maya@studio.co" becomes "m•••@studio.co". */
export function maskEmail(value: string) {
  const email = value.trim()
  const at = email.lastIndexOf('@')
  if (at < 1) return '•••'
  return `${email[0]}•••${email.slice(at)}`
}
