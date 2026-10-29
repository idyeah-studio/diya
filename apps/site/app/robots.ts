import type { MetadataRoute } from 'next'
import { SITE } from '../lib/site'

export default function robots(): MetadataRoute.Robots {
  // Crawlers must be able to read /explore's noindex directive before launch,
  // when the route is a 404 without the preview flag; robots.txt is not an
  // access-control gate. The sitemap adds the catalog at LAUNCH_AT.
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/demos/'] },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
