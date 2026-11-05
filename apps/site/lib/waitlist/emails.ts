import { CONTACT_EMAIL, POSTAL_ADDRESS_IN_TRANSACTIONAL, postalAddress as configuredPostalAddress, SENDER_ORG, type Choice } from './config'
import { FOUNDING_ART_JPG, RELIGHT_ART_JPG } from './email-art'

// CAN-SPAM (FTC, "CAN-SPAM Act: A Compliance Guide for Business"). The emails
// here are transactional or relationship messages: each answers the person's
// own request to join, the subject says so, and that answer comes first. They
// still carry an honest From, a working one-click way off the list (honored
// at once) and, when switched on and set, the postal address
// (POSTAL_ADDRESS_IN_TRANSACTIONAL, DIYA_POSTAL_ADDRESS).
// Any future commercial or announcement email is different: it MUST carry a
// valid postal address, a clear way to opt out, and honor opt-outs within 10
// business days. Pass `postalAddress: true` to footerText and page for those.

export type EmailHeader = { name: string; value: string }

export type EmailAttachment = {
  name: string
  contentType: string
  content: Uint8Array
  /** Set for a picture the HTML shows inline, as `cid:{contentId}`. */
  contentId?: string
}

export type ComposedEmail = {
  subject: string
  /** Plain text is the primary part; the HTML says the same thing. */
  text: string
  html: string
  headers: EmailHeader[]
  tag: 'waitlist-confirm' | 'waitlist-already' | 'waitlist-welcome' | 'screen-request'
  /** Overrides the sender's Reply-To for this one message. */
  replyTo?: string
  attachments?: EmailAttachment[]
}

