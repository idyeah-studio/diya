import { CONTACT_EMAIL, POSTAL_ADDRESS_IN_TRANSACTIONAL, postalAddress as configuredPostalAddress, SENDER_ORG, type Choice } from './config'
import {
  DIYA_DARK_PNG,
  DIYA_LIGHT_PNG,
  FOUNDING_HERO_DARK_PNG,
  FOUNDING_HERO_LIGHT_PNG,
  RELIGHT_HERO_DARK_PNG,
  RELIGHT_HERO_LIGHT_PNG,
} from './email-art'

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

const png = (name: string, base64: string): EmailAttachment => ({
  name: `${name}.png`,
  contentType: 'image/png',
  content: Uint8Array.from(Buffer.from(base64, 'base64')),
  contentId: name,
})

/**
 * The wordmark and the two drawings, each with a Dark twin. They ride inside
 * the email (cid:), so opening one loads nothing from anywhere.
 */
const WORDMARK = { light: png('diya-light', DIYA_LIGHT_PNG), dark: png('diya-dark', DIYA_DARK_PNG) }
const HEROES = {
  relight: {
    light: png('relight-hero-light', RELIGHT_HERO_LIGHT_PNG),
    dark: png('relight-hero-dark', RELIGHT_HERO_DARK_PNG),
    alt: 'A rough sketch of a screen becoming a finished one: what Relight does.',
  },
  founding: {
    light: png('founding-hero-light', FOUNDING_HERO_LIGHT_PNG),
    dark: png('founding-hero-dark', FOUNDING_HERO_DARK_PNG),
    alt: 'A founding ticket: one in 200.',
  },
}
type Hero = (typeof HEROES)[keyof typeof HEROES]
const pictures = (hero: Hero | null) => [WORDMARK.light, WORDMARK.dark, ...(hero ? [hero.light, hero.dark] : [])]

// The site's Dark, for mail apps that follow the reader's setting: the page,
// the card and its parts, and each picture's Dark twin. Others keep Light.
const STYLE = `@media (prefers-color-scheme: dark) {
  .page { background:#0f1010 !important; color:#f1f3f2 !important; }
  .card { background:#1b1c1c !important; border-color:#2b2d2d !important; }
  .page a, .ink { color:#f1f3f2 !important; }
  .muted { color:#bec8cb !important; }
  .box { background:#242626 !important; border-color:#333636 !important; }
  .art { background:#242626 !important; }
  .chip { background:#2e2f2f !important; color:#f1f3f2 !important; }
  .page a.button { background:#f1f3f2 !important; color:#141515 !important; }
  .on-light { display:none !important; }
  .on-dark { display:block !important; }
}
@media (max-width: 480px) { .card { padding:28px 22px !important; } }`

/**
 * A picture and its Dark twin: mail apps that follow the reader's setting show
 * one, the rest show Light. It shrinks to fit a phone, never past `width`.
 */
function themed(pair: { light: EmailAttachment; dark: EmailAttachment }, width: number, height: number, alt: string) {
  const img = (file: EmailAttachment, cls: string, display: string, text: string) =>
    `<img class="${cls}" src="cid:${file.contentId}" width="${width}" height="${height}" alt="${escape(text)}" style="display:${display};width:100%;max-width:${width}px;height:auto;margin:0 auto;border:0;outline:none;">`
  return img(pair.light, 'on-light', 'block', alt) + `<!--[if !mso]><!-->${img(pair.dark, 'on-dark', 'none', '')}<!--<![endif]-->`
}

/**
 * The card's top: the wordmark, Relight with its tag, the headline, and then
 * the drawing, so the words lead even where pictures are blocked.
 */
function top(siteUrl: string, headline: string, hero: Hero | null) {
  return (
    `<p style="margin:0;"><a href="${escape(siteUrl)}" style="display:inline-block;width:92px;">${themed(WORDMARK, 92, 30, 'DIYA')}</a></p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;border-collapse:collapse;"><tr>` +
    `<td class="ink" style="padding:0 10px 0 0;vertical-align:middle;font-size:17px;font-weight:600;letter-spacing:-0.01em;color:#202627;">Relight</td>` +
    `<td style="vertical-align:middle;"><span class="chip" style="display:inline-block;padding:3px 9px 3px 8px;border-radius:7px;background:#eef0f0;color:#202627;font-size:13px;font-weight:500;line-height:1.3;white-space:nowrap;">` +
    `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#e8503a;margin-right:7px;vertical-align:1px;"></span>Coming to DIYA Pro</span></td>` +
    `</tr></table>` +
    `<h1 class="ink" style="margin:14px 0 22px;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-0.03em;color:#202627;">${escape(headline)}</h1>` +
    (hero
      ? `<div class="art" style="margin:0 0 26px;padding:22px 18px;border-radius:16px;background:#f4f5f3;text-align:center;">${themed(hero, 420, 182, hero.alt)}</div>`
      : '')
  )
}

