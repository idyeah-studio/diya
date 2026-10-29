import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MemorySearchLog,
  NeonSearchLog,
  normalizeQuery,
  recordSearches,
  RETENTION_DAYS,
  searchLog,
  SEARCHES_PER_REQUEST,
  setSearchLog,
} from './query-log'

// PGlite boots Postgres from WebAssembly; a cold boot on a shared CI runner can pass 5s.
vi.setConfig({ testTimeout: 30_000 })

const waitlist = readFileSync(new URL('../../db/001_waitlist.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../db/002_mcp_searches.sql', import.meta.url), 'utf8')
const DAY = new Date('2026-11-07T08:00:00Z')

afterEach(() => setSearchLog(undefined))

describe('what gets counted', () => {
  it('keeps the words, tidied, and drops anything that could carry personal details', () => {
    expect(normalizeQuery('  Date   RANGE picker? ')).toBe('date range picker')
    expect(normalizeQuery('Ｔｏｇｇｌｅ')).toBe('toggle')
    for (const risky of [
      'email vishal@example.com',
      'https://acme.dev/settings',
      'like www.acme.io',
      'call 4155550123',
      'invoice 2026-1107 for acme',
      'x'.repeat(81),
      '   ',
      '???',
    ])
      expect(normalizeQuery(risky), risky).toBeNull()
  })

  it('records at most ten searches from one request, and never throws', async () => {
    const log = new MemorySearchLog()
    await recordSearches(log, Array.from({ length: 25 }, (_, i) => ({ query: `table ${'x'.repeat(i % 3)}`.trim(), found: true })), DAY)
    expect([...log.counts.values()].reduce((sum, row) => sum + row.count, 0)).toBe(SEARCHES_PER_REQUEST)
    const failing = { record: async () => Promise.reject(new Error('down')) }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(recordSearches(failing, [{ query: 'secret words', found: true }], DAY)).resolves.toBeUndefined()
    expect(quiet.mock.calls.flat().join(' ')).not.toContain('secret')
    quiet.mockRestore()
    await expect(recordSearches(null, [{ query: 'table', found: true }])).resolves.toBeUndefined()
  })
})

describe('where counts go', () => {
  it('writes only from Vercel production with a database; previews and local runs never write', () => {
    expect(searchLog({ VERCEL_ENV: 'production', DIYA_DATABASE_URL: 'postgres://user:pass@example.neon.tech/diya' })).toBeInstanceOf(NeonSearchLog)
    expect(searchLog({ VERCEL_ENV: 'preview', DIYA_DATABASE_URL: 'postgres://user:pass@example.neon.tech/diya' })).toBeNull()
    expect(searchLog({ VERCEL_ENV: 'production' })).toBeNull()
    expect(searchLog({ DIYA_DATABASE_URL: 'postgres://user:pass@example.neon.tech/diya' })).toBeNull()
    const log = new MemorySearchLog()
    setSearchLog(log)
    expect(searchLog({})).toBe(log)
  })

  it('the Neon SQL counts by day on a real Postgres, prunes after a year, and leaves the waitlist alone', async () => {
    const pg = new PGlite()
    await pg.exec(waitlist)
    await pg.exec(migration)
    // Safe to run twice.
    await pg.exec(migration)
    await pg.query(`insert into diya_waitlist (email, source, consent_version, created_at, updated_at) values ('a@example.com', 'landing', 'x', now(), now())`)
    const log = new NeonSearchLog({ query: async (text, params) => (await pg.query(text, params as unknown[])).rows })
    const yearAgo = new Date(DAY.getTime() - (RETENTION_DAYS + 1) * 86_400_000)
    await log.record([{ query: 'old words', found: true }], yearAgo)
    await log.record([{ query: 'date range', found: true }, { query: 'carousel', found: false }], DAY)
    await log.record([{ query: 'date range', found: true }], new Date(DAY.getTime() + 3_600_000))
    const rows = (await pg.query<{ day: Date; query: string; found: boolean; count: number }>(`select * from diya_mcp_searches order by query`)).rows
    expect(rows.map(({ day, query, found, count }) => [day.toISOString().slice(0, 10), query, found, count])).toEqual([
      ['2026-11-07', 'carousel', false, 1],
      ['2026-11-07', 'date range', true, 2],
    ])
    // The table holds nothing else: no address, client or time of day.
    const columns = (await pg.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'diya_mcp_searches' order by ordinal_position`)).rows
    expect(columns.map((c) => c.column_name)).toEqual(['day', 'query', 'found', 'count'])
    expect((await pg.query<{ n: number }>(`select count(*)::int as n from diya_waitlist`)).rows[0].n).toBe(1)
    await expect(pg.query(`insert into diya_mcp_searches (day, query, found) values ('2026-11-07', $1, true)`, ['x'.repeat(81)])).rejects.toThrow()
    await pg.close()
  })
})
