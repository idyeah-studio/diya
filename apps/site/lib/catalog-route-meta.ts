import { componentIds, patternIds, type CatalogRoute } from './catalog-route'
import { customizeItems } from './customize/registry'
import { screenById, screens } from '../components/screens/screens-data'

/** The page's own address: one URL per catalog page, whatever link led there. */
export function catalogPath(route: CatalogRoute) {
  if (route.area === 'components') return `/explore?area=components&component=${route.id}`
  if (route.area === 'patterns') return `/explore?pattern=${route.id}`
  if (route.area === 'screens') return screenPath(route.id)
  return `/explore?area=${route.area}`
}

/** The Screens gallery, or one screen's page. */
export function screenPath(id: string | null) {
  return id ? `/explore?area=screens&screen=${id}` : '/explore?area=screens'
}

/** The browser title, for example "Table — DIYA" or "Sign in: Screens — DIYA". */
export function catalogTitle(route: CatalogRoute) {
  if (route.area === 'skills') return 'Skills & Prompts — DIYA'
  if (route.area === 'pro') return 'Relight — DIYA'
  if (route.area === 'motion') return 'Motion — DIYA'
  if (route.area === 'screens') {
    const screen = screenById(route.id)
    return screen ? `${screen.name}: Screens — DIYA` : 'Screens — DIYA'
  }
  return `${customizeItems[route.id].title} — DIYA`
}

/** Every component and pattern page, in sidebar order. */
export function catalogItemPaths() {
  return [
    ...componentIds.map((id) => catalogPath({ area: 'components', id })),
    ...patternIds.map((id) => catalogPath({ area: 'patterns', id })),
  ]
}

/**
 * The Screens pages a launched site lists: the gallery and every ready
 * screen. Posters and screens still being built stay out of the sitemap.
 */
export function screenItemPaths() {
  return [screenPath(null), ...screens.filter((screen) => screen.status === 'ready').map((screen) => screenPath(screen.id))]
}
