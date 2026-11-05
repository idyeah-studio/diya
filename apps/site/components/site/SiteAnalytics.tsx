'use client'
import { Analytics } from '@vercel/analytics/next'
import { analyticsUrl } from '../../lib/analytics'

/**
 * Vercel Web Analytics: cookieless visit counts, as the privacy page says.
 * A client component because `beforeSend` is a function, which can't cross
 * from the server-rendered layout.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: analyticsUrl(event.url) })} />
}
