import { componentIds, patternIds, type CatalogRoute } from './catalog-route'
import { customizeItems } from './customize/registry'

/** The page's own address: one URL per catalog page, whatever link led there. */
export function catalogPath(route: CatalogRoute) {
  if (route.area === 'components') return `/explore?area=components&component=${route.id}`
  if (route.area === 'patterns') return `/explore?pattern=${route.id}`
  return `/explore?area=${route.area}`
}

/** The browser title, for example "Table — DIYA". */
export function catalogTitle(route: CatalogRoute) {
  if (route.area === 'skills') return 'Skills & Prompts — DIYA'
  if (route.area === 'pro') return 'Relight — DIYA'
  return `${customizeItems[route.id].title} — DIYA`
}

/** Every component and pattern page, in sidebar order. */
export function catalogItemPaths() {
  return [
    ...componentIds.map((id) => catalogPath({ area: 'components', id })),
    ...patternIds.map((id) => catalogPath({ area: 'patterns', id })),
  ]
}
