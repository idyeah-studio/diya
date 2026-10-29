'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Avatar, Inline, SideNavigation, SiteHeader, Stack, Toast } from '@idyeah/diya'
import { useStore } from '@/lib/store'
import { CustomersIcon, InvoiceIcon, OverviewIcon, SettingsIcon } from './icons'
import { BRAND, Wordmark } from '@/lib/brand'

const PAGES = [
  { value: '/', label: 'Overview', href: '/', icon: <OverviewIcon /> },
  { value: '/invoices', label: 'Invoices', href: '/invoices', icon: <InvoiceIcon /> },
  { value: '/customers', label: 'Customers', href: '/customers', icon: <CustomersIcon /> },
  { value: '/settings', label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
]

/** The wordmark: 23px in the sidebar, 22px in the phone header. */
function Brand({ uid, size }: { uid: string; size: number }) {
  return (
    <span className="brand">
      <Wordmark size={size} uid={uid} />
    </span>
  )
}

/**
 * The app frame: Side Navigation on wide screens, Site Header (with its own
 * phone menu) on narrow ones, and the screen in between. Every item has an
 * href, so the provider's linkComponent (Next.js Link) does the routing.
 */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const current = PAGES.find((p) => (p.value === '/' ? path === '/' : path.startsWith(p.value))) ?? PAGES[0]
  const { notice, dismiss } = useStore()

  return (
    <div className="shell">
      <a className="skip-link" href="#screen">
        Skip to content
      </a>
      <aside className="shell-side" aria-label={BRAND.name}>
        <div className="side-inner">
          <SideNavigation
            brand={<Brand uid="side" size={23} />}
            value={current.value}
            showGroups={false}
            groups={[{ id: 'main', items: PAGES.map(({ value, label, href, icon }) => ({ value, label, href, icon })) }]}
            // The sidebar's own pane is the surface; the navigation sits in it without one of its own.
            style={{ width: 'auto', flex: 1, borderRight: 0, background: 'transparent', backdropFilter: 'none' }}
          />
          <Inline gap={3} className="workspace" wrap={false}>
            <Avatar name="Asha Rao" size="small" />
            <Stack gap={0}>
              <strong>Kiln Studio</strong>
              <span>Asha Rao</span>
            </Stack>
          </Inline>
        </div>
      </aside>

      <div className="shell-top">
        <SiteHeader
          brand={<Brand uid="top" size={22} />}
          brandHref="/"
          brandLabel={`${BRAND.name}, overview`}
          value={current.value}
          items={PAGES.map(({ value, label, href }) => ({ value, label, href }))}
          avatar={<Avatar name="Asha Rao" size="small" />}
        />
      </div>

      <main className="shell-main" id="screen" tabIndex={-1}>
        <div className="screen">{children}</div>
      </main>

      {notice && (
        <Toast key={notice.id} tone={notice.tone} title={notice.title} onDismiss={dismiss} duration={5000}>
          {notice.text}
        </Toast>
      )}
    </div>
  )
}
