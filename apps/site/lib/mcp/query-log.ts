import { neonRunner } from '../waitlist/neon-store'

/*
 * What agents search DIYA for, counted by day so we learn what to build next.
 * Only the words, the day, whether DIYA had an answer, and a count: no IP
 * address, no client name, no time of day, nothing that says who asked. The
 * privacy page says exactly this.
 */

export type Search = { query: string; found: boolean }

/** Where the counts live. Neon in production; tests and local runs use their own. */
export interface SearchLog {
  record(searches: Search[], now: Date): Promise<void>
}

export const QUERY_MAX = 80
/** At most this many searches from one request are counted. */
export const SEARCHES_PER_REQUEST = 10
/** Counts older than this are deleted as new ones arrive. */
export const RETENTION_DAYS = 365

/**
 * The words worth counting, or null. Anything that could carry personal
 * details (an @, a link, a long number) or reads like pasted prose is
 * dropped rather than trimmed.
 */
export function normalizeQuery(query: string): string | null {
  const text = query.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!text || text.length > QUERY_MAX) return null
  if (/@|https?:|www\.|\.(com|io|dev|app|net|org)\b|\d{4,}|[/\\]{2}/.test(text)) return null
  return text
}

/** Postgres, through the same driver as the waitlist. Schema: db/002_mcp_searches.sql. */
export class NeonSearchLog implements SearchLog {
  constructor(private readonly db: { query(text: string, params: unknown[]): Promise<unknown[]> }) {}

  async record(searches: Search[], now: Date) {
    const day = now.toISOString().slice(0, 10)
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10)
    for (const { query, found } of searches) {
      await this.db.query(
        `with pruned as (delete from diya_mcp_searches where day < $4::date)
         insert into diya_mcp_searches (day, query, found, count) values ($1::date, $2, $3, 1)
         on conflict (day, query) do update set count = diya_mcp_searches.count + 1, found = excluded.found`,
        [day, query, found, cutoff]
      )
    }
  }
}

/** Keeps counts in memory: tests, and a look at what would be stored. */
export class MemorySearchLog implements SearchLog {
  readonly counts = new Map<string, { day: string; query: string; found: boolean; count: number }>()

  async record(searches: Search[], now: Date) {
    const day = now.toISOString().slice(0, 10)
    for (const { query, found } of searches) {
      const key = `${day}\n${query}`
      const row = this.counts.get(key) ?? { day, query, found, count: 0 }
      this.counts.set(key, { ...row, found, count: row.count + 1 })
    }
  }
}

let override: SearchLog | null | undefined
let live: { url: string; log: SearchLog } | undefined

/** Tests swap in their own log; `null` turns counting off; `undefined` restores the env-driven one. */
export function setSearchLog(log: SearchLog | null | undefined) {
  override = log
}

/**
 * The log for this environment: Neon in Vercel production when
 * DIYA_DATABASE_URL is set, otherwise none. Previews and local runs never
 * write, so test searches don't mix with real ones.
 */
export function searchLog(env: Record<string, string | undefined> = process.env): SearchLog | null {
  if (override !== undefined) return override
  const url = env.DIYA_DATABASE_URL?.trim()
  if (env.VERCEL_ENV !== 'production' || !url) return null
  if (live?.url !== url) live = { url, log: new NeonSearchLog(neonRunner(url)) }
  return live.log
}

/** Normalizes, drops what shouldn't be kept, caps the batch and records it. Never throws. */
export async function recordSearches(log: SearchLog | null, searches: Search[], now = new Date()) {
  if (!log) return
  const kept = searches
    .map(({ query, found }) => ({ query: normalizeQuery(query), found }))
    .filter((search): search is Search => search.query !== null)
    .slice(0, SEARCHES_PER_REQUEST)
  if (!kept.length) return
  try {
    await log.record(kept, now)
  } catch (error) {
    // Counting is a nicety; a failure must never reach the agent. Log the error, never the words.
    console.error('diya-mcp: search count failed', error instanceof Error ? error.name : 'unknown')
  }
}
