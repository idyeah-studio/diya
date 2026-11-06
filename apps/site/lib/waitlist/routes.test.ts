import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as statusRoute, POST as joinRoute } from '../../app/api/waitlist/route'
import { GET as confirmGetRoute, POST as confirmRoute } from '../../app/api/waitlist/confirm/route'
import { GET as unsubscribeGetRoute, POST as unsubscribeRoute } from '../../app/api/waitlist/unsubscribe/route'
import { CONSENT_VERSION, CONTACT_EMAIL, PRIVACY_UPDATED } from './config'
import { MemoryWaitlistStore } from './memory-store'
import { neonRunner, NeonWaitlistStore } from './neon-store'
import { isLaunched } from '../launch'
import { waitlistIsOpen } from './open'
import { missingEnv, setWaitlistDeps, waitlistDeps } from './runtime'
import { FakeSender, PostmarkSender } from './sender'
import type { WaitlistDeps } from './service'
import { readConfirmedStatus } from './confirmed-status'
import { confirmedPath } from './handlers'
import { issueFormToken, keyedHash } from './tokens'

vi.mock('next/server', () => ({ connection: async () => {} }))

const SITE = 'https://diya13.ai'
let store: MemoryWaitlistStore
let sender: FakeSender
let deps: WaitlistDeps

beforeEach(() => {
  store = new MemoryWaitlistStore()
  sender = new FakeSender()
  deps = { store, sender, secret: 's', siteUrl: SITE }
  setWaitlistDeps(deps)
})
afterEach(() => setWaitlistDeps(undefined))

