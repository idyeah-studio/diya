import type { ReactNode } from 'react'
import '@idyeah/diya/styles.css'

export const metadata = { title: 'DIYA on Next.js' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
