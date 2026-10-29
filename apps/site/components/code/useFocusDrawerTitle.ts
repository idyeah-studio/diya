'use client'
import { useEffect } from 'react'

/** Focus a drawer's own title as it opens, so it is read from the top. */
export function useFocusDrawerTitle(open: boolean, inside: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      /* The title keeps its class at any heading level. */
      const heading = inside.current?.closest('dialog')?.querySelector<HTMLElement>(':scope > header :is(.diya-drawer-title, h3)')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, inside])
}
