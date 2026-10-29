'use client'
import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { countLabel } from '../badge/badge-utils.js'
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
  /** A quiet number after the label, such as unread messages: '99+' above 99, and a dot on the icon when collapsed. The accessible name keeps the real count ("Inbox, 120"). 0 shows nothing. */
  count?: number
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
  /** Pinned under the groups, such as an account or workspace Menu; it sits at the bottom when the navigation is given its full height. */
  footer?: ReactNode
  /** Smaller footer shown when collapsed, such as the account Menu with just an Avatar; defaults to `footer`. */
  collapsedFooter?: ReactNode
  /** Narrow, icon-only rail; defaults to false. */
  collapsed?: boolean
  /** Shows group headings; defaults to true. */
  showGroups?: boolean
  /** Accessible name for the navigation landmark (not shown); defaults to "Application navigation". */
  label?: string
}

/** A vertical app navigation with grouped items and an optional collapsed icon rail; items with `href` are links. The ref, `className`, `style` and other attributes go to the `nav`. */
export const SideNavigation = forwardRef<HTMLElement, SideNavigationProps>(function SideNavigation({ groups, value, onValueChange, brand, collapsedBrand, footer, collapsedFooter, collapsed = false, showGroups = true, label, className, ...props }, ref) {
  const t = useDiyaMessages('sideNavigation', sideNavigationMessages)
  const Link = useDiyaLinkComponent()
  return <nav aria-label={label ?? t.label} {...props} ref={ref} className={cx('diya-side-navigation diya-app-pattern-surface', className)} data-collapsed={collapsed}>
    {brand && <strong>{collapsed ? collapsedBrand ?? brand : brand}</strong>}
    {groups.map(group => <div key={group.id}>
      {showGroups && !collapsed && group.label && <small>{group.label}</small>}
      {group.items.map(item => {
        // Badge's cap: the shown number stops at 99+, the accessible name keeps the real count.
        const count = countLabel(item.count ?? 0, 99)
        const counted = count.count > 0
        const shared = { 'aria-current': value === item.value ? 'page' as const : undefined, 'aria-label': counted ? t.count(item.label, count.count) : collapsed ? item.label : undefined }
        const glyph = item.icon || (collapsed ? Array.from(item.label)[0] : null)
        const label = <span className="diya-side-navigation-label">{item.label}</span>
        const text = collapsed ? null : counted ? <span className="diya-side-navigation-text">{label}<span className="diya-side-navigation-count" aria-hidden="true">{count.text}</span></span> : label
        const inner = <>{glyph && <span className="diya-side-navigation-icon" aria-hidden="true">{glyph}{collapsed && counted && <span className="diya-side-navigation-dot" />}</span>}{text}</>
        return item.href && !item.disabled
          ? <Link key={item.value} href={item.href} {...shared} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (!onValueChange || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onValueChange(item.value)
          }}>{inner}</Link>
          : <button type="button" key={item.value} disabled={item.disabled} {...shared} onClick={() => onValueChange?.(item.value)}>{inner}</button>
      })}
    </div>)}
    {footer && <div className="diya-side-navigation-footer">{collapsed ? collapsedFooter ?? footer : footer}</div>}
  </nav>
})
