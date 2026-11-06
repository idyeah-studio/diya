/** The catalog's own page keys, the only query values analytics may record. */
const CATALOG_KEYS = ['area', 'component', 'pattern', 'screen'] as const

/**
 * The address Vercel Web Analytics records for a visit: no fragment, and no
 * query except the catalog's page keys on /explore. Everything else stays in
 * the browser, including the private tokens in waitlist links.
 */
export function analyticsUrl(href: string): string {
  const url = new URL(href)
  const kept = new URLSearchParams()
  if (url.pathname === '/explore') {
    for (const key of CATALOG_KEYS) {
      const value = url.searchParams.get(key)
      if (value !== null) kept.set(key, value)
    }
  }
  url.search = kept.toString()
  url.hash = ''
  return url.toString()
}
