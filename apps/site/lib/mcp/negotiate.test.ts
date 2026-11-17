import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config, proxy } from '../../proxy'
import { acceptedTypes, MCP_PAGE_PATH, wantsMcpPage } from './negotiate'

/*
 * diya13.ai/mcp answers people with a page and agents with the server. These
 * are the Accept headers each one really sends.
 */
const BROWSERS = {
  chrome: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  safari: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  firefox: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}
/** What every MCP client sends on POST (the spec requires both), and on GET for a stream. */
const MCP_POST = 'application/json, text/event-stream'
const MCP_SSE = 'text/event-stream'

const request = (method: string, accept?: string, extra: Record<string, string> = {}) =>
  new NextRequest('https://diya13.ai/mcp', { method, headers: { ...(accept ? { accept } : {}), ...extra } })

beforeEach(() => vi.stubEnv('DIYA_NOW', '2026-11-17T12:00:00Z'))
afterEach(() => vi.unstubAllEnvs())

describe('which /mcp requests get the page', () => {
  it('reads Accept as media types, leaving out the ones refused with q=0', () => {
    expect(acceptedTypes(BROWSERS.safari)).toEqual(['text/html', 'application/xhtml+xml', 'application/xml', '*/*'])
    expect(acceptedTypes('text/html;q=0, application/json')).toEqual(['application/json'])
    expect(acceptedTypes(' Text/HTML ; charset=utf-8 ')).toEqual(['text/html'])
    expect(acceptedTypes(null)).toEqual([])
  })

  it('gives every browser the page on GET and HEAD', () => {
    for (const [name, accept] of Object.entries(BROWSERS)) {
      expect(wantsMcpPage(request('GET', accept)), name).toBe(true)
      expect(wantsMcpPage(request('HEAD', accept)), name).toBe(true)
    }
    // A Next client navigation inside the site.
    expect(wantsMcpPage(request('GET', '*/*', { rsc: '1' }))).toBe(true)
  })

  it('never gives an MCP client the page: POST, a stream GET, or Accept naming both', () => {
    expect(wantsMcpPage(request('POST', MCP_POST))).toBe(false)
    expect(wantsMcpPage(request('POST', BROWSERS.chrome))).toBe(false)
    expect(wantsMcpPage(request('GET', MCP_SSE))).toBe(false)
    expect(wantsMcpPage(request('GET', `text/html, ${MCP_SSE}`))).toBe(false)
    expect(wantsMcpPage(request('GET', MCP_SSE, { rsc: '1' }))).toBe(false)
    expect(wantsMcpPage(request('DELETE', BROWSERS.chrome))).toBe(false)
  })

  it('leaves any other GET to the server, which answers 405 as before', () => {
    for (const accept of [undefined, '*/*', 'application/json', 'text/*', 'text/html;q=0'])
      expect(wantsMcpPage(request('GET', accept)), String(accept)).toBe(false)
  })
})

describe('the proxy at /mcp', () => {
  it('rewrites a browser to the page at the same address', () => {
    const response = proxy(request('GET', BROWSERS.chrome))
    expect(response.headers.get('x-middleware-rewrite')).toBe(`https://diya13.ai${MCP_PAGE_PATH}`)
    expect(response.headers.get('location')).toBeNull()
  })

  it('passes everything else to the server untouched', () => {
    for (const [method, accept] of [['POST', MCP_POST], ['GET', MCP_SSE], ['GET', '*/*'], ['GET', undefined], ['OPTIONS', undefined]] as const) {
      const response = proxy(request(method, accept))
      expect(response.headers.get('x-middleware-next'), `${method} ${accept}`).toBe('1')
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    }
  })

  it('sends the page’s internal path to the branded 404 before launch, and leaves it alone once open (QA-01)', () => {
    const internal = () => proxy(new NextRequest(`https://diya13.ai${MCP_PAGE_PATH}`, { headers: { accept: BROWSERS.chrome } }))
    vi.stubEnv('DIYA_NOW', '2026-11-01T12:00:00Z')
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '0')
    expect(internal().headers.get('x-middleware-rewrite')).toBe('https://diya13.ai/diya-preview-unavailable')
    // Open: a server that runs the proxy again on the rewrite's destination still gets the page.
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '1')
    expect(internal().headers.get('x-middleware-next')).toBe('1')
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '0')
    vi.stubEnv('DIYA_NOW', '2026-11-17T12:00:00Z')
    expect(internal().headers.get('x-middleware-next')).toBe('1')
  })

  it('is gated like the server: before launch without the flag, a browser gets the server’s 404', () => {
    vi.stubEnv('DIYA_NOW', '2026-11-01T12:00:00Z')
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '0')
    expect(proxy(request('GET', BROWSERS.chrome)).headers.get('x-middleware-next')).toBe('1')
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '1')
    expect(proxy(request('GET', BROWSERS.chrome)).headers.get('x-middleware-rewrite')).toBe(`https://diya13.ai${MCP_PAGE_PATH}`)
  })

})

describe('the proxy’s matcher', () => {
  const matches = (accept?: string, extra: Record<string, string> = {}) =>
    unstable_doesMiddlewareMatch({ config, url: '/mcp', headers: { ...(accept ? { accept } : {}), ...extra } })

  it('sends only a browser’s request for /mcp through the proxy', () => {
    for (const accept of Object.values(BROWSERS)) expect(matches(accept)).toBe(true)
    expect(matches('*/*', { rsc: '1' })).toBe(true)
  })

  it('keeps MCP clients off the proxy entirely, as before this page existed', () => {
    expect(matches(MCP_POST)).toBe(false)
    expect(matches(MCP_SSE)).toBe(false)
    expect(matches('*/*')).toBe(false)
    expect(matches()).toBe(false)
  })

  it('still covers the gated catalog pages and the page’s internal path, and never the landing', () => {
    for (const url of ['/explore', '/ask', '/changelog', MCP_PAGE_PATH]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true)
    expect(unstable_doesMiddlewareMatch({ config, url: '/', headers: { accept: BROWSERS.chrome } })).toBe(false)
  })
})
