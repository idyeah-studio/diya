'use client'
import { DiyaProvider } from '@idyeah/diya'
import type { ReactNode } from 'react'
import { useAppearance } from '../app/Appearance'
import { CustomizeProvider } from './customize/CustomizeContext'
/** The installed download owns all preview controls, patterns, tokens and portals. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { theme, glass } = useAppearance()
  return (
    <DiyaProvider surface={false} theme={theme} glass={glass} className="catalog-provider">
      <CustomizeProvider>{children}</CustomizeProvider>
    </DiyaProvider>
  )
}
