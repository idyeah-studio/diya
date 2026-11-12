'use client'
// Where a pointer is pressed in a document, for the fields' held errors (MOT-1.2-04): one pair of
// capture listeners per document, counted by the fields that use it, not one per field, which
// matters for a 100-row editable table.

type Watch = { users: number; pressed: Element | null; waiting: Set<() => void>; stop: () => void }
const watches = new WeakMap<Document, Watch>()

/** Starts watching presses in `document` for one user; returns its release. */
export function watchPointer(document: Document) {
  let watch = watches.get(document)
  if (!watch) {
    const created: Watch = { users: 0, pressed: null, waiting: new Set(), stop: () => {} }
    const down = (event: Event) => { created.pressed = event.target as Element | null }
    const up = () => {
      created.pressed = null
      if (!created.waiting.size) return
      // Every waiting field runs in one task, after the click that follows the release, so a
      // press that lands on a button reaches it before any error moves the layout.
      const run = [...created.waiting]
      created.waiting.clear()
      setTimeout(() => { for (const callback of run) callback() }, 0)
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', up, true)
    created.stop = () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', up, true)
    }
    watches.set(document, created)
    watch = created
  }
  watch.users += 1
  const kept = watch
  return () => {
    kept.users -= 1
    if (kept.users > 0) return
    kept.stop()
    watches.delete(document)
  }
}

/** The element a pointer is pressed on now, if any. */
export const pressedIn = (document: Document) => watches.get(document)?.pressed ?? null

/** Runs `callback` in the task after the pointer is released; returns a cancel. */
export function afterRelease(document: Document, callback: () => void) {
  const watch = watches.get(document)
  if (!watch?.pressed) {
    callback()
    return () => {}
  }
  watch.waiting.add(callback)
  return () => { watch.waiting.delete(callback) }
}
