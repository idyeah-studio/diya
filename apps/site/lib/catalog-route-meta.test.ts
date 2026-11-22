import { describe, expect, it } from 'vitest'
import { componentIds, patternIds, type CatalogRoute } from './catalog-route'
import { catalogDescription, catalogPath, catalogTitle } from './catalog-route-meta'
import { LAUNCHED_IMAGE, shareCard } from './share-card'
import { screens } from '../components/screens/screens-data'
import { itemReference } from '../components/reference/api'

const items: CatalogRoute[] = [
  ...componentIds.map((id) => ({ area: 'components' as const, id })),
  ...patternIds.map((id) => ({ area: 'patterns' as const, id })),
]
const screenRoutes: CatalogRoute[] = [{ area: 'screens', id: null }, ...screens.map((screen) => ({ area: 'screens' as const, id: screen.id }))]
const every: CatalogRoute[] = [...items, ...screenRoutes, { area: 'motion' }, { area: 'pro' }]

describe('catalogDescription', () => {
  it('gives every catalog page its own plain sentence, never the home page’s', () => {
    const seen = new Map<string, string>()
    for (const route of every) {
      const description = catalogDescription(route)
      const path = catalogPath(route)
      expect(description, path).toMatch(/^[A-Z0-9].{22,}[.!?”"]$/)
      expect(description, path).not.toMatch(/`|undefined|null|\s{2}/)
      // No prop or attribute left behind once the code marks are gone ("…with href or asChild.").
      expect(description, path).not.toMatch(/="|\b(asChild|href|multiple|range|open|label is set)\b[.,]?$/)
      expect(description, path).not.toContain('40+')
      expect(seen.get(description), `${path} repeats ${seen.get(description)}`).toBeUndefined()
      seen.set(description, path)
    }
  })

  it('reads components and patterns from api.json, as the first sentence a person needs', () => {
    expect(catalogDescription({ area: 'patterns', id: 'table' })).toBe(
      'A data table with optional search, filters, sorting, row selection, bulk and row actions, and pagination, all run in the browser.'
    )
    // Up to the semicolon, without code marks.
    expect(catalogDescription({ area: 'components', id: 'button' })).toBe(
      "A native button in DIYA's styles, or a link that looks like one."
    )
    // Parenthesized props go.
    expect(catalogDescription({ area: 'components', id: 'badge' })).toBe('A small count or dot that flags status or new items.')
    // A sentence too short to help gets the catalog's guidance.
    expect(catalogDescription({ area: 'components', id: 'link' })).toBe('A styled anchor. For going somewhere: another page, a section, a document.')
    // A quote that ends the sentence stays whole.
    expect(catalogDescription({ area: 'components', id: 'rating' })).toBe(
      'A read-only star rating, with an optional number and review count, announced as one phrase such as "Rated 4.3 out of 5, 128 reviews".'
    )
    for (const route of items) {
      if (route.area !== 'components' && route.area !== 'patterns') continue
      expect(catalogDescription(route).slice(0, 10), route.id).toBe(itemReference(route.id)!.description.slice(0, 10))
    }
  })

  it('reads screens from screens-data: the gallery counts the ready ones, a poster says what it waits on', () => {
    const ready = screens.filter((screen) => screen.status === 'ready').length
    expect(catalogDescription({ area: 'screens', id: null })).toBe(
      `${ready} whole screens for React, ready to paste: one file each, with sample data and every state already working.`
    )
    const live = screens.find((screen) => screen.status === 'ready')!
    expect(catalogDescription({ area: 'screens', id: live.id })).toBe(live.description)
    const poster = screens.find((screen) => screen.status === 'poster')
    if (poster && poster.status === 'poster')
      expect(catalogDescription({ area: 'screens', id: poster.id })).toBe(`${poster.description} Waiting on ${poster.waitingOn}.`)
    // An unknown screen falls back to the gallery, like the page.
    expect(catalogDescription({ area: 'screens', id: 'nope' })).toBe(catalogDescription({ area: 'screens', id: null }))
  })

  it('never promises Relight is out', () => {
    expect(catalogDescription({ area: 'pro' })).toMatch(/coming to DIYA Pro/)
  })
})

describe('catalogTitle', () => {
  it('uses one separator, the em dash, on every catalog page', () => {
    for (const route of every) expect(catalogTitle(route), catalogPath(route)).toMatch(/ — DIYA$/)
  })
})

describe('shareCard', () => {
  it('names the page on Open Graph and X, with the site’s name and the launched image', () => {
    const card = shareCard({ title: 'Table — DIYA', description: 'A data table.', path: '/explore?pattern=table' })
    expect(card.openGraph).toEqual({
      title: 'Table — DIYA',
      description: 'A data table.',
      type: 'website',
      siteName: 'DIYA',
      url: '/explore?pattern=table',
      images: [LAUNCHED_IMAGE],
    })
    expect(card.twitter).toEqual({ card: 'summary_large_image', title: 'Table — DIYA', description: 'A data table.', images: [LAUNCHED_IMAGE] })
    expect(LAUNCHED_IMAGE.url).toBe('/social-preview-v7.jpg')
  })
})
