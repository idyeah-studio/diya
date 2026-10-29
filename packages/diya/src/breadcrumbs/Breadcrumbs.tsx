'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { Menu } from '../menu/Menu.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useDiyaLinkComponent } from '../internal/link.js'
import { breadcrumbsMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    breadcrumbs: typeof breadcrumbsMessages
  }
}
export type BreadcrumbItem = {
  /** Visible page name. */
  label: string
  /** Link target; also the item's key, so keep it unique. */
  href: string
}
export type BreadcrumbsProps = HTMLAttributes<HTMLElement> & {
  /** The trail from the top level to the current page; the last item is the current page and is not a link. */
  items: BreadcrumbItem[]
  /** Replaces the first item's text with a home icon; its `label` stays as the accessible name. */
  showHomeIcon?: boolean
  /** With more than three items, folds the middle ones into a "More pages" menu. */
  collapsed?: boolean
  /** Handles plain left-clicks and menu picks in the app instead of following `href`; modified clicks still open the link. Without it, items are links through the provider's `linkComponent`. */
  onNavigate?: (item: BreadcrumbItem) => void
}
/** A trail of links from the top level to the current page; the ref, `className`, `style` and other attributes go to the `nav`. */
export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs({ items, showHomeIcon = false, collapsed = false, onNavigate, className, ...props }, ref) {
  const t = useDiyaMessages('breadcrumbs', breadcrumbsMessages)
  const Link = useDiyaLinkComponent()
  if (!items.length) return null
  const middle = items.slice(1, -1)
  const shown = collapsed && items.length > 3 ? [items[0], null, items[items.length - 1]] : items
  return <nav aria-label={t.label} {...props} ref={ref} className={cx('diya-breadcrumbs', className)}><ol>{shown.map((item, index) => <li key={`${item?.href ?? 'collapsed'}-${index}`}>
    {index > 0 && <svg className="diya-breadcrumb-separator" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>}
    {!item ? <span className="diya-breadcrumb-collapse"><Menu label={t.morePages} items={middle.map((entry) => ({ id:entry.href, label:entry.label, href:entry.href, onSelect:onNavigate && (() => onNavigate(entry)) }))} /></span> : index === shown.length - 1 ? <span aria-current="page">{item.label}</span> : <Link href={item.href} aria-label={showHomeIcon && index === 0 ? item.label : undefined} onClick={onNavigate ? (event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(item) } : undefined}>{showHomeIcon && index === 0 ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3Z M9 21v-8h6v8" /></svg> : item.label}</Link>}
  </li>)}</ol></nav>
})
