import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it, vi } from 'vitest'
import type { SqlRunner } from '../waitlist/neon-store'
import { REPLIED_RETENTION_MS, UNANSWERED_RETENTION_MS } from './config'
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

/** Marks a request answered or closed, the way the manual queries in db/ENV.md do. */
type Mark = (store: ScreenRequestStore, id: string, how: { repliedAt?: Date; closed?: boolean }) => Promise<void>

const stores: [string, () => Promise<{ store: ScreenRequestStore; mark: Mark; ids: () => Promise<string[]> }>][] = [
  [
    'memory',
    async () => {
      const store = new MemoryScreenRequestStore()
      return {
        store,
        mark: async (_, id, how) => {
          if (how.repliedAt) store.reply(id, how.repliedAt)
          if (how.closed) store.close(id)
        },
        ids: async () => [...store.requests.keys()],
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
        },
        ids: async () => (await pg.query<{ id: string }>(`select id::text from diya_screen_requests order by id`)).rows.map((r) => r.id),
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
    const rule = {
      repliedBefore: new Date(now.getTime() - REPLIED_RETENTION_MS),
      unansweredBefore: new Date(now.getTime() - UNANSWERED_RETENTION_MS),
    }
    await store.insert(input(), at(400 - 366))
    const unansweredRecent = await store.insert(input(), at(400 - 364))
    const repliedOld = await store.insert(input(), at(0))
    await mark(store, repliedOld.id, { repliedAt: at(400 - 91) })
    const repliedRecent = await store.insert(input(), at(0))
    await mark(store, repliedRecent.id, { repliedAt: at(400 - 89) })
    const closed = await store.insert(input(), at(399))
    await mark(store, closed.id, { closed: true })

    expect(await store.purge(rule)).toBe(3)
    expect(await ids()).toEqual([unansweredRecent.id, repliedRecent.id])
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
    await expect(insert('email, request_text', `'maya@studio.co', '${'x'.repeat(20)}'`)).resolves.toBeTruthy()
  })
})
