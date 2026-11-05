'use client'
import { useEffect, useRef } from 'react'

/**
 * After a catalog navigation, focus moves to the new page's title (its one
 * `<h1>`), so a keyboard user carries on from the content instead of from
 * the top of the header and sidebar. A first load keeps the browser's own
 * focus; `path` is one address per page, so in-page controls never move it.
 */
export function TitleFocus({ path }: { path: string }) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const title = document.querySelector<HTMLElement>('main h1')
    if (!title) return
    if (!title.hasAttribute('tabindex')) title.tabIndex = -1
    title.focus({ preventScroll: true })
  }, [path])
  return null
}
