'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type CatalogSearchArea = 'components' | 'patterns'
type CatalogQueries = Record<CatalogSearchArea, string>
type CatalogSearch = {
  queries: CatalogQueries
  changeQuery: (area: CatalogSearchArea, value: string) => void
}

const CatalogSearchContext = createContext<CatalogSearch | null>(null)

/** Keep each area's search while its individual preview pages mount and unmount. */
export function CatalogSearchProvider({ children }: { children: ReactNode }) {
  const [queries, setQueries] = useState<CatalogQueries>({ components: '', patterns: '' })
  const changeQuery = useCallback((area: CatalogSearchArea, value: string) => {
    setQueries((previous) => (previous[area] === value ? previous : { ...previous, [area]: value }))
  }, [])
  const search = useMemo(() => ({ queries, changeQuery }), [queries, changeQuery])
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
