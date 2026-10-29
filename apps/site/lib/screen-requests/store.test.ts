import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it, vi } from 'vitest'
import type { SqlRunner } from '../waitlist/neon-store'
import { READY_RETENTION_MS, REPLIED_RETENTION_MS, UNANSWERED_RETENTION_MS } from './config'
import { MemoryScreenRequestStore } from './memory-store'
import { NeonScreenRequestStore } from './neon-store'
import type { ScreenRequestInput, ScreenRequestStore } from './store'

// Each PGlite store boots Postgres from WebAssembly; a cold boot on a shared CI runner can pass 5s.
vi.setConfig({ testTimeout: 30_000 })

const waitlist = readFileSync(new URL('../../db/001_waitlist.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../db/003_screen_requests.sql', import.meta.url), 'utf8')

async function pglite() {
  const pg = new PGlite()
  await pg.exec(waitlist)
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
  return { pg, store: new NeonScreenRequestStore(runner) }
}

const DAY = 24 * 60 * 60 * 1000
const T0 = new Date('2026-11-08T12:00:00Z')
const at = (days: number) => new Date(T0.getTime() + days * DAY)
const WEBP = Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8 '), 1, 2, 3])

const ruleAt = (now: Date) => ({
  repliedBefore: new Date(now.getTime() - REPLIED_RETENTION_MS),
  unansweredBefore: new Date(now.getTime() - UNANSWERED_RETENTION_MS),
  readySince: new Date(now.getTime() - READY_RETENTION_MS),
})

const input = (extra: Partial<ScreenRequestInput> = {}): ScreenRequestInput => ({
  email: 'maya@studio.co',
  text: 'A support queue where each priority has its own column.',
  posterId: null,
  notifyWhenReady: false,
  consentVersion: '2026-11-07',
  image: null,
  ipHash: 'a'.repeat(64),
  ...extra,
})

/** Marks a request answered, closed or shipped, the way the manual queries in db/ENV.md do. */
type Mark = (store: ScreenRequestStore, id: string, how: { repliedAt?: Date; closed?: boolean; shippedAt?: Date }) => Promise<void>
/** What a row still holds, for checking what the clean-up trimmed. */
type Kept = { id: string; email: string; text: string | null; image: boolean; ipHash: string | null; posterId: string | null; consentVersion: string; createdAt: number; repliedAt: number | null }

const stores: [string, () => Promise<{ store: ScreenRequestStore; mark: Mark; ids: () => Promise<string[]>; rows: () => Promise<Kept[]> }>][] = [
  [
    'memory',
    async () => {
      const store = new MemoryScreenRequestStore()
      return {
        store,
        mark: async (_, id, how) => {
          if (how.repliedAt) store.reply(id, how.repliedAt)
          if (how.closed) store.close(id)
          if (how.shippedAt) store.ship(id, how.shippedAt)
        },
        ids: async () => [...store.requests.keys()],
        rows: async () =>
          [...store.requests.values()].map((r) => ({
            id: r.id,
            email: r.email,
            text: r.text,
            image: !!r.image,
            ipHash: r.ipHash,
            posterId: r.posterId,
            consentVersion: r.consentVersion,
            createdAt: r.createdAt.getTime(),
            repliedAt: r.repliedAt?.getTime() ?? null,
          })),
      }
    },
  ],
  [
    'neon SQL on PGlite',
    async () => {
      const { pg, store } = await pglite()
      return {
        store,
        mark: async (_, id, how) => {
          if (how.repliedAt) await pg.query(`update diya_screen_requests set status = 'replied', replied_at = $2 where id = $1`, [id, how.repliedAt])
          if (how.closed) await pg.query(`update diya_screen_requests set status = 'closed' where id = $1`, [id])
          if (how.shippedAt) await pg.query(`update diya_screen_requests set shipped_at = $2 where id = $1`, [id, how.shippedAt])
        },
        ids: async () => (await pg.query<{ id: string }>(`select id::text from diya_screen_requests order by id`)).rows.map((r) => r.id),
        rows: async () =>
          (
            await pg.query<Record<string, unknown>>(
              `select id::text, email, request_text, image is not null as image, ip_hash, poster_id, consent_version, created_at, replied_at from diya_screen_requests order by id`,
            )
          ).rows.map((r) => ({
            id: String(r.id),
            email: String(r.email),
            text: (r.request_text as string | null) ?? null,
            image: r.image === true,
            ipHash: (r.ip_hash as string | null) ?? null,
            posterId: (r.poster_id as string | null) ?? null,
            consentVersion: String(r.consent_version),
            createdAt: new Date(r.created_at as string).getTime(),
            repliedAt: r.replied_at ? new Date(r.replied_at as string).getTime() : null,
          })),
      }
    },
  ],
]

