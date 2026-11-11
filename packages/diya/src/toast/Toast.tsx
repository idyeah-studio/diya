'use client'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, type AlertProps } from '../alert/Alert.js'
import { useDiyaMessages, useDiyaPortal } from '../DiyaProvider.js'
import { toastMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    toast: typeof toastMessages
  }
}

// The longest a leaving copy stays on the page, even if its animation never settles.
const EXIT_CAP_MS = 1000

/** A time from computed style, such as '0.16s', in milliseconds. */
const milliseconds = (time: string) => parseFloat(time) * (/ms$/.test(time.trim()) ? 1 : 1000)

/**
 * Plays the toast's exit on a copy, so onDismiss can run at once and the host can unmount it or
 * raise the next one straight away. The copy is a picture: no ids, roles or ARIA, hidden from
 * assistive tech, inert and click-through. Nothing plays with motion off, without the Web
 * Animations API (jsdom, happy-dom) or in a hidden tab.
 */
function playExit(node: HTMLElement | null) {
  const parent = node?.parentElement
  if (!node || !parent || typeof node.animate !== 'function' || node.ownerDocument.hidden) return
  const view = node.ownerDocument.defaultView
  if (!view) return
  const box = node.getBoundingClientRect()
  const from = view.getComputedStyle(node).opacity
  const copy = node.cloneNode(true) as HTMLElement
  for (const element of [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))]) {
    for (const { name } of Array.from(element.attributes)) if (name === 'id' || name === 'role' || name.startsWith('aria-')) element.removeAttribute(name)
  }
  copy.setAttribute('aria-hidden', 'true')
  copy.inert = true
  Object.assign(copy.style, {
    position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, right: 'auto', bottom: 'auto', margin: '0',
    pointerEvents: 'none', transition: 'none',
    // Read back below as plain times: the provider's exit duration and curve, with motion settings applied.
    animationDuration: 'var(--diya-internal-exit-slow)', animationTimingFunction: 'var(--diya-ease-exit)',
  })
  parent.append(copy)
  const style = view.getComputedStyle(copy)
  const duration = milliseconds(style.animationDuration)
  if (!(duration > 0)) {
    copy.remove()
    return
  }
  const distance = style.getPropertyValue('--diya-internal-motion-distance-edge').trim() || '0px'
  const animation = copy.animate(
    [{ opacity: from, translate: '0 0' }, { opacity: 0, translate: `0 ${distance}` }],
    { duration, easing: style.animationTimingFunction || 'ease-in', fill: 'forwards' },
  )
  const cap = setTimeout(() => copy.remove(), EXIT_CAP_MS)
  const done = () => { clearTimeout(cap); copy.remove() }
  animation.finished.then(done, done)
}

export type ToastProps = Omit<AlertProps, 'onDismiss'> & {
  /** Called once, at once, when the toast goes, by timer, close button or Escape; unmount the toast here. Its exit plays on its own afterwards. */
  onDismiss: () => void
  /** Milliseconds before it dismisses itself, paused while hovered, focused or the tab is hidden; 0 or less keeps it until dismissed. Toasts with an `action` never time out. Defaults to 8000. */
  duration?: number
  /** Shows a close button; a toast with an `action` always has one. Defaults to true. */
  showClose?: boolean
}
/** A temporary Alert floated above the page that dismisses itself after a while; the host unmounts the toast in `onDismiss`. `className`, `style` and the ref reach the Alert. */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast({ onDismiss, duration = 8000, ...props }, ref) {
  const portal = useDiyaPortal()
  const t = useDiyaMessages('toast', toastMessages)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mounted, setMounted] = useState(false)
  const region = useRef<HTMLDivElement | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const remaining = useRef(duration)
  const callback = useRef(onDismiss)
  callback.current = onDismiss
  // A toast is dismissed once, whether by the timer, the button or Escape,
  // even if the host keeps it mounted afterwards.
  const dismissed = useRef(false)
  const settle = () => {
    if (dismissed.current) return
    dismissed.current = true
    playExit(region.current)
    callback.current()
  }
  useEffect(() => {
    remaining.current = duration
  }, [duration])
  useEffect(() => {
    setMounted(true)
    returnFocus.current = document.activeElement as HTMLElement
    const visibility = () => setHidden(document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])
  useEffect(() => {
    // Actionable messages remain until dismissed so actions are not time-limited.
    if (!mounted || hovered || focused || hidden || props.action || duration <= 0 || dismissed.current) return
    const started = Date.now()
    const timer = setTimeout(settle, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - started))
    }
  }, [mounted, hovered, focused, hidden, props.action, duration])
  function dismiss() {
    if (region.current?.contains(document.activeElement)) returnFocus.current?.focus()
    settle()
  }
  if (!mounted || !portal) return null
  const { showClose = true, ...alertProps } = props
  const modal = returnFocus.current?.closest<HTMLDialogElement>('dialog[open]')
  const target = modal && !modal.contains(portal) ? modal : portal
  return createPortal(
    <div
      ref={region}
      className="diya-toast-region"
      aria-label={t.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          dismiss()
        }
      }}
    >
      <Alert
        {...alertProps}
        ref={ref}
        action={
          alertProps.action
            ? {
                ...alertProps.action,
                onClick: () => {
                  returnFocus.current?.focus()
                  alertProps.action?.onClick()
                },
              }
            : undefined
        }
        onDismiss={showClose || props.action ? dismiss : undefined}
      />
    </div>,
    target
  )
})
