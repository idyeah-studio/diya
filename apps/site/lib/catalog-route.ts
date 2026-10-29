import { isLaunched, launchNow } from './launch'

export const componentIds = [
  'button',
  'text-input',
  'text-area',
  'select',
  'date-picker',
  'calendar',
  'combobox',
  'choice',
  'switch',
  'slider',
  'search',
  'link',
  'pagination',
  'tabs',
  'breadcrumbs',
  'menu',
  'tag',
  'metric',
  'rating',
  'avatar',
  'list',
  'accordion',
  'prose',
  'code-block',
  'badge',
  'alert',
  'progress',
  'tooltip',
  'popover',
] as const

export const patternIds = [
  'page-header',
  'site-header',
  'side-navigation',
  'card',
  'table',
  'data-viz',
  'form',
  'wizard',
  'file-upload',
  'chatbot',
  'dialog',
  'drawer',
  'empty-state',
] as const

export type CatalogArea = 'patterns' | 'components' | 'skills' | 'pro'
export type CatalogRoute =
  | { area: 'components'; id: (typeof componentIds)[number] }
  | { area: 'patterns'; id: (typeof patternIds)[number] }
  | { area: 'skills' }
  | { area: 'pro' }
type CatalogRouteResult = CatalogRoute | { redirect: string }
type SearchParams = Record<string, string | string[] | undefined>

/**
 * Whether /explore is public: always from the launch moment, and before it
 * only in builds with DIYA_CATALOG_PREVIEW=1. Before launch, without the
 * flag, the route is a 404.
 */
export function catalogIsOpen(
  env: Record<string, string | undefined> = process.env,
  now = launchNow(env)
) {
  return env.DIYA_CATALOG_PREVIEW === '1' || isLaunched(now)
}

export function catalogArea(area: string | null | undefined): CatalogArea {
  return area === 'components' || area === 'skills' || area === 'pro' ? area : 'patterns'
}

/** Explicit areas take precedence over stale selectors from another area. */
export function resolveCatalogRoute(params: SearchParams): CatalogRouteResult {
  if (Array.isArray(params.area)) return { redirect: '/explore' }
  const area = catalogArea(params.area)
  // The Relight page's address before it was neutral; shared links still land.
  if (params.area === 'rebuild') return { redirect: '/explore?area=pro' }
  if (params.area && !['components', 'patterns', 'skills', 'pro'].includes(params.area))
    return { redirect: '/explore' }
  if (area === 'skills' || area === 'pro') return { area }

  if (area === 'components') {
    if (params.component === 'dialog') return { redirect: '/explore?pattern=dialog' }
    if (params.component === undefined) return { area, id: 'button' }
    const id = componentIds.find((id) => id === params.component)
    return id ? { area, id } : { redirect: '/explore?area=components' }
  }

  // Preserve old links that moved Dialog into Patterns and retired Filter Bar.
  if (!params.area && params.component === 'dialog') return { redirect: '/explore?pattern=dialog' }
  if (params.pattern === 'filter-bar') return { redirect: '/explore' }
  if (params.pattern === undefined) return { area, id: 'page-header' }
  const id = patternIds.find((id) => id === params.pattern)
  return id ? { area, id } : { redirect: '/explore' }
}
