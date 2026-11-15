'use client'
// Where focus goes back to when an overlay closes. Safari's clicks don't focus a button, so after
// a mouse click focus is on <body>, and an overlay opened that way used to return focus there
// (Q-03, since 1.0.1). One capture listener per document remembers the control the last press
// landed on, for exactly that case (F2).

const controls = 'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
const pressed = new WeakMap<Document, { target: HTMLElement | null }>()

/** Whether `element` is a control a person was using (it takes typing or a press), rather than
 *  <body>, a dialog or another container that a click in Safari focuses instead (H3). */
export function isControl(element: Element | null | undefined) {
  return !!element && element !== element.ownerDocument.body && (element.matches(controls) || (element as HTMLElement).isContentEditable)
}

/** Starts remembering presses in this document (once per document; it stays for the page's life). */
export function watchPresses(document: Document) {
  if (pressed.has(document)) return
  const state: { target: HTMLElement | null } = { target: null }
  pressed.set(document, state)
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null
    state.target = typeof target?.closest === 'function' ? target.closest<HTMLElement>(controls) : null
  }, true)
}

/** Whether `element` is somewhere a person was: anything that held focus, a heading with
 *  tabindex="-1" included (where focus goes when a view changes), but not <body> or a modal's own
 *  element (a <dialog>, or a role="dialog" or aria-modal root), which a click in Safari focuses
 *  instead of the control it pressed (H3, UX-78-01). */
export function isPlace(element: Element | null | undefined) {
  return !!element && element !== element.ownerDocument.body && !element.matches('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]')
}

/** Where a person is now: the focused element when it's a place, else (Safari focused <body> or
 *  the modal instead) the control the last press landed on. */
export function currentPlace(document: Document): HTMLElement | null {
  const active = document.activeElement
  if (active instanceof HTMLElement && isPlace(active)) return active
  const target = pressed.get(document)?.target
  return target?.isConnected ? target : null
}

/** The element to give focus back to: the focused one, or, with focus on <body>, the control the last press landed on. */
export function opener(document: Document): HTMLElement | null {
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) return active
  const target = pressed.get(document)?.target
  return target?.isConnected ? target : null
}
