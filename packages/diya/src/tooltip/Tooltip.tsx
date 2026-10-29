'use client'
import { Children, cloneElement, forwardRef, isValidElement, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { useDiyaPortal } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { composeRefs, renderSlot } from '../internal/slot.js'
export type TooltipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'content' | 'children'> & {
  /** Visible text in the bubble, shown on hover, focus or tap; also read as the trigger's description. */
  content: string
  /** Accessible name for the tooltip's own trigger button, not shown, such as 'Billing help'. Leave it out when the child is your own trigger. */
  label?: string
  /** With `label`, noninteractive content for the tooltip's own button, such as an icon. Without it, your single trigger element, such as `<Button iconOnly aria-label="Delete">`, which gets the hover, focus and description wiring. */
  children: ReactNode
  /** Preferred side for the bubble; it moves to stay on screen. Defaults to 'top'. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}
/** A short hint in a bubble beside its trigger: your own child element, or the tooltip's button when `label` is set. The ref reaches the trigger. */
export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(function Tooltip({ content, label, children, placement = 'top', className, ...props }, ref) {
  const providerPortal = useDiyaPortal()
  const id = useId()
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const trigger = useRef<HTMLElement | null>(null)
  const setTrigger = useMemo(() => composeRefs<HTMLElement>(trigger, ref as Ref<HTMLElement>), [ref])
  const tip = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const modal = open ? trigger.current?.closest<HTMLDialogElement>('dialog[open]') : null
  const portal = modal && !modal.contains(providerPortal) ? modal : providerPortal
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false })
  useEffect(() => {
    if (!open) return
    const anchor = trigger.current?.getBoundingClientRect()
    const box = tip.current?.getBoundingClientRect()
    if (anchor && box) {
      let left = anchor.left + (anchor.width - box.width) / 2
      let top = placement === 'bottom' ? anchor.bottom + 10 : anchor.top - box.height - 10
      if (placement === 'left' || placement === 'right') {
        left = placement === 'left' ? anchor.left - box.width - 10 : anchor.right + 10
        top = anchor.top + (anchor.height - box.height) / 2
      }
      if (top < 8) top = anchor.bottom + 10
      if (top + box.height > window.innerHeight - 8) top = anchor.top - box.height - 10
      setPosition({
        left: Math.max(8, Math.min(left, window.innerWidth - box.width - 8)),
        top: Math.max(8, top),
        ready: true,
      })
    }
    const close = () => setOpen(false)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', escape)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, placement, content, portal])
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  function hideSoon() {
    leaveTimer.current = setTimeout(() => setOpen(false), 120)
  }
  function show() {
    clearTimeout(leaveTimer.current)
    if (!open) setPosition((old) => ({ ...old, ready: false }))
    setOpen(true)
  }
  const bubble = open &&
    portal &&
    createPortal(
      <span
        ref={tip}
        id={id}
        role="tooltip"
        className="diya-tooltip-bubble"
        style={{
          left: position.left,
          top: position.top,
          visibility: position.ready ? 'visible' : 'hidden',
        }}
        onMouseEnter={() => {
          clearTimeout(leaveTimer.current)
          setOpen(true)
        }}
        onMouseLeave={hideSoon}
      >
        {content}
      </span>,
      portal
    )
  if (label === undefined) {
    const child = Children.only(children)
    if (!isValidElement(child)) return null
    const own = child as ReactElement<{ 'aria-describedby'?: string }>
    const described = cx(own.props['aria-describedby'], open ? id : undefined) || undefined
    return (
      <>
        {renderSlot(cloneElement(own, { 'aria-describedby': described }), {
          ...props,
          className,
          onMouseEnter: show,
          onMouseLeave: hideSoon,
          onFocus: show,
          onBlur: () => setOpen(false),
        }, setTrigger)}
        {bubble}
      </>
    )
  }
  return (
    <span {...props} className={cx('diya-tooltip-anchor', className)} onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={setTrigger}
        className="diya-tooltip-trigger"
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={show}
      >
        {children}
      </button>
      {bubble}
    </span>
  )
})
