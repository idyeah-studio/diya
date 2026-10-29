'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { listedScreens } from './screens/screens-data'

type CatalogSearchArea = 'components' | 'patterns' | 'screens'
type CatalogQueries = Record<CatalogSearchArea, string>
type CatalogSearch = {
  queries: CatalogQueries
  changeQuery: (area: CatalogSearchArea, value: string) => void
  screens: ReadonlySet<string>
}

const CatalogSearchContext = createContext<CatalogSearch | null>(null)

/* Without a provider (isolated previews, tests), a launched site's list: ready screens and posters. */
const LAUNCHED_SCREENS: ReadonlySet<string> = new Set(listedScreens(false).map((screen) => screen.id))

/**
 * Keep each area's search while its individual preview pages mount and
 * unmount. `screens` is the ids of the screens this build lists (the
 * server decides: building screens show only in preview builds).
 */
export function CatalogSearchProvider({ children, screens }: { children: ReactNode; screens?: readonly string[] }) {
  const [queries, setQueries] = useState<CatalogQueries>({ components: '', patterns: '', screens: '' })
  const changeQuery = useCallback((area: CatalogSearchArea, value: string) => {
    setQueries((previous) => (previous[area] === value ? previous : { ...previous, [area]: value }))
  }, [])
  const key = screens?.join(' ')
  const listed = useMemo(() => (key === undefined ? LAUNCHED_SCREENS : new Set(key ? key.split(' ') : [])), [key])
  const search = useMemo(() => ({ queries, changeQuery, screens: listed }), [queries, changeQuery, listed])
  return <CatalogSearchContext.Provider value={search}>{children}</CatalogSearchContext.Provider>
}

/** Isolated previews can still search without requiring the full catalog shell. */
export function useCatalogSearch(area: CatalogSearchArea) {
  const search = useContext(CatalogSearchContext)
  const [localQuery, setLocalQuery] = useState('')
  const changeQuery = search?.changeQuery
  const setQuery = useCallback(
    (value: string) => {
      if (changeQuery) changeQuery(area, value)
      else setLocalQuery(value)
    },
    [area, changeQuery]
  )
  return [search ? search.queries[area] : localQuery, setQuery] as const
}

/** The screens this build lists, for the sidebar and search. */
export function useListedScreens() {
  return useContext(CatalogSearchContext)?.screens ?? LAUNCHED_SCREENS
}
