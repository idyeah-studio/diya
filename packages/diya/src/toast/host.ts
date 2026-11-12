'use client'
// The toast stack's elements, made once per provider in the browser:
//
//   div.diya-toast-host                     display: contents; in the provider's portal or the topmost open modal
//     div[aria-live=polite][aria-atomic]    visually hidden, no role
//     div[aria-live=assertive][aria-atomic] visually hidden, no role
//     div.diya-toast-region[popover=manual] the stack: in the top layer while it holds toasts or exit copies
//       div.diya-toast-copies               exits play here, under the live toasts
//       (React portals the list in after it)
//
// In the top layer the stack is placed against the viewport and painted above an open Dialog or
// Drawer, while staying the modal's DOM child, so it's inside its focus boundary and clickable.
// Without the Popover API (Safari before 17, Firefox before 125) it stays a fixed layer, as in 1.1.

const HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden',
  clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: '0',
}

export type ToastHost = {
  root: HTMLDivElement
  polite: HTMLDivElement
  assertive: HTMLDivElement
  region: HTMLDivElement
  copies: HTMLDivElement
  /** Whether the region is a popover (the Popover API is there). */
  popover: boolean
}

export function createToastHost(document: Document): ToastHost {
  const make = (className?: string) => {
    const element = document.createElement('div')
    if (className) element.className = className
    return element
  }
  const root = make('diya-toast-host')
  const live = (politeness: 'polite' | 'assertive') => {
    const element = make()
    element.setAttribute('aria-live', politeness)
    element.setAttribute('aria-atomic', 'true')
    Object.assign(element.style, HIDDEN)
    return element
  }
  const polite = live('polite')
  const assertive = live('assertive')
  const region = make('diya-toast-region diya-toast-stack')
  const copies = make('diya-toast-copies')
  copies.setAttribute('aria-hidden', 'true')
  const view = document.defaultView
  const popover = !!view && typeof view.HTMLElement.prototype.showPopover === 'function'
  if (popover) region.setAttribute('popover', 'manual')
  region.append(copies)
  root.append(polite, assertive, region)
  return { root, polite, assertive, region, copies, popover }
}

/** Puts the stack in the top layer, above whatever is there now (a modal that just opened). */
export function raiseToastHost(host: ToastHost) {
  if (!host.popover || !host.root.isConnected) return
  try {
    if (host.region.matches(':popover-open')) host.region.hidePopover()
    host.region.showPopover()
  } catch {
    // A detached or disconnected element can't be shown; the next move raises it.
  }
}

export function lowerToastHost(host: ToastHost) {
  if (!host.popover) return
  try {
    if (host.region.matches(':popover-open')) host.region.hidePopover()
  } catch {
    // Already hidden.
  }
}

/** Says one line through a live region: cleared, then set on the next frame, so it's read again. */
export function announce(region: HTMLElement, text: string) {
  const view = region.ownerDocument.defaultView
  region.textContent = ''
  const set = () => { region.textContent = text }
  if (view && typeof view.requestAnimationFrame === 'function') view.requestAnimationFrame(set)
  else set()
}
