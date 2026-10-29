import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as statusRoute, POST as submitRoute } from '../../app/api/screen-requests/route'
import { CONSENT_VERSION, MIN_FILL_MS } from '../waitlist/config'
import { FakeSender, PostmarkSender } from '../waitlist/sender'
import { issueFormToken, keyedHash } from '../waitlist/tokens'
import { BODY_MAX_BYTES, IMAGE_MAX_BYTES, RATE_LIMITS, READY_RETENTION_MS, REPLIED_RETENTION_MS, UNANSWERED_RETENTION_MS } from './config'
import { MemoryScreenRequestStore } from './memory-store'
import { NeonScreenRequestStore } from './neon-store'
import { screenRequestDeps, screenRequestsOpen, setScreenRequestDeps } from './runtime'
import { GLOBAL_CAP_KEY, type ScreenRequestDeps } from './service'

vi.mock('next/server', () => ({ connection: async () => {} }))

const SITE = 'https://diya13.ai'
const IP = '203.0.113.7'
const SECRET = 's'
const DAY = 24 * 60 * 60 * 1000
let store: MemoryScreenRequestStore
let sender: FakeSender
let deps: ScreenRequestDeps

beforeEach(() => {
  store = new MemoryScreenRequestStore()
  sender = new FakeSender()
  deps = { store, sender, secret: SECRET, siteUrl: SITE, to: 'diya@idyeah.studio' }
  setScreenRequestDeps(deps)
})
afterEach(() => {
  setScreenRequestDeps(undefined)
  vi.unstubAllEnvs()
})

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3])
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3])
const WEBP = Uint8Array.from([...Buffer.from('RIFF'), 9, 0, 0, 0, ...Buffer.from('WEBPVP8 '), 1, 2, 3])
const TEXT = 'A support queue where each priority has its own column.'

const tokenFor = (ip = IP, issuedAgo = 5000) => issueFormToken(SECRET, keyedHash(SECRET, 'ip', ip), Date.now() - issuedAgo)

type Fields = Record<string, string | Blob | undefined>
function form(extra: Fields = {}) {
  const fields: Fields = { text: TEXT, email: 'maya@studio.co', website: '', formToken: tokenFor(), ...extra }
  const body = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue
    if (typeof value === 'string') body.set(name, value)
    else body.set(name, value, 'picture.webp')
  }
  return body
}

