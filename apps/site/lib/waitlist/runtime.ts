import { DEFAULT_REPLY_TO } from './config'
import { MemoryWaitlistStore } from './memory-store'
import { waitlistIsOpen } from './open'
import { neonRunner, NeonWaitlistStore } from './neon-store'
import { FakeSender, PostmarkSender } from './sender'
import type { WaitlistDeps } from './service'

/** Every variable the live waitlist needs. db/ENV.md says what each one is for. */
export const REQUIRED_ENV = [
  'DIYA_DATABASE_URL',
  'POSTMARK_SERVER_TOKEN',
  'POSTMARK_STREAM',
  'DIYA_WAITLIST_FROM',
  'DIYA_SITE_URL',
  'DIYA_WAITLIST_SECRET',
] as const

type Env = Record<string, string | undefined>

let override: WaitlistDeps | null | undefined
/** Signs form tokens in local development only; production requires DIYA_WAITLIST_SECRET. */
const LOCAL_DEVELOPMENT_KEY = 'local-development-only'
let localDev: WaitlistDeps | undefined
let live: { key: string; deps: WaitlistDeps } | undefined

/** Tests swap in their own store and sender; `undefined` restores the env-driven deps. */
export function setWaitlistDeps(deps: WaitlistDeps | null | undefined) {
  override = deps
}

export function missingEnv(env: Env) {
  return REQUIRED_ENV.filter((name) => !env[name]?.trim())
}

/**
 * Null (closed) before launch. After it, the live store and sender when every
 * variable is set. Outside production a missing variable falls back to the
 * in-memory list and a sender that prints to the server log; in production
 * it returns null.
 */
export function waitlistDeps(env: Env = process.env): WaitlistDeps | null {
  if (override !== undefined) return override
  if (!waitlistIsOpen(env)) return null
  if (missingEnv(env).length === 0) {
    const key = [...REQUIRED_ENV, 'DIYA_WAITLIST_REPLY_TO'].map((name) => env[name]).join('\n')
    if (live?.key !== key) {
      const from = env.DIYA_WAITLIST_FROM!.trim()
      live = {
        key,
        deps: {
          store: new NeonWaitlistStore(neonRunner(env.DIYA_DATABASE_URL!.trim())),
          sender: new PostmarkSender({
            serverToken: env.POSTMARK_SERVER_TOKEN!.trim(),
            stream: env.POSTMARK_STREAM!.trim(),
            from,
            replyTo: env.DIYA_WAITLIST_REPLY_TO?.trim() || DEFAULT_REPLY_TO,
          }),
          secret: env.DIYA_WAITLIST_SECRET!.trim(),
          siteUrl: env.DIYA_SITE_URL!.trim().replace(/\/+$/, ''),
        },
      }
    }
    return live.deps
  }
  if (env.NODE_ENV === 'production') return null
  localDev ??= {
    store: new MemoryWaitlistStore(),
    sender: new FakeSender(true),
    secret: LOCAL_DEVELOPMENT_KEY,
    // Empty: links in the printed emails use the request's own origin.
    siteUrl: (env.DIYA_SITE_URL ?? '').replace(/\/+$/, ''),
  }
  return localDev
}
