import { DEFAULT_REPLY_TO } from '../waitlist/config'
import { neonRunner } from '../waitlist/neon-store'
import { waitlistIsOpen } from '../waitlist/open'
import { LOCAL_DEVELOPMENT_KEY, missingEnv, REQUIRED_ENV } from '../waitlist/runtime'
import { FakeSender, PostmarkSender } from '../waitlist/sender'
import { requestsTo } from './config'
import { MemoryScreenRequestStore } from './memory-store'
import { NeonScreenRequestStore } from './neon-store'
import type { ScreenRequestDeps } from './service'

type Env = Record<string, string | undefined>

let override: ScreenRequestDeps | null | undefined
let localDev: ScreenRequestDeps | undefined
let live: { key: string; deps: ScreenRequestDeps } | undefined

/** Tests swap in their own store and sender; `undefined` restores the env-driven deps. */
export function setScreenRequestDeps(deps: ScreenRequestDeps | null | undefined) {
  override = deps
}

/**
 * The waitlist's rules: closed (null) before launch unless the catalog
 * preview flag is on. After it, Neon and Postmark when every waitlist
 * variable is set; outside production a missing one falls back to memory and
 * a sender that prints to the server log; in production it closes.
 */
export function screenRequestDeps(env: Env = process.env): ScreenRequestDeps | null {
  if (override !== undefined) return override
  if (!waitlistIsOpen(env)) return null
  if (missingEnv(env).length === 0) {
    const key = [...REQUIRED_ENV, 'DIYA_REQUESTS_TO'].map((name) => env[name]).join('\n')
    if (live?.key !== key) {
      live = {
        key,
        deps: {
          store: new NeonScreenRequestStore(neonRunner(env.DIYA_DATABASE_URL!.trim())),
          sender: new PostmarkSender({
            serverToken: env.POSTMARK_SERVER_TOKEN!.trim(),
            stream: env.POSTMARK_STREAM!.trim(),
            from: env.DIYA_WAITLIST_FROM!.trim(),
            // Each notification replies to the person who asked; this is only the fallback.
            replyTo: DEFAULT_REPLY_TO,
          }),
          secret: env.DIYA_WAITLIST_SECRET!.trim(),
          siteUrl: env.DIYA_SITE_URL!.trim().replace(/\/+$/, ''),
          to: requestsTo(env),
        },
      }
    }
    return live.deps
  }
  if (env.NODE_ENV === 'production') return null
  localDev ??= {
    store: new MemoryScreenRequestStore(),
    sender: new FakeSender(true, 'screen-requests'),
    secret: LOCAL_DEVELOPMENT_KEY,
    // Empty: links in the printed email use the request's own origin.
    siteUrl: (env.DIYA_SITE_URL ?? '').replace(/\/+$/, ''),
    to: requestsTo(env),
  }
  return localDev
}

/** Whether the form takes requests: the page renders "Requests open with the launch." when it doesn't. */
export function screenRequestsOpen(env: Env = process.env) {
  return screenRequestDeps(env) !== null
}
