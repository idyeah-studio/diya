'use client'
import { forwardRef, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Alert, AlertInStackContext, type AlertProps } from '../alert/Alert.js'
import { ToastRegistryContext, useDiyaMessages } from '../DiyaProvider.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { playOnCopy } from '../internal/presence.js'
import { toastMessages } from './messages.js'
import { nextToastOrder } from './queue.js'

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

const noSlot = () => () => {}
const nothing = () => null

export type ToastProps = Omit<AlertProps, 'onDismiss'> & {
  /** Called once, straight away, when the toast goes (by timer, close button or Escape); unmount the toast here. Its exit then plays on its own. */
  onDismiss: () => void
  /** Milliseconds before it dismisses itself, paused while hovered, focused or the tab is hidden; 0 or less keeps it until dismissed. Toasts with an `action` never time out. Defaults to 8000. */
  duration?: number
  /** Shows a close button; a toast with an `action` always has one. Defaults to true. */
  showClose?: boolean
}
/** A temporary Alert floated above the page that dismisses itself after a while; the host unmounts the toast in `onDismiss`. It joins its provider's stack, with any toast() toasts. `className`, `style` and the ref reach the Alert. */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast({ onDismiss, duration = 8000, ...props }, ref) {
  const registry = useContext(ToastRegistryContext)
  const t = useDiyaMessages('toast', toastMessages)
  const [key] = useState(() => registry?.key() ?? 0)
  const slot = useSyncExternalStore(registry ? registry.subscribe : noSlot, () => registry?.slot(key) ?? null, nothing)
  const paused = useSyncExternalStore(registry ? registry.subscribe : noSlot, () => registry?.paused() ?? false, () => false)
  const [hidden, setHidden] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const remaining = useRef(duration)
  const callback = useRef(onDismiss)
  callback.current = onDismiss
  // A toast is dismissed once, whether by the timer, the button or Escape,
  // even if the host keeps it mounted afterwards.
  const dismissed = useRef(false)
  const slotRef = useRef<HTMLElement | null>(null)
  slotRef.current = slot
  const settle = () => {
    if (dismissed.current) return
    dismissed.current = true
    playExit(slotRef.current, registry?.copies() ?? null)
    callback.current()
  }
  function dismiss() {
    if (slotRef.current?.contains(document.activeElement)) returnFocus.current?.focus()
    settle()
  }
  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss
  // A place in the stack, in arrival order, for as long as it's mounted.
  useClientLayoutEffect(() => {
    if (!registry) return
    returnFocus.current = document.activeElement as HTMLElement
    registry.add({ key, order: nextToastOrder(), hasAction: !!props.action, urgent: !!props.urgent, dismiss: () => dismissRef.current() })
    return () => registry.remove(key)
  }, [registry, key])
  useClientLayoutEffect(() => {
    registry?.update(key, { hasAction: !!props.action, urgent: !!props.urgent })
  }, [!!props.action, !!props.urgent])
  // Tell the stack the words changed, so it announces them.
  useClientLayoutEffect(() => {
    if (slot) registry?.touch()
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
                  returnFocus.current?.focus()
                  alertProps.action?.onClick()
                },
              }
            : undefined
        }
        onDismiss={showClose || props.action ? dismiss : undefined}
      />
    </AlertInStackContext.Provider>,
    slot
  )
})
