// Where `playwright install` puts browsers and ffmpeg, as Playwright itself decides: the
// PLAYWRIGHT_BROWSERS_PATH override, else the platform's cache (on Linux, $XDG_CACHE_HOME or
// ~/.cache). "0" means inside playwright-core, which the caller resolves. (K8, L5)
import { join } from 'node:path'

export function playwrightCache(env: Record<string, string | undefined>, os: string, home: string): string | '0' {
  const set = env.PLAYWRIGHT_BROWSERS_PATH
  if (set) return set
  if (os === 'darwin') return join(home, 'Library', 'Caches', 'ms-playwright')
  if (os === 'win32') return join(env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'ms-playwright')
  return join(env.XDG_CACHE_HOME || join(home, '.cache'), 'ms-playwright')
}
