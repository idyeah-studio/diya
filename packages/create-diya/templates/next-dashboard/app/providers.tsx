'use client'
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { DiyaProvider } from '@idyeah/diya'
import { StoreProvider } from '@/lib/store'
import { BRAND } from '@/lib/brand'

// The provider takes Next.js Link, a component, so it lives in a client file.
// The app also lets Settings change the look live, so the three props DIYA
// needs for that (theme, brandColor, glass) are kept here, with the backdrop
// Glass shows through.

export type Backdrop =
  | 'studio'
  | 'ember'
  | 'lagoon'
  | 'image'
export type Look = {
  theme: 'system' | 'light' | 'dark'; brandColor: string; glass: boolean; backdrop: Backdrop
}
export const DEFAULT_LOOK: Look = { theme: 'system', brandColor: '', glass: false, backdrop: BRAND.backdrop ? 'image' : 'studio' }
const BACKDROPS: Backdrop[] = [
  'studio',
  'ember',
  'lagoon',
]
if (BRAND.backdrop) BACKDROPS.push('image')

const LookContext = createContext<{ look: Look; setLook: (next: Partial<Look>) => void } | null>(null)
export const useLook = () => useContext(LookContext)!

const KEY = 'oriel-look'

export function Providers({ children }: { children: ReactNode }) {
  const [look, setLookState] = useState(DEFAULT_LOOK)

  // Remember the look in this browser only. Read after mount, so the server's
  // HTML and the first client render agree.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) {
        const look = { ...DEFAULT_LOOK, ...JSON.parse(saved) }
        // A backdrop this version doesn't have falls back to the default.
        if (!BACKDROPS.includes(look.backdrop)) look.backdrop = DEFAULT_LOOK.backdrop
        setLookState(look)
      }
    } catch {}
  }, [])
  const setLook = (next: Partial<Look>) =>
    setLookState((current) => {
      const merged = { ...current, ...next }
      try {
        localStorage.setItem(KEY, JSON.stringify(merged))
      } catch {}
      return merged
    })
  // Glass can blur your own image (BRAND.backdrop); app/oriel.css calms it.
  const style: CSSProperties | undefined =
    (look.backdrop === 'image' && BRAND.backdrop ? ({ '--backdrop-image': `url(${JSON.stringify(BRAND.backdrop)})` } as CSSProperties) : undefined)

  return (
    <LookContext.Provider value={{ look, setLook }}>
      <DiyaProvider
        linkComponent={Link}
        theme={look.theme}
        glass={look.glass}
        brandColor={look.brandColor || undefined}
        className={`oriel backdrop-${look.backdrop}`}
        style={style}
      >
        <StoreProvider>{children}</StoreProvider>
      </DiyaProvider>
    </LookContext.Provider>
  )
}
