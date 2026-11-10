import { neonRunner } from '../waitlist/neon-store'
import { mcpEntries } from './catalog'
import { RETENTION_DAYS, SEARCHES_PER_REQUEST } from './query-log'

/*
 * Which components agents ask DIYA for with get_component, counted by day,
 * so we learn which ones people build with. Only the component's id from
 * DIYA's own catalog (never the words the agent sent), the day and a count:
 * no IP address, no client name, no time of day. The privacy page says
 * exactly this.
 */

/** Where the counts live. Neon in production; tests and local runs use their own. */
export interface ComponentLog {
  record(ids: string[], now: Date): Promise<void>
}

/** At most this many components from one request are counted, the same cap as searches. */
export const COMPONENTS_PER_REQUEST = SEARCHES_PER_REQUEST

let known: Set<string> | undefined

/** True only for an id in DIYA's catalog (api.json), so nothing else can be stored. */
export function isKnownComponent(id: string): boolean {
  known ??= new Set(mcpEntries().map((entry) => entry.id))
  return known.has(id)
}

/** Postgres, through the same driver as the waitlist. Schema: db/004_mcp_components.sql. */
export class NeonComponentLog implements ComponentLog {
  constructor(private readonly db: { query(text: string, params: unknown[]): Promise<unknown[]> }) {}

  async record(ids: string[], now: Date) {
    const day = now.toISOString().slice(0, 10)
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10)
    for (const id of ids) {
      await this.db.query(
        `with pruned as (delete from diya_mcp_components where day < $3::date)
         insert into diya_mcp_components (day, component, count)
         values ($1::date, $2::text, 1)
         on conflict (day, component) do update set count = diya_mcp_components.count + 1`,
        [day, id, cutoff]
      )
    }
  }
}

/** Keeps counts in memory: tests, and a look at what would be stored. */
export class MemoryComponentLog implements ComponentLog {
  readonly counts = new Map<string, { day: string; component: string; count: number }>()

  async record(ids: string[], now: Date) {
    const day = now.toISOString().slice(0, 10)
    for (const component of ids) {
      const key = `${day}\n${component}`
      const row = this.counts.get(key) ?? { day, component, count: 0 }
      this.counts.set(key, { ...row, count: row.count + 1 })
    }
  }
}

let override: ComponentLog | null | undefined
let live: { url: string; log: ComponentLog } | undefined

/** Tests swap in their own log; `null` turns counting off; `undefined` restores the env-driven one. */
export function setComponentLog(log: ComponentLog | null | undefined) {
  override = log
}

/**
 * The log for this environment: Neon in Vercel production when
 * DIYA_DATABASE_URL is set, otherwise none. Previews and local runs never
 * write, so test calls don't mix with real ones.
 */
export function componentLog(env: Record<string, string | undefined> = process.env): ComponentLog | null {
  if (override !== undefined) return override
  const url = env.DIYA_DATABASE_URL?.trim()
  if (env.VERCEL_ENV !== 'production' || !url) return null
  if (live?.url !== url) live = { url, log: new NeonComponentLog(neonRunner(url)) }
  return live.log
}

/** Keeps only catalog ids, caps the batch and records it. Never throws. */
export async function recordComponents(log: ComponentLog | null, ids: string[], now = new Date()) {
  if (!log) return
  const kept = ids.filter(isKnownComponent).slice(0, COMPONENTS_PER_REQUEST)
  if (!kept.length) return
  try {
    await log.record(kept, now)
  } catch (error) {
    // Counting is a nicety; a failure must never reach the agent.
    console.error('diya-mcp: component count failed', error instanceof Error ? error.name : 'unknown')
  }
}
