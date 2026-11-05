import { describe, expect, it, vi } from 'vitest'
import { FOUNDING_LIMIT, RATE_LIMITS } from './config'
import { emailProblem } from './email-address'
import { MemoryWaitlistStore } from './memory-store'
import { FakeSender } from './sender'
import { confirm, join, parseJoinBody, unsubscribe, type JoinRequest, type WaitlistDeps } from './service'
import { issueFormToken, keyedHash } from './tokens'

const SECRET = 'test-secret'
const T0 = new Date('2026-11-07T08:00:00Z').getTime()
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function setup() {
  let now = T0
  const store = new MemoryWaitlistStore()
  const sender = new FakeSender()
  const deps: WaitlistDeps = { store, sender, secret: SECRET, siteUrl: 'https://diya13.ai', now: () => new Date(now) }
  const tokenFor = (ip: string, issuedAgo = 5000) => issueFormToken(SECRET, keyedHash(SECRET, 'ip', ip), now - issuedAgo)
  /** Joins from `ip` with a token that IP was handed a few seconds ago. */
  const joinAs = (email: string, extra: Partial<JoinRequest> = {}, ip = '1.1.1.1') =>
    join(deps, { email, choice: null, otherText: null, source: 'landing', website: '', formToken: tokenFor(ip), ...extra }, ip)
  return {
    store,
    sender,
    deps,
    tokenFor,
    joinAs,
    advance: (ms: number) => {
      now += ms
    },
  }
}

const tokenFrom = (text: string, path: string) => decodeURIComponent(new RegExp(`${path}\\?token=([^\\s"&]+)`).exec(text)![1])

