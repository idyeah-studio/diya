'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'

// Where each list was scrolled, so a page change, which mounts a new sidebar, keeps the list
// where the reader left it.
const scrolled = new Map<string, number>()

/**
 * Keeps the selected item in view. With `list`, the list also keeps its scroll position across
 * page changes. It runs before paint, so a page transition captures the sidebar where it will
 * be, and the selected highlight slides to the item's real place.
 */
export function useActiveCatalogItem(
  nav: RefObject<HTMLElement | null>,
  current: string,
  query: string,
  list?: string
) {
  const previousQuery = useRef(query)
  const restored = useRef(false)
  useLayoutEffect(() => {
    const container = nav.current
    if (!container) return
    if (list && !restored.current && !query && scrolled.has(list)) container.scrollTop = scrolled.get(list)!
    restored.current = true

    const revealActive = () => {
      const active = container.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) return
      const item = active.getBoundingClientRect()
      const box = container.getBoundingClientRect()
      if (box.height > 0 && (item.bottom > box.bottom || item.top < box.top))
        container.scrollTop += item.top - box.top - box.height / 2 + item.height / 2
    }

    if (previousQuery.current !== query) container.scrollTop = 0
    else revealActive()
    previousQuery.current = query

    let previousBox = container.getBoundingClientRect()
    const revealOnResize = () => {
      const box = container.getBoundingClientRect()
      const resized = box.width !== previousBox.width || box.height !== previousBox.height
      previousBox = box
      if (resized && !query) revealActive()
    }

    const remember = () => { if (list && !query) scrolled.set(list, container.scrollTop) }
    remember()
    container.addEventListener('scroll', remember, { passive: true })

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(revealOnResize)
      observer.observe(container)
      return () => {
        observer.disconnect()
        container.removeEventListener('scroll', remember)
      }
    }
    window.addEventListener('resize', revealOnResize)
    return () => {
      window.removeEventListener('resize', revealOnResize)
      container.removeEventListener('scroll', remember)
    }
  }, [nav, current, query, list])
}
