// The <Toast>s a provider holds: each gets a slot in the provider's stack, in arrival order, and
// portals into it. A plain store, made per provider; no DOM at import.
export type ToastSlotEntry = {
  key: number
  /** Arrival order, shared with toast() toasts, so the stack shows both in the order they came. */
  order: number
  hasAction: boolean
  /** Announced at once, as Alert's urgent. */
  urgent: boolean
  /** Ends the toast as its close button would (Escape on it in the stack). */
  dismiss: () => void
}

export type ToastRegistry = ReturnType<typeof createToastRegistry>

export function createToastRegistry() {
  let entries: ToastSlotEntry[] = []
  let paused = false
  let version = 0
  let copies: HTMLElement | null = null
  const slots = new Map<number, HTMLElement>()
  const listeners = new Set<() => void>()
  let next = 0
  const changed = () => {
    version += 1
    for (const listener of [...listeners]) listener()
  }
  return {
    key: () => ++next,
    add(entry: ToastSlotEntry) { entries = [...entries.filter((item) => item.key !== entry.key), entry]; changed() },
    update(key: number, patch: Partial<Omit<ToastSlotEntry, 'key' | 'order' | 'dismiss'>>) {
      entries = entries.map((item) => (item.key === key ? { ...item, ...patch } : item))
      changed()
    },
    remove(key: number) {
      if (!entries.some((item) => item.key === key)) return
      entries = entries.filter((item) => item.key !== key)
      slots.delete(key)
      changed()
    },
    entries: () => entries,
    /** The slot element the stack made for this toast, once it exists. */
    slot: (key: number) => slots.get(key) ?? null,
    setSlot(key: number, element: HTMLElement | null) {
      if (element) { if (slots.get(key) === element) return; slots.set(key, element) } else if (!slots.delete(key)) return
      changed()
    },
    /** A toast's words changed: the stack reads them again for its announcement. */
    touch: changed,
    /** All timers pause while the pointer or focus is in the stack. */
    paused: () => paused,
    setPaused(value: boolean) { if (paused !== value) { paused = value; changed() } },
    /** Where exits play: under the live toasts, in the stack's own layer. */
    copies: () => copies,
    setCopies(element: HTMLElement | null) { copies = element },
    version: () => version,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
