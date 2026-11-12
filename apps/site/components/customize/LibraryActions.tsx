'use client'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Button } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import { customizeItems, type ItemId } from '../../lib/customize/registry'
import { resetItem } from '../../lib/customize/store'
import { Icon } from '../Icon'
import { LibraryDownload } from '../LibraryDownload'
import { CustomizePanel, triggerId } from './CustomizePanel'
import { useCustomizeUi, useItemAppearance } from './CustomizeContext'
import { GetThemeDrawer } from './GetThemeDrawer'
import { SlowMotionSwitch } from './SlowMotion'

/**
 * Header actions for every catalog item: Customize (or Customized, marked
 * in the brand's accent, with Reset for the item's own settings), Get code,
 * and the item's panel, whose Get theme exports the brand.
 */
export function LibraryActions({
  id,
  extra,
  options,
}: {
  id: ItemId
  /** Item-only settings shown under "{Item}’s own settings". */
  extra?: ReactNode
  options?: Record<string, string | boolean>
}) {
  const ui = useCustomizeUi()
  const site = useAppearance()
  const { appearance, customized, ownCount } = useItemAppearance(id)
  const [themeDrawer, setThemeDrawer] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const open = ui.open === id
  const accent = appearance.colors[ui.previewTheme ?? site.theme].accent
  const { setOpen, requestFocus } = ui
  /* Leaving the item closes its panel, so it never reopens unasked. */
  useEffect(() => () => setOpen(null), [id, setOpen])
  return (
    <div className="component-document-actions">
      <Button
        id={triggerId(id)}
        variant="quiet"
        size="small"
        shape="pill"
        className="customize-trigger"
        aria-expanded={open}
        aria-controls={open ? `customize-panel-${id}` : undefined}
        onClick={() => setOpen(open ? null : id)}
        onKeyDown={(event) => {
          /* The panel is rendered elsewhere in the page; Tab steps into it as if it followed here. */
          if (open && event.key === 'Tab' && !event.shiftKey) {
            const heading = document.querySelector<HTMLElement>(`#customize-panel-${id} h2`)
            if (heading) {
              event.preventDefault()
              heading.focus()
            }
          }
        }}
      >
        {customized ? (
          <span className="customize-trigger-dot" aria-hidden="true" style={{ '--customize-dot': accent } as CSSProperties} />
        ) : (
          <Icon name="settings" size={16} />
        )}
        {customized ? 'Customized' : 'Customize'}
      </Button>
      {ownCount > 0 && !open && (
        <Button
          variant="quiet"
          size="small"
          shape="pill"
          aria-label={`Reset ${customizeItems[id].title} customization`}
          onClick={() => {
            resetItem(id)
            setAnnouncement(`${customizeItems[id].title} reset. Its own settings are gone; your brand, if any, still applies.`)
            document.getElementById(triggerId(id))?.focus()
          }}
        >
          Reset
        </Button>
      )}
      <LibraryDownload id={id} glass={site.glass} theme={site.theme} />
      <SlowMotionSwitch />
      <span role="status" className="customize-visually-hidden">
        {announcement}
      </span>
      <CustomizePanel id={id} extra={extra} options={options} onGetTheme={() => setThemeDrawer(true)} />
      <GetThemeDrawer
        open={themeDrawer}
        onOpenChange={setThemeDrawer}
        onAdjust={(path, theme) => {
          if (!open) setOpen(id)
          requestFocus(path, theme)
        }}
      />
    </div>
  )
}
