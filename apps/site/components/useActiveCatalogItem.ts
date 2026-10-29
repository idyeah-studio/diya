'use client'

import { useEffect, useRef, type RefObject } from 'react'

export function useActiveCatalogItem(
  nav: RefObject<HTMLElement | null>,
  current: string,
  query: string
) {
  const previousQuery = useRef(query)
  useEffect(() => {
    const container = nav.current
    if (!container) return

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

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(revealOnResize)
      observer.observe(container)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', revealOnResize)
    return () => window.removeEventListener('resize', revealOnResize)
  }, [nav, current, query])
}
