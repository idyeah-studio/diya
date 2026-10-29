import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { isLaunched, launchNow } from '../lib/launch'
import { catalogItemPaths } from '../lib/catalog-route-meta'
import { SITE } from '../lib/site'

/** The home page; from the launch moment on, privacy, the changelog, requests and every catalog page too. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const paths = ['/', ...(isLaunched(launchNow()) ? ['/privacy', '/changelog', '/ask', ...catalogItemPaths()] : [])]
  // Next writes each url into <loc> as is, so the query's & must be escaped here.
  return paths.map((path) => ({ url: `${SITE}${path}`.replaceAll('&', '&amp;') }))
}