function post(body: unknown, headers: Record<string, string> = {}) {
  return joinRoute(
    new Request(`${SITE}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7, 10.0.0.1', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

const person = (email = 'maya@studio.co', extra: Record<string, unknown> = {}) => ({
  email,
  choice: 'dashboard',
  source: 'landing',
  website: '',
  formToken: issueFormToken('s', keyedHash('s', 'ip', '203.0.113.7'), Date.now() - 5000),
  ...extra,
})

const linkIn = (text: string, path: string) => new RegExp(`${SITE}${path}\\?token=[^\\s"]+`).exec(text)![0]

describe('GET /api/waitlist', () => {
  it('says the list is open and hands out a signed form token', async () => {
    const response = await statusRoute(new Request(`${SITE}/api/waitlist`, { headers: { 'x-forwarded-for': '203.0.113.7' } }))
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.open).toBe(true)
    expect(body.formToken).toMatch(/^\d+\.[0-9a-f]{32}$/)
  })

  it('says the list is closed when the live services are not configured', async () => {
    setWaitlistDeps(null)
    expect(await (await statusRoute(new Request(`${SITE}/api/waitlist`))).json()).toEqual({ open: false })
  })
})

describe('POST /api/waitlist', () => {
  it('accepts a signup with 202 and the same body for a new address, a repeat and a bot', async () => {
    const first = await post(person())
    const repeat = await post(person('MAYA@studio.co', { choice: 'settings' }))
    const bot = await post(person('bot@x.dev', { website: 'filled' }))
    for (const response of [first, repeat, bot]) {
      expect(response.status).toBe(202)
      expect(await response.json()).toEqual({ ok: true })
    }
    expect(sender.sent).toHaveLength(1)
    // A repeat that sends nothing changes nothing.
    expect(store.byEmail('maya@studio.co')!.choice).toBe('dashboard')
    expect(store.byEmail('bot@x.dev')).toBeUndefined()
  })

  it('rejects a malformed address, a bad pick, a non-JSON body and an oversized body', async () => {
    expect(await (await post(person('not-an-email'))).json()).toEqual({ error: 'invalid', field: 'email' })
    expect((await post(person('a@x.dev', { choice: 'clone' }))).status).toBe(400)
    expect((await post('{nope')).status).toBe(400)
    expect((await post(person(), { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect((await post(person('a@x.dev', { other: 'x'.repeat(5000) }))).status).toBe(413)
    expect(store.signups.size).toBe(0)
  })

  it('returns 429 with Retry-After once an IP has tried too often', async () => {
    let last: Response | undefined
    for (let i = 0; i < 9; i++) last = await post(person(`p${i}@x.dev`))
    expect(last!.status).toBe(429)
    expect(last!.headers.get('retry-after')).toBe('600')
    expect(await last!.json()).toEqual({ error: 'rate_limited' })
  })

  it('answers 409 for a missing token or one issued to another IP, so the form can fetch a fresh one', async () => {
    expect((await post(person('a@x.dev', { formToken: undefined }))).status).toBe(409)
    const elsewhere = issueFormToken('s', keyedHash('s', 'ip', '198.51.100.1'), Date.now() - 5000)
    const response = await post(person('a@x.dev', { formToken: elsewhere }))
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'token' })
    expect(store.signups.size).toBe(0)
  })

  it('answers 503 "busy" with Retry-After once the list-wide send cap is reached', async () => {
    const realNow = Date.now()
    for (let i = 0; i < 60; i++) await store.countAttempt('global:send', 60 * 60_000, new Date(realNow))
    const response = await post(person('a@x.dev'))
    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('300')
    expect(await response.json()).toEqual({ error: 'busy' })
    expect(sender.sent).toHaveLength(0)
  })

  it('returns 502 when the email could not be sent', async () => {
    sender.failNext = true
    const response = await post(person())
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'server' })
  })

  it('returns 500 when the database fails', async () => {
    vi.spyOn(store, 'countAttempt').mockRejectedValue(new Error('db down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(person())).status).toBe(500)
  })

  it('returns 503 "closed" when the live services are not configured', async () => {
    setWaitlistDeps(null)
    const response = await post(person())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'closed' })
  })
})

describe('/api/waitlist/confirm', () => {
  const confirmPost = (token: string) =>
    confirmRoute(
      new Request(`${SITE}/api/waitlist/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      }),
    )
  const emailedToken = () => new URL(linkIn(sender.sent[0].text, '/waitlist/confirm')).searchParams.get('token')!

  it('the email links to the confirm page, not the API', async () => {
    await post(person())
    expect(sender.sent[0].text).toMatch(`${SITE}/waitlist/confirm?token=`)
    expect(sender.sent[0].text).not.toContain('/api/waitlist/confirm')
  })

  it('a GET never confirms; it only sends the visitor to the confirm page', async () => {
    await post(person())
    const token = emailedToken()
    for (let i = 0; i < 3; i++) {
      const response = await confirmGetRoute(new Request(`${SITE}/api/waitlist/confirm?token=${token}`))
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe(`${SITE}/waitlist/confirm?token=${token}`)
    }
    expect(store.byEmail('maya@studio.co')!.confirmedAt).toBeNull()
    expect([...store.tokens.values()].every((t) => t.usedAt === null)).toBe(true)
  })

  it('the confirm page has no way to touch the list when it renders', () => {
    const page = readFileSync(new URL('../../app/waitlist/confirm/page.tsx', import.meta.url), 'utf8')
    expect(page).not.toMatch(/lib\/waitlist\/(runtime|service|handlers|neon-store|memory-store)/)
    expect(page).toContain('action="/api/waitlist/confirm"')
    expect(page).toMatch(/index: false/)
    expect(page).toContain("referrer: 'no-referrer'")
  })

  it('the button’s POST confirms, then redirects to the confirmed page without the token', async () => {
    await post(person())
    const response = await confirmPost(emailedToken())
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/waitlist/confirmed')
    expect(location.search).not.toContain(emailedToken())
    expect(readConfirmedStatus(Object.fromEntries(location.searchParams), 's')).toBe('founding')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(store.byEmail('maya@studio.co')!.confirmedAt).not.toBeNull()
  })

  it('sends past the first 200 to the "listed" page', async () => {
    await post(person())
    for (let i = 0; i < 200; i++) {
      const s = await store.insertSignup({ email: `f${i}@x.dev`, choice: null, otherText: null, source: 'landing', consentVersion: 'v' }, new Date())
      store.signups.get(s.id)!.founding = true
      store.signups.get(s.id)!.confirmedAt = new Date()
    }
    const location = new URL((await confirmPost(emailedToken())).headers.get('location')!)
    expect(readConfirmedStatus(Object.fromEntries(location.searchParams), 's')).toBe('listed')
  })

  it('reports unknown tokens as invalid and a closed list as an error', async () => {
    expect(new URL((await confirmPost('nope')).headers.get('location')!).searchParams.get('s')).toBe('invalid')
    expect(new URL((await confirmPost('')).headers.get('location')!).searchParams.get('s')).toBe('invalid')
    setWaitlistDeps(null)
    expect((await confirmPost('nope')).headers.get('location')).toBe(`${SITE}/waitlist/confirmed?s=error`)
  })
})

describe('/api/waitlist/unsubscribe', () => {
  async function oneClickUrl() {
    await post(person())
    const header = sender.sent[0].headers.find((h) => h.name === 'List-Unsubscribe')!.value
    return /<(https:[^>]+)>/.exec(header)![1]
  }

  it('honours an RFC 8058 one-click POST with a plain 200', async () => {
    const url = await oneClickUrl()
    const response = await unsubscribeRoute(
      new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }),
    )
    expect(response.status).toBe(200)
    expect(store.byEmail('maya@studio.co')!.unsubscribedAt).not.toBeNull()
  })

  it('takes the unsubscribe page’s form post and sends the person back to that page', async () => {
    await post(person())
    const token = new URL(linkIn(sender.sent[0].text, '/waitlist/unsubscribe')).searchParams.get('token')!
    const response = await unsubscribeRoute(
      new Request(`${SITE}/api/waitlist/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      }),
    )
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`${SITE}/waitlist/unsubscribe?s=done`)
    expect(store.byEmail('maya@studio.co')!.unsubscribedAt).not.toBeNull()
    const bad = await unsubscribeRoute(new Request(`${SITE}/api/waitlist/unsubscribe`, { method: 'POST', body: 'token=nope' }))
    expect(bad.headers.get('location')).toBe(`${SITE}/waitlist/unsubscribe?s=invalid`)
  })

  it('a GET on the one-click address only shows the page; it never unsubscribes', async () => {
    const url = await oneClickUrl()
    const response = await unsubscribeGetRoute(new Request(url))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toMatch(`${SITE}/waitlist/unsubscribe?token=`)
    expect(store.byEmail('maya@studio.co')!.unsubscribedAt).toBeNull()
  })
})

