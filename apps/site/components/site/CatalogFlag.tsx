'use client'
import { useLayoutEffect } from 'react'

/**
 * Sets the catalog's style hook, `html[data-catalog="true"]`, for exactly as
 * long as a catalog page is showing. Rendered by app/explore/layout.tsx.
 *
 * A direct load gets it from the inline script before first paint; a client
 * navigation into the catalog from the layout effect; leaving the catalog
 * (say, for the landing) removes it in the effect's cleanup.
 */
export function CatalogFlag() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.catalog = 'true'
    return () => {
      delete root.dataset.catalog
    }
  }, [])
  return (
    <script
      // Runs while the HTML parses, so a direct load paints styled.
      dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.catalog='true'" }}
      suppressHydrationWarning
    />
  )
}
