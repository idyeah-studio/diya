'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { DiyaProvider } from '@idyeah/diya'

// Your one brand color. Leave it undefined for DIYA's neutral near-black.
const brandColor: string | undefined = undefined

// A client file, so the provider can take Next.js Link (a component can't cross
// from a Server Component). theme="system" follows the visitor's Light or Dark
// setting in CSS, from the first paint: no flash, no script.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <DiyaProvider theme="system" brandColor={brandColor} linkComponent={Link}>
      {children}
    </DiyaProvider>
  )
}
