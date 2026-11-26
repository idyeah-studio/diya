'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type DialogHTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { Button } from '../button/Button.js'
import { PortalContainerContext, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { announcePolite, forgetPolite } from '../internal/announce.js'
import { useHoldOpen, showAgain } from '../internal/hold-open.js'
import { pushModal, removeModal } from '../internal/modal-stack.js'
import { inertWhileExiting } from '../internal/presence.js'
import { opener, watchPresses } from '../internal/opener.js'
import { watchForStrayPopups } from '../internal/stray-popups.js'
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
  /** Supporting text under the title, read as the dialog's description when it opens. Text, or block content such as two paragraphs; all of it is read. To have text lower in the body read too, give it an `id` and pass it in `aria-describedby`. */
  description?: ReactNode
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
  /** Called when the person dismisses the dialog (dismiss or close button, Escape or a click outside). Not called while it can't be dismissed. */
  onDismiss?: () => void
  /** Confirm button text; defaults to "Save changes". */
  confirmLabel?: string
  /** 'destructive' marks the confirm button as an action that deletes or can't be undone; defaults to 'solid'. */
  confirmVariant?: 'solid' | 'destructive'
  /** Dismiss button text; defaults to "Cancel" with `onConfirm`, otherwise "Close". */
  dismissLabel?: string
  /** Disables the confirm button; defaults to false. */
  confirmDisabled?: boolean
  /** Shows the confirm button's working indicator and blocks confirming and dismissing (see `dismissible`); defaults to false. */
  loading?: boolean
  /**
   * Whether the person can dismiss the dialog: Escape, the close button, the dismiss button or a click outside. Leave it out and DIYA decides: yes, except while the confirm action runs (`loading`, or a Promise from `onConfirm` that hasn't settled). `false` keeps it open until your code changes `open`. `true` lets people dismiss it even while it works; abort the work in `onDismiss`, since its result is then ignored. While it can't be dismissed, the close and dismiss buttons stay in place and focusable, and look and announce as unavailable.
   * @since 1.3.0
   */
  dismissible?: boolean
  /**
   * Said to screen readers when the confirm action is still running after 400ms, as the confirm button's spinner appears. Defaults to "Working…". Name the work, such as "Removing the workspace…"; an empty string says nothing, for when your page already announces it.
   * @since 1.3.0
   */
  loadingLabel?: string
  /** Draws a line above the buttons; defaults to false. */
  divided?: boolean
  /** Shows the close icon button in the corner; defaults to true. */
  showClose?: boolean
}

