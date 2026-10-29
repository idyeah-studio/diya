'use client'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { listMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    list: typeof listMessages
  }
}
export type ListItem = {
  /** Unique key for the row. */
  id: string
  /** Visible main text. */
  label: string
  /** Visible secondary text under the label. */
  description?: string
  /** Decorative content before the text, such as an icon or Avatar; hidden from screen readers. */
  leading?: ReactNode
  /** Visible content at the end of the row, such as a Badge or a value; must be noninteractive. */
  trailing?: ReactNode
  /** Makes the whole row a button that calls this. */
  onSelect?: () => void
  /** Disables a selectable row. */
  disabled?: boolean
  /** Marks the open item, such as the message being read: a selected background and `aria-current="true"`. Defaults to false. */
  current?: boolean
  /** Marks the item as not yet seen: a heavier label and a dot at the end of the row, and "unread" after the label for screen readers. Defaults to false. */
  unread?: boolean
}
export type ListProps = Omit<HTMLAttributes<HTMLUListElement>, 'children'> & {
  /** The rows, in order. */
  items: ListItem[]
  /** Accessible name for the list; not shown. */
  label: string
  /** Draws lines between rows. */
  divided?: boolean
  /** Row height and text size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
}
/** A vertical list of rows. Selectable rows use a native button; leading/trailing slots must be noninteractive. */
export const List = forwardRef<HTMLUListElement, ListProps>(function List({ items, label, divided = false, size = 'medium', className, ...props }, ref) {
  const t = useDiyaMessages('list', listMessages)
  return <ul {...props} ref={ref} className={cx('diya-list', className)} aria-label={label} data-divided={divided} data-size={size}>{items.map((item) => {
    // The open item is current on the row people reach: its button, or the list item itself.
    const current = item.current ? 'true' as const : undefined
    const unread = item.unread ? true : undefined
    const content = <>{item.leading && <span className="diya-list-leading" aria-hidden="true">{item.leading}</span>}<span className="diya-list-copy"><span className="diya-list-label">{item.label}{unread && <span className="diya-sr-only">, {t.unread}</span>}</span>{item.description && <span className="diya-list-description">{item.description}</span>}</span>{item.trailing && <span className="diya-list-trailing">{item.trailing}</span>}{unread && <span className="diya-list-unread" aria-hidden="true" />}</>
    return <li key={item.id} aria-current={item.onSelect ? undefined : current}>{item.onSelect ? <button type="button" className="diya-list-row" aria-current={current} data-unread={unread} disabled={item.disabled} onClick={item.onSelect}>{content}</button> : <div className="diya-list-row" data-unread={unread}>{content}</div>}</li>
  })}</ul>
})
