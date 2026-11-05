import { cookies } from 'next/headers'
import { connection } from 'next/server'
import type { Metadata } from 'next'
import { AppearanceProvider, type Theme } from './Appearance'
import './globals.css'
import { isLaunched, launchNow } from '../lib/launch'
import { catalogIsOpen } from '../lib/catalog-route'
import { SITE } from '../lib/site'
import { SiteAnalytics } from '../components/site/SiteAnalytics'
import { screens } from '../components/screens/screens-data'

const title = 'DIYA — Components and patterns. In code.'
const description = 'A library for your next app. Thoughtfully built UI components and patterns, ready to work together. Coming soon.'
const image = {
  url: '/brand/social-preview-v1.jpg',
  type: 'image/jpeg',
  width: 1512,
  height: 733,
  alt: 'DIYA: A library for your next app. Components and patterns. In code. Coming soon.',
}

// One favicon before and after launch: the D with its vermilion dot. The SVG
// follows the visitor's light or dark setting; the PNGs are for browsers
// without SVG icons; the apple-touch icon is opaque (iOS fills transparency
// with black). New file names, so no browser keeps the old icon.
const icons: Metadata['icons'] = {
  icon: [
    { url: '/brand/diya-icon-v3.svg', type: 'image/svg+xml', sizes: 'any' },
    { url: '/brand/diya-icon-v3-light-32.png', type: 'image/png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
    { url: '/brand/diya-icon-v3-dark-32.png', type: 'image/png', sizes: '32x32', media: '(prefers-color-scheme: dark)' },
  ],
  apple: { url: '/brand/diya-icon-v3-180.png', sizes: '180x180' },
}

const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: { title, description, type: 'website', siteName: 'DIYA', url: '/', images: [image] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
  icons,
}

// Counted, not typed, so the descriptions stay true as Screens grow. The share
// card rounds instead ("30+ screens"), since a picture is slow to remake.
const readyScreens = screens.filter((screen) => screen.status === 'ready').length

// From the launch moment: the copy deck's title, description and social card,
// with a new image file name (so LinkedIn and X don't reuse the cached
// "Coming soon" card). The favicon stays the same.
const launchedImage = {
  url: '/social-preview-v7.jpg',
  type: 'image/jpeg',
  width: 1200,
  height: 630,
  alt: 'DIYA: a library for your next app. 40+ components and patterns, and 30+ screens, for React. Free, MIT, yours to own. npm install @idyeah/diya.',
}
const launchedSocial = {
  title: 'DIYA — a library for your next app',
  description: `30 components, 13 patterns and ${readyScreens} screens for React. Free, MIT, yours to own.`,
}
const launchedMetadata: Metadata = {
  ...metadata,
  title: 'DIYA — React components and patterns, free under MIT',
  description:
    `30 components, 13 patterns and ${readyScreens} screens for React, with Light, Dark and Glass. Free, MIT, yours to own. npm install @idyeah/diya`,
  openGraph: { ...launchedSocial, type: 'website', siteName: 'DIYA', url: '/', images: [launchedImage] },
  twitter: { card: 'summary_large_image', ...launchedSocial, images: [launchedImage] },
  icons,
}

export async function generateMetadata(): Promise<Metadata> {
  // Request time, like the page: the switch happens at LAUNCH_AT, not at build.
  await connection()
  const preview = process.env.DIYA_CATALOG_PREVIEW === '1'
  const base = isLaunched(launchNow()) ? launchedMetadata : metadata
  return { ...base, robots: { index: !preview, follow: !preview } }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferences = await cookies()
  // Once the catalog is open, pages bring their own header. The catalog's
  // style hook (html[data-catalog]) is set by app/explore/layout.tsx only,
  // so its rules never reach the landing after a client navigation.
  const catalog = catalogIsOpen()
  const theme: Theme = preferences.get('diya-theme')?.value === 'light' ? 'light' : 'dark'
  const glass = preferences.get('diya-glass')?.value === 'true'
  return (
    <html lang="en" suppressHydrationWarning data-theme={theme} data-glass={String(glass)}>
      <body>
        <AppearanceProvider initialTheme={theme} initialGlass={glass}>
          <a className="skip-link" href="#content">Skip to content</a>
          {/* Once the catalog is open, pages bring their own SiteHeader (the catalog's lives in app/explore). */}
          {catalog ? children : <><header className="site-header" inert aria-hidden="true">
            <a href="/" aria-label="DIYA home" className="brand">
              {/* One file per theme, swapped in globals.css: a filter would turn the vermilion dot cyan. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-light" src="/brand/diya.svg" width="80" height="24" alt="DIYA" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-dark" src="/brand/diya-dark.svg" width="80" height="24" alt="DIYA" />
            </a>
            <div className="upcoming-navigation" role="group" aria-label="Upcoming library">
              <span>Patterns</span><span>Components</span><span>Skills &amp; Prompts</span>
            </div>
          </header>{children}</>}
        </AppearanceProvider>
        <SiteAnalytics />
      </body>
    </html>
  )
}