function page(email: { preheader: string; headline: string; hero: Hero | null; body: string }, links: EmailLinks, postalAddress: boolean) {
  const small = `margin:0 0 6px;font-size:13px;line-height:1.5;color:#495659;`
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>DIYA</title>
<style>${STYLE}</style></head>
<body class="page" style="margin:0;padding:0;background:#f2f2ef;color:#2f3637;font-family:${FONT};font-size:16px;line-height:1.6;">
<div style="display:none;max-height:0;overflow:hidden;">${escape(email.preheader)}</div>
<div class="page" style="background:#f2f2ef;color:#2f3637;">
<div style="max-width:560px;margin:0 auto;padding:28px 12px 32px;">
<div class="card" style="background:#ffffff;border:1px solid #e4e4df;border-radius:20px;padding:34px 32px;">
${top(links.siteUrl, email.headline, email.hero)}
${email.body}
</div>
<div style="padding:22px 20px 0;">
<p class="muted" style="${small}">You’re getting this because this address was entered to join the DIYA Pro waitlist at ${escape(host(links.siteUrl))}.</p>
<p class="muted" style="${small}"><a href="${escape(links.unsubscribePageUrl)}" style="color:#202627;">Leave the list</a> · <a href="${escape(links.siteUrl)}/privacy" style="color:#202627;">Privacy</a> · Questions about your data: <a href="mailto:${escape(CONTACT_EMAIL)}" style="color:#202627;">${escape(CONTACT_EMAIL)}</a></p>
<p class="muted" style="${small}margin:0;">${escape(senderLine(postalAddress))}</p>
</div>
</div>
</div>
</body>
</html>`
}

const p = (text: string) => `<p style="margin:0 0 16px;">${text}</p>`
const quiet = (text: string) => `<p class="muted" style="margin:0 0 16px;color:#495659;">${text}</p>`
/** The one fact worth keeping, in a tinted box. */
const box = (text: string) =>
  `<div class="box" style="margin:6px 0 22px;padding:16px 20px;border-radius:14px;background:#f4f5f3;border:1px solid #e6e8e6;">${text}</div>`

const SIGNATURE_TEXT = 'Vishal\nIDYeah Studio'
const SIGNATURE_HTML =
  `<p class="ink" style="margin:28px 0 0;font-size:18px;font-weight:600;color:#202627;">Vishal</p>` +
  `<p class="muted" style="margin:0;font-size:15px;color:#495659;">IDYeah Studio</p>`

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
  const offer = 'The first 200 to confirm get early access and the founding price for a year. No card needed.'
  const ignore = 'Didn’t sign up? Just ignore this.'
  const text = [
    'Hi,',
    'One click confirms it’s you:',
    `Confirm my email: ${confirmUrl}`,
    offer,
    ...(pick ? [pick] : []),
    ignore,
    SIGNATURE_TEXT,
    '--',
    footerText(links, postalAddress),
  ].join('\n\n')
  const button = `<p style="margin:4px 0 24px;"><a class="button" href="${escape(confirmUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#262626;color:#fafafa;font-weight:600;text-decoration:none;">Confirm my email</a></p>`
  const html = page(
    {
      preheader: 'One click, then it’s quiet until Relight is ready.',
      headline: 'Almost in.',
      hero: HEROES.relight,
      body: p('Hi,') + p('One click confirms it’s you:') + button + box(offer) + (pick ? p(escape(pick)) : '') + quiet(ignore) + SIGNATURE_HTML,
    },
    links,
    postalAddress,
  )
  return {
    subject: 'Confirm your spot on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-confirm',
    attachments: pictures(HEROES.relight),
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
  const library = libraryLine(links.siteUrl)
  const hero = founding ? HEROES.founding : HEROES.relight
  const ticket = 'One of the first 200 means early access and the founding price for a year. Keep this email: it’s your ticket.'
  const quietNow = 'Now it goes quiet until Relight is ready. Promise.'
  const later = 'The 200 founding spots went fast, but you’ll hear the moment Relight is ready.'
  const lines = founding ? [ticket, quietNow] : [later]
  const text = ['Hi,', ...lines, library.text, SIGNATURE_TEXT, '--', footerText(links, postalAddress)].join('\n\n')
  const body = founding ? p('Hi,') + box(escape(ticket)) + p(escape(quietNow)) : p('Hi,') + p(escape(later))
  const html = page(
    {
      preheader: founding ? 'One of the first 200. Keep this one.' : 'Confirmed. You’ll hear when Relight is ready.',
      headline: founding ? 'Your founding spot is saved.' : 'You’re on the list.',
      hero,
      body: body + library.html + SIGNATURE_HTML,
    },
    links,
    postalAddress,
  )
  return {
    subject: founding ? 'Your founding ticket for Relight' : 'You’re on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-welcome',
    attachments: pictures(hero),
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
    {
      preheader: 'Nothing to do. You’re already on it.',
      headline: 'Already in.',
      hero: null,
      body: p('Hi,') + p(escape(news)) + (pick ? p(escape(pick)) : '') + SIGNATURE_HTML,
    },
    links,
    postalAddress,
  )
  return {
    subject: 'You’re already on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-already',
    attachments: pictures(null),
  }
}
