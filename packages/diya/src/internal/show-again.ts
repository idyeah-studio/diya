'use client'
// A forced close while a DIYA modal can't be dismissed (owner question 4: "show it again").
//
// A close request the browser won't let anyone stop (Android's back gesture, or Chromium's second
// request without a new user activation) closes the modal right after a `cancel` that isn't
// cancelable. This shows it again, with focus back where it was, so nobody believes they cancelled
// work that goes on. To let such a close go through instead, delete this module and its two calls
// in Dialog and in Drawer (`showAgain.refused` and `showAgain.closed`), and its tests.
import { useRef } from 'react'

export function useShowAgain() {
  const forced = useRef<{ focus: Element | null } | null>(null)
  return {
    /** From `cancel`, refused because it can't be dismissed: remembers a request that will close it anyway. */
    refused(event: { cancelable: boolean; currentTarget: HTMLDialogElement }) {
      if (!event.cancelable) forced.current = { focus: event.currentTarget.ownerDocument.activeElement }
    },
    /** From `close`: shows it again when that request closed it and it still can't be dismissed. True when it did. */
    closed(node: HTMLDialogElement, held: boolean) {
      const request = forced.current
      forced.current = null
      if (!request || !held || node.open) return false
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
      if (request.focus && node.contains(request.focus)) (request.focus as HTMLElement).focus?.()
      return true
    },
  }
}