describe('Configuration', () => {
  const full = {
    DIYA_DATABASE_URL: 'postgres://user:pass@ep-example.us-west-2.aws.neon.tech/diya?sslmode=require',
    POSTMARK_SERVER_TOKEN: 'token',
    POSTMARK_STREAM: 'diya-waitlist',
    DIYA_WAITLIST_FROM: 'Vishal <diya@idyeah.studio>',
    DIYA_SITE_URL: 'https://diya13.ai/',
    DIYA_WAITLIST_SECRET: 'x'.repeat(64),
    // Just after launch (honoured outside Vercel production).
    DIYA_NOW: '2026-11-07T00:00:01-08:00',
  }
  const beforeLaunch = '2026-11-06T23:59:59-08:00'

  beforeEach(() => setWaitlistDeps(undefined))

  it('closes the list in production when any variable is missing', () => {
    expect(waitlistDeps({ NODE_ENV: 'production' })).toBeNull()
    expect(waitlistDeps({ ...full, POSTMARK_STREAM: ' ', NODE_ENV: 'production' })).toBeNull()
    expect(missingEnv({ ...full, POSTMARK_STREAM: undefined })).toEqual(['POSTMARK_STREAM'])
  })

  it('uses Neon and Postmark when everything is set', () => {
    const live = waitlistDeps({ ...full, NODE_ENV: 'production' })!
    expect(live.store).toBeInstanceOf(NeonWaitlistStore)
    expect(live.sender).toBeInstanceOf(PostmarkSender)
    expect(live.siteUrl).toBe('https://diya13.ai')
  })

  it('replies go to DIYA’s public alias unless DIYA_WAITLIST_REPLY_TO says otherwise', () => {
    const config = (deps: ReturnType<typeof waitlistDeps>) => (deps!.sender as unknown as { config: { from: string; replyTo: string } }).config
    const plain = config(waitlistDeps({ ...full, DIYA_WAITLIST_FROM: 'Someone <someone@example.com>', NODE_ENV: 'production' }))
    expect(plain).toMatchObject({ from: 'Someone <someone@example.com>', replyTo: 'Vishal <diya@idyeah.studio>' })
    const custom = config(waitlistDeps({ ...full, DIYA_WAITLIST_REPLY_TO: 'Help <help@example.com>', NODE_ENV: 'production' }))
    expect(custom.replyTo).toBe('Help <help@example.com>')
  })

  it('sends our copies to DIYA’s public alias unless DIYA_WAITLIST_COPY_TO says otherwise', () => {
    expect(waitlistDeps({ ...full, NODE_ENV: 'production' })!.copyTo).toBe('diya@idyeah.studio')
    expect(waitlistDeps({ ...full, DIYA_WAITLIST_COPY_TO: ' Me <me@example.com> ', NODE_ENV: 'production' })!.copyTo).toBe('Me <me@example.com>')
  })

  it('falls back to the in-memory list and a logging sender in development', () => {
    const local = waitlistDeps({ NODE_ENV: 'development', DIYA_NOW: full.DIYA_NOW })!
    expect(local.store).toBeInstanceOf(MemoryWaitlistStore)
    expect(local.sender).toBeInstanceOf(FakeSender)
  })

  it('stays closed before launch, even with every credential set, unless the catalog preview flag is on', () => {
    expect(waitlistIsOpen({ DIYA_NOW: beforeLaunch })).toBe(false)
    expect(waitlistDeps({ ...full, DIYA_NOW: beforeLaunch, NODE_ENV: 'production' })).toBeNull()
    expect(waitlistDeps({ NODE_ENV: 'development', DIYA_NOW: beforeLaunch })).toBeNull()
    // Vercel production ignores DIYA_NOW and uses the real clock, which is before launch today.
    expect(waitlistIsOpen({ VERCEL_ENV: 'production', DIYA_NOW: full.DIYA_NOW })).toBe(isLaunched(Date.now()))
    expect(waitlistDeps({ ...full, DIYA_NOW: beforeLaunch, DIYA_CATALOG_PREVIEW: '1', NODE_ENV: 'production' })).not.toBeNull()
  })

  it('the privacy page and the consent version name the same date, and the public contact is the alias', () => {
    expect(new Date(`${PRIVACY_UPDATED} 12:00 UTC`).toISOString().slice(0, 10)).toBe(CONSENT_VERSION)
    expect(CONTACT_EMAIL).toBe('diya@idyeah.studio')
    for (const file of ['../../app/privacy/page.tsx', '../../app/waitlist/unsubscribe/page.tsx']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).toContain('mailto:${CONTACT_EMAIL}')
      expect(source).not.toMatch(/vishal@/i)
    }
    expect(readFileSync(new URL('../../app/privacy/page.tsx', import.meta.url), 'utf8')).toContain('Last updated {PRIVACY_UPDATED}')
  })

  it('every /waitlist page refuses to render before launch', () => {
    for (const page of ['confirm', 'confirmed', 'unsubscribe']) {
      const source = readFileSync(new URL(`../../app/waitlist/${page}/page.tsx`, import.meta.url), 'utf8')
      expect(source).toMatch(/if \(!waitlistIsOpen\(\)\) notFound\(\)/)
      expect(source).toMatch(/index: false/)
      expect(source).toContain("referrer: 'no-referrer'")
    }
  })

  it('never opens a connection until a query runs', () => {
    expect(() => neonRunner(full.DIYA_DATABASE_URL)).not.toThrow()
  })
})