function post(body: FormData | string, headers: Record<string, string> = {}, ip = IP) {
  return submitRoute(new Request(`${SITE}/api/screen-requests`, { method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.0.0.1`, ...headers }, body }))
}

const only = () => [...store.requests.values()]

describe('GET /api/screen-requests', () => {
  it('says requests are open and hands out a signed form token, uncached', async () => {
    const response = await statusRoute(new Request(`${SITE}/api/screen-requests`, { headers: { 'x-forwarded-for': IP } }))
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.open).toBe(true)
    expect(body.formToken).toMatch(/^\d+\.[0-9a-f]{32}$/)
  })

  it('says closed, with no token, when the form is closed', async () => {
    setScreenRequestDeps(null)
    expect(await (await statusRoute(new Request(`${SITE}/api/screen-requests`))).json()).toEqual({ open: false })
  })
})

describe('POST /api/screen-requests', () => {
  it('stores a request with its picture and poster, and emails it to DIYA with the picture attached and Reply-To the person', async () => {
    const response = await post(form({ email: 'Maya@Studio.co', poster: 'board', notify: '1', image: new Blob([WEBP], { type: 'image/webp' }) }))
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ ok: true })
    const [saved] = only()
    expect(saved).toMatchObject({ email: 'maya@studio.co', text: TEXT, posterId: 'board', notifyWhenReady: true, consentVersion: CONSENT_VERSION, status: 'new' })
    expect(saved.image?.type).toBe('image/webp')
    expect(saved.ipHash).toBe(keyedHash(SECRET, 'ip', IP))
    expect(sender.sent).toHaveLength(1)
    const [email] = sender.sent
    expect(email.to).toBe('diya@idyeah.studio')
    expect(email.replyTo).toBe('maya@studio.co')
    expect(email.subject).toBe('Screen request: Board')
    expect(email.attachments).toEqual([{ name: `screen-request-${saved.id}.webp`, contentType: 'image/webp', content: saved.image!.bytes }])
  })

  it('takes PNG and JPEG by their first bytes, and a request without a picture', async () => {
    await post(form({ image: new Blob([PNG]) }))
    await post(form({ image: new Blob([JPEG], { type: 'application/octet-stream' }) }))
    await post(form({ notify: undefined }))
    expect(only().map((r) => r.image?.type ?? null)).toEqual(['image/png', 'image/jpeg', null])
    expect(only()[2].notifyWhenReady).toBe(false)
    expect(sender.sent[2].attachments).toEqual([])
  })

  it('refuses a fake picture whose first bytes aren’t PNG, JPEG or WebP, whatever it claims', async () => {
    for (const fake of [new Blob(['GIF89a…'], { type: 'image/png' }), new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/webp' }), new Blob([Uint8Array.from([0x89, 0x50, 0x4e])])]) {
      const response = await post(form({ image: fake }))
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'invalid', field: 'image' })
    }
    expect(only()).toHaveLength(0)
    expect(sender.sent).toHaveLength(0)
  })

  it('refuses a picture over 3.5 MB, and a body over 4 MB before reading the rest of it', async () => {
    const big = new Uint8Array(IMAGE_MAX_BYTES + 1)
    big.set(PNG)
    expect(await (await post(form({ image: new Blob([big]) }))).json()).toEqual({ error: 'invalid', field: 'image' })
    const huge = new Uint8Array(BODY_MAX_BYTES + 1024)
    huge.set(PNG)
    const response = await post(form({ image: new Blob([huge]) }))
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'too_large' })
    expect((await post(form(), { 'content-length': String(BODY_MAX_BYTES + 1) })).status).toBe(413)
    expect(only()).toHaveLength(0)
  })

  it('names the field for a missing or malformed email and a missing, short or long description', async () => {
    const field = async (extra: Fields) => (await post(form(extra))).json()
    expect(await field({ email: undefined })).toEqual({ error: 'invalid', field: 'email' })
    expect(await field({ email: 'maya@studio' })).toEqual({ error: 'invalid', field: 'email' })
    expect(await field({ text: undefined })).toEqual({ error: 'invalid', field: 'text' })
    expect(await field({ text: '   A kanban board   ' })).toEqual({ error: 'invalid', field: 'text' })
    expect(await field({ text: 'x'.repeat(2001) })).toEqual({ error: 'invalid', field: 'text' })
    expect(only()).toHaveLength(0)
  })

  it('accepts 20 to 2,000 characters, counting characters rather than code units, and keeps line breaks', async () => {
    expect((await post(form({ text: '🙂'.repeat(20) }))).status).toBe(202)
    expect((await post(form({ text: 'é'.repeat(2000) }))).status).toBe(202)
    expect((await post(form({ text: '  Line one is here,\r\nand line two.\u0007  ' }))).status).toBe(202)
    expect(only()[2].text).toBe('Line one is here,\nand line two.')
  })

  it('keeps only a poster’s id; another screen or a made-up one is left off', async () => {
    await post(form({ poster: 'sign-in' }))
    await post(form({ poster: '<script>' }))
    await post(form({ poster: 'create-edit' }))
    expect(only().map((r) => r.posterId)).toEqual([null, null, 'create-edit'])
  })

  it('a filled honeypot gets an ordinary success, and nothing is stored, counted or sent', async () => {
    const response = await post(form({ website: 'https://spam.example' }))
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ ok: true })
    expect(only().length + store.attempts.length + sender.sent.length).toBe(0)
  })

  it('a form sent faster than a person could gets an ordinary success, and nothing is stored or sent', async () => {
    const response = await post(form({ formToken: tokenFor(IP, MIN_FILL_MS - 200) }))
    expect(response.status).toBe(202)
    expect(only().length + sender.sent.length).toBe(0)
  })

  it('answers 409 for a missing, forged or another IP’s token, so the form fetches a fresh one', async () => {
    for (const formToken of [undefined, '123.abc', `${Date.now() - 5000}.${'0'.repeat(32)}`, tokenFor('198.51.100.1')]) {
      const response = await post(form({ formToken }))
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual({ error: 'token' })
    }
    expect(only()).toHaveLength(0)
  })

  it('allows 5 requests an hour from one IP, then 429 with Retry-After', async () => {
    let last: Response | undefined
    for (let i = 0; i < RATE_LIMITS.ip.max + 1; i++) last = await post(form({ email: `p${i}@x.dev` }))
    expect(last!.status).toBe(429)
    expect(last!.headers.get('retry-after')).toBe('3600')
    expect(await last!.json()).toEqual({ error: 'rate_limited', scope: 'ip' })
    expect(only()).toHaveLength(RATE_LIMITS.ip.max)
  })

  it('allows 3 requests a day from one email, from anywhere, then 429', async () => {
    let last: Response | undefined
    for (let i = 0; i < RATE_LIMITS.email.max + 1; i++) {
      const ip = `198.51.100.${i}`
      last = await post(form({ email: 'maya@studio.co', formToken: tokenFor(ip) }), {}, ip)
    }
    expect(last!.status).toBe(429)
    expect(last!.headers.get('retry-after')).toBe(String(DAY / 1000))
    expect(await last!.json()).toEqual({ error: 'rate_limited', scope: 'email' })
    expect(only()).toHaveLength(RATE_LIMITS.email.max)
  })

  it('stops everyone with 503 "busy" once the daily cap on all requests is reached', async () => {
    for (let i = 0; i < RATE_LIMITS.global.max; i++) await store.countAttempt(GLOBAL_CAP_KEY, RATE_LIMITS.global.windowMs, new Date())
    const response = await post(form())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'busy' })
    expect(response.headers.get('retry-after')).toBe('3600')
    expect(only().length + sender.sent.length).toBe(0)
  })

  it('keeps no raw IP address or email in rate-limit records', async () => {
    await post(form())
    const keys = store.attempts.map((a) => a.keyHash).join(' ')
    expect(keys).not.toContain(IP)
    expect(keys).not.toContain('maya')
    expect(only()[0].ipHash).not.toContain(IP)
  })

  it('takes the request back and answers 502 when the email to DIYA can’t be sent, so a retry leaves no twin', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sender.failNext = true
    const response = await post(form())
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'server' })
    expect(only()).toHaveLength(0)
    expect((await post(form())).status).toBe(202)
    expect(only()).toHaveLength(1)
    // The log names the failure, never the person or their words.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/maya|support queue/)
  })

  it('answers 500 when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(store, 'countAttempt').mockRejectedValue(new Error('db down'))
    expect((await post(form())).status).toBe(500)
  })

  it('cleans up old requests when a new one arrives', async () => {
    const old = await store.insert({ email: 'old@x.dev', text: TEXT, posterId: null, notifyWhenReady: false, consentVersion: 'v', image: null, ipHash: 'h' }, new Date(Date.now() - UNANSWERED_RETENTION_MS - DAY))
    const replied = await store.insert({ email: 'r@x.dev', text: TEXT, posterId: null, notifyWhenReady: false, consentVersion: 'v', image: null, ipHash: 'h' }, new Date())
    store.reply(replied.id, new Date(Date.now() - REPLIED_RETENTION_MS - DAY))
    expect((await post(form())).status).toBe(202)
    expect(only().map((r) => r.email)).toEqual(['maya@studio.co'])
    expect(store.requests.has(old.id)).toBe(false)
  })

  it('a new request trims an old “when it’s ready” one to its email, poster and dates', async () => {
    const ready = await store.insert(
      { email: 'sam@x.dev', text: TEXT, posterId: 'board', notifyWhenReady: true, consentVersion: 'v', image: { bytes: WEBP, type: 'image/webp' }, ipHash: 'h' },
      new Date(Date.now() - UNANSWERED_RETENTION_MS - DAY),
    )
    expect((await post(form())).status).toBe(202)
    expect(store.requests.get(ready.id)).toMatchObject({ email: 'sam@x.dev', posterId: 'board', consentVersion: 'v', text: null, image: null, ipHash: null })
  })

  it('refuses anything but multipart/form-data', async () => {
    expect((await post(JSON.stringify({ text: TEXT }), { 'Content-Type': 'application/json' })).status).toBe(415)
    expect((await post('nope', { 'Content-Type': 'multipart/form-data; boundary=x' })).status).toBe(400)
  })

  it('answers 503 "closed" when the form is closed', async () => {
    setScreenRequestDeps(null)
    const response = await post(form())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'closed' })
  })
})

describe('Opening and closing', () => {
  const full = {
    DIYA_DATABASE_URL: 'postgres://user:pass@ep-example.us-west-2.aws.neon.tech/diya?sslmode=require',
    POSTMARK_SERVER_TOKEN: 'token',
    POSTMARK_STREAM: 'diya-waitlist',
    DIYA_WAITLIST_FROM: 'Vishal <diya@idyeah.studio>',
    DIYA_SITE_URL: 'https://diya13.ai/',
    DIYA_WAITLIST_SECRET: 'x'.repeat(64),
    DIYA_NOW: '2026-11-07T00:00:01-08:00',
  }
  const beforeLaunch = '2026-11-06T23:59:59-08:00'

  beforeEach(() => setScreenRequestDeps(undefined))

  it('is closed before launch, even with every credential set, unless the catalog preview flag is on', async () => {
    expect(screenRequestDeps({ ...full, DIYA_NOW: beforeLaunch, NODE_ENV: 'production' })).toBeNull()
    expect(screenRequestDeps({ NODE_ENV: 'development', DIYA_NOW: beforeLaunch })).toBeNull()
    expect(screenRequestsOpen({ ...full, DIYA_NOW: beforeLaunch, DIYA_CATALOG_PREVIEW: '1', NODE_ENV: 'production' })).toBe(true)
    // Through the route, on the server's own clock.
    vi.stubEnv('DIYA_NOW', beforeLaunch)
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '0')
    expect(await (await statusRoute(new Request(`${SITE}/api/screen-requests`))).json()).toEqual({ open: false })
    expect((await post(form())).status).toBe(503)
  })

  it('answers 503 after launch in production when any variable is missing', async () => {
    expect(screenRequestDeps({ ...full, POSTMARK_STREAM: ' ', NODE_ENV: 'production' })).toBeNull()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DIYA_NOW', full.DIYA_NOW)
    vi.stubEnv('DIYA_DATABASE_URL', '')
    const response = await post(form())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'closed' })
    expect(await (await statusRoute(new Request(`${SITE}/api/screen-requests`))).json()).toEqual({ open: false })
  })

  it('uses Neon and Postmark when everything is set, and sends to DIYA_REQUESTS_TO or the public contact', () => {
    const live = screenRequestDeps({ ...full, NODE_ENV: 'production' })!
    expect(live.store).toBeInstanceOf(NeonScreenRequestStore)
    expect(live.sender).toBeInstanceOf(PostmarkSender)
    expect(live.siteUrl).toBe('https://diya13.ai')
    expect(live.to).toBe('diya@idyeah.studio')
    expect(screenRequestDeps({ ...full, DIYA_REQUESTS_TO: 'Requests <requests@example.com>', NODE_ENV: 'production' })!.to).toBe('Requests <requests@example.com>')
  })

  it('falls back to memory and a logging sender in development', () => {
    const local = screenRequestDeps({ NODE_ENV: 'development', DIYA_NOW: full.DIYA_NOW })!
    expect(local.store).toBeInstanceOf(MemoryScreenRequestStore)
    expect(local.sender).toBeInstanceOf(FakeSender)
  })

  it('the privacy page has a Screen requests section that matches the form’s link and the retention in config', () => {
    const page = readFileSync(new URL('../../app/privacy/page.tsx', import.meta.url), 'utf8')
    const form = readFileSync(new URL('../../components/screens/ScreenRequest.tsx', import.meta.url), 'utf8')
    expect(form).toContain('href="/privacy#screen-requests"')
    expect(page).toContain('<h2 id="screen-requests">Screen requests</h2>')
    expect(page).toContain("{ id: 'screen-requests', label: 'Screen requests' }")
    expect(page).not.toMatch(/The only personal details/)
    const text = page.replace(/\s+/g, ' ')
    expect(text).toContain(`${REPLIED_RETENTION_MS / DAY} days after we reply`)
    expect(text).toContain(`${UNANSWERED_RETENTION_MS / DAY} days after you sent it`)
    expect(text).toContain('Also tell me when it’s ready')
    expect(text).toContain(`until that screen ships or ${READY_RETENTION_MS / (365 * DAY)} years after your request, whichever comes first`)
    expect(text).not.toContain('email goes with it')
    expect(text).toContain('<strong>Microsoft 365</strong> holds our email, including the copy of each screen request that comes to us.')
    expect(text).toContain('Microsoft 365 holds that email')
  })

  it('no route serves a request or its picture', () => {
    const route = readFileSync(new URL('../../app/api/screen-requests/route.ts', import.meta.url), 'utf8')
    expect(route.match(/export (async )?function (\w+)/g)).toEqual(['export async function GET', 'export async function POST'])
  })
})
