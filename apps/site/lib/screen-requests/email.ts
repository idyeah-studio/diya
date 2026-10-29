import type { ComposedEmail } from '../waitlist/emails'
import { IMAGE_EXTENSION } from './image'
import type { ScreenRequest } from './store'

// The one email a screen request sends: to DIYA (DIYA_REQUESTS_TO), never to
// the person who asked. Reply-To is their address, so answering is one click.

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
const SUBJECT_WORDS = 60

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** "Screen request: Board", or the request's first words when it didn't come from a poster. */
function subject(request: ScreenRequest, posterName: string | null) {
  if (posterName) return `Screen request: ${posterName}`
  const words = (request.text ?? '').replace(/\s+/g, ' ').trim()
  if (words.length <= SUBJECT_WORDS) return `Screen request: ${words}`
  const cut = words.slice(0, SUBJECT_WORDS - 1)
  // At a word's end when there is one, so the subject never stops mid-word.
  const space = cut.lastIndexOf(' ')
  return `Screen request: ${(space > SUBJECT_WORDS / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

function received(at: Date) {
  return `${at.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })} Pacific`
}

export function attachmentName(request: ScreenRequest) {
  return request.image ? `screen-request-${request.id}.${IMAGE_EXTENSION[request.image.type]}` : null
}

/** The query that marks a request answered, so it's deleted 90 days later (db/ENV.md). */
export function repliedQuery(id: string) {
  return `update diya_screen_requests set status = 'replied', replied_at = now() where id = ${Number(id)};`
}

/** For "when it's ready" without a poster: names the screen, so the trimmed row still says which one. */
export function screenNameQuery(id: string) {
  return `update diya_screen_requests set screen_name = 'Name of the screen' where id = ${Number(id)};`
}

export function screenRequestEmail(input: {
  request: ScreenRequest
  /** The poster's display name, when the request came from one. */
  posterName: string | null
  /** Absolute origin, without a trailing slash. */
  siteUrl: string
}): ComposedEmail {
  const { request, posterName, siteUrl } = input
  const posterUrl = request.posterId ? `${siteUrl}/explore?area=screens&screen=${encodeURIComponent(request.posterId)}` : null
  const file = attachmentName(request)
  const facts: [string, string][] = [
    ['From', request.email],
    ...(posterName && posterUrl ? [['Poster', `${posterName} (${posterUrl})`] as [string, string]] : []),
    ['Picture', file && request.image ? `attached, ${file}, ${size(request.image.bytes.byteLength)}` : 'none'],
    ['Wants an email when it’s ready', request.notifyWhenReady ? 'yes' : 'no'],
    ['Received', `${received(request.createdAt)}, request ${request.id}`],
  ]
  // A "when it's ready" request without a poster keeps only a name for its screen once trimmed: ask for one.
  const nameIt = request.notifyWhenReady && !request.posterId
  const footer = [
    'Reply to this email to answer them. Nothing went to them when they sent it.',
    `Once you’ve replied, mark it so it’s deleted in 90 days:\n${repliedQuery(request.id)}`,
    ...(nameIt ? [`They want to hear when it’s ready, and it isn’t a poster, so name the screen when you reply:\n${screenNameQuery(request.id)}`] : []),
  ]
  const body = request.text ?? ''
  const text = [
    'A new screen request.',
    body,
    facts.map(([label, value]) => `${label}: ${value}`).join('\n'),
    '--',
    ...footer,
  ].join('\n\n')

  const p = (body: string, style = '') => `<p style="margin:0 0 16px;${style}">${body}</p>`
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>Screen request</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#202627;font-family:${FONT};font-size:16px;line-height:1.55;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
${p('A new screen request.', 'color:#495659;')}
${p(escape(body), 'white-space:pre-wrap;font-size:17px;')}
<table role="presentation" style="border-collapse:collapse;margin:8px 0 24px;font-size:15px;">
${facts.map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#495659;vertical-align:top;">${escape(label)}</td><td style="padding:4px 0;">${escape(value)}</td></tr>`).join('\n')}
</table>
<hr style="border:0;border-top:1px solid #d5dadb;margin:24px 0 16px;">
${p(escape(footer[0]), 'font-size:14px;color:#495659;')}
${[repliedQuery(request.id), ...(nameIt ? [screenNameQuery(request.id)] : [])]
  .map((query, i) => p(`${i ? 'They want to hear when it’s ready, and it isn’t a poster, so name the screen when you reply:' : 'Once you’ve replied, mark it so it’s deleted in 90 days:'}<br><code style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;">${escape(query)}</code>`, 'font-size:14px;color:#495659;'))
  .join('\n')}
</div>
</body>
</html>`

  return {
    subject: subject(request, posterName),
    text,
    html,
    headers: [],
    tag: 'screen-request',
    replyTo: request.email,
    attachments: file && request.image ? [{ name: file, contentType: request.image.type, content: request.image.bytes }] : [],
  }
}