export type EmailLinks = {
  siteUrl: string
  /** RFC 8058 one-click endpoint (POST). */
  oneClickUrl: string
  /** The page a person lands on from the footer link (GET, then a button). */
  unsubscribePageUrl: string
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function host(siteUrl: string) {
  try {
    return new URL(siteUrl).host
  } catch {
    return 'diya13.ai'
  }
}

const REBUILD: Record<Choice, string> = {
  dashboard: 'a dashboard',
  settings: 'a settings page',
  'admin-table': 'an admin table',
  landing: 'a landing page',
  other: 'something of your own',
}

// The free-text "Something else" answer is never echoed: anyone can type any
// address into the form, and the email must not carry their words to it.
function pickLine(choice: Choice | null) {
  return choice ? `First thing you’d rebuild: ${REBUILD[choice]}. Noted.` : null
}

function unsubscribeHeaders(links: EmailLinks): EmailHeader[] {
  return [
    { name: 'List-Unsubscribe', value: `<${links.oneClickUrl}>, <mailto:${CONTACT_EMAIL}?subject=Leave%20the%20DIYA%20Pro%20list>` },
    { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
  ]
}

/** "IDYeah Studio LLC · {postal address}", or the name alone when the address is switched off or not set. */
function senderLine(postalAddress: boolean) {
  const address = postalAddress ? configuredPostalAddress() : null
  return address ? `${SENDER_ORG} · ${address}` : SENDER_ORG
}

function footerText(links: EmailLinks, postalAddress: boolean) {
  return [
    `You’re getting this because this address was entered to join the DIYA Pro waitlist at ${host(links.siteUrl)}.`,
    `Leave the list: ${links.unsubscribePageUrl}`,
    `Privacy: ${links.siteUrl}/privacy`,
    `Questions about your data: ${CONTACT_EMAIL}`,
    senderLine(postalAddress),
  ].join('\n')
}

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

const jpg = (name: string, base64: string): EmailAttachment => ({
  name: `${name}.jpg`,
  contentType: 'image/jpeg',
  content: Uint8Array.from(Buffer.from(base64, 'base64')),
  contentId: name,
})

/**
 * The picture at the top: the arch photo, the wordmark and a glass card with a
 * drawing. It rides inside the email (cid:), so opening one loads nothing from
 * anywhere, and it carries no words a phone would shrink below 13px.
 */
const ART = {
  relight: { file: jpg('relight', RELIGHT_ART_JPG), alt: 'DIYA. A sketch of a screen turning into a finished one.' },
  founding: { file: jpg('founding', FOUNDING_ART_JPG), alt: 'DIYA. A founding ticket: 1 of the first 200.' },
}
type Art = (typeof ART)[keyof typeof ART]

// The site's Dark, for mail apps that follow the reader's setting. Others keep
// the Light inline styles. The picture reads the same on either.
const DARK = `@media (prefers-color-scheme: dark) {
  .page { background:#141515 !important; color:#f1f3f2 !important; }
  .page a, .ink { color:#f1f3f2 !important; }
  .muted { color:#bec8cb !important; }
  .rule { border-top-color:#373838 !important; }
  .chip, .code { background:#2e2f2f !important; color:#f1f3f2 !important; }
  .page a.button { background:#f1f3f2 !important; color:#141515 !important; }
}`

/** The picture, then Relight with the site's "Coming to DIYA Pro" tag, in live text so it never shrinks. */
function header(siteUrl: string, art: Art) {
  return (
    `<p style="margin:0 0 28px;"><a href="${escape(siteUrl)}" style="display:block;">` +
    `<img src="cid:${art.file.contentId}" width="512" alt="${escape(art.alt)}" style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:16px;"></a></p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:collapse;"><tr>` +
    `<td class="ink" style="padding:0 12px 0 0;vertical-align:middle;font-size:24px;line-height:1.1;font-weight:600;letter-spacing:-0.025em;color:#202627;">Relight</td>` +
    `<td style="vertical-align:middle;"><span class="chip" style="display:inline-block;padding:4px 10px 4px 9px;border-radius:7px;background:#eef0f0;color:#202627;font-size:14px;font-weight:500;line-height:1.3;white-space:nowrap;">` +
    `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e8503a;margin-right:8px;vertical-align:1px;"></span>Coming to DIYA Pro</span></td>` +
    `</tr></table>`
  )
}

function page(preheader: string, art: Art, body: string, links: EmailLinks, postalAddress: boolean) {
  const small = `margin:0 0 6px;font-size:13px;line-height:1.5;color:#495659;`
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>DIYA</title>
<style>${DARK}</style></head>
<body class="page" style="margin:0;padding:0;background:#ffffff;color:#202627;font-family:${FONT};font-size:17px;line-height:1.55;">
<div style="display:none;max-height:0;overflow:hidden;">${escape(preheader)}</div>
<div class="page" style="background:#ffffff;color:#202627;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
${header(links.siteUrl, art)}
${body}
<hr class="rule" style="border:0;border-top:1px solid #e3e6e6;margin:40px 0 20px;">
<p class="muted" style="${small}">You’re getting this because this address was entered to join the DIYA Pro waitlist at ${escape(host(links.siteUrl))}.</p>
<p class="muted" style="${small}"><a href="${escape(links.unsubscribePageUrl)}" style="color:#202627;">Leave the list</a> · <a href="${escape(links.siteUrl)}/privacy" style="color:#202627;">Privacy</a> · Questions about your data: <a href="mailto:${escape(CONTACT_EMAIL)}" style="color:#202627;">${escape(CONTACT_EMAIL)}</a></p>
<p class="muted" style="${small}margin:0;">${escape(senderLine(postalAddress))}</p>
</div>
</div>
</body>
</html>`
}

const p = (text: string) => `<p style="margin:0 0 18px;">${text}</p>`
const quiet = (text: string) => `<p class="muted" style="margin:0 0 18px;color:#495659;">${text}</p>`

const SIGNATURE_TEXT = '— Vishal'
const SIGNATURE_HTML = `<p style="margin:28px 0 0;">— Vishal</p>`

/** One line pointing at the free library, with an open door for replies. */
function libraryLine(siteUrl: string) {
  return {
    text: `Meanwhile, DIYA is free at ${siteUrl}. Build something? Reply and show me.`,
    html: p(`Meanwhile, DIYA is free at <a href="${escape(siteUrl)}" style="color:#202627;">${escape(host(siteUrl))}</a>. Build something? Reply and show me.`),
  }
}

/** The double opt-in email: one button, a few short lines, from Vishal. */
export function confirmationEmail(input: {
  confirmUrl: string
  choice: Choice | null
  links: EmailLinks
  /** Print the postal address in the footer. Defaults to POSTAL_ADDRESS_IN_TRANSACTIONAL. */
  postalAddress?: boolean
}): ComposedEmail {
  const { confirmUrl, choice, links, postalAddress = POSTAL_ADDRESS_IN_TRANSACTIONAL } = input
  const pick = pickLine(choice)
  const founding = 'The first 200 to confirm get early access and the founding price for a year. No card needed.'
  const ignore = 'Didn’t sign up? Just ignore this.'
  const text = [
    'Hi,',
    'One click and you’re on the list:',
    `Confirm my email: ${confirmUrl}`,
    founding,
    ...(pick ? [pick] : []),
    ignore,
    SIGNATURE_TEXT,
    '--',
    footerText(links, postalAddress),
  ].join('\n\n')
  const button = `<p style="margin:0 0 28px;"><a class="button" href="${escape(confirmUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#262626;color:#fafafa;font-weight:600;text-decoration:none;">Confirm my email</a></p>`
  const html = page(
    'One click, then it’s quiet until Relight is ready.',
    ART.relight,
    p('Hi,') + p('One click and you’re on the list:') + button + p(founding) + (pick ? p(escape(pick)) : '') + quiet(ignore) + SIGNATURE_HTML,
    links,
    postalAddress,
  )
  return {
    subject: 'Confirm your spot on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-confirm',
    attachments: [ART.relight.file],
  }
}

/** Sent once, after an address's first confirmation: a record of founding status, and what happens next. */
export function welcomeEmail(input: {
  founding: boolean
  links: EmailLinks
  /** Print the postal address in the footer. Defaults to POSTAL_ADDRESS_IN_TRANSACTIONAL. */
  postalAddress?: boolean
}): ComposedEmail {
  const { founding, links, postalAddress = POSTAL_ADDRESS_IN_TRANSACTIONAL } = input
  const lines = founding
    ? [
        'You’re in, and you’re one of the first 200. That’s early access and the founding price for a year.',
        'Keep this email. It’s your ticket.',
        'Now it goes quiet until Relight is ready. Promise.',
      ]
    : ['You’re in. The 200 founding spots went fast, but you’ll hear the moment Relight is ready.']
  const library = libraryLine(links.siteUrl)
  const art = founding ? ART.founding : ART.relight
  const text = ['Hi,', ...lines, library.text, SIGNATURE_TEXT, '--', footerText(links, postalAddress)].join('\n\n')
  const html = page(
    founding ? 'One of the first 200. Keep this one.' : 'Confirmed. You’ll hear when Relight is ready.',
    art,
    p('Hi,') + lines.map((line) => p(escape(line))).join('') + library.html + SIGNATURE_HTML,
    links,
    postalAddress,
  )
  return {
    subject: founding ? 'Your founding ticket for Relight' : 'You’re on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-welcome',
    attachments: [art.file],
  }
}

/** Sent instead when a confirmed address signs up again. Says nothing new, changes nothing else. */
export function alreadyOnListEmail(input: {
  choice: Choice | null
  links: EmailLinks
  /** Print the postal address in the footer. Defaults to POSTAL_ADDRESS_IN_TRANSACTIONAL. */
  postalAddress?: boolean
}): ComposedEmail {
  const { choice, links, postalAddress = POSTAL_ADDRESS_IN_TRANSACTIONAL } = input
  const pick = pickLine(choice)
  const news = 'Good news: you’re already on the list. Nothing to do.'
  const text = ['Hi,', news, ...(pick ? [pick] : []), SIGNATURE_TEXT, '--', footerText(links, postalAddress)].join('\n\n')
  const html = page(
    'Nothing to do. You’re already on it.',
    ART.relight,
    p('Hi,') + p(escape(news)) + (pick ? p(escape(pick)) : '') + SIGNATURE_HTML,
    links,
    postalAddress,
  )
  return {
    subject: 'You’re already on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-already',
    attachments: [ART.relight.file],
  }
}
