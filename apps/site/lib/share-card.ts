import type { Metadata } from 'next'

// The descriptions and the share card round the counts ("40+ components and
// patterns", "30+ screens"), so they stay true as the library grows.
// tests/counts.test.ts fails when a rounded claim falls behind or runs ahead.

/**
 * The launched site's social card image, shared by every page. A new file
 * name from the launch moment on, so LinkedIn and X don't reuse the cached
 * "Coming soon" card.
 */
export const LAUNCHED_IMAGE = {
  url: '/social-preview-v7.jpg',
  type: 'image/jpeg',
  width: 1200,
  height: 630,
  alt: 'DIYA: a library for your next app. 40+ components and patterns, and 30+ screens, for React. Free, MIT, yours to own. npm install @idyeah/diya.',
}

/**
 * A launched page's own share card: its title, description and address on
 * Open Graph and X, with the site's name and image. `path` is the page's
 * canonical path; the root layout's metadataBase makes it absolute.
 *
 * shareCard({ title: 'Table — DIYA', description: 'A data table…', path: '/explore?pattern=table' })
 */
export function shareCard({ title, description, path }: { title: string; description: string; path: string }): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: { title, description, type: 'website', siteName: 'DIYA', url: path, images: [LAUNCHED_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [LAUNCHED_IMAGE] },
  }
}
