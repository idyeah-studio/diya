'use client'
// Which element has focus, for fields whose control lives in an iframe (G5). Focus inside a
// cross-origin frame reaches the page as little as a window blur (Chromium, WebKit) or nothing
// at all (Firefox), and moving between two such frames, or out to blank page, may send nothing
// either. One watcher per document, counted by the fields that use it, reads activeElement after
// every focus, pointer, key and window event, and tells each field when it changes. It also reads
// it every 100ms, but only while focus is in an iframe or the pointer is over one (H5): a page at
// rest does no work, and a click into a frame (which Firefox doesn't tell the page about) is
// still seen.

type Watch = { users: Set<(active: Element | null) => void>; last: Element | null | undefined; stop: () => void }
const watches = new WeakMap<Document, Watch>()
const POLL_MS = 100

/** Calls `onChange` with the document's active element whenever it changes, until the returned stop. */
export function watchFocus(document: Document, onChange: (active: Element | null) => void) {
  let watch = watches.get(document)
  if (!watch) {
    const view = document.defaultView
    const created: Watch = { users: new Set(), last: undefined, stop: () => {} }
    let timer: number | undefined
    let overFrame = false
    // The poll runs only while focus is in an iframe or the pointer is over one.
    const poll = (active: Element | null) => {
      const wanted = overFrame || active?.tagName === 'IFRAME'
      if (wanted && timer === undefined && view) timer = view.setInterval(check, POLL_MS)
      if (!wanted && timer !== undefined) { view?.clearInterval(timer); timer = undefined }
    }
    function check() {
      const active = document.activeElement
      poll(active)
      if (active === created.last) return
      created.last = active
      for (const user of [...created.users]) user(active)
    }
    const hover = (event: PointerEvent) => {
      overFrame = event.type === 'pointerover' && (event.target as Element | null)?.tagName === 'IFRAME'
      check()
    }
    let frame = 0
    const soon = () => {
      check()
      if (!frame && view) frame = view.requestAnimationFrame(() => { frame = 0; check() })
    }
    const events = ['focusin', 'focusout', 'pointerdown', 'keydown'] as const
    for (const type of events) document.addEventListener(type, soon, true)
    document.addEventListener('pointerover', hover, true)
    document.addEventListener('pointerout', hover, true)
    view?.addEventListener('blur', soon)
    view?.addEventListener('focus', soon)
    created.stop = () => {
      for (const type of events) document.removeEventListener(type, soon, true)
      document.removeEventListener('pointerover', hover, true)
      document.removeEventListener('pointerout', hover, true)
      view?.removeEventListener('blur', soon)
      view?.removeEventListener('focus', soon)
      if (timer !== undefined) view?.clearInterval(timer)
      if (frame) view?.cancelAnimationFrame(frame)
    }
    watches.set(document, created)
    watch = created
    // Focus may already be in a frame.
    poll(document.activeElement)
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
