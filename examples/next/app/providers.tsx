'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { DiyaProvider } from '@idyeah/diya'

// A client file, so the provider can take a component (Link) and functions.
export function Providers({ children }: { children: ReactNode }) {
  return <DiyaProvider linkComponent={Link} locale="en-US">{children}</DiyaProvider>
}
