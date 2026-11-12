'use client'
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../button/Button.js'
import { useDiyaPortal } from '../DiyaProvider.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { usePresence } from '../internal/presence.js'
import { composeRefs, mergeSlotProps, renderSlot } from '../internal/slot.js'

// Scrolls this soon after opening only reposition, even if the trigger is briefly out of view:
// the browser may still be bringing it in after focus moved to it.
const OPEN_SETTLE_MS = 300

/** Whether a trigger rectangle still shows any part inside the viewport. */
function inViewport(rect: DOMRect, view: Window) {
  return rect.bottom > 0 && rect.right > 0 && rect.top < view.innerHeight && rect.left < view.innerWidth
}

const tabbableSelector =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, object, embed, audio[controls], video[controls], summary, [contenteditable], [tabindex]'

function tabStops(scope: Document | HTMLElement, surface?: HTMLDivElement | null) {
  const document = scope.ownerDocument ?? (scope as Document)
  const view = document.defaultView
  const stops = Array.from(scope.querySelectorAll<HTMLElement>(tabbableSelector)).filter(
    (element) => {
      if (surface?.contains(element) || element.matches(':disabled')) return false
      const editable =
        element.hasAttribute('contenteditable') &&
        element.contentEditable !== 'false' &&
        !element.parentElement?.isContentEditable
      if (element.tabIndex < 0 && (element.hasAttribute('tabindex') || !editable)) return false
      for (
        let ancestor: HTMLElement | null = element;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        if (ancestor.hidden || ancestor.hasAttribute('inert')) return false
        const style = view?.getComputedStyle(ancestor)
        if (
          style?.display === 'none' ||
          style?.visibility === 'hidden' ||
          style?.visibility === 'collapse' ||
          style?.contentVisibility === 'hidden'
        )
          return false
        if (
          ancestor !== element &&
          ancestor.tagName === 'DETAILS' &&
          !ancestor.hasAttribute('open')
        ) {
          const summary = Array.from(ancestor.children).find((child) => child.tagName === 'SUMMARY')
          if (!summary?.contains(element)) return false
        }
      }
      return true
    }
  )
  const ordered = stops
    .filter((element) => {
      if (element.tagName !== 'INPUT') return true
      const radio = element as HTMLInputElement
      return (
        radio.type !== 'radio' ||
        !radio.name ||
        radio.checked ||
        !stops.some((candidate) => {
          if (candidate.tagName !== 'INPUT') return false
          const other = candidate as HTMLInputElement
          return (
            other.type === 'radio' &&
            other.name === radio.name &&
            other.form === radio.form &&
            other.checked
          )
        })
      )
    })
    .map((element, index) => ({ element, index, order: Math.max(0, element.tabIndex) }))
    .sort((a, b) => {
      if (a.order === b.order) return a.index - b.index
      if (a.order === 0) return 1
      if (b.order === 0) return -1
      return a.order - b.order
    })
  return ordered.map(({ element }) => element)
}

function adjacentTabStop(anchor: HTMLElement, surface: HTMLDivElement | null, backwards: boolean) {
  const modal = anchor.closest<HTMLDialogElement>('dialog[open]')
  const ordered = tabStops(modal ?? anchor.ownerDocument, surface)
  const index = ordered.indexOf(anchor)
  if (index < 0) return undefined
  const next = index + (backwards ? -1 : 1)
  return ordered[modal ? (next + ordered.length) % ordered.length : next]
}

/** Root props shared by Menu and Popover: everything except `children` lands on the trigger. An interface, so declaration files keep these docs. */
export interface FloatingTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled' | 'type' | 'role'> {
  /** Your own trigger element, such as `<Button iconOnly aria-label="More">…</Button>`; DIYA wires its click, keys and ARIA. Defaults to a DIYA Button showing `label`. */
  trigger?: ReactElement
  /** Whether the panel is open; leave it out to let the trigger manage it. */
  open?: boolean
  /** Called with the next open state whenever the panel opens or closes. */
  onOpenChange?: (open: boolean) => void
}

