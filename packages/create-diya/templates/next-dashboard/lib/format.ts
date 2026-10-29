import type { Tone } from '@idyeah/diya'
import { TODAY, type Invoice } from './data'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const money = (n: number) => usd.format(n)
export const moneyShort = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : usd.format(n))

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
export const shortDate = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`))

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })

/** The words and color an invoice's status shows with, relative to today.
 * Color is spent only where it asks something of you: late (red), due this
 * week (amber) and paid (green). Everything else stays neutral. */
export function statusOf(invoice: Invoice): { text: string; tone: Tone; key: string } {
  if (invoice.status === 'paid') return { text: 'Paid', tone: 'success', key: 'Paid' }
  if (invoice.status === 'draft') return { text: 'Draft', tone: 'neutral', key: 'Draft' }
  const left = daysBetween(TODAY, invoice.due)
  if (left < 0) return { text: `${-left} days late`, tone: 'error', key: 'Overdue' }
  if (left === 0) return { text: 'Due today', tone: 'warning', key: 'Due soon' }
  if (left <= 7) return { text: `Due ${weekday.format(new Date(`${invoice.due}T00:00:00Z`))}`, tone: 'warning', key: 'Due soon' }
  return { text: `Due ${shortDate(invoice.due)}`, tone: 'neutral', key: 'Sent' }
}