/** A modal dialog opened by your `trigger`, or controlled through `open`; focus returns on close. It can't be dismissed while its confirm action runs (see `dismissible`). The ref, `className`, `style` and other attributes go to the native `dialog` element; your `aria-describedby` is read after the description. */
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
  dismissible,
  loadingLabel,
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
  // Leave `dismissible` out and the dialog can't be dismissed while it works.
  const locked = dismissible === undefined ? busy : !dismissible
  const dialog = useRef<HTMLDialogElement | null>(null)
  // The element in state too, so popups inside learn where to render once it exists.
  const [element, setElement] = useState<HTMLDialogElement | null>(null)
  const setDialog = useMemo(() => composeRefs<HTMLDialogElement>(dialog, setElement, ref as Ref<HTMLDialogElement>), [ref])
  const trigger = useRef<HTMLElement | null>(null)
  const Heading = `h${headingLevel}` as const
  const previousFocus = useRef<HTMLElement | null>(null)
  const operation = useRef(0)
  const id = useId()
  // Whether the dialog is open as of the latest change, ahead of the next render.
  const openNow = useRef(open)
  openNow.current = open
  // Whether it can't be dismissed, as of the latest change: a press that lands as the confirm
  // action starts, before the next render, is already refused.
  const lockedNow = useRef(locked)
  lockedNow.current = locked
  // A close request the browser wouldn't let us stop, and where focus was then.
  const forced = useRef<{ focus: Element | null } | null>(null)
  useHoldOpen(dialog, open, lockedNow)
  function change(next: boolean) {
    openNow.current = next
    if (controlledOpen === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }
  function dismiss() {
    if (lockedNow.current) return
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
  // Remember presses, so a dialog opened by a click in Safari can give focus back to its opener.
  useEffect(() => { if (dialog.current) watchPresses(dialog.current.ownerDocument) }, [])
  // A layout cleanup runs before React removes the dialog's node, so whatever follows the modal
  // stack (the toast stack) leaves it while it's still in the page.
  useClientLayoutEffect(() => {
    const node = dialog.current
    return () => removeModal(node)
  }, [])
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      // The opener, even when a click in Safari left focus on <body> (F2).
      previousFocus.current = opener(document)
      setError('')
      node.inert = false
      // Safari applies inert through style: read layout so it's lifted before showModal()
      // picks what to focus, or a dialog reopened mid-exit opens with focus on <body>.
      void node.offsetWidth
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
      pushModal(node)
      if (process.env.NODE_ENV !== 'production') watchForStrayPopups(node.ownerDocument)
    } else if (!open && node.open) {
      operation.current += 1
      setPending(false)
      removeModal(node)
      if (typeof node.close === 'function') node.close()
      else node.removeAttribute('open')
      inertWhileExiting(node)
      ;(trigger.current ?? previousFocus.current)?.focus()
    }
  }, [open])
  // Screen readers don't announce aria-busy: still working on the beat, the dialog says so, once,
  // through the stack's polite region (it follows the top modal). Taken back when the work settles.
  const working = useRef('')
  working.current = loadingLabel ?? t.working
  useEffect(() => {
    if (!busy || !open) return
    const key = id + '-working'
    const node = dialog.current
    const timer = setTimeout(() => { if (working.current) announcePolite(working.current, node, key) }, 400)
    return () => {
      clearTimeout(timer)
      forgetPolite(key)
    }
  }, [busy, open])
  async function confirm() {
    // A second click while the dialog closes, which Safari still delivers, confirms nothing.
    if (busy || confirmDisabled || !onConfirm || !openNow.current) return
    const request = ++operation.current
    if (dismissible === undefined) lockedNow.current = true
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
  const described = description != null && description !== false && description !== ''
  // Text stays a paragraph; block content, such as two paragraphs, goes in a div.
  const Description = typeof description === 'string' || typeof description === 'number' ? 'p' : 'div'
  const content = (
    // data-busy: the unavailable close and dismiss buttons dim on the confirm button's beat.
    <div className="diya-dialog-layout" data-busy={busy || undefined}>
      <div className="diya-dialog-heading">
        <Heading id={id + '-title'} className="diya-dialog-title">{title}</Heading>
        {described && (
          <Description id={id + '-description'} className="diya-dialog-description">
            {description}
          </Description>
        )}
        {showClose && (
          <button
            type="button"
            className="diya-dialog-close"
            aria-label={t.close}
            aria-disabled={locked || undefined}
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
            <Button variant="quiet" aria-disabled={locked || undefined} onClick={dismiss}>
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
        aria-describedby={cx(described && id + '-description', props['aria-describedby']) || undefined}
        onCancel={(event) => {
          onCancel?.(event)
          if (event.defaultPrevented) return
          event.preventDefault()
          if (lockedNow.current) {
            // One the browser won't let us stop closes it next; it's shown again then.
            if (!event.cancelable) forced.current = { focus: event.currentTarget.ownerDocument.activeElement }
            return
          }
          dismiss()
        }}
        onClose={(event) => {
          onClose?.(event)
          const node = event.currentTarget
          const refused = forced.current
          forced.current = null
          if (node.open) return
          if (refused && lockedNow.current && openNow.current) return showAgain(node, refused.focus)
          removeModal(node)
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
        <PortalContainerContext.Provider value={element}>{content}</PortalContainerContext.Provider>
      </dialog>
    </>
  )
})
