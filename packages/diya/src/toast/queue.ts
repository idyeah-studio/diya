// toast(): the app's one stack of toasts, fed from any client code. No directive, no hooks and no
// browser globals, so a Server Component or server action can import the real function (it does
// nothing there). The providers' stacks render what's queued here.
//
// The module is not named toast.ts: it would collide with Toast.tsx on a case-insensitive disk.
import type { ReactNode } from 'react'
import type { AlertTone } from '../alert/Alert.js'
import { warnOnce } from '../internal/warn.js'

export type ToastOptions = {
  /** Visible bold first line: what happened, with the real name ("Draft saved", "3 emails archived"). It also names the toast's close button. */
  title: string
  /** Visible message under the title: what happens next. */
  description?: ReactNode
  /** 'info' for information, 'success' done, 'warning' needs care, 'error' failed, 'brand' the provider's brand color; sets the icon and color and is announced before the title. Defaults to 'info'. */
  tone?: AlertTone
  /** One visible button, such as Undo; `label` is its text. Running it closes the toast and returns focus. A toast with an action never times out and is never pushed out to make room. */
  action?: { label: string; onClick: () => void }
  /** Milliseconds it stays, counted only while it shows and paused while pointed at, focused or the tab is hidden; 0 or less keeps it until dismissed. Ignored with an `action`. Defaults to 8000. */
  duration?: number
  /** Announces it at once, interrupting a screen reader; otherwise it's polite. Use for errors that need action. */
  urgent?: boolean
  /** Names the toast: a later call with the same id updates it in place and restarts its time, such as "Saving…" then "Saved". Defaults to a generated id. */
  id?: string
}

/** One queued toast. `order` is its place in arrival order; `version` changes with every update. */
export type ToastEntry = Required<Pick<ToastOptions, 'title' | 'tone' | 'duration' | 'urgent' | 'id'>> & Pick<ToastOptions, 'description' | 'action'> & {
  order: number
  version: number
  /** Shown in the active stack, waiting for room, or leaving (its exit is playing). */
  status: 'waiting' | 'shown' | 'leaving'
}

export type ToastSnapshot = { readonly entries: readonly ToastEntry[]; readonly hosts: readonly object[] }

type Store = {
  entries: ToastEntry[]
  hosts: object[]
  listeners: Set<() => void>
  snapshot: ToastSnapshot
  count: number
  order: number
  dropping: boolean
}

// One store per page, on globalThis under a versioned key: two copies of the package in one page
// (peer variants, an injected workspace copy, a hot reload) still share one queue, and a future
// incompatible store never mixes with this one. Made on first use, so nothing runs at import.
const KEY = Symbol.for('@idyeah/diya/toast@1')
function store(): Store {
  const host = globalThis as unknown as Record<symbol, Store | undefined>
  return (host[KEY] ??= { entries: [], hosts: [], listeners: new Set(), snapshot: { entries: [], hosts: [] }, count: 0, order: 0, dropping: false })
}

function changed(state: Store) {
  state.snapshot = { entries: state.entries, hosts: state.hosts }
  for (const listener of [...state.listeners]) listener()
}

const onServer = () => typeof window === 'undefined'
// On the server, ids only: nothing is stored, so one visitor's toast never reaches another.
let serverCount = 0

/** Shows a toast in the app's one stack and returns its id. Call it from client code, such as event handlers, effects and data code. On the server it does nothing. */
function show(options: ToastOptions): string {
  if (onServer()) {
    if (process.env.NODE_ENV !== 'production') warnOnce('DIYA: toast() does nothing on the server. Return a result and call toast() in the client.')
    return options.id ?? `t-server-${++serverCount}`
  }
  const state = store()
  const id = options.id ?? `t${++state.count}`
  const known = state.entries.find((entry) => entry.id === id && entry.status !== 'leaving')
  const fields = {
    title: options.title,
    description: options.description,
    tone: options.tone ?? 'info',
    action: options.action,
    duration: options.duration ?? 8000,
    urgent: options.urgent ?? false,
  }
  if (known) {
    // Same id: update in place, shown or waiting, and restart its time.
    state.entries = state.entries.map((entry) => (entry === known ? { ...entry, ...fields, version: entry.version + 1 } : entry))
  } else {
    state.entries = [...state.entries, { ...fields, id, order: ++state.order, version: 0, status: 'waiting' }]
    if (process.env.NODE_ENV !== 'production' && !state.hosts.length) {
      setTimeout(() => {
        if (!store().hosts.length && store().entries.some((entry) => entry.id === id)) warnOnce('DIYA: toast() was called, but no DiyaProvider is mounted to show it. It will show when one mounts.')
      }, 2000)
    }
  }
  changed(state)
  return id
}

