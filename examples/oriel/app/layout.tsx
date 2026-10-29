import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@idyeah/diya/styles.css'
import './oriel.css'
import { Providers } from './providers'
import { Shell } from '@/components/Shell'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  metadataBase: new URL('https://oriel.diya13.ai'),
  title: { default: `${BRAND.name} · a demo app made with DIYA`, template: `%s · ${BRAND.name}` },
  description: 'A small invoicing app made only from DIYA components: a table, forms, a chart and Glass. Open source.',
  // The link preview: the app's real Overview at 1200×630, by absolute URL.
  // Share the home page with its trailing slash; X caches a card per exact URL.
  openGraph: {
    type: 'website',
    siteName: 'DIYA',
    title: `${BRAND.name}, a demo app made only from DIYA`,
    description: 'A small invoicing app: a table, forms, a chart and Glass, all DIYA components. Open source, MIT.',
    images: [
      {
        url: 'https://oriel.diya13.ai/demo-only/og.jpg',
        width: 1200,
        height: 630,
        alt: `${BRAND.name}’s Overview screen: three figures, a bar chart and the invoices that need a nudge.`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name}, a demo app made only from DIYA`,
    description: 'A small invoicing app: a table, forms, a chart and Glass, all DIYA components. Open source, MIT.',
    images: [
      {
        url: 'https://oriel.diya13.ai/demo-only/og.jpg',
        alt: `${BRAND.name}’s Overview screen: three figures, a bar chart and the invoices that need a nudge.`,
      },
    ],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  )
}