describe.each(stores)('Screen request store contract: %s', (_, make) => {
  it('keeps the request, the picture and its type and size, and starts it as new', async () => {
    const { store } = await make()
    const saved = await store.insert(
      input({ posterId: 'board', notifyWhenReady: true, image: { bytes: WEBP, type: 'image/webp' } }),
      at(0),
    )
    expect(saved).toMatchObject({
      email: 'maya@studio.co',
      posterId: 'board',
      notifyWhenReady: true,
      consentVersion: '2026-11-07',
      status: 'new',
      repliedAt: null,
    })
    expect(saved.createdAt.getTime()).toBe(at(0).getTime())
    expect(saved.image?.type).toBe('image/webp')
    expect([...saved.image!.bytes]).toEqual([...WEBP])
    const plain = await store.insert(input(), at(0))
    expect(plain.image).toBeNull()
    expect(plain.id).not.toBe(saved.id)
  })

  it('removes a request it was asked to take back', async () => {
    const { store, ids } = await make()
    const saved = await store.insert(input(), at(0))
    await store.remove(saved.id)
    expect(await ids()).toEqual([])
  })

  it('the clean-up deletes closed requests, replies past 90 days and unanswered ones past 365, and nothing else', async () => {
    const { store, mark, ids } = await make()
    const now = at(400)
    const rule = ruleAt(now)
    await store.insert(input(), at(400 - 366))
    const unansweredRecent = await store.insert(input(), at(400 - 364))
    const repliedOld = await store.insert(input(), at(0))
    await mark(store, repliedOld.id, { repliedAt: at(400 - 91) })
    const repliedRecent = await store.insert(input(), at(0))
    await mark(store, repliedRecent.id, { repliedAt: at(400 - 89) })
    const closed = await store.insert(input(), at(399))
    await mark(store, closed.id, { closed: true })

    expect(await store.purge(rule)).toEqual({ deleted: 3, trimmed: 0 })
    expect(await ids()).toEqual([unansweredRecent.id, repliedRecent.id])
  })

  it('“when it’s ready”: past its time, a request keeps only the email, the poster, the consent version and the dates', async () => {
    const { store, mark, rows } = await make()
    const picture = { bytes: WEBP, type: 'image/webp' as const }
    const replied = await store.insert(input({ notifyWhenReady: true, posterId: 'board', image: picture }), at(0))
    await mark(store, replied.id, { repliedAt: at(1) })
    const unanswered = await store.insert(input({ notifyWhenReady: true, email: 'sam@x.dev' }), at(0))
    const recent = await store.insert(input({ notifyWhenReady: true, email: 'kai@x.dev', image: picture }), at(380))

    expect(await store.purge(ruleAt(at(400)))).toEqual({ deleted: 0, trimmed: 2 })
    const kept = await rows()
    expect(kept.find((r) => r.id === replied.id)).toEqual({
      id: replied.id,
      email: 'maya@studio.co',
      text: null,
      image: false,
      ipHash: null,
      posterId: 'board',
      consentVersion: '2026-11-07',
      createdAt: at(0).getTime(),
      repliedAt: at(1).getTime(),
    })
    expect(kept.find((r) => r.id === unanswered.id)).toMatchObject({ text: null, image: false, ipHash: null, email: 'sam@x.dev' })
    // Still within its own time: untouched.
    expect(kept.find((r) => r.id === recent.id)).toMatchObject({ text: input().text, image: true, ipHash: 'a'.repeat(64) })
    // Running again changes nothing.
    expect(await store.purge(ruleAt(at(400)))).toEqual({ deleted: 0, trimmed: 0 })
  })

  it('“when it’s ready” rows go once the screen ships, or 2 years after the request, whichever comes first', async () => {
    const { store, mark, ids } = await make()
    const shipped = await store.insert(input({ notifyWhenReady: true, posterId: 'board' }), at(0))
    const waiting = await store.insert(input({ notifyWhenReady: true, posterId: 'landing' }), at(0))
    const shippedEarly = await store.insert(input({ notifyWhenReady: true, posterId: 'board' }), at(390))
    await store.purge(ruleAt(at(400)))
    await mark(store, shipped.id, { shippedAt: at(500) })
    await mark(store, shippedEarly.id, { shippedAt: at(500) })

    // Shipped and past its time: deleted. Shipped but still within its time: kept until then, as usual.
    expect(await store.purge(ruleAt(at(501)))).toEqual({ deleted: 1, trimmed: 0 })
    expect(await ids()).toEqual([waiting.id, shippedEarly.id])
    // The one still waiting stays until 2 years after the request, then goes.
    const twoYears = READY_RETENTION_MS / DAY
    expect(await store.purge(ruleAt(at(twoYears - 1)))).toEqual({ deleted: 0, trimmed: 0 })
    expect(await store.purge(ruleAt(at(twoYears + 1)))).toEqual({ deleted: 1, trimmed: 0 })
    expect(await ids()).toEqual([shippedEarly.id])
    // The early one, shipped, goes on its normal schedule: 365 days unanswered.
    expect(await store.purge(ruleAt(at(390 + 366)))).toEqual({ deleted: 1, trimmed: 0 })
    expect(await ids()).toEqual([])
  })

  it('a closed request is deleted, “when it’s ready” or not', async () => {
    const { store, mark, ids } = await make()
    const spam = await store.insert(input({ notifyWhenReady: true }), at(0))
    await mark(store, spam.id, { closed: true })
    expect(await store.purge(ruleAt(at(1)))).toEqual({ deleted: 1, trimmed: 0 })
    expect(await ids()).toEqual([])
  })

  it('counts attempts inside the window only', async () => {
    const { store } = await make()
    const hour = DAY / 24
    expect(await store.countAttempt('k', hour, at(0))).toBe(1)
    expect(await store.countAttempt('k', hour, new Date(at(0).getTime() + hour / 2))).toBe(2)
    expect(await store.countAttempt('k', hour, new Date(at(0).getTime() + hour + 1))).toBe(2)
  })
})

