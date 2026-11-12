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

/** How long an announcement stays in its live region once set: 5 seconds, so a screen reader
 *  that queues it behind what it's already saying (VoiceOver) still finds it, then cleared, so
 *  the words don't linger in the accessibility tree. It goes at once when its toast leaves
 *  (T7; the founders' F5, Nov 12: "when its toast leaves or after 5 seconds"). */
export const ANNOUNCEMENT_MS = 5000

/**
 * A live region's voice. Everything said within one frame is read as one text node, in order,
 * so two toasts raised together are both heard (T11). The region is cleared, then set on the next
 * frame, so it's read again; then cleared once read, or as soon as its toast leaves.
 */
export function createAnnouncer(region: HTMLElement) {
  const view = region.ownerDocument.defaultView
  let pending: { id: string; text: string }[] = []
  let speaking = new Set<string>()
  let frame = 0
  let clear: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    frame = 0
    if (!pending.length) return
    region.textContent = pending.map((item) => item.text).join(' ')
    speaking = new Set(pending.map((item) => item.id))
    pending = []
    if (clear) clearTimeout(clear)
    clear = setTimeout(() => { region.textContent = ''; speaking.clear() }, ANNOUNCEMENT_MS)
  }
  return {
    say(id: string, text: string) {
      pending = [...pending.filter((item) => item.id !== id), { id, text }]
      if (frame) return
      region.textContent = ''
      if (view && typeof view.requestAnimationFrame === 'function') frame = view.requestAnimationFrame(flush)
      else flush()
    },
    /** The toast left: its words go too. */
    forget(id: string) {
      pending = pending.filter((item) => item.id !== id)
      if (!speaking.has(id)) return
      speaking.clear()
      region.textContent = ''
    },
    stop() {
      if (frame && view) view.cancelAnimationFrame(frame)
      if (clear) clearTimeout(clear)
    },
  }
}

// What a toast's own animations read: its enter (CSS), its delayed enter, and its exit copy.
const MOTION_TOKENS = [
  '--diya-internal-motion', '--diya-internal-motion-travel', '--diya-internal-motion-distance', '--diya-internal-motion-distance-edge',
  '--diya-internal-duration-fast', '--diya-internal-duration-medium', '--diya-internal-duration-slow',
  '--diya-internal-exit-fast', '--diya-internal-exit-medium', '--diya-internal-exit-slow',
  '--diya-ease-enter', '--diya-ease-exit', '--diya-ease-move',
]

/**
 * A provider's motion as resolved on its own element: its setting (off, reduced, or the device's
 * Reduce Motion), its duration scale and anything set above it. A <Toast> from a nested provider
 * carries these on its place in the page's stack, so it enters and leaves the way its own
 * provider moves, as it did in 1.1.1 (R2).
 */
export function motionTokens(element: HTMLElement | null): Record<string, string> | undefined {
  const view = element?.ownerDocument.defaultView
  if (!element || !element.isConnected || !view) return undefined
  const style = view.getComputedStyle(element)
  const out: Record<string, string> = {}
  for (const name of MOTION_TOKENS) {
    const value = style.getPropertyValue(name).trim()
    if (value) out[name] = value
  }
  return out
}
