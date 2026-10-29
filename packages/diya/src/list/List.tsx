import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../internal/cx.js'
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
  return <ul {...props} ref={ref} className={cx('diya-list', className)} aria-label={label} data-divided={divided} data-size={size}>{items.map((item) => {
    const content = <>{item.leading && <span className="diya-list-leading" aria-hidden="true">{item.leading}</span>}<span className="diya-list-copy"><span className="diya-list-label">{item.label}</span>{item.description && <span className="diya-list-description">{item.description}</span>}</span>{item.trailing && <span className="diya-list-trailing">{item.trailing}</span>}</>
    return <li key={item.id}>{item.onSelect ? <button type="button" className="diya-list-row" disabled={item.disabled} onClick={item.onSelect}>{content}</button> : <div className="diya-list-row">{content}</div>}</li>
  })}</ul>
})
