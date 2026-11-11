'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, type DialogHTMLAttributes, type ReactNode, type Ref } from 'react'
import { Button } from '../button/Button.js'
import { Icon } from '../Icon.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { inertWhileExiting } from '../internal/presence.js'
import { composeRefs } from '../internal/slot.js'
import { drawerMessages } from './drawer-messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    drawer: typeof drawerMessages
  }
}

export type DrawerProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'children' | 'open'> & {
  /** Whether the drawer is shown; the caller owns this state. */
  open: boolean
  /** Called with false when the person closes it (close button, Escape or the browser); update `open` in response. */
  onOpenChange: (open: boolean) => void
  /** Visible heading; it is also the drawer's accessible name. */
  title: string
  /** The title's heading level, 1 to 6; it looks the same at every level. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text under the title, also read as the drawer's description. */
  description?: ReactNode
  /** Scrollable drawer body. */
  children: ReactNode
  /** Content pinned to the bottom, usually action buttons. */
  footer?: ReactNode
  /** Edge the drawer slides in from; defaults to 'right'. */
  side?: 'left' | 'right'
  /** Shows the close icon button in the header; defaults to true. */
  showClose?: boolean
}

/** A modal panel that slides in from the side, traps focus and returns it on close. The ref, `className`, `style` and other attributes go to the native `dialog` element. */
export const Drawer = forwardRef<HTMLDialogElement, DrawerProps>(function Drawer({ open, onOpenChange, title, headingLevel = 3, description, children, footer, side = 'right', showClose = true, className, onCancel, onClose, onClick, ...props }, ref) {
  const t = useDiyaMessages('drawer', drawerMessages)
  const dialog = useRef<HTMLDialogElement>(null)
  const setDialog = useMemo(() => composeRefs<HTMLDialogElement>(dialog, ref as Ref<HTMLDialogElement>), [ref])
  const Heading = `h${headingLevel}` as const
  const returnFocus = useRef<HTMLElement | null>(null)
  const id = useId()
  function restoreFocus() {
    if (returnFocus.current?.isConnected) returnFocus.current.focus()
    returnFocus.current = null
  }
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      node.inert = false
      // Safari applies inert through style: read layout so it's lifted before showModal()
      // picks what to focus, or a drawer reopened mid-exit opens with focus on <body>.
      void node.offsetWidth
      node.showModal()
    } else if (!open && node.open) {
      node.close()
      inertWhileExiting(node)
    }
  }, [open])
  useEffect(() => {
    const node = dialog.current
    return () => { if (node?.open) node.close(); restoreFocus() }
  }, [])
  return <dialog {...props} ref={setDialog} className={cx('diya-workflow-surface diya-drawer-modal', className)} data-side={side} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onCancel={event => { onCancel?.(event); if (event.defaultPrevented) return; event.preventDefault(); onOpenChange(false) }} onClose={event => { onClose?.(event); if (event.currentTarget.open) return; restoreFocus(); if (open) onOpenChange(false) }}
    onClick={event => {
      onClick?.(event)
      // A click on the dimmed page (the dialog's backdrop) closes it, as it does a Dialog.
      if (event.target !== event.currentTarget) return
      const box = event.currentTarget.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onOpenChange(false)
    }}>
    <header><div><Heading id={`${id}-title`} className="diya-drawer-title">{title}</Heading>{description && <p id={`${id}-description`}>{description}</p>}</div>{showClose && <Button variant="quiet" iconOnly aria-label={t.close} onClick={() => onOpenChange(false)}><Icon name="close" /></Button>}</header>
    <div className="diya-drawer-body">{children}</div>
    {footer && <footer>{footer}</footer>}
  </dialog>
})
