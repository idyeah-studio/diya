// Everything about the waitlist (Relight, part of DIYA Pro) that a person might want to change
// lives here: the options, the limits and the words in the email footer.

export const CHOICES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'settings', label: 'Settings' },
  { value: 'admin-table', label: 'Admin table' },
  { value: 'landing', label: 'Landing' },
  { value: 'other', label: 'Something else' },
] as const

export type Choice = (typeof CHOICES)[number]['value']
export type Source = 'landing' | 'catalog'

export const SOURCES: readonly Source[] = ['landing', 'catalog']
export const OTHER_TEXT_MAX = 80
export const EMAIL_MAX = 254

/** Founding status goes to the first this-many confirmed addresses. */
export const FOUNDING_LIMIT = 200

/**
 * Bumped whenever the privacy page or a form's promise changes. Stored with
 * each signup and each screen request. Keep it equal to the privacy page's
 * "Last updated" date.
 */
export const CONSENT_VERSION = '2026-11-06'
/** The privacy page's "Last updated" line; the date CONSENT_VERSION names. */
export const PRIVACY_UPDATED = 'November 6, 2026'

/** The sender's legal name. Printed in every email footer and on the privacy page. */
export const SENDER_ORG = 'IDYeah Studio LLC'
/**
 * The sender's postal address for email footers, from the optional
 * DIYA_POSTAL_ADDRESS environment variable (db/ENV.md). Unset or blank means
 * no address is printed anywhere. CAN-SPAM accepts a current street address,
 * a USPS post office box, or a private mailbox registered with a commercial
 * mail receiving agency.
 */
export function postalAddress(): string | null {
  const value = process.env.DIYA_POSTAL_ADDRESS?.trim()
  return value ? value : null
}
/**
 * Whether the waitlist's transactional emails (the confirmation and "already
 * on the list") print the postal address in the footer. They answer the
 * person's own request, so CAN-SPAM's address rule likely doesn't bind them.
 * Off by default. Set to true to include it (when DIYA_POSTAL_ADDRESS is set).
 *
 * Any future commercial or announcement email (for example "Relight is
 * ready", or the founding offer) MUST include a valid postal address: a street
 * address, a USPS PO box or a registered private mailbox. Don't build one on
 * this switch; build it with `postalAddress: true`, and set DIYA_POSTAL_ADDRESS.
 */
export const POSTAL_ADDRESS_IN_TRANSACTIONAL = false

/** DIYA's public contact: privacy questions, deletion requests, replies, the mailto unsubscribe. */
export const CONTACT_EMAIL = 'diya@idyeah.studio'
/** Reply-To when DIYA_WAITLIST_REPLY_TO isn't set: the public alias, under Vishal's name. */
export const DEFAULT_REPLY_TO = `Vishal <${CONTACT_EMAIL}>`

/** Below this, a submission is treated as a bot: quietly accepted, never stored. */
export const MIN_FILL_MS = 1500
/** The form fetches a fresh token before submitting once its own is older than this. */
export const FORM_TOKEN_REFRESH_MS = 23 * 60 * 60 * 1000

export const RATE_LIMITS = {
  ip: { max: 8, windowMs: 10 * 60 * 1000 },
  email: { max: 4, windowMs: 60 * 60 * 1000 },
  /** Every email the list sends, across all addresses: a ceiling on abuse with address variants. */
  send: { max: 60, windowMs: 60 * 60 * 1000 },
} as const
/** Attempt records are kept this long, then pruned. */
export const ATTEMPT_RETENTION_MS = 2 * 24 * 60 * 60 * 1000

/** At most one email per address in this window, whatever kind it is. */
export const EMAIL_GAP_MS = 24 * 60 * 60 * 1000
/** Addresses that never confirm are deleted this long after their last confirmation email. */
export const UNCONFIRMED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** The browser's masked note that it joined, shared by every form on the site. */
export const LOCAL_NOTE_KEY = 'diya:waitlist'
/** The same note's key before 2026-10-20. Read once, moved to LOCAL_NOTE_KEY, then removed. */
export const LEGACY_LOCAL_NOTE_KEY = 'diya:rebuild'

export function choiceLabel(choice: Choice | null | undefined) {
  return CHOICES.find((option) => option.value === choice)?.label ?? null
}
