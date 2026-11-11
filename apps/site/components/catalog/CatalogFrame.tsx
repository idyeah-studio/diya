import type { ReactNode } from 'react'
import type { CatalogArea } from '../../lib/catalog-route'
import { SiteFooter } from '../site/SiteFooter'
import { SiteHeader } from '../site/SiteHeader'
import { OrielDoor } from '../oriel/OrielDoor'
import { ReferencePanel } from '../reference/ReferencePanel'
import { CatalogHead } from './CatalogHead'
import { SidebarFoot } from './SidebarFoot'
import { TitleFocus } from './TitleFocus'
import './catalog.css'

/**
 * The public catalog's chrome around one page: the site header (option C),
 * the page itself, the sidebar foot's narrow-screen copy, and the footer.
 * Needs AppearanceProvider and CatalogProvider above it (app/explore/layout).
 */
export function CatalogFrame({
  area,
  title,
  path,
  children,
}: {
  area: CatalogArea
  title: string
  path: string
  children: ReactNode
}) {
  const current = area === 'components' || area === 'patterns' || area === 'screens' ? area : undefined
  return (
    <div className="catalog-frame" data-area={area}>
      <CatalogHead title={title} path={path} />
      <SiteHeader current={current} />
      <TitleFocus path={path} />
      {children}
      <ReferencePanel path={path} />
      <OrielDoor path={path} />
      <aside className="catalog-below" aria-label="Install, requests and Relight">
        <SidebarFoot placement="below" page={area === 'pro' || area === 'motion' ? area : undefined} />
      </aside>
      <SiteFooter />
    </div>
  )
}
