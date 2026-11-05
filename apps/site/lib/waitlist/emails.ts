import { choiceLabel, CONTACT_EMAIL, POSTAL_ADDRESS_IN_TRANSACTIONAL, postalAddress as configuredPostalAddress, SENDER_ORG, type Choice } from './config'
import { DIYA_LOGO_DARK_PNG, DIYA_LOGO_LIGHT_PNG } from './email-logo'

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

// The free-text "Something else" answer is never echoed: anyone can type any
// address into the form, and the email must not carry their words to it.
function pickLine(choice: Choice | null) {
  if (!choice) return null
  if (choice === 'other') return 'You picked something else as the first thing you’d rebuild. That helps more than you’d think: it tells me what Relight has to get right first.'
  return `You picked ${choiceLabel(choice)} as the first thing you’d rebuild. That helps more than you’d think: it tells me what Relight has to get right first.`
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

const png = (base64: string) => Uint8Array.from(Buffer.from(base64, 'base64'))

/** The wordmark rides inside every email (cid:), so opening one loads nothing from anywhere. */
const LOGOS: EmailAttachment[] = [
  { name: 'diya-light.png', contentType: 'image/png', content: png(DIYA_LOGO_LIGHT_PNG), contentId: 'diya-light' },
  { name: 'diya-dark.png', contentType: 'image/png', content: png(DIYA_LOGO_DARK_PNG), contentId: 'diya-dark' },
]

// The site's Dark, for mail apps that follow the reader's setting. Others keep
// the Light inline styles; the light wordmark's white edge covers apps that
// darken the message themselves.
const DARK = `@media (prefers-color-scheme: dark) {
  .page { background:#141515 !important; color:#f1f3f2 !important; }
  .page a, .ink { color:#f1f3f2 !important; }
  .muted { color:#bec8cb !important; }
  .rule { border-top-color:#373838 !important; }
  .chip, .code { background:#2e2f2f !important; color:#f1f3f2 !important; }
  .page a.button { background:#f1f3f2 !important; color:#141515 !important; }
  .logo-light { display:none !important; }
  .logo-dark { display:block !important; }
}`

/** The wordmark, then Relight with the site's "Coming to DIYA Pro" tag. */
function header(siteUrl: string) {
  const logo = (theme: 'light' | 'dark', display: string, alt: string) =>
    `<img class="logo-${theme}" src="cid:diya-${theme}" width="92" height="30" alt="${alt}" style="display:${display};border:0;outline:none;">`
  return (
    `<p style="margin:0 0 36px;"><a href="${escape(siteUrl)}" style="display:inline-block;">${logo('light', 'block', 'DIYA')}` +
    `<!--[if !mso]><!-->${logo('dark', 'none', '')}<!--<![endif]--></a></p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-collapse:collapse;"><tr>` +
    `<td class="ink" style="padding:0 14px 0 0;vertical-align:middle;font-size:26px;line-height:1.1;font-weight:600;letter-spacing:-0.025em;color:#202627;">Relight</td>` +
    `<td style="vertical-align:middle;"><span class="chip" style="display:inline-block;padding:4px 10px 4px 9px;border-radius:7px;background:#eef0f0;color:#202627;font-size:14px;font-weight:500;line-height:1.3;white-space:nowrap;">` +
    `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e8503a;margin-right:8px;vertical-align:1px;"></span>Coming to DIYA Pro</span></td>` +
    `</tr></table>`
  )
}

function page(preheader: string, body: string, links: EmailLinks, postalAddress: boolean) {
  const small = `margin:0 0 8px;font-size:13px;line-height:1.5;color:#495659;`
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>DIYA</title>
<style>${DARK}</style></head>
<body class="page" style="margin:0;padding:0;background:#ffffff;color:#202627;font-family:${FONT};font-size:16px;line-height:1.55;">
<div style="display:none;max-height:0;overflow:hidden;">${escape(preheader)}</div>
<div class="page" style="background:#ffffff;color:#202627;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px 32px;">
${header(links.siteUrl)}
${body}
<hr class="rule" style="border:0;border-top:1px solid #d5dadb;margin:32px 0 20px;">
<p class="muted" style="${small}">You’re getting this because this address was entered to join the DIYA Pro waitlist at ${escape(host(links.siteUrl))}.</p>
<p class="muted" style="${small}"><a href="${escape(links.unsubscribePageUrl)}" style="color:#202627;">Leave the list</a> · <a href="${escape(links.siteUrl)}/privacy" style="color:#202627;">Privacy</a></p>
<p class="muted" style="${small}">Questions about your data: <a href="mailto:${escape(CONTACT_EMAIL)}" style="color:#202627;">${escape(CONTACT_EMAIL)}</a></p>
<p class="muted" style="${small}margin:0;">${escape(senderLine(postalAddress))}</p>
</div>
</div>
</body>
</html>`
}

const p = (text: string) => `<p style="margin:0 0 16px;">${text}</p>`

function libraryLines(siteUrl: string) {
  return {
    text: `Meanwhile, the library is free and MIT:\nnpm install @idyeah/diya\nBrowse it at ${host(siteUrl)}.`,
    html:
      p('Meanwhile, the library is free and MIT:') +
      `<p style="margin:0 0 16px;"><code class="code" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;background:#eef0f0;padding:4px 8px;border-radius:6px;">npm install @idyeah/diya</code></p>` +
      p(`Browse it at <a href="${escape(siteUrl)}" style="color:#202627;">${escape(host(siteUrl))}</a>.`),
  }
}

