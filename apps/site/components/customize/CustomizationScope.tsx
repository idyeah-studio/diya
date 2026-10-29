'use client'
import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import { brandSet, fonts } from '../../lib/customize/appearance'
import type { ItemId } from '../../lib/customize/registry'
import { appearanceCss } from '../../lib/customize/tokens'
import { useCustomizeUi, useItemAppearance } from './CustomizeContext'
import '../CustomizationFonts.css'
import './CustomizationScope.css'

/**
 * Previews an item exactly as your theme will render it: one provider
 * scope, so overlays portal inside it, with the customization as a scoped
 * stylesheet (never inline tokens, which would override the SDK's glass,
 * reduced-transparency and forced-colors rules).
 *
 * Uncustomized and in the site's theme it is an invisible boundary and adds
 * nothing. Customized, or previewed in the other theme, it becomes a canvas
 * painted in that theme's Background, so text, Background and Light/Dark
 * read exactly as they will ship.
 */
/** `canvas={false}` for a scope that only carries the appearance (a launcher in the controls row). */
export function CustomizationScope({ id, children, canvas = true }: { id: ItemId; children: ReactNode; canvas?: boolean }) {
  const site = useAppearance()
  const { open, previewTheme } = useCustomizeUi()
  const { appearance, customized, translucentChosen } = useItemAppearance(id)
  const theme = (open === id && previewTheme) || site.theme
  const painted = canvas && (customized || theme !== site.theme)
  const scope = `customize-scope--${id}`
  const css = customized ? appearanceCss(appearance, `.diya-root.${scope}`) : ''
  return (
    <DiyaProvider surface={false}
      theme={theme}
      /* Glass is how the catalog is being viewed until Glass is chosen in Customize. */
      glass={translucentChosen ? appearance.translucent : site.glass}
      /* One theme at a time, so the brand for this theme alone. */
      brandColor={customized && brandSet(appearance) ? appearance.colors[theme].accent : undefined}
      fontFamily={customized ? fonts[appearance.font].family : undefined}
      className={`customize-scope ${scope}${painted ? ' customize-scope--painted' : ''}${canvas ? '' : ' customize-scope--bare'}`}
    >
      {children}
      {css && <style>{css}</style>}
    </DiyaProvider>
  )
}
