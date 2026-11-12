// The open DIYA modals (Dialog and Drawer), per document, in the order they opened. The toast
// stack, the field announcer and useDiyaPortalContainer() follow the topmost one. No directive
// and no DOM at import: the store is made on first use.
type Entry = { modals: HTMLElement[]; listeners: Set<() => void> }
const KEY = Symbol.for('@idyeah/diya/modal-stack@1')
type Store = WeakMap<Document, Entry>

function entry(document: Document): Entry {
  // On globalThis, so two copies of the package in one page share one stack.
  const host = globalThis as unknown as Record<symbol, Store | undefined>
  const store = (host[KEY] ??= new WeakMap())
  let found = store.get(document)
  if (!found) store.set(document, (found = { modals: [], listeners: new Set() }))
  return found
}

function notify(found: Entry) {
  for (const listener of [...found.listeners]) listener()
}

/** Records a modal that has just opened (after showModal()). */
export function pushModal(modal: HTMLElement) {
  const found = entry(modal.ownerDocument)
  if (found.modals.at(-1) === modal) return
  found.modals = [...found.modals.filter((item) => item !== modal), modal]
  notify(found)
}

/** Drops a modal that is closing or unmounting. Safe to call twice. */
export function removeModal(modal: HTMLElement | null | undefined) {
  if (!modal) return
  const found = entry(modal.ownerDocument)
  if (!found.modals.includes(modal)) return
  found.modals = found.modals.filter((item) => item !== modal)
  notify(found)
}

/** The topmost open DIYA modal in this document, or null. */
export function topModal(document: Document): HTMLElement | null {
  return entry(document).modals.at(-1) ?? null
}

/** Calls `listener` whenever a modal opens or closes in this document; returns the unsubscribe. */
export function subscribeModals(document: Document, listener: () => void) {
  const found = entry(document)
  found.listeners.add(listener)
  return () => { found.listeners.delete(listener) }
}
