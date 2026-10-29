import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

const BEFORE = '2026-11-06T23:59:59-08:00'
const AFTER = '2026-11-07T00:00:00-08:00'

beforeEach(() => vi.stubEnv('DIYA_NOW', BEFORE))
afterEach(() => vi.unstubAllEnvs())

describe('catalog navigation before and after launch', () => {
  it('rewrites component queries to the normal unavailable-page renderer before launch unless preview is explicitly enabled', () => {
    for (const flag of [undefined, '0', 'true']) {
      vi.stubEnv('DIYA_CATALOG_PREVIEW', flag)
      const response = proxy(new NextRequest('https://diya13.ai/explore?area=components&component=button'))
      expect(response.headers.get('x-middleware-rewrite')).toBe('https://diya13.ai/diya-preview-unavailable')
      expect(response.headers.get('location')).toBeNull()
    }
  })

  it('lets the enabled catalog use its original selection and route checks', () => {
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '1')
    const response = proxy(new NextRequest('https://diya13.ai/explore?pattern=data-viz'))
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('opens the catalog to everyone from the launch moment, without the flag', () => {
    vi.stubEnv('DIYA_NOW', AFTER)
    for (const flag of [undefined, '0']) {
      vi.stubEnv('DIYA_CATALOG_PREVIEW', flag)
      for (const path of ['/explore', '/explore?area=components&component=button', '/explore?area=pro']) {
        const response = proxy(new NextRequest(`https://diya13.ai${path}`))
        expect(response.headers.get('x-middleware-next')).toBe('1')
        expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      }
    }
  })

  it('leaves the public site, API routes and image delivery to their own handlers', () => {
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '0')
    for (const path of ['/', '/robots.txt', '/sitemap.xml', '/api/launch', '/_next/image?url=hero.png', '/explore-extra']) {
      const response = proxy(new NextRequest(`https://diya13.ai${path}`))
      expect(response.headers.get('x-middleware-next')).toBe('1')
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    }
  })
})
