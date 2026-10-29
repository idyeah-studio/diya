import { describe, expect, it } from 'vitest'
import { catalogArea, catalogIsOpen, componentIds, patternIds, resolveCatalogRoute } from './catalog-route'
import { catalogItemPaths, catalogPath, catalogTitle } from './catalog-route-meta'
import { LAUNCH_AT } from './launch'
import { customizeItems } from './customize/registry'

describe('Catalog route selection', () => {
  it('keeps all published component and pattern destinations available', () => {
    const items = Object.values(customizeItems)
    expect([...componentIds].sort()).toEqual(
      items.filter((item) => item.kind === 'component').map((item) => item.id).sort()
    )
    expect([...patternIds].sort()).toEqual(
      items.filter((item) => item.kind === 'pattern').map((item) => item.id).sort()
    )
    for (const id of componentIds)
      expect(resolveCatalogRoute({ area: 'components', component: id })).toEqual({
        area: 'components',
        id,
      })
    for (const id of patternIds)
      expect(resolveCatalogRoute({ pattern: id })).toEqual({ area: 'patterns', id })
  })

  it('uses an explicit area even when a link retains another area’s selector', () => {
    expect(resolveCatalogRoute({ area: 'skills', pattern: 'table', component: 'button' })).toEqual({
      area: 'skills',
    })
    expect(
      resolveCatalogRoute({ area: 'components', component: 'button', pattern: 'table' })
    ).toEqual({ area: 'components', id: 'button' })
    expect(
      resolveCatalogRoute({ area: 'patterns', pattern: 'table', component: 'button' })
    ).toEqual({ area: 'patterns', id: 'table' })
    expect(
      resolveCatalogRoute({ area: 'patterns', pattern: 'table', component: 'dialog' })
    ).toEqual({ area: 'patterns', id: 'table' })
    expect(
      resolveCatalogRoute({ area: 'skills', pattern: 'filter-bar', component: 'dialog' })
    ).toEqual({ area: 'skills' })
  })

  it('opens each area’s initial page when no item is selected', () => {
    expect(resolveCatalogRoute({})).toEqual({ area: 'patterns', id: 'page-header' })
    expect(resolveCatalogRoute({ area: 'components' })).toEqual({
      area: 'components',
      id: 'button',
    })
    expect(resolveCatalogRoute({ area: 'skills' })).toEqual({ area: 'skills' })
  })

  it('recovers unknown and empty selectors at their area’s canonical starting URL', () => {
    for (const component of ['removed-component', ''])
      expect(resolveCatalogRoute({ area: 'components', component })).toEqual({
        redirect: '/explore?area=components',
      })
    for (const pattern of ['removed-pattern', ''])
      expect(resolveCatalogRoute({ pattern })).toEqual({ redirect: '/explore' })
    expect(resolveCatalogRoute({ area: 'unknown', pattern: 'table' })).toEqual({
      redirect: '/explore',
    })
  })

  it('preserves Dialog and Filter Bar legacy redirects in their relevant areas', () => {
    expect(resolveCatalogRoute({ area: 'components', component: 'dialog' })).toEqual({
      redirect: '/explore?pattern=dialog',
    })
    expect(resolveCatalogRoute({ component: 'dialog' })).toEqual({
      redirect: '/explore?pattern=dialog',
    })
    expect(resolveCatalogRoute({ pattern: 'filter-bar' })).toEqual({ redirect: '/explore' })
    expect(
      resolveCatalogRoute({ area: 'components', component: 'combobox', pattern: 'filter-bar' })
    ).toEqual({ area: 'components', id: 'combobox' })
  })

  it('recovers ambiguous repeated selectors without guessing one value', () => {
    expect(resolveCatalogRoute({ area: ['components', 'skills'] })).toEqual({
      redirect: '/explore',
    })
    expect(resolveCatalogRoute({ area: 'components', component: ['button', 'select'] })).toEqual({
      redirect: '/explore?area=components',
    })
    expect(resolveCatalogRoute({ pattern: ['table', 'card'] })).toEqual({ redirect: '/explore' })
    expect(resolveCatalogRoute({ area: 'skills', pattern: ['table', 'card'] })).toEqual({
      area: 'skills',
    })
  })

  it('uses the same area default for the header and the route', () => {
    expect(catalogArea(undefined)).toBe('patterns')
    expect(catalogArea(null)).toBe('patterns')
    expect(catalogArea('unknown')).toBe('patterns')
    expect(catalogArea('components')).toBe('components')
    expect(catalogArea('skills')).toBe('skills')
    expect(catalogArea('patterns')).toBe('patterns')
    expect(catalogArea('pro')).toBe('pro')
  })

  it('resolves the Relight page as its own area, whatever selectors a link kept', () => {
    expect(resolveCatalogRoute({ area: 'pro' })).toEqual({ area: 'pro' })
    expect(resolveCatalogRoute({ area: 'pro', pattern: 'table', component: 'button' })).toEqual({
      area: 'pro',
    })
  })

  it('sends the old address, area=rebuild, to area=pro', () => {
    expect(resolveCatalogRoute({ area: 'rebuild' })).toEqual({ redirect: '/explore?area=pro' })
    expect(resolveCatalogRoute({ area: 'rebuild', pattern: 'table' })).toEqual({ redirect: '/explore?area=pro' })
  })
})

