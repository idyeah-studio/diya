'use client'
import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import './diya-styles'
import { useAppearance } from '../../app/Appearance'
import { SiteFooter } from '../site/SiteFooter'
import { SiteHeader } from '../site/SiteHeader'
import './WaitlistPage.css'

/**
 * The quiet page frame shared by the confirmed, unsubscribe and privacy pages.
 * Once the catalog is open (`chrome`), it wears the site's one header and
 * footer, like every other public page; before launch the root layout's
 * header stands in, because the header's library links would lead nowhere.
 */
export function WaitlistPage({
  labelledBy,
  wide = false,
  chrome = false,
  children,
}: {
  labelledBy: string
  wide?: boolean
  chrome?: boolean
  children: ReactNode
}) {
  const { theme, glass } = useAppearance()
  const page = (
    <DiyaProvider surface={false} theme={theme} glass={glass} className="waitlist-page">
      <main id="content" className="wp-main" data-wide={wide || undefined} aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </main>
    </DiyaProvider>
  )
  if (!chrome) return page
  // The header and footer sit outside the page's own scope, so its plain
  // type rules (h2, p, ul) never reach them.
  return (
    <DiyaProvider surface={false} theme={theme} glass={glass} className="waitlist-shell">
      <SiteHeader />
      {page}
      <SiteFooter />
    </DiyaProvider>
  )
}
