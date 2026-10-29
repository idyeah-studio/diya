'use client'
import { CatalogBrowser } from './catalog/CatalogBrowser'
import type { PatternId } from './catalog/catalog-index'

export function PatternSidebar({ current }: { current: PatternId }) {
  return <CatalogBrowser area="patterns" current={current} />
}
