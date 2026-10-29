'use client'
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { effectiveAppearance, type Appearance, type AppearancePath, type Theme } from '../../lib/customize/appearance'
import type { ItemId } from '../../lib/customize/registry'
import {
  brandVisible,
  explicitChoices,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type CustomizeState,
} from '../../lib/customize/store'

type Ui = {
  /** The item whose panel is open, if any. */
  open: ItemId | null
  setOpen: (id: ItemId | null) => void
  /** The theme the panel is editing and the preview shows; null follows the site. */
  previewTheme: Theme | null
  setPreviewTheme: (theme: Theme | null) => void
  /** A setting the open panel should bring into view and focus (from Get theme). */
  focusRequest: { path: AppearancePath; at: number } | null
  requestFocus: (path: AppearancePath, theme: Theme) => void
}

const UiContext = createContext<Ui | null>(null)

/**
 * Panel state for the catalog. Customizations themselves live in the store.
 * At 1.0 the panel edits the brand only; per-component themes come later.
 */
export function CustomizeProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState<ItemId | null>(null)
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null)
  const [focusRequest, setFocusRequest] = useState<Ui['focusRequest']>(null)
  /* Stable, so effects can depend on it without re-running. */
  const setOpen = useCallback((id: ItemId | null) => {
    setOpenState(id)
    setPreviewTheme(null)
    setFocusRequest(null)
  }, [])
  const requestFocus = useCallback((path: AppearancePath, theme: Theme) => {
    setPreviewTheme(theme)
    setFocusRequest({ path, at: Date.now() })
  }, [])
  const value = useMemo<Ui>(
    () => ({ open, setOpen, previewTheme, setPreviewTheme, focusRequest, requestFocus }),
    [open, setOpen, previewTheme, focusRequest, requestFocus],
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useCustomizeUi(): Ui {
  const ui = useContext(UiContext)
  if (!ui) throw new Error('useCustomizeUi needs CustomizeProvider')
  return ui
}

/** For components that also render outside the catalog (the drawers in tests). */
export function useOptionalCustomizeUi(): Ui | null {
  return useContext(UiContext)
}

/** Stored customizations; the server and the first client render see none. */
export function useCustomizeState(): CustomizeState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useItemAppearance(id: ItemId): {
  appearance: Appearance
  customized: boolean
  /** Glass was chosen in the brand, not just left at its default. */
  translucentChosen: boolean
  /** The item's own settings (Button's shape, size and so on). */
  ownCount: number
} {
  const state = useCustomizeState()
  /* Brand-level only at 1.0: item colour overrides saved by the preview stay stored but don't apply. */
  return useMemo(() => {
    const options = Object.keys(state.items[id]?.options ?? {}).length
    return {
      appearance: effectiveAppearance(state.brand),
      customized: brandVisible(state.brand) || options > 0,
      translucentChosen: explicitChoices(state, null).includes('translucent'),
      ownCount: options,
    }
  }, [state, id])
}