const SIGNATURE_TEXT = 'Vishal\nIDYeah Studio'
const SIGNATURE_HTML = p('Vishal<br>IDYeah Studio')

/** The double opt-in email: one button, short, from Vishal. */
export function confirmationEmail(input: {
  confirmUrl: string
  choice: Choice | null
  links: EmailLinks
  /** Print the postal address in the footer. Defaults to POSTAL_ADDRESS_IN_TRANSACTIONAL. */
  postalAddress?: boolean
}): ComposedEmail {
  const { confirmUrl, choice, links, postalAddress = POSTAL_ADDRESS_IN_TRANSACTIONAL } = input
  const pick = pickLine(choice)
  const library = libraryLines(links.siteUrl)
  const text = [
    'Hi,',
    'Thanks for joining the Relight list. One click confirms it’s really you:',
    `Confirm my email: ${confirmUrl}`,
    ...(pick ? [pick] : []),
    'Relight is still in the workshop. When it’s good enough to hand to you, I’ll write. There’s no date yet, because I’d rather be late than show you something half-done.',
    'The first 200 people to confirm get early access and the founding price for a year. No card now, or to stay on the list.',
    library.text,
    'If you build something with it, reply and show me. Replies come straight to me.',
    SIGNATURE_TEXT,
    'Didn’t ask to join? Ignore this email and you won’t hear from us again.',
    '--',
    footerText(links, postalAddress),
  ].join('\n\n')
  const button = `<p style="margin:0 0 24px;"><a class="button" href="${escape(confirmUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#262626;color:#fafafa;font-weight:600;text-decoration:none;">Confirm my email</a></p>`
  const html = page(
    'One link to confirm. Then it’s quiet until Relight is ready.',
    p('Hi,') +
      p('Thanks for joining the Relight list. One click confirms it’s really you:') +
      button +
      (pick ? p(escape(pick)) : '') +
      p('Relight is still in the workshop. When it’s good enough to hand to you, I’ll write. There’s no date yet, because I’d rather be late than show you something half-done.') +
      p('The first 200 people to confirm get early access and the founding price for a year. No card now, or to stay on the list.') +
      library.html +
      p('If you build something with it, reply and show me. Replies come straight to me.') +
      SIGNATURE_HTML +
      `<p class="muted" style="margin:0;font-size:15px;color:#495659;">Didn’t ask to join? Ignore this email and you won’t hear from us again.</p>`,
    links,
    postalAddress,
  )
  return {
    subject: 'Confirm your spot on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-confirm',
    attachments: LOGOS,
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
  const status = founding
    ? [
        'You’re confirmed, and you’re one of the first 200, so you’re founding: early access and the founding price for a year when Relight opens.',
        'Keep this email. It’s your record of it.',
      ]
    : ['You’re confirmed. The 200 founding spots are taken, but you’re on the list, and you’ll hear the moment Relight is ready.']
  const next = 'What happens now is very little, on purpose. Relight is in the workshop, and I’ll write when it can turn a picture of your screen into one you’d actually ship. Nothing in between.'
  const reply = 'Meanwhile, the library is free and MIT. If you build something with it, reply and show me. Replies come straight to me.'
  const text = ['Hi,', ...status, next, `${reply}\n${links.siteUrl}`, SIGNATURE_TEXT, '--', footerText(links, postalAddress)].join('\n\n')
  const html = page(
    founding ? 'One of the first 200. Keep this one.' : 'Confirmed. You’ll hear when Relight is ready.',
    p('Hi,') +
      status.map((line) => p(escape(line))).join('') +
      p(escape(next)) +
      p(
        `Meanwhile, the library is free and MIT at <a href="${escape(links.siteUrl)}" style="color:#202627;">${escape(host(links.siteUrl))}</a>. ` +
          'If you build something with it, reply and show me. Replies come straight to me.',
      ) +
      SIGNATURE_HTML,
    links,
    postalAddress,
  )
  return {
    subject: founding ? 'You’re in: a founding spot on the Relight list' : 'You’re in: you’re on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-welcome',
    attachments: LOGOS,
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
  const label = choice === 'other' ? 'something else' : choiceLabel(choice)
  const pick = label ? `I’ve noted ${label} as the first thing you’d rebuild.` : null
  const text = [
    'Hi,',
    'This address was just entered on the Relight list again. You’re already on it, so there’s nothing else to do.',
    ...(pick ? [pick] : []),
    'I’ll write when Relight is ready.',
    SIGNATURE_TEXT,
    '--',
    footerText(links, postalAddress),
  ].join('\n\n')
  const html = page(
    'Nothing to do. You’re already on it.',
    p('Hi,') +
      p('This address was just entered on the Relight list again. You’re already on it, so there’s nothing else to do.') +
      (pick ? p(escape(pick)) : '') +
      p('I’ll write when Relight is ready.') +
      SIGNATURE_HTML,
    links,
    postalAddress,
  )
  return {
    subject: 'You’re already on the Relight list',
    text,
    html,
    headers: unsubscribeHeaders(links),
    tag: 'waitlist-already',
    attachments: LOGOS,
  }
}
