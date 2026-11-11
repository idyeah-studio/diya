'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type DialogHTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { Button } from '../button/Button.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { inertWhileExiting } from '../internal/presence.js'
import { composeRefs, renderSlot } from '../internal/slot.js'
import { dialogMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    dialog: typeof dialogMessages
  }
}

export type DialogProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'children' | 'open'> & {
  /** Your own element that opens the dialog, such as `<Button>Edit project</Button>`; DIYA wires its click and `aria-haspopup`, and focus returns to it on close. */
  trigger?: ReactElement
  /** Visible dialog heading; it is also the dialog's accessible name. */
  title: string
  /** The title's heading level, 1 to 6; it looks the same at every level. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text under the title, also read as the dialog's description. */
  description?: string
  /** Dialog width; defaults to 'medium'. */
  size?: 'small' | 'medium' | 'large'
  /** Dialog body. */
  children?: ReactNode
  /** Replaces the default dismiss and confirm buttons. */
  footer?: ReactNode
  /** Whether the dialog is open; leave it out to let `trigger` manage it. */
  open?: boolean
  /** Called with the next open state whenever the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Shows the confirm button. May be async; the dialog closes when it settles, unless it returns false. A thrown Error's message shows in the dialog. */
  onConfirm?: () => void | boolean | Promise<void | boolean>
  /** Called when the person dismisses the dialog (dismiss or close button, Escape or a backdrop click). */
  onDismiss?: () => void
  /** Confirm button text; defaults to "Save changes". */
  confirmLabel?: string
  /** 'destructive' marks the confirm button as an action that deletes or can't be undone; defaults to 'solid'. */
  confirmVariant?: 'solid' | 'destructive'
  /** Dismiss button text; defaults to "Cancel" with `onConfirm`, otherwise "Close". */
  dismissLabel?: string
  /** Disables the confirm button; defaults to false. */
  confirmDisabled?: boolean
  /** Shows a spinner on the confirm button and blocks confirming; defaults to false. */
  loading?: boolean
  /** Draws a line above the buttons; defaults to false. */
  divided?: boolean
  /** Shows the close icon button in the corner; defaults to true. */
  showClose?: boolean
}

/** A modal dialog opened by your `trigger`, or controlled through `open`; focus returns on close. The ref, `className`, `style` and other attributes go to the native `dialog` element. */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog({
  trigger: triggerElement,
  title,
  headingLevel = 3,
  description,
  size = 'medium',
  children,
  footer,
  open: controlledOpen,
  onOpenChange,
  onConfirm,
  onDismiss,
  confirmLabel,
  confirmVariant = 'solid',
  dismissLabel,
  confirmDisabled = false,
  loading = false,
  divided = false,
  showClose = true,
  className,
  onCancel,
  onClose,
  onClick,
  ...props
}, ref) {
  const t = useDiyaMessages('dialog', dialogMessages)
  const [localOpen, setLocalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const open = controlledOpen ?? localOpen
  const busy = loading || pending
  const dialog = useRef<HTMLDialogElement | null>(null)
  const setDialog = useMemo(() => composeRefs<HTMLDialogElement>(dialog, ref as Ref<HTMLDialogElement>), [ref])
  const trigger = useRef<HTMLElement | null>(null)
  const Heading = `h${headingLevel}` as const
  const previousFocus = useRef<HTMLElement | null>(null)
  const operation = useRef(0)
  const id = useId()
  // Whether the dialog is open as of the latest change, ahead of the next render.
  const openNow = useRef(open)
  openNow.current = open
  function change(next: boolean) {
    openNow.current = next
    if (controlledOpen === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }
  function dismiss() {
    operation.current += 1
    setPending(false)
    change(false)
    onDismiss?.()
  }
  useEffect(
    () => () => {
      operation.current += 1
    },
    []
  )
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      setError('')
      node.inert = false
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
    } else if (!open && node.open) {
      operation.current += 1
      setPending(false)
      if (typeof node.close === 'function') node.close()
      else node.removeAttribute('open')
      inertWhileExiting(node)
      ;(trigger.current ?? previousFocus.current)?.focus()
    }
  }, [open])
  async function confirm() {
    // A second click while the dialog closes, which Safari still delivers, confirms nothing.
    if (busy || confirmDisabled || !onConfirm || !openNow.current) return
    const request = ++operation.current
    setPending(true)
    setError('')
    try {
      if ((await onConfirm()) !== false && request === operation.current) change(false)
    } catch (failure) {
      if (request === operation.current)
        setError(
          failure instanceof Error ? failure.message : t.error
        )
    } finally {
      if (request === operation.current) setPending(false)
    }
  }
  const content = (
    <div className="diya-dialog-layout">
      <div className="diya-dialog-heading">
        <div>
          <Heading id={id + '-title'} className="diya-dialog-title">{title}</Heading>
          {description && (
            <p id={id + '-description'} className="diya-dialog-description">
              {description}
            </p>
          )}
        </div>
        {showClose && (
          <button
            type="button"
            className="diya-dialog-close"
            aria-label={t.close}
            onClick={dismiss}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        )}
      </div>
      {children && <div className="diya-dialog-content">{children}</div>}
      {error && (
        <p className="diya-workflow-error" role="alert">
          {error}
        </p>
      )}
      <div className="diya-dialog-actions" data-divider={divided || undefined}>
        {footer ?? (
          <>
            <Button variant="quiet" onClick={dismiss}>
              {dismissLabel ?? (onConfirm ? t.dismiss : t.closeAction)}
            </Button>
            {onConfirm && (
              <Button variant={confirmVariant} loading={busy} disabled={confirmDisabled} onClick={confirm}>
                {confirmLabel ?? t.confirm}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
  return (
    <>
      {triggerElement && renderSlot(triggerElement, { 'aria-haspopup': 'dialog', onClick: () => change(true) }, trigger)}
      <dialog
        {...props}
        ref={setDialog}
        className={cx('diya-dialog', className)}
        data-size={size}
        aria-labelledby={id + '-title'}
        aria-describedby={description ? id + '-description' : undefined}
        onCancel={(event) => {
          onCancel?.(event)
          if (event.defaultPrevented) return
          event.preventDefault()
          dismiss()
        }}
        onClose={(event) => {
          onClose?.(event)
          if (event.currentTarget.open) return
          operation.current += 1
          setPending(false)
          if (open) change(false)
          ;(trigger.current ?? previousFocus.current)?.focus()
        }}
        onClick={(event) => {
          onClick?.(event)
          if (event.target !== event.currentTarget) return
          const box = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            dismiss()
        }}
      >
        {content}
      </dialog>
    </>
  )
})