type FloatingSurfaceProps = FloatingTriggerProps & {
  /** Shows this icon as an icon-only trigger; `label` then becomes its accessible name. */
  triggerIcon?: ReactNode
  /** The trigger's visible text (or accessible name with `triggerIcon`) and the panel's accessible name. */
  label: string
  /** 'menu' for a list of menu items, 'dialog' for free content with its own tab order. Defaults to 'dialog'. */
  role?: 'menu' | 'dialog'
  /** Preferred side for the panel; it moves to stay on screen. Defaults to 'bottom'. */
  placement?: 'top' | 'bottom'
  /** Disables the trigger and closes an open panel. */
  disabled?: boolean
  /** The panel's content, or a function that renders it; call `close` to shut it and return focus to the trigger. */
  children: ReactNode | ((close: () => void) => ReactNode)
  /** Handles keys other than Tab inside the panel, such as menu arrow keys. */
  onPanelKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  /** Focuses the last control instead of the first when the panel opens. */
  focusLast?: boolean
}

/** The shared trigger button and floating panel behind Menu and Popover. */
export const FloatingSurface = forwardRef<HTMLButtonElement, FloatingSurfaceProps>(function FloatingSurface({
  label,
  role = 'dialog',
  placement = 'bottom',
  disabled,
  children,
  onPanelKeyDown,
  focusLast = false,
  triggerIcon,
  trigger: triggerElement,
  open: controlledOpen,
  onOpenChange,
  ...rest
}, ref) {
  const providerPortal = useDiyaPortal()
  const id = useId()
  const trigger = useRef<HTMLElement | null>(null)
  const setTrigger = useMemo(() => composeRefs<HTMLElement>(trigger, ref as Ref<HTMLElement>), [ref])
  const panel = useRef<HTMLDivElement>(null)
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen ?? localOpen
  // Document listeners outlive a render, so they read the latest state and callback from here.
  const current = useRef(open)
  current.current = open
  const latest = useRef({ controlled: controlledOpen !== undefined, onOpenChange })
  latest.current = { controlled: controlledOpen !== undefined, onOpenChange }
  const openedAt = useRef(0)
  const last = useRef(focusLast)
  // Closes the reader didn't cause in place (the trigger scrolled away, or was disabled) skip the exit.
  const quiet = useRef(false)
  const { present, closing } = usePresence(open, panel, quiet.current)
  // The outlet is chosen while open and kept through the exit, so a closing panel stays put.
  const outlet = useRef<HTMLElement | null>(null)
  if (open) {
    const modal = trigger.current?.closest<HTMLDialogElement>('dialog[open]')
    outlet.current = modal && !modal.contains(providerPortal) ? modal : providerPortal
  }
  const portal = present ? outlet.current ?? providerPortal : null
  function setOpen(next: boolean) {
    if (next === current.current) return
    current.current = next
    if (!latest.current.controlled) setLocalOpen(next)
    latest.current.onOpenChange?.(next)
  }
  function close(restore = true) {
    setOpen(false)
    if (restore) trigger.current?.focus({ preventScroll: true })
  }
  // Anchors the panel to the trigger, flipping above it or clamping so it stays on screen.
  // Written straight to the panel's style, so following a scroll doesn't re-render the content.
  // The panel is measured by its layout size: while it scales in, its rectangle is smaller.
  function place() {
    const node = panel.current
    const anchor = trigger.current?.getBoundingClientRect()
    if (!node || !anchor) return
    const width = node.offsetWidth
    const height = node.offsetHeight
    let side = placement
    let top = side === 'top' ? anchor.top - height - 10 : anchor.bottom + 10
    if (top + height > window.innerHeight - 12) { side = 'top'; top = anchor.top - height - 10 }
    if (top < 12) { side = 'bottom'; top = 12 }
    const left = Math.max(12, Math.min(anchor.left + (anchor.width - width) / 2, window.innerWidth - width - 12))
    node.style.left = `${left}px`
    node.style.top = `${top}px`
    node.dataset.side = side
    // It grows from the trigger's center, on the edge nearest the trigger.
    node.style.setProperty('--diya-internal-overlay-origin', `${Math.round(anchor.left + anchor.width / 2 - left)}px ${side === 'top' ? '100%' : '0'}`)
  }
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return
    if (event.key !== 'Tab') {
      onPanelKeyDown?.(event)
      return
    }
    const anchor = trigger.current
    if (role === 'dialog' && panel.current) {
      const controls = tabStops(panel.current)
      const current = controls.indexOf(panel.current.ownerDocument.activeElement as HTMLElement)
      if (current >= 0 && (event.shiftKey ? current > 0 : current < controls.length - 1)) return
      if (event.shiftKey) {
        event.preventDefault()
        close()
        return
      }
    }
    const destination = anchor && adjacentTabStop(anchor, panel.current, event.shiftKey)
    close(false)
    if (destination) {
      destination.focus()
      if (destination.ownerDocument.activeElement === destination) event.preventDefault()
    }
  }
  useClientLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    quiet.current = false
    openedAt.current = performance.now()
    place()
    const targets = role === 'dialog' && panel.current ? tabStops(panel.current)
      : panel.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled), input:not(:disabled), [tabindex="0"]')
    const target = last.current ? targets?.[targets.length - 1] : targets?.[0]
    ;(target ?? panel.current)?.focus({ preventScroll: true })
  }, [open, placement])
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    // A scroll or resize outside the panel moves it with its trigger, once per frame. It closes only
    // when the trigger has left the viewport, and never in the first moments after opening.
    let frame = 0
    const follow = () => {
      frame = 0
      const anchor = trigger.current?.getBoundingClientRect()
      if (anchor && !inViewport(anchor, window) && performance.now() - openedAt.current > OPEN_SETTLE_MS) {
        quiet.current = true
        close(!!panel.current?.contains(document.activeElement))
        return
      }
      place()
    }
    const schedule = (event: Event) => {
      if (event.type === 'scroll' && panel.current?.contains(event.target as Node)) return
      if (!frame) frame = requestAnimationFrame(follow)
    }
    // The panel's own size changes too, such as switching Tabs inside it.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule(new Event('resize'))) : null
    if (panel.current) observer?.observe(panel.current)
    if (trigger.current) observer?.observe(trigger.current)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open, placement])
  useEffect(() => {
    if (disabled && open) {
      quiet.current = true
      close(false)
    }
  }, [disabled, open])
  const triggerProps = {
    ...(triggerElement ? rest : {}),
    disabled: disabled || undefined,
    'aria-haspopup': role,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: () => {
      last.current = false
      setOpen(!current.current)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (role === 'menu' && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        last.current = event.key === 'ArrowUp'
        setOpen(true)
      }
    },
  }
  return (
    <>
      {/* The wrapper keeps the trigger's place in layouts that select it. */}
      <span>
        {triggerElement
          ? renderSlot(triggerElement, triggerProps, setTrigger)
          : <Button
            ref={setTrigger}
            variant={triggerIcon ? 'quiet' : 'outline'}
            iconOnly={!!triggerIcon}
            aria-label={triggerIcon ? label : undefined}
            disabled={disabled}
            {...mergeSlotProps(triggerProps, rest)}
          >
            {triggerIcon ?? label}
          </Button>}
      </span>
      {portal &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role={role}
            aria-label={label}
            tabIndex={-1}
            className={`diya-floating-surface diya-floating diya-floating-${role}`}
            data-side={placement}
            data-exiting={closing ? 'true' : undefined}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget as Node) &&
                event.relatedTarget !== trigger.current
              )
                close(false)
            }}
          >
            {typeof children === 'function' ? children(() => close()) : children}
          </div>,
          portal
        )}
    </>
  )
})