describe('The screen requests table', () => {
  it('refuses rows that break its rules', async () => {
    const { pg } = await pglite()
    const insert = (columns: string, values: string) =>
      pg.query(`insert into diya_screen_requests (created_at, ip_hash, consent_version, ${columns}) values (now(), 'h', 'v', ${values})`)
    await expect(insert('email, request_text', `'Maya@Studio.co', '${'x'.repeat(20)}'`)).rejects.toThrow()
    await expect(insert('email, request_text', `'maya@studio.co', 'too short'`)).rejects.toThrow()
    await expect(insert('email, request_text', `'maya@studio.co', '${'x'.repeat(2001)}'`)).rejects.toThrow()
    await expect(insert('email, request_text, image', `'maya@studio.co', '${'x'.repeat(20)}', '\\x00'`)).rejects.toThrow()
    await expect(insert('email, request_text, image_type', `'maya@studio.co', '${'x'.repeat(20)}', 'image/gif'`)).rejects.toThrow()
    await expect(insert('email, request_text, status', `'maya@studio.co', '${'x'.repeat(20)}', 'replied'`)).rejects.toThrow()
    // Only a "when it's ready" request may lose its words, and then its IP hash goes too.
    await expect(insert('email, request_text', `'maya@studio.co', null`)).rejects.toThrow()
    await expect(insert('email, request_text, notify_when_ready', `'maya@studio.co', null, true`)).rejects.toThrow()
    await expect(
      pg.query(`insert into diya_screen_requests (created_at, consent_version, email, request_text) values (now(), 'v', 'a@x.dev', '${'x'.repeat(20)}')`),
    ).rejects.toThrow()
    await expect(
      pg.query(`insert into diya_screen_requests (created_at, consent_version, email, poster_id, notify_when_ready) values (now(), 'v', 'a@x.dev', 'board', true)`),
    ).resolves.toBeTruthy()
    await expect(insert('email, request_text', `'maya@studio.co', '${'x'.repeat(20)}'`)).resolves.toBeTruthy()
  })
})
