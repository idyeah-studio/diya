'use client'
import { cloneElement, forwardRef, isValidElement, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { useDiyaMotion, useDiyaPortal } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { usePresence } from '../internal/presence.js'
import { composeRefs, onlyChild, renderSlot } from '../internal/slot.js'
export type TooltipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'content' | 'children'> & {
  /** Visible text in the bubble: shown after a mouse rests on the trigger for 300ms, and at once on keyboard focus, a tap or with `motion="off"`; also read as the trigger's description. */
  content: string
  /** Accessible name for the tooltip's own trigger button, not shown, such as 'Billing help'. Leave it out when the child is your own trigger. */
  label?: string
  /** With `label`, noninteractive content for the tooltip's own button, such as an icon. Without it, your single trigger element, such as `<Button iconOnly aria-label="Delete">`, which gets the hover, focus and description wiring. */
  children: ReactNode
  /** Preferred side for the bubble; it moves to stay on screen. Defaults to 'top'. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

// A mouse rests this long before a bubble shows, so passing over a toolbar shows nothing.
// Keyboard focus and touch show it at once, and so does motion="off".
const HOVER_DELAY_MS = 300
// Once one bubble is up, or for this long after it closes, the next one shows at once:
// moving along a row of icons doesn't wait again. Shared by every Tooltip on the page.
const WARM_MS = 300
let showing = 0
let lastClosed = Number.NEGATIVE_INFINITY
const warm = () => showing > 0 || Date.now() - lastClosed < WARM_MS
// The bubble shown last. Moving to a neighbor swaps the two at once, so they never overlap.
let current: { id: string; visible: () => boolean; dismiss: () => void } | null = null

/** A short hint in a bubble beside its trigger: your own child element, or the tooltip's button when `label` is set. The ref reaches the trigger. */
export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(function Tooltip({ content, label, children, placement = 'top', className, ...props }, ref) {
  const providerPortal = useDiyaPortal()
  const motion = useDiyaMotion()
  const id = useId()
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // The kind of pointer that last pressed the trigger: a mouse press doesn't show the bubble by itself.
  const pressedBy = useRef('')
  // The kind of pointer that last entered the trigger. Pointer events only record it: hover
  // itself is the mouse events, as in 1.0, so fireEvent.mouseEnter shows the bubble, and a
  // touch lifting off the trigger doesn't hide it.
  const pointer = useRef('')
  // Shown in place of a neighbor's bubble: no enter, so the two never show at once.
  const [swap, setSwap] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const setTrigger = useMemo(() => composeRefs<HTMLElement>(trigger, ref as Ref<HTMLElement>), [ref])
  const tip = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const isOpen = useRef(open)
  isOpen.current = open
  // Closing because the page scrolled or resized skips the exit: the bubble would float off its trigger.
  const quiet = useRef(false)
  const { present, closing } = usePresence(open, tip, quiet.current)
  // The outlet is chosen while open and kept through the exit.
  const outlet = useRef<HTMLElement | null>(null)
  if (open) {
    const modal = trigger.current?.closest<HTMLDialogElement>('dialog[open]')
    outlet.current = modal && !modal.contains(providerPortal) ? modal : providerPortal
  }
  const portal = present ? outlet.current ?? providerPortal : null
  // Placed before paint, by layout size: while the bubble scales in, its rectangle is smaller.
  useClientLayoutEffect(() => {
    const node = tip.current
    const anchor = trigger.current?.getBoundingClientRect()
    if (!open || !node || !anchor) return
    quiet.current = false
    const width = node.offsetWidth
    const height = node.offsetHeight
    let side: TooltipProps['placement'] = placement
    let left = anchor.left + (anchor.width - width) / 2
    let top = placement === 'bottom' ? anchor.bottom + 10 : anchor.top - height - 10
    if (placement === 'left' || placement === 'right') {
      left = placement === 'left' ? anchor.left - width - 10 : anchor.right + 10
      top = anchor.top + (anchor.height - height) / 2
    }
    if (top < 8) { side = 'bottom'; top = anchor.bottom + 10 }
    if (top + height > window.innerHeight - 8) { side = 'top'; top = anchor.top - height - 10 }
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    top = Math.max(8, top)
    node.style.left = `${left}px`
    node.style.top = `${top}px`
    node.dataset.side = side
    // It grows from the trigger's center, on the edge nearest the trigger.
    const centerX = `${Math.round(anchor.left + anchor.width / 2 - left)}px`
    const centerY = `${Math.round(anchor.top + anchor.height / 2 - top)}px`
    const origins = { top: `${centerX} 100%`, bottom: `${centerX} 0`, left: `100% ${centerY}`, right: `0 ${centerY}` }
    node.style.setProperty('--diya-internal-overlay-origin', origins[side])
  }, [open, placement, content, portal])
  useEffect(() => {
    if (!open) return
    showing += 1
    const close = () => setOpen(false)
    const away = () => { quiet.current = true; close() }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', escape)
    window.addEventListener('scroll', away, true)
    window.addEventListener('resize', away)
    return () => {
      showing -= 1
      lastClosed = Date.now()
      window.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', away, true)
      window.removeEventListener('resize', away)
    }
  }, [open])
  useEffect(() => () => {
    clearTimeout(leaveTimer.current)
    clearTimeout(showTimer.current)
  }, [])
  function hide() {
    pressedBy.current = ''
    clearTimeout(showTimer.current)
    setOpen(false)
  }
  function hideSoon() {
    clearTimeout(showTimer.current)
    leaveTimer.current = setTimeout(() => setOpen(false), 120)
  }
  function show() {
    clearTimeout(leaveTimer.current)
    clearTimeout(showTimer.current)
    const other = current && current.id !== id && current.visible() ? current : null
    other?.dismiss()
    if (!open) setSwap(!!other)
    // The bubble may have been hidden mid-exit by a neighbor; it's back.
    if (tip.current) tip.current.style.visibility = ''
    current = {
      id,
      visible: () => isOpen.current || tip.current?.dataset.exiting === 'true',
      dismiss: () => {
        clearTimeout(leaveTimer.current)
        clearTimeout(showTimer.current)
        quiet.current = true
        setOpen(false)
        // Already leaving: hide what's left of its exit.
        if (tip.current?.dataset.exiting === 'true') tip.current.style.visibility = 'hidden'
      },
    }
    setOpen(true)
  }
  // A mouse rests 300ms first, unless a bubble is already up or just closed, or nothing moves:
  // motion="off", or a duration scale of 0.
  function hover(event: MouseEvent<HTMLElement>) {
    clearTimeout(leaveTimer.current)
    clearTimeout(showTimer.current)
    // Firefox can send a mouse's mouseenter before its pointerenter, so a real event waits a
    // tick for the pointer to say what it is. A synthetic one (fireEvent) decides at once.
    if (event.nativeEvent.isTrusted) showTimer.current = setTimeout(decide, 0)
    else decide()
  }
  function decide() {
    const node = trigger.current
    const still = () => !!node && parseFloat(node.ownerDocument.defaultView?.getComputedStyle(node).getPropertyValue('--diya-duration-scale') ?? '') === 0
    if (isOpen.current || pointer.current !== 'mouse' || motion === 'off' || warm() || still()) {
      show()
      return
    }
    showTimer.current = setTimeout(show, HOVER_DELAY_MS)
  }
  // A pointer that doesn't say what it is counts as a mouse, so it gets the wait, not a tap's
  // instant bubble.
  const sense = (event: PointerEvent<HTMLElement>) => { pointer.current = event.pointerType || 'mouse' }
  // Focus from a mouse press waits for the hover; keyboard focus and a tap show it at once.
  function focus() {
    if (pressedBy.current !== 'mouse') show()
  }
  const press = (event: PointerEvent<HTMLElement>) => {
    sense(event)
    pressedBy.current = pointer.current
  }
  const bubble = portal &&
    createPortal(
      <span
        ref={tip}
        id={id}
        role="tooltip"
        className="diya-tooltip-bubble diya-floating"
        data-side={placement}
        data-exiting={closing ? 'true' : undefined}
        data-swap={swap && !closing ? 'true' : undefined}
        // The bubble can be hovered: the pointer may move onto it to read it.
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
    const child = onlyChild(children)
    if (!isValidElement(child)) return null
    const own = child as ReactElement<{ 'aria-describedby'?: string }>
    const described = cx(own.props['aria-describedby'], open ? id : undefined) || undefined
    return (
      <>
        {renderSlot(cloneElement(own, { 'aria-describedby': described }), {
          ...props,
          className,
          onPointerEnter: sense,
          onMouseEnter: hover,
          onMouseLeave: hideSoon,
          onPointerDown: press,
          onFocus: focus,
          onBlur: hide,
        }, setTrigger)}
        {bubble}
      </>
    )
  }
  return (
    <span {...props} className={cx('diya-tooltip-anchor', className)} onPointerEnter={sense} onMouseEnter={hover} onMouseLeave={hideSoon}>
      <button
        ref={setTrigger}
        className="diya-tooltip-trigger"
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onPointerDown={press}
        onFocus={focus}
        onBlur={hide}
        // A tap, or Enter or Space, shows it; a mouse click leaves it to the hover.
        onClick={(event) => { if (event.detail === 0 || pressedBy.current !== 'mouse') show() }}
      >
        {children}
      </button>
      {bubble}
    </span>
  )
})
