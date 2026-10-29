import { clientIp } from '../waitlist/handlers'
import { issueFormToken, keyedHash } from '../waitlist/tokens'
import { BODY_MAX_BYTES } from './config'
import { parseSubmission, submit, type ScreenRequestDeps } from './service'

const NO_STORE = { 'Cache-Control': 'no-store' }

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...NO_STORE, ...headers } })

/** The body, or null once it passes `limit` bytes; reading stops there. */
export async function readCapped(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    body.set(chunk, at)
    at += chunk.byteLength
  }
  return body
}

/** GET /api/screen-requests: whether requests are open, plus a form token bound to this IP for the fill-time check. */
export function handleStatus(request: Request, deps: ScreenRequestDeps | null) {
  if (!deps) return json({ open: false })
  const ipHash = keyedHash(deps.secret, 'ip', clientIp(request))
  return json({ open: true, formToken: issueFormToken(deps.secret, ipHash, (deps.now?.() ?? new Date()).getTime()) })
}

/** POST /api/screen-requests, as multipart/form-data: text, email, notify, poster, image, website, formToken. */
export async function handleSubmit(request: Request, deps: ScreenRequestDeps | null) {
  if (!deps) return json({ error: 'closed' }, 503)
  const type = request.headers.get('content-type') ?? ''
  if (!type.toLowerCase().startsWith('multipart/form-data')) return json({ error: 'invalid' }, 415)
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > BODY_MAX_BYTES) return json({ error: 'too_large' }, 413)
  const body = await readCapped(request, BODY_MAX_BYTES).catch(() => undefined)
  if (body === null) return json({ error: 'too_large' }, 413)
  if (body === undefined) return json({ error: 'invalid' }, 400)
  let form: FormData
  try {
    form = await new Response(body, { headers: { 'Content-Type': type } }).formData()
  } catch {
    return json({ error: 'invalid' }, 400)
  }
  try {
    const parsed = await parseSubmission(form)
    if ('invalid' in parsed) return json({ error: 'invalid', field: parsed.invalid }, 400)
    const live = deps.siteUrl ? deps : { ...deps, siteUrl: new URL(request.url).origin }
    const outcome = await submit(live, parsed, clientIp(request))
    switch (outcome.kind) {
      case 'accepted':
        return json({ ok: true }, 202)
      case 'token':
        return json({ error: 'token' }, 409)
      case 'busy':
        return json({ error: 'busy' }, 503, { 'Retry-After': String(outcome.retryAfterSeconds) })
      case 'rate_limited':
        return json({ error: 'rate_limited', scope: outcome.scope }, 429, { 'Retry-After': String(outcome.retryAfterSeconds) })
      case 'failed':
        return json({ error: 'server' }, 502)
    }
  } catch (error) {
    console.error('[screen-requests] submit failed', error instanceof Error ? error.message : 'unknown error')
    return json({ error: 'server' }, 500)
  }
}
