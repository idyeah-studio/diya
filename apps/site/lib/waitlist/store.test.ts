import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it, vi } from 'vitest'
import { MemoryWaitlistStore } from './memory-store'
import { NeonWaitlistStore, type SqlRunner } from './neon-store'
import type { SignupInput, WaitlistStore } from './store'

// Each PGlite store boots Postgres from WebAssembly; a cold boot on a shared CI runner can pass 5s.
vi.setConfig({ testTimeout: 30_000 })

const migration = readFileSync(new URL('../../db/001_waitlist.sql', import.meta.url), 'utf8')

/** The Neon store's SQL, run for real against an in-process Postgres. */
async function pgliteStore() {
  const pg = new PGlite()
  await pg.exec(migration)
  // The migration is safe to run twice.
  await pg.exec(migration)
  const runner: SqlRunner = {
    query: async (text, params) => (await pg.query<Record<string, unknown>>(text, params)).rows,
    transaction: (statements) =>
      pg.transaction(async (tx) => {
        const out: Record<string, unknown>[][] = []
        for (const [text, params] of statements) out.push((await tx.query<Record<string, unknown>>(text, params)).rows)
        return out
      }),
  }
  return { store: new NeonWaitlistStore(runner), pg }
}

const T0 = new Date('2026-11-07T08:00:00Z')
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000)
const input = (email: string, extra: Partial<SignupInput> = {}): SignupInput => ({
  email,
  choice: null,
  otherText: null,
  source: 'landing',
  consentVersion: '2026-11-07',
  ...extra,
})

const stores: [string, () => Promise<WaitlistStore>][] = [
  ['memory', async () => new MemoryWaitlistStore()],
  ['neon SQL on PGlite', async () => (await pgliteStore()).store],
]

