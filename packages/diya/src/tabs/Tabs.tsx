'use client'
import { forwardRef, useId, useRef, type HTMLAttributes, type ReactNode, type KeyboardEvent } from 'react'
import { Badge, type BadgeProps } from '../badge/Badge.js'
import { cx } from '../internal/cx.js'

export type TabItem = {
  /** Unique key for the tab; `value` and `onValueChange` use it. */
  value: string
  /** Visible tab text. */
  label: string
  /** Decorative icon before the label; hidden from screen readers. */
  icon?: ReactNode
  /** Small Badge after the label, such as an unread count; its `label` is the badge's accessible name. */
  badge?: Omit<BadgeProps, 'size'>
  /** Skips this tab for clicks and arrow keys. */
  disabled?: boolean
  /** Panel shown while this tab is selected. */
  content: ReactNode
}
export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  /** The tabs, in order. */
  items: TabItem[]
  /** `value` of the selected tab; falls back to the first enabled tab. */
  value: string
  /** Called with a tab's `value` when it is clicked or reached with the arrow, Home or End keys. */
  onValueChange: (value: string) => void
  /** Accessible name for the tab list; not shown. */
  label: string
  /** 'underline' marks the selected tab with a line; 'pill' fills it. Defaults to 'underline'. */
  variant?: 'underline' | 'pill'
  /** Tab height and text size. Defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Disables every tab. */
  disabled?: boolean
}
/** Tabs that switch between panels in place, with arrow-key navigation. The ref, `className`, `style` and other attributes go to the outer element. */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs({ items, value, onValueChange, label, variant = 'underline', size = 'medium', disabled = false, className, ...props }, ref) {
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const selected = items.findIndex((item) => item.value === value && !item.disabled)
  const active = selected >= 0 ? selected : items.findIndex((item) => !item.disabled)
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const available = items.map((item, i) => !item.disabled ? i : -1).filter((i) => i >= 0)
    if (!available.length) return
    const position = available.indexOf(index)
    const next = event.key === 'Home' ? available[0] : event.key === 'End' ? available[available.length - 1]
      : available[(position + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length]
    buttons.current[next]?.focus()
    onValueChange(items[next].value)
  }
  return (
    <div {...props} ref={ref} className={cx('diya-tabs', className)} data-variant={variant} data-size={size}>
      <div className="diya-tab-list" role="tablist" aria-label={label} aria-orientation="horizontal">
        {items.map((item, index) => (
          <button key={item.value} ref={(node) => { buttons.current[index] = node }}
            className="diya-tab" type="button" role="tab" id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`} aria-selected={index === active}
            tabIndex={index === active && !disabled ? 0 : -1} disabled={disabled || item.disabled}
            onClick={() => onValueChange(item.value)} onKeyDown={(event) => navigate(event, index)}>
            {item.icon && <span className="diya-tab-icon" aria-hidden="true">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && <Badge {...item.badge} size="small" />}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div key={item.value} className="diya-tab-panel" role="tabpanel" id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`} hidden={index !== active} tabIndex={0}>
          {item.content}
        </div>
      ))}
    </div>
  )
})
