'use client'
import { useEffect } from 'react'

/**
 * Keeps the tab title and canonical link true on in-catalog navigation.
 * Every catalog page is /explore with a different query, and Next applies a
 * prefetched head for those moves, so a link to Card could leave
 * "Page Header — DIYA" in the tab. A full load already has the right head
 * from generateMetadata.
 */
export function CatalogHead({ title, path }: { title: string; path: string }) {
  useEffect(() => {
    const settle = () => {
      if (document.title !== title) document.title = title
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (canonical) canonical.href = new URL(path, canonical.href).href
    }
    settle()
    // Next may apply its head after this commit; settle on ours.
    const frame = window.requestAnimationFrame(settle)
    return () => window.cancelAnimationFrame(frame)
  }, [title, path])
  return null
}