describe.each(stores)('Waitlist store contract: %s', (_, make) => {
  it('adds an address once; an existing row comes back untouched until a pick update', async () => {
    const store = await make()
    expect(await store.findByEmail('a@x.dev')).toBeNull()
    const first = await store.insertSignup(input('a@x.dev', { choice: 'dashboard' }), at(0))
    const again = await store.insertSignup(input('a@x.dev', { choice: 'settings', source: 'catalog' }), at(5))
    expect(again).toMatchObject({ id: first.id, choice: 'dashboard', source: 'landing', confirmedAt: null })
    await store.updatePick(first.id, { choice: 'other', otherText: 'Billing', consentVersion: 'v2' }, at(6))
    expect(await store.findByEmail('a@x.dev')).toMatchObject({ choice: 'other', otherText: 'Billing', consentVersion: 'v2', source: 'landing' })
    await store.updatePick(first.id, { choice: null, otherText: null, consentVersion: 'v3' }, at(7))
    const kept = (await store.findByEmail('a@x.dev'))!
    expect(kept).toMatchObject({ choice: 'other', otherText: 'Billing', consentVersion: 'v3' })
    expect(kept.createdAt.getTime()).toBe(at(0).getTime())
  })

  it('counts attempts inside the window only', async () => {
    const store = await make()
    expect(await store.countAttempt('k', 10 * 60_000, at(0))).toBe(1)
    expect(await store.countAttempt('k', 10 * 60_000, at(1))).toBe(2)
    expect(await store.countAttempt('other', 10 * 60_000, at(1))).toBe(1)
    expect(await store.countAttempt('k', 10 * 60_000, at(9))).toBe(3)
    // At 12 minutes, only the attempts at 9 and 12 are inside the window.
    expect(await store.countAttempt('k', 10 * 60_000, at(12))).toBe(2)
  })

  it('allows one email per address per gap, gives the slot back after a failure, and none after leaving', async () => {
    const store = await make()
    const { id } = await store.insertSignup(input('a@x.dev'), at(0))
    const day = 24 * 60 * 60_000
    expect(await store.claimEmailSlot(id, at(0), day)).toBe(true)
    expect(await store.claimEmailSlot(id, at(60), day)).toBe(false)
    await store.releaseEmailSlot(id, at(0))
    expect(await store.claimEmailSlot(id, at(61), day)).toBe(true)
    await store.addToken(id, 'unsubscribe', 'u1', null, at(61))
    await store.unsubscribe('u1', at(62))
    expect(await store.claimEmailSlot(id, at(61 + 2 * 24 * 60), day)).toBe(false)
  })

  it('confirms by token, once, and refuses expired and unknown tokens', async () => {
    const store = await make()
    const { id } = await store.insertSignup(input('a@x.dev'), at(0))
    await store.addToken(id, 'confirm', 'h1', at(60), at(0))
    await store.addToken(id, 'confirm', 'h-old', at(1), at(0))
    await store.addToken(id, 'unsubscribe', 'u1', null, at(0))
    expect(await store.confirm('nope', at(2), 200)).toEqual({ status: 'invalid' })
    expect(await store.confirm('u1', at(2), 200)).toEqual({ status: 'invalid' })
    expect(await store.confirm('h-old', at(2), 200)).toEqual({ status: 'expired' })
    expect(await store.confirm('h1', at(2), 200)).toEqual({ status: 'confirmed', founding: true, already: false })
    expect(await store.confirm('h1', at(3), 200)).toEqual({ status: 'confirmed', founding: true, already: true })
  })

  it('gives founding status by confirmation order, not signup order', async () => {
    const store = await make()
    for (const [i, email] of ['a@x.dev', 'b@x.dev', 'c@x.dev'].entries()) {
      const { id } = await store.insertSignup(input(email), at(i))
      await store.addToken(id, 'confirm', `t-${email}`, at(1000), at(i))
    }
    // c and b confirm first; a, who signed up first, confirms last.
    expect(await store.confirm('t-c@x.dev', at(10), 2)).toMatchObject({ founding: true })
    expect(await store.confirm('t-b@x.dev', at(11), 2)).toMatchObject({ founding: true })
    expect(await store.confirm('t-a@x.dev', at(12), 2)).toMatchObject({ status: 'confirmed', founding: false })
  })

  it('leaving forgets the pick, and no confirm link brings the address back', async () => {
    const store = await make()
    const { id } = await store.insertSignup(input('a@x.dev', { choice: 'other', otherText: 'Billing' }), at(0))
    await store.addToken(id, 'confirm', 'c1', at(1000), at(0))
    await store.addToken(id, 'confirm', 'c2', at(1000), at(0))
    await store.addToken(id, 'unsubscribe', 'u1', null, at(0))
    await store.confirm('c1', at(1), 200)
    expect(await store.unsubscribe('c1', at(2))).toBe(false)
    expect(await store.unsubscribe('u1', at(2))).toBe(true)
    expect(await store.unsubscribe('u1', at(3))).toBe(true)
    const left = (await store.findByEmail('a@x.dev'))!
    expect(left).toMatchObject({ choice: null, otherText: null, founding: true })
    expect(left.unsubscribedAt?.getTime()).toBe(at(2).getTime())
    expect(await store.confirm('c1', at(5), 200)).toEqual({ status: 'invalid' })
    expect(await store.confirm('c2', at(5), 200)).toEqual({ status: 'invalid' })
    expect((await store.findByEmail('a@x.dev'))!.unsubscribedAt).not.toBeNull()
  })

  it('deletes unconfirmed addresses 30 days after their last email, never confirmed ones or people who left', async () => {
    const store = await make()
    const day = 24 * 60
    const stale = await store.insertSignup(input('stale@x.dev'), at(0))
    await store.addToken(stale.id, 'confirm', 's1', at(1000), at(0))
    const emailed = await store.insertSignup(input('emailed@x.dev'), at(0))
    await store.claimEmailSlot(emailed.id, at(20 * day), 60_000)
    const kept = await store.insertSignup(input('kept@x.dev'), at(0))
    await store.addToken(kept.id, 'confirm', 'k1', at(1000), at(0))
    await store.confirm('k1', at(1), 200)
    const left = await store.insertSignup(input('left@x.dev'), at(0))
    await store.addToken(left.id, 'unsubscribe', 'l1', null, at(0))
    await store.unsubscribe('l1', at(1))
    await store.purgeUnconfirmed(at(10 * day))
    expect(await store.findByEmail('stale@x.dev')).toBeNull()
    expect(await store.confirm('s1', at(11), 200)).toEqual({ status: 'invalid' })
    expect(await store.findByEmail('emailed@x.dev')).not.toBeNull()
    expect(await store.findByEmail('kept@x.dev')).not.toBeNull()
    expect(await store.findByEmail('left@x.dev')).not.toBeNull()
  })
})

describe('Waitlist migration', () => {
  it('stores no IP address column and rejects mixed-case email and long other text', async () => {
    const { pg } = await pgliteStore()
    const columns = await pg.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name like 'diya_waitlist%'`,
    )
    expect(columns.rows.map((r) => r.column_name).join(' ')).not.toMatch(/\bip\b|ip_address/)
    const now = new Date()
    await expect(
      pg.query(
        `insert into diya_waitlist (email, source, consent_version, created_at, updated_at) values ('A@x.dev', 'landing', 'v', $1, $1)`,
        [now],
      ),
    ).rejects.toThrow()
    await expect(
      pg.query(
        `insert into diya_waitlist (email, source, consent_version, other_text, created_at, updated_at) values ('a@x.dev', 'landing', 'v', $2, $1, $1)`,
        [now, 'x'.repeat(81)],
      ),
    ).rejects.toThrow()
  })
})
