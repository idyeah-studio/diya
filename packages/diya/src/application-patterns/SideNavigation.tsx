'use client'
import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useDiyaLinkComponent } from '../internal/link.js'
import { sideNavigationMessages } from './side-navigation-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    sideNavigation: typeof sideNavigationMessages
  }
}

export type SideNavigationItem = {
  /** Stable key; matched against the navigation's `value` and passed to `onValueChange`. */
  value: string
  /** Visible text; when collapsed it becomes the item's accessible name. */
  label: string
  /** Decorative icon before the label; when collapsed without one, the label's first letter shows. */
  icon?: ReactNode
  /** Makes the item a real link to this URL, through the provider's `linkComponent`; a plain click calls `onValueChange` instead of navigating when it is given. */
  href?: string
  /** Shows the item but prevents choosing it. */
  disabled?: boolean
}
export type SideNavigationGroup = {
  /** Stable key for the group. */
  id: string
  /** Small visible heading above the group; hidden when collapsed or `showGroups` is false. */
  label?: string
  /** The group's items, in order. */
  items: readonly SideNavigationItem[]
}
export type SideNavigationProps = HTMLAttributes<HTMLElement> & {
  /** Item groups, in order. */
  groups: readonly SideNavigationGroup[]
  /** The current item's `value`; it is marked as the current page. */
  value: string
  /** Called with an item's `value` when it is chosen; leave it out when every item has an `href` and the links do the routing. */
  onValueChange?: (value: string) => void
  /** Logo or product name at the top. */
  brand?: ReactNode
  /** Smaller brand shown when collapsed; defaults to `brand`. */
  collapsedBrand?: ReactNode
  /** Narrow, icon-only rail; defaults to false. */
  collapsed?: boolean
  /** Shows group headings; defaults to true. */
  showGroups?: boolean
  /** Accessible name for the navigation landmark (not shown); defaults to "Application navigation". */
  label?: string
}

/** A vertical app navigation with grouped items and an optional collapsed icon rail; items with `href` are links. The ref, `className`, `style` and other attributes go to the `nav`. */
export const SideNavigation = forwardRef<HTMLElement, SideNavigationProps>(function SideNavigation({ groups, value, onValueChange, brand, collapsedBrand, collapsed = false, showGroups = true, label, className, ...props }, ref) {
  const t = useDiyaMessages('sideNavigation', sideNavigationMessages)
  const Link = useDiyaLinkComponent()
  return <nav aria-label={label ?? t.label} {...props} ref={ref} className={cx('diya-side-navigation diya-app-pattern-surface', className)} data-collapsed={collapsed}>
    {brand && <strong>{collapsed ? collapsedBrand ?? brand : brand}</strong>}
    {groups.map(group => <div key={group.id}>
      {showGroups && !collapsed && group.label && <small>{group.label}</small>}
      {group.items.map(item => {
        const shared = { 'aria-current': value === item.value ? 'page' as const : undefined, 'aria-label': collapsed ? item.label : undefined }
        const inner = <>{item.icon && <span aria-hidden="true">{item.icon}</span>}{collapsed ? !item.icon && <span aria-hidden="true">{Array.from(item.label)[0]}</span> : item.label}</>
        return item.href && !item.disabled
          ? <Link key={item.value} href={item.href} {...shared} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (!onValueChange || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onValueChange(item.value)
          }}>{inner}</Link>
          : <button type="button" key={item.value} disabled={item.disabled} {...shared} onClick={() => onValueChange?.(item.value)}>{inner}</button>
      })}
    </div>)}
  </nav>
})
