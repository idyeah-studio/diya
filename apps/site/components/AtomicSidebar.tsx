'use client'
import { CatalogBrowser } from './catalog/CatalogBrowser'
import type { ComponentId } from './catalog/catalog-index'

export type AtomicComponent = ComponentId

/** `pro` marks the foot's Relight entry as the current page instead of a component. */
export function AtomicSidebar({ current, pro = false }: { current?: AtomicComponent; pro?: boolean }) {
  return <CatalogBrowser area="components" current={current} pro={pro} />
}
