'use client'
import { forwardRef, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Alert, AlertInStackContext, type AlertProps } from '../alert/Alert.js'
import { ToastScopeContext, useDiyaMessages } from '../DiyaProvider.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { playOnCopy } from '../internal/presence.js'
import { toastMessages } from './messages.js'
import { addToastSlot, leaveToastSlot, nextToastOrder, nextToastSlotKey, removeToastSlot, returnToastFocus, subscribeToasts, toastCopies, toastSlotElement, toastsPaused, touchToasts, updateToastSlot } from './queue.js'

declare module '../messages.js' {
  interface DiyaMessages {
    toast: typeof toastMessages
  }
}

// The toast leaves on a copy, so onDismiss can run at once and the host can unmount it or raise
// the next one straight away: it sinks 12px and fades over two-thirds of the slow time. The copy
// plays in the stack's own layer, under the live toasts.
const playExit = (node: HTMLElement | null, layer: HTMLElement | null) => playOnCopy(node, layer ?? node?.parentElement, 'exit-slow', (style, opacity) => [
  { opacity, translate: '0 0' },
  { opacity: 0, translate: `0 ${style.getPropertyValue('--diya-internal-motion-distance-edge').trim() || '0px'}` },
], { zIndex: 0 })

const none = () => () => {}
const noSlot = () => null
const notPaused = () => false

export type ToastProps = Omit<AlertProps, 'onDismiss'> & {
  /** Called once, straight away, when the toast goes (by timer, close button or Escape); unmount the toast here. Its exit then plays on its own. */
  onDismiss: () => void
  /** Milliseconds before it dismisses itself, paused while hovered, focused or the tab is hidden; 0 or less keeps it until dismissed. Toasts with an `action` never time out. Defaults to 8000. */
  duration?: number
  /** Shows a close button; a toast with an `action` always has one. Defaults to true. */
  showClose?: boolean
}
/** A temporary Alert floated above the page that dismisses itself after a while; the host unmounts the toast in `onDismiss`. It joins the page's one stack, with any toast() toasts, in its own provider's look. `className`, `style` and the ref reach the Alert. */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast({ onDismiss, duration = 8000, ...props }, ref) {
  const scope = useContext(ToastScopeContext)
  const t = useDiyaMessages('toast', toastMessages)
  const [key] = useState(nextToastSlotKey)
  const subscribe = scope ? subscribeToasts : none
  const slot = useSyncExternalStore(subscribe, () => toastSlotElement(key), noSlot)
  const paused = useSyncExternalStore(subscribe, toastsPaused, notPaused)
  const [hidden, setHidden] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const remaining = useRef(duration)
  const callback = useRef(onDismiss)
  callback.current = onDismiss
  // A toast is dismissed once, whether by the timer, the button or Escape,
  // even if the host keeps it mounted afterwards.
  const dismissed = useRef(false)
  const slotRef = useRef<HTMLElement | null>(null)
  // The slot is the stack's element; the exit copies the toast's whole place in the column.
  slotRef.current = slot?.closest<HTMLElement>('.diya-toast') ?? slot
  const settle = () => {
    if (dismissed.current) return
    dismissed.current = true
    playExit(slotRef.current, toastCopies())
    leaveToastSlot(key)
    callback.current()
  }
  // Focus follows the stack's chain, as for toast() (T12): Escape goes back to where F8 was
  // pressed, a close button to the toast beside it; where the toast was raised is a fallback.
  function dismiss(adjacent = false) {
    if (slotRef.current?.contains(document.activeElement)) returnToastFocus(key, returnFocus.current, adjacent)
    settle()
  }
  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss
  // A place in the page's stack, in arrival order, for as long as it's mounted, in its own
  // provider's look.
  useClientLayoutEffect(() => {
    if (!scope) return
    returnFocus.current = document.activeElement as HTMLElement
    addToastSlot({ key, order: nextToastOrder(), hasAction: !!props.action, urgent: !!props.urgent, owner: scope.owner, look: scope.look, motion: scope.motion, dismiss: () => dismissRef.current() })
    return () => removeToastSlot(key)
  }, [!!scope, key])
  const first = useRef(true)
  useClientLayoutEffect(() => {
    if (first.current) { first.current = false; return }
    if (scope) updateToastSlot(key, { hasAction: !!props.action, urgent: !!props.urgent, look: scope.look })
  }, [!!props.action, !!props.urgent, scope?.look])
  // Tell the stack the words changed, so it announces them.
  useClientLayoutEffect(() => {
    if (slot) touchToasts()
  }, [slot, props.title, props.tone, props.children, props.urgent])
  useEffect(() => {
    remaining.current = duration
  }, [duration])
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])
  useEffect(() => {
    // Actionable messages remain until dismissed so actions are not time-limited.
    if (!slot || paused || hidden || props.action || duration <= 0 || dismissed.current) return
    const started = Date.now()
    const timer = setTimeout(settle, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - started))
    }
  }, [!!slot, paused, hidden, props.action, duration])
  if (!slot) return null
  const { showClose = true, ...alertProps } = props
  return createPortal(
    <AlertInStackContext.Provider value={{ announce: false, dismissLabel: alertProps.title ? t.dismiss(alertProps.title) : undefined }}>
      <Alert
        {...alertProps}
        ref={ref}
        action={
          alertProps.action
            ? {
                ...alertProps.action,
                onClick: () => {
                  // As in 1.1.1, an action returns focus whether or not a click focused it (Safari's doesn't).
                  returnToastFocus(key, returnFocus.current)
                  alertProps.action?.onClick()
                },
              }
            : undefined
        }
        onDismiss={showClose || props.action ? () => dismiss(true) : undefined}
      />
    </AlertInStackContext.Provider>,
    slot
  )
})
