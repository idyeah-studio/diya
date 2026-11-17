import { NextResponse, type NextRequest } from 'next/server'
import { catalogIsOpen } from './lib/catalog-route'
import { MCP_PAGE_PATH, wantsMcpPage } from './lib/mcp/negotiate'

// Before launch, without the preview flag, the catalog's pages use the normal
// 404 renderer, so they send recovery HTML even without JavaScript. Keep this
// destination unmatched. From LAUNCH_AT they are public.
// The /mcp page's internal path is gated the same way.
const gated = new Set(['/explore', '/ask', '/changelog', MCP_PAGE_PATH])
const unavailable = '/diya-preview-unavailable'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (gated.has(pathname) && !catalogIsOpen()) {
    return NextResponse.rewrite(new URL(unavailable, request.url))
  }
  // /mcp: a browser gets the readable page at the same address, gated like the
  // server. Everything else goes on to the server's own route, unchanged.
  if (pathname === '/mcp' && catalogIsOpen() && wantsMcpPage(request)) {
    return NextResponse.rewrite(new URL(MCP_PAGE_PATH, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/explore',
    '/ask',
    '/changelog',
    // Only a request that could be a browser's reaches the proxy for /mcp. MCP
    // clients send `Accept: application/json, text/event-stream`, so their POSTs
    // and stream GETs skip it and go straight to app/mcp/route.ts.
    {
      source: '/mcp',
      has: [{ type: 'header', key: 'accept', value: '(.*)text/html(.*)' }],
      missing: [{ type: 'header', key: 'accept', value: '(.*)text/event-stream(.*)' }],
    },
    { source: '/mcp', has: [{ type: 'header', key: 'rsc', value: '1' }] },
    // Once the catalog is open some servers run the proxy again on a
    // rewrite's destination, so this path then passes through untouched.
    '/diya-mcp-page',
  ],
}
