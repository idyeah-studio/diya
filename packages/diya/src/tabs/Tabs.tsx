'use client'
import { forwardRef, useId, useRef, type HTMLAttributes, type ReactNode, type KeyboardEvent } from 'react'
import { Badge, type BadgeProps } from '../badge/Badge.js'
import { useDiyaMotion } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'

// A selection made this recently slides the indicator; anything else (the first placement, a
// font arriving, a resize, a hidden panel shown again) moves it at once.
const SLIDE_MS = 300

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
  // One indicator per tab list slides between tabs (D3). The server can't measure, so each tab's
  // own mark shows until this has measured and set data-indicator on the list. With motion off
  // there is no indicator at all: the per-tab marks are 1.0's.
  const motion = useDiyaMotion()
  const sliding = motion !== 'off'
  const list = useRef<HTMLDivElement>(null)
  const copies = useRef<(HTMLSpanElement | null)[]>([])
  const placed = useRef(active)
  const changedAt = useRef(Number.NEGATIVE_INFINITY)
  useClientLayoutEffect(() => {
    const node = list.current
    if (!sliding || !node) return
    if (placed.current !== active) {
      placed.current = active
      changedAt.current = performance.now()
    }
    let frame = 0
    const measure = () => {
      frame = 0
      const tab = buttons.current[active]
      // Inside a hidden panel a tab measures 0: the per-tab mark stays until it's shown again.
      if (!tab || !tab.offsetWidth) {
        delete node.dataset.indicator
        return
      }
      // Physical left plus translate, from offsetLeft: right to left and scrolled lists line up too.
      node.style.setProperty('--diya-internal-tab-indicator-x', `${tab.offsetLeft}px`)
      node.style.setProperty('--diya-internal-tab-indicator-y', `${tab.offsetTop}px`)
      node.style.setProperty('--diya-internal-tab-indicator-width', `${tab.offsetWidth}px`)
      node.style.setProperty('--diya-internal-tab-indicator-height', `${tab.offsetHeight}px`)
      // Pill labels: a copy of every label sits exactly over its tab, inside the indicator, so the
      // selected label rides along in the fill's own color and never fades mid-slide (VIS-01).
      copies.current.forEach((copy, index) => {
        const button = buttons.current[index]
        if (!copy || !button) return
        copy.style.left = `${button.offsetLeft}px`
        copy.style.top = `${button.offsetTop}px`
        copy.style.width = `${button.offsetWidth}px`
        copy.style.height = `${button.offsetHeight}px`
      })
      node.dataset.indicator = performance.now() - changedAt.current < SLIDE_MS ? 'move' : 'still'
    }
    measure()
    // Fonts arriving, labels changing and the list resizing all re-measure, once a frame. Only
    // the indicator and its copies are written, so nothing observed changes size.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure) }) : null
    observer?.observe(node)
    for (const button of buttons.current) if (button) observer?.observe(button)
    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [active, items, variant, size, sliding])
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
      <div ref={list} className="diya-tab-list" role="tablist" aria-label={label} aria-orientation="horizontal">
        {sliding && <span className="diya-tab-indicator" aria-hidden="true">
          {variant === 'pill' && <span className="diya-tab-indicator-labels">
            {items.map((item, index) => <span key={item.value} ref={(node) => { copies.current[index] = node }} className="diya-tab">
              {item.icon && <span className="diya-tab-icon">{item.icon}</span>}
              <span className="diya-tab-label">{item.label}</span>
              {item.badge && <Badge {...item.badge} size="small" />}
            </span>)}
          </span>}
        </span>}
        {items.map((item, index) => (
          <button key={item.value} ref={(node) => { buttons.current[index] = node }}
            className="diya-tab" type="button" role="tab" id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`} aria-selected={index === active}
            tabIndex={index === active && !disabled ? 0 : -1} disabled={disabled || item.disabled}
            onClick={() => onValueChange(item.value)} onKeyDown={(event) => navigate(event, index)}>
            {item.icon && <span className="diya-tab-icon" aria-hidden="true">{item.icon}</span>}
            {/* The bold width is reserved, so an underline tab doesn't grow when selected (VIS-07). */}
            <span className="diya-tab-label" data-label={item.label}>{item.label}</span>
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