/** Closes the toast with this id, or every toast, shown and waiting, when called without one. */
function dismiss(id?: string) {
  if (onServer()) return
  const state = store()
  const leave = (entry: ToastEntry) => id === undefined || entry.id === id
  if (!state.entries.some(leave)) return
  // A shown toast leaves through its stack, which plays its exit; the rest go at once.
  state.entries = state.entries.flatMap((entry) => (!leave(entry) ? [entry] : entry.status === 'shown' && state.hosts.length ? [{ ...entry, status: 'leaving' as const }] : []))
  changed(state)
}

export const toast: {
  (options: ToastOptions): string
  /** Closes the toast with this id, or every toast, shown and waiting, when called without one. */
  dismiss(id?: string): void
} = Object.assign(show, { dismiss })

// --- For the providers' stacks (internal) -----------------------------------------------

export function subscribeToasts(listener: () => void) {
  const state = store()
  state.listeners.add(listener)
  return () => { state.listeners.delete(listener) }
}
export const toastSnapshot = (): ToastSnapshot => store().snapshot
export const EMPTY_TOASTS: ToastSnapshot = { entries: [], hosts: [] }

/** A provider that can show toast() toasts. The first registered that's still registered is active. */
export function registerHost(host: object) {
  const state = store()
  if (state.hosts.includes(host)) return
  state.hosts = [...state.hosts, host]
  changed(state)
}

/**
 * When the last host goes, every toast is dropped, so tests don't leak into each other: one
 * microtask later, and only if no host has registered by then. A layout swap, such as navigating
 * to a page under another root layout, unmounts one provider and mounts the next in the same
 * synchronous commit, so a "Saved" fired just before it survives.
 */
export function unregisterHost(host: object) {
  const state = store()
  if (!state.hosts.includes(host)) return
  state.hosts = state.hosts.filter((item) => item !== host)
  changed(state)
  if (state.hosts.length || state.dropping) return
  state.dropping = true
  queueMicrotask(() => {
    const now = store()
    now.dropping = false
    if (now.hosts.length || !now.entries.length) return
    now.entries = []
    changed(now)
  })
}

/** The entry is gone from the page: its exit has played. */
export function removeToast(id: string) {
  const state = store()
  if (!state.entries.some((entry) => entry.id === id && entry.status === 'leaving')) return
  state.entries = state.entries.filter((entry) => !(entry.id === id && entry.status === 'leaving'))
  changed(state)
}

/** Ends a toast from its stack (its timer, close button, Escape or action): it plays its exit. */
export function leaveToast(id: string) {
  const state = store()
  if (!state.entries.some((entry) => entry.id === id && entry.status !== 'leaving')) return
  state.entries = state.entries.flatMap((entry) => (entry.id !== id || entry.status === 'leaving' ? [entry] : entry.status === 'shown' ? [{ ...entry, status: 'leaving' as const }] : []))
  changed(state)
}

/**
 * Fits the queue to the active stack: `room` toasts may show besides the stack's own <Toast>s.
 * A waiting toast shows at once if there's room; otherwise the oldest shown toast without an
 * action leaves to make it, and with none, it waits. When there's less room than shown toasts
 * (a <Toast> arrived, or the window narrowed), the oldest without an action leave; if every shown
 * toast has an action, the newest go back to the front of the line.
 */
export function settleToasts(room: number) {
  const state = store()
  let entries = state.entries
  const count = () => entries.filter((entry) => entry.status === 'shown').length
  const evict = () => {
    const oldest = entries.filter((entry) => entry.status === 'shown' && !entry.action).sort((a, b) => a.order - b.order)[0]
    if (!oldest) return false
    entries = entries.map((entry) => (entry === oldest ? { ...entry, status: 'leaving' as const } : entry))
    return true
  }
  // Too many showing.
  while (count() > Math.max(0, room)) {
    if (evict()) continue
    const newest = entries.filter((entry) => entry.status === 'shown').sort((a, b) => b.order - a.order)[0]
    entries = entries.map((entry) => (entry === newest ? { ...entry, status: 'waiting' as const } : entry))
  }
  // Waiting toasts, oldest first.
  for (const waiting of entries.filter((entry) => entry.status === 'waiting').sort((a, b) => a.order - b.order)) {
    if (count() >= room && !evict()) break
    if (count() >= room) break
    entries = entries.map((entry) => (entry.id === waiting.id && entry.status === 'waiting' ? { ...entry, status: 'shown' as const } : entry))
  }
  if (entries.length === state.entries.length && entries.every((entry, index) => entry === state.entries[index])) return
  state.entries = entries
  changed(state)
}