describe('Joining the waitlist', () => {
  it('stores the lowercased address with its pick and source and sends one confirmation email', async () => {
    const t = setup()
    expect(await t.joinAs('Maya@Studio.co', { choice: 'other', otherText: 'Billing screen', source: 'catalog' })).toEqual({ kind: 'accepted' })
    expect(t.store.byEmail('maya@studio.co')).toMatchObject({ choice: 'other', otherText: 'Billing screen', source: 'catalog', confirmedAt: null })
    expect(t.sender.sent).toHaveLength(1)
    const [email] = t.sender.sent
    expect(email.to).toBe('maya@studio.co')
    expect(email.text).toContain('https://diya13.ai/waitlist/confirm?token=')
    // The free-text answer is never echoed into an email.
    expect(email.text + email.html).not.toContain('Billing screen')
  })

  it('keeps no raw IP address or email in rate-limit records, and only token hashes', async () => {
    const t = setup()
    await t.joinAs('maya@studio.co', {}, '203.0.113.9')
    const keys = t.store.attempts.map((a) => a.keyHash).join(' ')
    expect(keys).not.toContain('203.0.113.9')
    expect(keys).not.toContain('maya')
    expect(t.store.tokens.has(tokenFrom(t.sender.sent[0].text, '/waitlist/confirm'))).toBe(false)
    expect([...t.store.tokens.keys()].every((hash) => /^[0-9a-f]{64}$/.test(hash))).toBe(true)
  })

  it('a repeat inside the day answers the same and changes nothing: no email, no new pick, no used-up slot', async () => {
    const t = setup()
    await t.joinAs('maya@studio.co', { choice: 'dashboard' })
    const before = { ...t.store.byEmail('maya@studio.co')! }
    t.advance(MINUTE)
    expect(await t.joinAs('maya@studio.co', { choice: 'settings' }, '9.9.9.9')).toEqual({ kind: 'accepted' })
    expect(t.sender.sent).toHaveLength(1)
    expect(t.store.byEmail('maya@studio.co')).toEqual(before)
  })

  it('a stranger cannot rewrite or lock out someone else’s address', async () => {
    const t = setup()
    await t.joinAs('maya@studio.co', { choice: 'dashboard' })
    t.advance(MINUTE)
    // Many tries at Maya's address from elsewhere, all inside her 24 hours.
    for (let i = 0; i < 10; i++) await t.joinAs('maya@studio.co', { choice: 'landing' }, `5.5.5.${i}`)
    expect(t.store.byEmail('maya@studio.co')!.choice).toBe('dashboard')
    t.advance(DAY)
    // Her own retry the next day still goes through: the attempts never spent her per-address allowance.
    expect(await t.joinAs('maya@studio.co', { choice: 'settings' })).toEqual({ kind: 'accepted' })
    expect(t.sender.sent).toHaveLength(2)
    expect(t.store.byEmail('maya@studio.co')!.choice).toBe('settings')
  })

  it('resends the confirmation after a day if the address still has not confirmed, and the new pick wins then', async () => {
    const t = setup()
    await t.joinAs('maya@studio.co', { choice: 'dashboard' })
    t.advance(DAY + MINUTE)
    await t.joinAs('maya@studio.co', { choice: 'landing' })
    expect(t.sender.sent.map((m) => m.tag)).toEqual(['waitlist-confirm', 'waitlist-confirm'])
    expect(t.sender.sent[1].text).toContain('You picked Landing')
    expect(t.store.byEmail('maya@studio.co')!.choice).toBe('landing')
  })

  it('sends a confirmed address an "already on the list" email, at most once a day', async () => {
    const t = setup()
    await t.joinAs('maya@studio.co')
    await confirm(t.deps, tokenFrom(t.sender.sent[0].text, '/waitlist/confirm'))
    t.advance(DAY + MINUTE)
    await t.joinAs('maya@studio.co', { choice: 'landing' })
    await t.joinAs('maya@studio.co')
    expect(t.sender.sent.map((m) => m.tag)).toEqual(['waitlist-confirm', 'waitlist-welcome', 'waitlist-already'])
    expect(t.sender.sent[2].text).toContain('I’ve noted Landing')
  })

  it('every email carries one-click unsubscribe headers and a privacy link, and no postal address by default', async () => {
    vi.stubEnv('DIYA_POSTAL_ADDRESS', 'PO Box 100, Springfield, ST 00000')
    const t = setup()
    await t.joinAs('maya@studio.co')
    const [email] = t.sender.sent
    const header = Object.fromEntries(email.headers.map((h) => [h.name, h.value]))
    expect(header['List-Unsubscribe']).toMatch(/^<https:\/\/diya13\.ai\/api\/waitlist\/unsubscribe\?token=[^>]+>, <mailto:diya@idyeah\.studio/)
    expect(header['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    for (const body of [email.text, email.html]) {
      expect(body).not.toContain('PO Box 100')
      expect(body).toContain('https://diya13.ai/privacy')
      expect(body).toContain('https://diya13.ai/waitlist/unsubscribe?token=')
    }
    vi.unstubAllEnvs()
  })
})

describe('People who left', () => {
  it('are never emailed again by a new join, confirmed or not, and nothing about them changes', async () => {
    for (const confirmFirst of [true, false]) {
      const t = setup()
      await t.joinAs('maya@studio.co', { choice: 'dashboard' })
      if (confirmFirst) await confirm(t.deps, tokenFrom(t.sender.sent[0].text, '/waitlist/confirm'))
      expect(await unsubscribe(t.deps, tokenFrom(t.sender.sent[0].text, '/waitlist/unsubscribe'))).toBe(true)
      const left = { ...t.store.byEmail('maya@studio.co')! }
      for (const gap of [MINUTE, 2 * DAY, 40 * DAY]) {
        t.advance(gap)
        expect(await t.joinAs('maya@studio.co', { choice: 'landing' })).toEqual({ kind: 'accepted' })
      }
      // The confirmation, and the welcome if they confirmed: nothing after leaving.
      expect(t.sender.sent).toHaveLength(confirmFirst ? 2 : 1)
      expect(t.store.byEmail('maya@studio.co')).toEqual(left)
    }
  })
})

describe('Bots and form tokens', () => {
  it('a filled honeypot gets an ordinary success, and nothing is stored or sent', async () => {
    const t = setup()
    expect(await t.joinAs('bot@spam.io', { website: 'https://spam.io' })).toEqual({ kind: 'accepted' })
    expect(await t.joinAs('bot2@spam.io', { website: 'x', formToken: null })).toEqual({ kind: 'accepted' })
    expect(t.store.signups.size + t.store.attempts.length + t.sender.sent.length).toBe(0)
  })

  it('a form filled faster than a person could gets an ordinary success, and nothing is stored', async () => {
    const t = setup()
    expect(await t.joinAs('fast@x.dev', { formToken: t.tokenFor('1.1.1.1', 300) })).toEqual({ kind: 'accepted' })
    expect(t.store.signups.size).toBe(0)
  })

  it('requires a token issued to the same IP; a missing, forged or borrowed one asks the form for a fresh one', async () => {
    const t = setup()
    expect(await t.joinAs('a@x.dev', { formToken: null })).toEqual({ kind: 'token' })
    expect(await t.joinAs('a@x.dev', { formToken: `${T0 - 9000}.deadbeefdeadbeefdeadbeefdeadbeef` })).toEqual({ kind: 'token' })
    expect(await t.joinAs('a@x.dev', { formToken: t.tokenFor('2.2.2.2') }, '1.1.1.1')).toEqual({ kind: 'token' })
    expect(t.store.signups.size).toBe(0)
  })

  it('a correctly signed token from a tab left open for days still counts as a person', async () => {
    // Before this fix, a token older than 24 hours was treated as a bot: success shown, nothing stored.
    const t = setup()
    expect(await t.joinAs('slow@x.dev', { formToken: t.tokenFor('1.1.1.1', 3 * DAY) })).toEqual({ kind: 'accepted' })
    expect(t.store.byEmail('slow@x.dev')).toBeDefined()
    expect(t.sender.sent).toHaveLength(1)
  })

  it('ignores any client-supplied fill time', () => {
    expect(parseJoinBody({ email: 'a@x.dev', source: 'landing', elapsedMs: 99999 })).not.toHaveProperty('elapsedMs')
  })
})

describe('Rate limits and the send cap', () => {
  it('limits attempts per IP over the window, then lets them through again', async () => {
    const t = setup()
    for (let i = 0; i < RATE_LIMITS.ip.max; i++) expect((await t.joinAs(`p${i}@x.dev`, {}, '5.5.5.5')).kind).toBe('accepted')
    expect(await t.joinAs('one-more@x.dev', {}, '5.5.5.5')).toEqual({ kind: 'rate_limited', retryAfterSeconds: 600 })
    expect((await t.joinAs('elsewhere@x.dev', {}, '6.6.6.6')).kind).toBe('accepted')
    t.advance(RATE_LIMITS.ip.windowMs + MINUTE)
    expect((await t.joinAs('later@x.dev', {}, '5.5.5.5')).kind).toBe('accepted')
  })

  it('counts the per-address limit only when an email is due', async () => {
    const t = setup()
    await t.joinAs('same@x.dev')
    for (let i = 0; i < 10; i++) await t.joinAs('same@x.dev', {}, `7.7.7.${i}`)
    const emailKey = keyedHash(SECRET, 'email', 'same@x.dev')
    expect(t.store.attempts.filter((a) => a.keyHash === emailKey)).toHaveLength(1)
  })

  it('stops sending at the list-wide cap with a "busy" answer, whatever the address variant, and resumes after the hour', async () => {
    const t = setup()
    const variants = Array.from({ length: RATE_LIMITS.send.max }, (_, i) => `maya+${i}@gmail.com`)
    for (const [i, address] of variants.entries()) {
      expect((await t.joinAs(address, {}, `10.0.${Math.floor(i / 8)}.${i % 8}`)).kind).toBe('accepted')
    }
    expect(t.sender.sent).toHaveLength(RATE_LIMITS.send.max)
    expect(await t.joinAs('m.a.y.a@gmail.com', {}, '11.0.0.1')).toEqual({ kind: 'busy', retryAfterSeconds: 300 })
    expect(t.store.byEmail('m.a.y.a@gmail.com')).toBeUndefined()
    t.advance(RATE_LIMITS.send.windowMs + MINUTE)
    expect((await t.joinAs('m.a.y.a@gmail.com', {}, '11.0.0.1')).kind).toBe('accepted')
    // Dots and +tags are kept as typed: distinct addresses, not folded together.
    expect(t.store.byEmail('m.a.y.a@gmail.com')).toBeDefined()
  })
})

describe('Double opt-in and the first 200', () => {
  it('only confirmed addresses count, and founding goes by confirmation order', async () => {
    const t = setup()
    const links: string[] = []
    for (let i = 0; i <= FOUNDING_LIMIT; i++) {
      await t.joinAs(`person${i}@x.dev`, {}, `10.0.${Math.floor(i / 5)}.${i % 5}`)
      links.push(tokenFrom(t.sender.sent[i].text, '/waitlist/confirm'))
      t.advance(RATE_LIMITS.send.windowMs / RATE_LIMITS.send.max + 1000)
    }
    expect([...t.store.signups.values()].filter((s) => s.founding)).toHaveLength(0)
    const results = []
    for (const link of [...links].reverse()) results.push(await confirm(t.deps, link))
    expect(results.slice(0, FOUNDING_LIMIT).every((r) => r.status === 'confirmed' && r.founding)).toBe(true)
    expect(results[FOUNDING_LIMIT]).toEqual({ status: 'confirmed', founding: false, already: false })
    expect(t.store.byEmail('person0@x.dev')!.founding).toBe(false)
  })

  it('a confirm link works once, then reports the same status; it expires after seven days', async () => {
    const t = setup()
    await t.joinAs('a@x.dev')
    const link = tokenFrom(t.sender.sent[0].text, '/waitlist/confirm')
    expect(await confirm(t.deps, link)).toEqual({ status: 'confirmed', founding: true, already: false })
    expect(await confirm(t.deps, link)).toEqual({ status: 'confirmed', founding: true, already: true })
    expect(await confirm(t.deps, 'made-up')).toEqual({ status: 'invalid' })
    expect(await confirm(t.deps, '')).toEqual({ status: 'invalid' })
    await t.joinAs('b@x.dev', {}, '1.1.1.2')
    t.advance(8 * DAY)
    const toB = t.sender.sent.find((m) => m.to === 'b@x.dev')!
    expect(await confirm(t.deps, tokenFrom(toB.text, '/waitlist/confirm'))).toEqual({ status: 'expired' })
  })
})

describe('The welcome', () => {
  const confirmLink = (t: ReturnType<typeof setup>, to: string) =>
    tokenFrom(t.sender.sent.find((m) => m.to === to && m.tag === 'waitlist-confirm')!.text, '/waitlist/confirm')

  it('goes once, after the first confirmation, as the record of founding status', async () => {
    const t = setup()
    await t.joinAs('a@x.dev')
    const link = confirmLink(t, 'a@x.dev')
    await confirm(t.deps, link)
    await confirm(t.deps, link)
    const welcomes = t.sender.sent.filter((m) => m.tag === 'waitlist-welcome')
    expect(welcomes).toHaveLength(1)
    expect(welcomes[0]).toMatchObject({ to: 'a@x.dev', subject: 'You’re in: a founding spot on the Relight list' })
    expect(welcomes[0].text).toContain('Keep this email. It’s your record of it.')
  })

  it('tells the first person past the founding limit that the spots are taken', async () => {
    const t = setup()
    const joined = new Date(T0)
    for (let i = 0; i < FOUNDING_LIMIT; i++) {
      t.store.signups.set(`f${i}`, {
        id: `f${i}`, email: `f${i}@x.dev`, choice: null, otherText: null, source: 'landing', consentVersion: 'x',
        founding: true, createdAt: joined, updatedAt: joined, confirmedAt: joined, unsubscribedAt: null, lastEmailAt: joined,
      })
    }
    await t.joinAs('late@x.dev')
    await confirm(t.deps, confirmLink(t, 'late@x.dev'))
    const welcome = t.sender.sent.find((m) => m.tag === 'waitlist-welcome')!
    expect(welcome.subject).toBe('You’re in: you’re on the Relight list')
    expect(welcome.text).toContain('The 200 founding spots are taken')
    expect(welcome.text).not.toContain('Keep this email')
  })

  it('carries its own way off the list, and a failed send never undoes the confirmation or logs the address', async () => {
    const t = setup()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await t.joinAs('a@x.dev')
    t.sender.failNext = true
    expect(await confirm(t.deps, confirmLink(t, 'a@x.dev'))).toEqual({ status: 'confirmed', founding: true, already: false })
    expect(t.store.byEmail('a@x.dev')!.confirmedAt).not.toBeNull()
    expect(JSON.stringify(log.mock.calls)).not.toContain('a@x.dev')
    log.mockRestore()

    await t.joinAs('b@x.dev', {}, '1.1.1.2')
    await confirm(t.deps, confirmLink(t, 'b@x.dev'))
    const welcome = t.sender.sent.find((m) => m.tag === 'waitlist-welcome')!
    expect(welcome.to).toBe('b@x.dev')
    expect(await unsubscribe(t.deps, tokenFrom(welcome.text, '/waitlist/unsubscribe'))).toBe(true)
    expect(t.store.byEmail('b@x.dev')!.unsubscribedAt).not.toBeNull()
  })
})

describe('Failures and clean-up', () => {
  it('a failed send reports failure, frees the day’s email so a retry sends, and never logs the address', async () => {
    const t = setup()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    t.sender.failNext = true
    expect(await t.joinAs('a@x.dev')).toEqual({ kind: 'failed' })
    expect(JSON.stringify(log.mock.calls)).not.toContain('a@x.dev')
    expect(await t.joinAs('a@x.dev')).toEqual({ kind: 'accepted' })
    expect(t.sender.sent).toHaveLength(1)
  })

  it('deletes addresses that never confirmed 30 days after their last email, on the next request', async () => {
    const t = setup()
    await t.joinAs('ghost@x.dev')
    t.advance(31 * DAY)
    await t.joinAs('next@x.dev', {}, '1.1.1.2')
    expect(t.store.byEmail('ghost@x.dev')).toBeUndefined()
  })
})

describe('Email addresses', () => {
  it('accepts plain addresses, including +tags and dots', () => {
    for (const ok of ['maya@studio.co', 'm.a.y.a+diya@gmail.com', "o'neil@x.dev", 'a_b-c@sub.example.io', 'x@xn--bcher-kva.example'])
      expect(emailProblem(ok)).toBeNull()
  })
  it('rejects quoting, comments, brackets, IP literals and other odd shapes', () => {
    for (const bad of [
      '"maya"@studio.co',
      'maya(comment)@studio.co',
      'maya@[127.0.0.1]',
      'maya<x>@studio.co',
      'ma,ya@studio.co',
      'ma;ya@studio.co',
      'ma:ya@studio.co',
      'ma\\ya@studio.co',
      'maya@studio',
      'maya@studio.c0',
      'maya@-studio.co',
      '.maya@studio.co',
      'maya.@studio.co',
      'ma..ya@studio.co',
      'maya@@studio.co',
      'måya@studio.co',
      `${'a'.repeat(65)}@studio.co`,
    ])
      expect(emailProblem(bad)).toBe('malformed')
  })
})

describe('Parsing the request body', () => {
  const ok = { email: ' Maya@Studio.co ', source: 'landing', formToken: 't' }
  it('normalizes the address and keeps only a known pick', () => {
    expect(parseJoinBody(ok)).toMatchObject({ email: 'maya@studio.co', choice: null, source: 'landing', formToken: 't' })
    expect(parseJoinBody({ ...ok, choice: 'other', other: '  Billing\nscreen ' })).toMatchObject({ choice: 'other', otherText: 'Billing screen' })
    expect(parseJoinBody({ ...ok, choice: 'dashboard', other: 'ignored' })).toMatchObject({ otherText: null })
  })
  it('names the field that is wrong', () => {
    expect(parseJoinBody({ ...ok, email: '' })).toEqual({ invalid: { kind: 'invalid', field: 'email' } })
    expect(parseJoinBody({ ...ok, email: '"maya"@studio.co' })).toEqual({ invalid: { kind: 'invalid', field: 'email' } })
    expect(parseJoinBody({ ...ok, choice: 'cloning' })).toEqual({ invalid: { kind: 'invalid', field: 'choice' } })
    expect(parseJoinBody({ ...ok, choice: 'other', other: 'x'.repeat(81) })).toEqual({ invalid: { kind: 'invalid', field: 'other' } })
    expect(parseJoinBody({ ...ok, source: 'elsewhere' })).toEqual({ invalid: { kind: 'invalid', field: 'source' } })
    expect(parseJoinBody(null)).toEqual({ invalid: { kind: 'invalid', field: 'email' } })
  })
})
