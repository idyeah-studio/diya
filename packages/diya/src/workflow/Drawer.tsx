'use client'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type DialogHTMLAttributes, type ReactNode, type Ref } from 'react'
import { Button } from '../button/Button.js'
import { Icon } from '../Icon.js'
import { PortalContainerContext, useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { useHoldOpen } from '../internal/hold-open.js'
import { useShowAgain } from '../internal/show-again.js'
import { pushModal, removeModal } from '../internal/modal-stack.js'
import { inertWhileExiting } from '../internal/presence.js'
import { opener, watchPresses } from '../internal/opener.js'
import { watchForStrayPopups } from '../internal/stray-popups.js'
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
  /** Called with false when the person closes it (close button, Escape, a click outside or the browser); update `open` in response. Not called while it can't be dismissed. */
  onOpenChange: (open: boolean) => void
  /** Visible heading; it is also the drawer's accessible name. */
  title: string
  /** The title's heading level, 1 to 6; it looks the same at every level. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Supporting text under the title, read as the drawer's description when it opens. Text, or block content such as two paragraphs; all of it is read. To have text in the body read too, give it an `id` and pass it in `aria-describedby`. */
  description?: ReactNode
  /** Scrollable drawer body. */
  children: ReactNode
  /** Content pinned to the bottom, usually action buttons. */
  footer?: ReactNode
  /** Which edge of the page the drawer sits on; defaults to 'right'. */
  side?: 'left' | 'right'
  /** Shows the close icon button in the header; defaults to true. */
  showClose?: boolean
  /**
   * Whether the person can close the drawer: Escape, the close button or a click outside. Defaults to true. Set it to false while your footer's work runs (`dismissible={!saving}`); the close button then looks and announces as unavailable.
   * @since 1.3.0
   */
  dismissible?: boolean
}

/** A modal panel at the side of the page that traps focus and returns it on close. The ref, `className`, `style` and other attributes go to the native `dialog` element; your `aria-describedby` is read after the description. */
export const Drawer = forwardRef<HTMLDialogElement, DrawerProps>(function Drawer({ open, onOpenChange, title, headingLevel = 3, description, children, footer, side = 'right', showClose = true, dismissible = true, className, onCancel, onClose, onClick, ...props }, ref) {
  const t = useDiyaMessages('drawer', drawerMessages)
  const dialog = useRef<HTMLDialogElement>(null)
  // The element in state too, so popups inside learn where to render once it exists.
  const [element, setElement] = useState<HTMLDialogElement | null>(null)
  const setDialog = useMemo(() => composeRefs<HTMLDialogElement>(dialog, setElement, ref as Ref<HTMLDialogElement>), [ref])
  const Heading = `h${headingLevel}` as const
  const returnFocus = useRef<HTMLElement | null>(null)
  const id = useId()
  // Read by Escape's guard and the close paths, ahead of the next render.
  const held = useRef(!dismissible)
  held.current = !dismissible
  const openNow = useRef(open)
  openNow.current = open
  useHoldOpen(dialog, open, held)
  const showAgain = useShowAgain()
  function requestClose() {
    if (!held.current) onOpenChange(false)
  }
  function restoreFocus() {
    if (returnFocus.current?.isConnected) returnFocus.current.focus()
    returnFocus.current = null
  }
  // Remember presses, so a drawer opened by a click in Safari can give focus back to its opener.
  useEffect(() => { if (dialog.current) watchPresses(dialog.current.ownerDocument) }, [])
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      // The opener, even when a click in Safari left focus on <body> (F2).
      returnFocus.current = opener(document)
      node.inert = false
      // Safari applies inert through style: read layout so it's lifted before showModal()
      // picks what to focus, or a drawer reopened mid-exit opens with focus on <body>.
      void node.offsetWidth
      node.showModal()
      pushModal(node)
      if (process.env.NODE_ENV !== 'production') watchForStrayPopups(node.ownerDocument)
    } else if (!open && node.open) {
      removeModal(node)
      node.close()
      inertWhileExiting(node)
    }
  }, [open])
  useEffect(() => {
    const node = dialog.current
    return () => { if (node?.open) node.close(); restoreFocus() }
  }, [])
  // A layout cleanup runs before React removes the dialog's node, so whatever follows the modal
  // stack (the toast stack) leaves it while it's still in the page.
  useClientLayoutEffect(() => {
    const node = dialog.current
    return () => removeModal(node)
  }, [])
  const described = description != null && description !== false && description !== ''
  // Text stays a paragraph; block content, such as two paragraphs, goes in a div.
  const Description = typeof description === 'string' || typeof description === 'number' ? 'p' : 'div'
  return <dialog {...props} ref={setDialog} className={cx('diya-workflow-surface diya-drawer-modal', className)} data-side={side} aria-labelledby={`${id}-title`} aria-describedby={cx(described && `${id}-description`, props['aria-describedby']) || undefined}
    onCancel={event => {
      onCancel?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      if (held.current) return showAgain.refused(event)
      onOpenChange(false)
    }}
    onClose={event => {
      onClose?.(event)
      const node = event.currentTarget
      if (showAgain.closed(node, !!held.current && openNow.current)) return
      if (node.open) return
      removeModal(node)
      restoreFocus()
      if (open) onOpenChange(false)
    }}
    onClick={event => {
      onClick?.(event)
      // A click on the dimmed page (the dialog's backdrop) closes it, as it does a Dialog.
      if (event.target !== event.currentTarget) return
      const box = event.currentTarget.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) requestClose()
    }}>
    <PortalContainerContext.Provider value={element}>
      <header>
        <Heading id={`${id}-title`} className="diya-drawer-title">{title}</Heading>
        {described && <Description id={`${id}-description`} className="diya-drawer-description">{description}</Description>}
        {showClose && <Button variant="quiet" iconOnly aria-label={t.close} aria-disabled={!dismissible || undefined} onClick={requestClose}><Icon name="close" /></Button>}
      </header>
      <div className="diya-drawer-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </PortalContainerContext.Provider>
  </dialog>
})
