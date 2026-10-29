import { issueFormToken, keyedHash, signStatus } from './tokens'
import { confirm, join, parseJoinBody, unsubscribe, type WaitlistDeps } from './service'

const MAX_BODY_BYTES = 4096
const NO_STORE = { 'Cache-Control': 'no-store' }

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...NO_STORE, ...headers } })

/** Never a raw address anywhere but this function's return value, which is only ever hashed. */
export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return request.headers.get('x-real-ip')?.trim() || forwarded || 'unknown'
}

function withOrigin(deps: WaitlistDeps, request: Request): WaitlistDeps {
  return deps.siteUrl ? deps : { ...deps, siteUrl: new URL(request.url).origin }
}

function redirect(request: Request, path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: new URL(path, request.url).toString(), 'Referrer-Policy': 'no-referrer', ...NO_STORE },
  })
}

/** GET /api/waitlist: whether the list is open, plus a form token bound to this IP for the fill-time check. */
export function handleStatus(request: Request, deps: WaitlistDeps | null) {
  if (!deps) return json({ open: false })
  const ipHash = keyedHash(deps.secret, 'ip', clientIp(request))
  return json({ open: true, formToken: issueFormToken(deps.secret, ipHash, (deps.now?.() ?? new Date()).getTime()) })
}

/** Where a confirmation lands: the result is signed, so the page can't be told "founding" by hand. */
export function confirmedPath(deps: WaitlistDeps, status: string) {
  const signed = signStatus(deps.secret, status, (deps.now?.() ?? new Date()).getTime())
  return `/waitlist/confirmed?${new URLSearchParams(signed)}`
}

/** POST /api/waitlist. */
export async function handleJoin(request: Request, deps: WaitlistDeps | null) {
  if (!deps) return json({ error: 'closed' }, 503)
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'invalid' }, 415)
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: 'invalid' }, 413)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'invalid' }, 400)
  }
  const parsed = parseJoinBody(body)
  if ('invalid' in parsed) return json({ error: 'invalid', field: parsed.invalid.field }, 400)
  try {
    const outcome = await join(withOrigin(deps, request), parsed, clientIp(request))
    switch (outcome.kind) {
      case 'accepted':
        return json({ ok: true }, 202)
      case 'invalid':
        return json({ error: 'invalid', field: outcome.field }, 400)
      case 'token':
        return json({ error: 'token' }, 409)
      case 'busy':
        return json({ error: 'busy' }, 503, { 'Retry-After': String(outcome.retryAfterSeconds) })
      case 'rate_limited':
        return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(outcome.retryAfterSeconds) })
      case 'failed':
        return json({ error: 'server' }, 502)
    }
  } catch (error) {
    console.error('[waitlist] join failed', error instanceof Error ? error.message : error)
    return json({ error: 'server' }, 500)
  }
}

/**
 * POST /api/waitlist/confirm, from the confirm page's button. Confirms, then
 * lands on the confirmed page, so the token leaves the address bar and history.
 */
export async function handleConfirm(request: Request, deps: WaitlistDeps | null) {
  if (!deps) return redirect(request, '/waitlist/confirmed?s=error')
  let token = ''
  try {
    token = new URLSearchParams((await request.text()).slice(0, MAX_BODY_BYTES)).get('token') ?? ''
  } catch {}
  try {
    const result = await confirm(deps, token)
    const status = result.status !== 'confirmed' ? result.status : result.founding ? 'founding' : 'listed'
    return redirect(request, confirmedPath(deps, status))
  } catch (error) {
    console.error('[waitlist] confirm failed', error instanceof Error ? error.message : error)
    return redirect(request, confirmedPath(deps, 'error'))
  }
}

/** GET on the confirm address (an older link, or a scanner) only shows the confirm page; it never confirms. */
export function handleConfirmGet(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  return redirect(request, `/waitlist/confirm${token ? `?token=${encodeURIComponent(token)}` : ''}`)
}

/**
 * POST /api/waitlist/unsubscribe. A mail client's RFC 8058 one-click request
 * (body `List-Unsubscribe=One-Click`, token in the URL) gets a plain 200; the
 * unsubscribe page's own form gets sent back to that page.
 */
export async function handleUnsubscribe(request: Request, deps: WaitlistDeps | null) {
  const url = new URL(request.url)
  let form: URLSearchParams
  try {
    form = new URLSearchParams((await request.text()).slice(0, MAX_BODY_BYTES))
  } catch {
    form = new URLSearchParams()
  }
  const oneClick = form.get('List-Unsubscribe') === 'One-Click'
  const token = url.searchParams.get('token') || form.get('token') || ''
  let done = false
  let failed = !deps
  if (deps) {
    try {
      done = await unsubscribe(deps, token)
    } catch (error) {
      failed = true
      console.error('[waitlist] unsubscribe failed', error instanceof Error ? error.message : error)
    }
  }
  if (oneClick) {
    if (failed) return new Response('Something went wrong. Please try again.', { status: 500, headers: NO_STORE })
    // The same answer for unknown tokens: nothing to learn by guessing.
    return new Response('You’re off the list.', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE } })
  }
  return redirect(request, `/waitlist/unsubscribe?s=${failed ? 'error' : done ? 'done' : 'invalid'}`)
}

/** GET on the one-click address (a person pasting it into a browser) shows the page; it never unsubscribes. */
export function handleUnsubscribeGet(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  return redirect(request, `/waitlist/unsubscribe${token ? `?token=${encodeURIComponent(token)}` : ''}`)
}
