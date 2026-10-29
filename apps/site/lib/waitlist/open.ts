import { isLaunched, launchNow } from '../launch'

/**
 * The list takes signups from the launch moment on, or earlier only with the
 * catalog preview flag. Before that nobody can claim a founding spot, even
 * with every credential set.
 */
export function waitlistIsOpen(env: Record<string, string | undefined> = process.env) {
  return env.DIYA_CATALOG_PREVIEW === '1' || isLaunched(launchNow(env))
}
