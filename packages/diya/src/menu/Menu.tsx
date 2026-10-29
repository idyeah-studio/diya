'use client'
import { forwardRef, type ReactNode, type KeyboardEvent, type MouseEvent } from 'react'
import { FloatingSurface, type FloatingTriggerProps } from '../overlay/FloatingSurface.js'
import { useDiyaLinkComponent } from '../internal/link.js'
export type MenuItem = {
  /** 'action' runs and closes; 'checkbox' toggles and keeps the menu open; 'radio' picks one of a set and closes. Defaults to 'action'. */
  type?: 'action' | 'checkbox' | 'radio'
  /** Whether a checkbox or radio item is on; you own this state. */
  checked?: boolean
  /** Unique key for the item. */
  id: string
  /** Visible item text; typing its first letter moves focus to it. */
  label: string
  /** Decorative icon before the label; hidden from screen readers. */
  icon?: ReactNode
  /** Visible keyboard hint, such as '⌘K'; it does not bind the key and is hidden from screen readers. */
  shortcut?: string
  /** Shows the item but makes it unselectable. */
  disabled?: boolean
  /** Styles the item as a destructive action, such as Delete. */
  destructive?: boolean
  /** Draws a separator line above this item. */
  separatorBefore?: boolean
  /** Makes the item a real link to this URL, through the provider's `linkComponent`; a plain click calls `onSelect` instead of navigating when both are given. */
  href?: string
  /** Marks a link item as the page you're on (`aria-current="page"`). */
  current?: boolean
  /** Called when the item is chosen; optional for link items. */
  onSelect?: () => void
}
export type MenuProps = FloatingTriggerProps & {
  /** The trigger button's visible text, or only its accessible name when `triggerIcon` is set; also names the menu. */
  label: string
  /** Shows this icon as an icon-only trigger instead of the label text. */
  triggerIcon?: ReactNode
  /** The menu's items, in order. */
  items: MenuItem[]
  /** Disables the trigger. */
  disabled?: boolean
}
/** A button that opens a list of actions, links, checkboxes or radio choices, with arrow-key and typeahead navigation; `className`, `style`, other attributes and the ref go to the trigger. */
export const Menu = forwardRef<HTMLButtonElement, MenuProps>(function Menu({ label, items, disabled = false, triggerIcon, ...props }, ref) {
  const Link = useDiyaLinkComponent()
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const entries = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)'))
    if (!entries.length) return
    const current = entries.indexOf(document.activeElement as HTMLButtonElement)
    let next = -1
    if (event.key === 'ArrowDown') next = (current + 1) % entries.length
    else if (event.key === 'ArrowUp') next = current < 0 ? entries.length - 1 : (current - 1 + entries.length) % entries.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = entries.length - 1
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      const ordered = [...entries.slice(current + 1), ...entries.slice(0, current + 1)]
      const match = ordered.find((entry) => entry.dataset.label?.toLowerCase().startsWith(event.key.toLowerCase()))
      if (match) { event.preventDefault(); match.focus() }; return
    } else return
    event.preventDefault(); entries[next]?.focus()
  }
  return <FloatingSurface {...props} ref={ref} triggerIcon={triggerIcon} label={label} role="menu" disabled={disabled} onPanelKeyDown={navigate}>{(close) => items.map((item) => <div key={item.id} role="none">
    {item.separatorBefore && <div role="separator" className="diya-menu-separator" />}
    {item.href && !item.disabled && item.type !== 'checkbox' && item.type !== 'radio'
      ? <Link href={item.href} role="menuitem" tabIndex={-1} data-label={item.label} className="diya-menu-item" data-destructive={item.destructive} aria-current={item.current ? 'page' : undefined}
        onKeyDown={(event: KeyboardEvent<HTMLAnchorElement>) => { if (event.key === ' ') { event.preventDefault(); event.currentTarget.click() } }}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (item.onSelect && !event.defaultPrevented && !event.button && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); item.onSelect() }
          close()
        }}>{content(item)}</Link>
      : <button type="button" role={item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem'} aria-checked={item.type === 'checkbox' || item.type === 'radio' ? !!item.checked : undefined} tabIndex={-1} data-label={item.label} className="diya-menu-item" data-destructive={item.destructive} disabled={item.disabled} onClick={() => { item.onSelect?.(); if(item.type !== 'checkbox') close() }}>
        {content(item)}
      </button>}
  </div>)}</FloatingSurface>
})
function content(item: MenuItem) {
  return <>
    {(item.type === 'checkbox' || item.type === 'radio') && <span className="diya-menu-icon" aria-hidden="true">{item.checked ? (item.type === 'radio' ? '●' : '✓') : ''}</span>}
    {item.icon && <span className="diya-menu-icon" aria-hidden="true">{item.icon}</span>}<span>{item.label}</span>{item.shortcut && <span className="diya-menu-shortcut" aria-hidden="true">{item.shortcut}</span>}
  </>
}
