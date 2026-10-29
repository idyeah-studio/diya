'use client'
import { DiyaProvider } from '@idyeah/diya'
import type { ReactNode } from 'react'
import { useAppearance } from '../../app/Appearance'

/**
 * The public site as DIYA's first customer: one provider that follows the
 * visitor's Appearance choice, so site chrome and components read the same
 * public tokens. The site's own grounds and wordmark dot live in site.css.
 */
export function SiteProvider({ children, className }: { children: ReactNode; className?: string }) {
  const { theme, glass } = useAppearance()
  return (
    <DiyaProvider surface={false} theme={theme} glass={glass} className={['site-root', className].filter(Boolean).join(' ')}>
      {children}
    </DiyaProvider>
  )
}
