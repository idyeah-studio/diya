'use client'
import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 560px)'

/** True on phone-width screens. DIYA's Table has no stacked layout for phones, so the app picks fewer, richer columns there. */
export function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(QUERY)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => matchMedia(QUERY).matches,
    () => false,
  )
}