describe('Catalog opening', () => {
  it('is a 404 before launch unless the preview flag is on, and public from LAUNCH_AT', () => {
    expect(catalogIsOpen({}, LAUNCH_AT - 1)).toBe(false)
    expect(catalogIsOpen({ DIYA_CATALOG_PREVIEW: '0' }, LAUNCH_AT - 1)).toBe(false)
    expect(catalogIsOpen({ DIYA_CATALOG_PREVIEW: 'true' }, LAUNCH_AT - 1)).toBe(false)
    expect(catalogIsOpen({ DIYA_CATALOG_PREVIEW: '1' }, LAUNCH_AT - 1)).toBe(true)
    expect(catalogIsOpen({}, LAUNCH_AT)).toBe(true)
    expect(catalogIsOpen({ DIYA_CATALOG_PREVIEW: '0' }, LAUNCH_AT + 1)).toBe(true)
  })

  it('reads the pinned server clock, which production ignores', () => {
    const after = '2026-11-07T00:00:01-08:00'
    expect(catalogIsOpen({ DIYA_NOW: after })).toBe(true)
    expect(catalogIsOpen({ DIYA_NOW: '2026-11-06T23:59:59-08:00' })).toBe(false)
    expect(catalogIsOpen({ DIYA_NOW: after, VERCEL_ENV: 'production' }, LAUNCH_AT - 1)).toBe(false)
  })
})

describe('Catalog page addresses and titles', () => {
  it('gives each page one canonical address and its own title', () => {
    expect(catalogPath({ area: 'components', id: 'button' })).toBe('/explore?area=components&component=button')
    expect(catalogPath({ area: 'patterns', id: 'table' })).toBe('/explore?pattern=table')
    expect(catalogPath({ area: 'pro' })).toBe('/explore?area=pro')
    expect(catalogTitle({ area: 'patterns', id: 'table' })).toBe('Table — DIYA')
    expect(catalogTitle({ area: 'components', id: 'link' })).toBe('Text Link — DIYA')
    expect(catalogTitle({ area: 'pro' })).toBe('Relight — DIYA')
    expect(catalogTitle({ area: 'skills' })).toBe('Skills & Prompts — DIYA')
  })

  it('lists every component and pattern once for the sitemap, each resolving to itself', () => {
    const paths = catalogItemPaths()
    expect(paths).toHaveLength(componentIds.length + patternIds.length)
    expect(paths).toHaveLength(38)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) {
      const route = resolveCatalogRoute(Object.fromEntries(new URL(path, 'https://diya13.ai').searchParams))
      expect('redirect' in route ? route.redirect : catalogPath(route)).toBe(path)
    }
  })
})
