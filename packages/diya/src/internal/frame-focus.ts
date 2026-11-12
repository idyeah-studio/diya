'use client'
// Which element has focus, for fields whose control lives in an iframe (G5). Focus inside a
// cross-origin frame reaches the page as little as a window blur (Chromium, WebKit) or nothing
// at all (Firefox), and moving between two such frames, or out to blank page, may send nothing
// either. One watcher per document, counted by the fields that use it, reads activeElement after
// every focus, pointer, key and window event, and every 100ms while any of them is mounted, and
// tells each field when it changes.

type Watch = { users: Set<(active: Element | null) => void>; last: Element | null | undefined; stop: () => void }
const watches = new WeakMap<Document, Watch>()
const POLL_MS = 100

/** Calls `onChange` with the document's active element whenever it changes, until the returned stop. */
export function watchFocus(document: Document, onChange: (active: Element | null) => void) {
  let watch = watches.get(document)
  if (!watch) {
    const view = document.defaultView
    const created: Watch = { users: new Set(), last: undefined, stop: () => {} }
    const check = () => {
      const active = document.activeElement
      if (active === created.last) return
      created.last = active
      for (const user of [...created.users]) user(active)
    }
    let frame = 0
    const soon = () => {
      check()
      if (!frame && view) frame = view.requestAnimationFrame(() => { frame = 0; check() })
    }
    const events = ['focusin', 'focusout', 'pointerdown', 'keydown'] as const
    for (const type of events) document.addEventListener(type, soon, true)
    view?.addEventListener('blur', soon)
    view?.addEventListener('focus', soon)
    const timer = view ? view.setInterval(check, POLL_MS) : undefined
    created.stop = () => {
      for (const type of events) document.removeEventListener(type, soon, true)
      view?.removeEventListener('blur', soon)
      view?.removeEventListener('focus', soon)
      if (timer !== undefined) view?.clearInterval(timer)
      if (frame) view?.cancelAnimationFrame(frame)
    }
    watches.set(document, created)
    watch = created
  }
  const kept = watch
  kept.users.add(onChange)
  onChange(document.activeElement)
  return () => {
    kept.users.delete(onChange)
    if (kept.users.size) return
    kept.stop()
    watches.delete(document)
  }
}
