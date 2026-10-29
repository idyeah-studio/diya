import { NextResponse, type NextRequest } from 'next/server'
import { catalogIsOpen } from './lib/catalog-route'

// Before launch, without the preview flag, the catalog's pages use the normal
// 404 renderer, so they send recovery HTML even without JavaScript. Keep this
// destination unmatched. From LAUNCH_AT they are public.
const gated = new Set(['/explore', '/ask', '/changelog'])

export function proxy(request: NextRequest) {
  if (gated.has(request.nextUrl.pathname) && !catalogIsOpen()) {
    return NextResponse.rewrite(new URL('/diya-preview-unavailable', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/explore', '/ask', '/changelog'] }
