// Shared deadline, never reset per visitor: midnight Pacific at the start
// of 7 November 2026, the eve of Diwali. Daylight time ends 1 November, so
// that is PST (UTC-8). Reaching zero switches the home page from the
// countdown to the launched landing (app/page.tsx); it deploys nothing.
export const LAUNCH_AT = Date.parse('2026-11-07T00:00:00-08:00')

export function secondsUntilLaunch(now: number) {
  return Math.max(0, Math.ceil((LAUNCH_AT - now) / 1000))
}

/** True from the launch moment on. Agrees with `secondsUntilLaunch(now) === 0`. */
export function isLaunched(now: number) {
  return now >= LAUNCH_AT
}

/**
 * The server's clock for launch decisions. Locally, `DIYA_NOW` (an ISO time,
 * such as `2026-11-07T00:00:01-08:00`) pins it so either side of the launch
 * can be checked locally (`next start`, `next dev`, `vercel dev`). Every Vercel
 * deployment ignores it, previews included, and so does an unreadable value.
 * Server only: the browser never sees `DIYA_NOW`.
 */
export function launchNow(env: Record<string, string | undefined> = process.env, real = Date.now()) {
  const deployed = env.VERCEL_ENV === 'production' || (env.VERCEL === '1' && env.VERCEL_ENV !== 'development')
  if (deployed || !env.DIYA_NOW) return real
  const pinned = Date.parse(env.DIYA_NOW)
  return Number.isNaN(pinned) ? real : pinned
}
