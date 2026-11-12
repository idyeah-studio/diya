'use client'
import { CatalogBrowser } from './catalog/CatalogBrowser'
import type { ComponentId } from './catalog/catalog-index'
import type { FootPage } from './catalog/SidebarFoot'

export type AtomicComponent = ComponentId

/** `page` marks a foot entry (Motion, Relight) as the current page instead of a component. */
export function AtomicSidebar({ current, page }: { current?: AtomicComponent; page?: FootPage }) {
  return <CatalogBrowser area="components" current={current} page={page} />
}
