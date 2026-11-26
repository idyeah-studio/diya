'use client'
// Keeping a DIYA modal (Dialog or Drawer) open while it can't be dismissed.
//
// A `cancel` handler that calls preventDefault() isn't enough on its own: Chromium lets a second
// close request through without a new user activation (its close-watcher rule), so the second
// Escape closed the modal. Escape's keydown, prevented at the window once everything inside has had
// it, never becomes a close request, in Chromium, WebKit and Firefox alike. Popups inside the modal
// (Menu, Select, DatePicker and the rest) handle Escape on the document first and mark it handled,
// and a marked Escape is left alone, so they still close one layer at a time.
import { useEffect, type RefObject } from 'react'
import { topModal } from './modal-stack.js'

/** While `open`, refuses Escape for `dialog` whenever `held.current` is true and it's the top modal. */
export function useHoldOpen(dialog: RefObject<HTMLDialogElement | null>, open: boolean, held: RefObject<boolean>) {
  useEffect(() => {
    const node = dialog.current
    const view = node?.ownerDocument.defaultView
    if (!open || !node || !view) return
    const refuse = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return
      if (!held.current || !node.open || topModal(node.ownerDocument) !== node) return
      event.preventDefault()
    }
    view.addEventListener('keydown', refuse)
    return () => view.removeEventListener('keydown', refuse)
  }, [open])
}