describe('The confirmed page’s status', () => {
  const at = Date.parse('2026-11-08T10:00:00Z')
  const signed = (status: string, secret = 's', when = at) => {
    const url = new URL('https://x' + confirmedPath({ ...deps, secret, now: () => new Date(when) }, status))
    return Object.fromEntries(url.searchParams)
  }

  it('believes "founding" and "listed" only with the server’s signature', () => {
    expect(readConfirmedStatus(signed('founding'), 's', at + 60_000)).toBe('founding')
    expect(readConfirmedStatus(signed('listed'), 's', at + 60_000)).toBe('listed')
    expect(readConfirmedStatus({ s: 'founding' }, 's', at)).toBe('invalid')
    expect(readConfirmedStatus({ ...signed('listed'), s: 'founding' }, 's', at)).toBe('invalid')
    expect(readConfirmedStatus({ ...signed('founding'), t: String(at + 1) }, 's', at + 5)).toBe('invalid')
    expect(readConfirmedStatus(signed('founding', 'other-secret'), 's', at)).toBe('invalid')
    expect(readConfirmedStatus(signed('founding'), null, at)).toBe('error')
  })

  it('lets a signed result age a month, then stops vouching for it', () => {
    expect(readConfirmedStatus(signed('founding'), 's', at + 29 * 24 * 60 * 60_000)).toBe('founding')
    expect(readConfirmedStatus(signed('founding'), 's', at + 31 * 24 * 60 * 60_000)).toBe('invalid')
  })

  it('passes the harmless answers through', () => {
    for (const s of ['expired', 'invalid', 'error'] as const) expect(readConfirmedStatus({ s }, 's', at)).toBe(s)
    expect(readConfirmedStatus({ s: 'whatever' }, 's', at)).toBe('invalid')
  })
})
