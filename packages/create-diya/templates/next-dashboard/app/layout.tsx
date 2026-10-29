import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@idyeah/diya/styles.css'
import './oriel.css'
import { Providers } from './providers'
import { Shell } from '@/components/Shell'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: 'A small invoicing app, made with DIYA.',
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
