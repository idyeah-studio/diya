import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  componentLog,
  COMPONENTS_PER_REQUEST,
  isKnownComponent,
  MemoryComponentLog,
  NeonComponentLog,
  recordComponents,
  setComponentLog,
} from './component-log'
import { RETENTION_DAYS } from './query-log'

// PGlite boots Postgres from WebAssembly; a cold boot on a shared CI runner can pass 5s.
vi.setConfig({ testTimeout: 30_000 })

const waitlist = readFileSync(new URL('../../db/001_waitlist.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../db/004_mcp_components.sql', import.meta.url), 'utf8')
const DAY = new Date('2026-11-10T08:00:00Z')

afterEach(() => setComponentLog(undefined))

describe('what gets counted', () => {
  it('only ids from DIYA’s catalog, never the words an agent sent', () => {
    expect(isKnownComponent('switch')).toBe(true)
    expect(isKnownComponent('date-picker')).toBe(true)
    for (const other of ['Switch', 'toggle', 'my secret app', 'vishal@example.com', '', 'switch '])
      expect(isKnownComponent(other), other).toBe(false)
  })

  it('records at most ten from one request, drops unknown ids, and never throws', async () => {
    const log = new MemoryComponentLog()
    await recordComponents(log, ['switch', 'Switch', 'not-a-component', ...Array.from({ length: 20 }, () => 'button')], DAY)
    expect([...log.counts.values()].map(({ component, count }) => [component, count])).toEqual([
      ['switch', 1],
      ['button', COMPONENTS_PER_REQUEST - 1],
    ])
    const failing = { record: async () => Promise.reject(new Error('down')) }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(recordComponents(failing, ['switch'], DAY)).resolves.toBeUndefined()
    quiet.mockRestore()
    await expect(recordComponents(null, ['switch'])).resolves.toBeUndefined()
  })
})

describe('where counts go', () => {
  it('writes only from Vercel production with a database; previews and local runs never write', () => {
    expect(componentLog({ VERCEL_ENV: 'production', DIYA_DATABASE_URL: 'postgres://user:pass@example.neon.tech/diya' })).toBeInstanceOf(NeonComponentLog)
    expect(componentLog({ VERCEL_ENV: 'preview', DIYA_DATABASE_URL: 'postgres://user:pass@example.neon.tech/diya' })).toBeNull()
    expect(componentLog({ VERCEL_ENV: 'production' })).toBeNull()
    const log = new MemoryComponentLog()
    setComponentLog(log)
    expect(componentLog({})).toBe(log)
  })

  it('the Neon SQL counts by day on a real Postgres, prunes after a year, and leaves the waitlist alone', async () => {
    const pg = new PGlite()
    await pg.exec(waitlist)
    await pg.exec(migration)
    // Safe to run twice.
    await pg.exec(migration)
    await pg.query(`insert into diya_waitlist (email, source, consent_version, created_at, updated_at) values ('a@example.com', 'landing', 'x', now(), now())`)
    const log = new NeonComponentLog({ query: async (text, params) => (await pg.query(text, params as unknown[])).rows })
    const yearAgo = new Date(DAY.getTime() - (RETENTION_DAYS + 1) * 86_400_000)
    await log.record(['card'], yearAgo)
    await log.record(['switch', 'date-picker'], DAY)
    await log.record(['switch'], new Date(DAY.getTime() + 3_600_000))
    const rows = (await pg.query<{ day: Date; component: string; count: number }>(`select * from diya_mcp_components order by component`)).rows
    expect(rows.map(({ day, component, count }) => [day.toISOString().slice(0, 10), component, count])).toEqual([
      ['2026-11-10', 'date-picker', 1],
      ['2026-11-10', 'switch', 2],
    ])
    // The table holds nothing else: no address, client or time of day.
    const columns = (await pg.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'diya_mcp_components' order by ordinal_position`)).rows
    expect(columns.map((c) => c.column_name)).toEqual(['day', 'component', 'count'])
    expect((await pg.query<{ n: number }>(`select count(*)::int as n from diya_waitlist`)).rows[0].n).toBe(1)
    // Even a direct insert can't store words: only an id's shape fits.
    for (const words of ['my secret app', 'Switch', 'x'.repeat(81)])
      await expect(pg.query(`insert into diya_mcp_components (day, component) values ('2026-11-10', $1)`, [words]), words).rejects.toThrow()
    await pg.close()
  })
})
