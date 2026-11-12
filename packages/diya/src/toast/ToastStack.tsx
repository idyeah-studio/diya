'use client'
// A provider's toast stack: one region in today's spot, newest nearest the corner, 12px apart.
// The outermost provider's stack shows toast() toasts; every provider's stack holds its own
// <Toast>s, in slots they portal into. It follows the topmost open modal, sits in the top layer,
// announces each toast once, pauses while read, and answers F8 and Escape.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type RefCallback } from 'react'
import { createPortal } from 'react-dom'
import { Alert, AlertInStackContext } from '../alert/Alert.js'
import { alertMessages } from '../alert/messages.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { cx } from '../internal/cx.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { subscribeModals, topModal } from '../internal/modal-stack.js'
import { motionTiming, playOnCopy } from '../internal/presence.js'
import { createAnnouncer, createToastHost, lowerToastHost, raiseToastHost, type ToastHost } from './host.js'
import { toastMessages } from './messages.js'
import { EMPTY_TOASTS, leaveToast, registerHost, removeToast, setToastCopies, setToastFocus, setToastSlotElement, setToastsPaused, settleToasts, subscribeToasts, toastSnapshot, unregisterHost, type ToastEntry, type ToastSlot } from './queue.js'

const LIMIT = 3
const PHONE_LIMIT = 2
const focusable = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

const narrow = {
  subscribe(onChange: () => void) {
    const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 600px)') : undefined
    media?.addEventListener?.('change', onChange)
    return () => media?.removeEventListener?.('change', onChange)
  },
  matches: () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 600px)').matches : false),
}
const serverFalse = () => false
const noHost = () => () => {}

// The exit, as 1.1's Toast: it sinks 12px and fades over two-thirds of the slow time, on a copy.
const exitFrames = (style: CSSStyleDeclaration, opacity: string): Keyframe[] => [
  { opacity, translate: '0 0' },
  { opacity: 0, translate: `0 ${style.getPropertyValue('--diya-internal-motion-distance-edge').trim() || '0px'}` },
]

/** The words a screen reader hears for a toast, as one text node. */
function spoken(tone: string, title: string, description: string, hint: string | undefined) {
  const status = tone.charAt(0).toLocaleUpperCase() + tone.slice(1)
  const sentence = /[.!?…]$/.test(title) ? title : `${title}.`
  return [`${status}: ${sentence}`, description, hint].filter(Boolean).join(' ')
}

const isConnectedFocusable = (element: Element | null | undefined): element is HTMLElement =>
  !!element && element.isConnected && typeof (element as HTMLElement).focus === 'function' && !element.closest('.diya-toast-region') && element !== element.ownerDocument.body

type Item = { kind: 'queue'; id: string; order: number; entry: ToastEntry } | { kind: 'slot'; id: string; order: number; slot: ToastSlot }

/**
 * The page's one stack, in its first-mounted outermost provider: toast() toasts, and every
 * provider's <Toast>s, in one corner and one column with one limit and one shift. A <Toast> from
 * another provider is wrapped in that provider's look (B1); nested providers make no stack.
 */
export function ToastStack({ portal, outermost, owner }: { portal: HTMLElement | null; outermost: boolean; owner: object }) {
  const t = useDiyaMessages('toast', toastMessages)
  const alertText = useDiyaMessages('alert', alertMessages)
  const [host, setHost] = useState<ToastHost | null>(null)
  const voices = useRef<{ polite: ReturnType<typeof createAnnouncer>; assertive: ReturnType<typeof createAnnouncer> } | null>(null)
  const [token] = useState(() => ({}))
  const snapshot = useSyncExternalStore(host ? subscribeToasts : noHost, toastSnapshot, () => EMPTY_TOASTS)
  const phone = useSyncExternalStore(narrow.subscribe, narrow.matches, serverFalse)
  const [pointer, setPointer] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [hidden, setHidden] = useState(false)
  const active = !!host && outermost && snapshot.hosts[0] === token
  const entries = useMemo(() => (active ? snapshot.entries.filter((entry) => entry.status !== 'waiting').sort((a, b) => a.order - b.order) : []), [active, snapshot])
  const components = useMemo(() => (active ? [...snapshot.slots].sort((a, b) => a.order - b.order) : []), [active, snapshot])
  const live = entries.filter((entry) => entry.status === 'shown')
  const items: Item[] = [
    ...entries.map((entry) => ({ kind: 'queue' as const, id: entry.id, order: entry.order, entry })),
    ...components.map((slot) => ({ kind: 'slot' as const, id: slot.key, order: slot.order, slot })),
  ].sort((a, b) => a.order - b.order)
  const showing = live.length + components.length > 0
  // Stable ref callbacks, one per <Toast>, so slots don't detach and reattach on every render.
  const slotRefs = useRef(new Map<string, RefCallback<HTMLDivElement>>())
  const slotRef = (key: string) => {
    let callback = slotRefs.current.get(key)
    if (!callback) {
      callback = (element) => {
        setToastSlotElement(key, element)
        if (!element) slotRefs.current.delete(key)
      }
      slotRefs.current.set(key, callback)
    }
    return callback
  }
  const list = useRef<HTMLDivElement | null>(null)
  const positions = useRef(new Map<string, number>())
  const announced = useRef(new Map<string, string>())
  const remaining = useRef(new Map<string, { version: number; left: number }>())
  const origin = useRef<HTMLElement | null>(null)
  // An F8 walk is under way: only then does the stack take Tab over (R1).
  const walking = useRef(false)
  const outside = useRef<HTMLElement | null>(null)
  const nativeModal = useRef<HTMLDialogElement | null>(null)
  // When a <Toast>'s exit copy last went into the copy layer (its gap closes after a delay too).
  const lastCopy = useRef(-Infinity)

  // The host: made in the browser only, so the server markup is unchanged.
  useClientLayoutEffect(() => {
    if (!portal || !outermost) return
    const made = createToastHost(portal.ownerDocument)
    portal.append(made.root)
    // Out of the top layer once the last exit has played and nothing shows.
    const view = portal.ownerDocument.defaultView
    const observer = view && typeof view.MutationObserver === 'function'
      ? new view.MutationObserver((records) => {
        if (records.some((record) => record.addedNodes.length)) lastCopy.current = performance.now()
        if (!made.copies.childElementCount && !made.region.querySelector('.diya-toast-list > .diya-toast')) lowerToastHost(made)
      })
      : null
    observer?.observe(made.copies, { childList: true })
    voices.current = { polite: createAnnouncer(made.polite), assertive: createAnnouncer(made.assertive) }
    setHost(made)
    return () => {
      voices.current?.polite.stop()
      voices.current?.assertive.stop()
      voices.current = null
      observer?.disconnect()
      made.root.remove()
      setHost(null)
    }
  }, [portal, outermost])

  // While this is the page's stack: where <Toast>s' exits play, and its focus chain.
  useClientLayoutEffect(() => {
    if (!active || !host) return
    setToastCopies(host.copies)
    setToastFocus((leaving, fallback, adjacent) => (adjacent ? closeFocusRef.current(leaving, fallback) : returnFocusRef.current(leaving, fallback)))
    return () => {
      setToastCopies(null)
      setToastFocus(null)
    }
  }, [active, host])

  // toast() uses the first-mounted outermost provider that's still mounted.
  useEffect(() => {
    if (!host || !outermost) return
    registerHost(token)
    // A passive cleanup: a layout swap unregisters and registers in one commit (see queue.ts).
    return () => unregisterHost(token)
  }, [host, token, outermost])

  // Where the stack lives: the topmost open modal, a native modal that held focus when a toast
  // arrived, or the provider's portal. Moving shows nothing new: no replay, no jump.
  const place = () => {
    if (!host || !portal) return
    const document = portal.ownerDocument
    const target = topModal(document) ?? (nativeModal.current?.open ? nativeModal.current : null) ?? portal
    if (host.root.parentElement === target) return
    host.region.dataset.still = ''
    target.append(host.root)
    if (items.length || host.copies.childElementCount) raiseToastHost(host)
    const view = document.defaultView
    view?.requestAnimationFrame(() => view.requestAnimationFrame(() => { delete host.region.dataset.still }))
  }
  const placeRef = useRef(place)
  placeRef.current = place
  useEffect(() => {
    if (!host || !portal) return
    placeRef.current()
    return subscribeModals(portal.ownerDocument, () => placeRef.current())
  }, [host, portal])

  // Fit the queue to this stack: at most 3 (2 under 600px wide), counting its <Toast>s, which
  // always show.
  useClientLayoutEffect(() => {
    if (active) settleToasts((phone ? PHONE_LIMIT : LIMIT) - components.length)
  }, [active, phone, snapshot, components.length])

  // All timers pause while the pointer or focus is in the stack, <Toast>s' too.
  useEffect(() => { if (active) setToastsPaused(pointer || focusInside) }, [active, pointer, focusInside])

  // After each commit: exits for leaving toasts, the shift for the others, the enter order, the
  // top layer, and what a screen reader hears.
  useClientLayoutEffect(() => {
    if (!host) return
    const node = list.current
    const slots = node ? Array.from(node.querySelectorAll<HTMLElement>(':scope > .diya-toast')) : []
    // In the top layer before anything is measured: a popover that isn't open lays out as nothing,
    // so a toast measured there would seem to have moved its whole height (T1).
    if (slots.some((slot) => slot.querySelector('.diya-alert') && !slot.hasAttribute('data-leaving')) && host.popover && !host.region.matches(':popover-open')) raiseToastHost(host)
    // Each toast is measured by its bottom edge from the list's bottom, where the stack is
    // anchored: a toast that grew in place (a same-id update) hasn't moved (T10).
    const edge = (slot: HTMLElement, height: number) => slot.offsetTop + slot.offsetHeight - height
    const hadToasts = positions.current.size > 0
    let height = node?.clientHeight ?? 0
    // Exits that leave a gap close it after the copy has mostly faded, so a see-through toast
    // never slides over a visible copy (T9). One that left to make room rides up with the stack.
    let gapDelay = performance.now() - lastCopy.current < 100
    // Leaving: the exit plays on a copy under the live toasts, then the entry goes.
    for (const slot of slots) {
      const id = slot.dataset.toast!
      const entry = entries.find((item) => item.id === id)
      if (entry?.status !== 'leaving') continue
      if (slot.contains(slot.ownerDocument.activeElement)) returnFocus(id)
      // Under the live toasts (z-index 1), inside the stack's own layer, where the toast was on
      // screen: if a toast arrived in this same commit, the leaving one has already moved up by
      // the newcomer's height (T3).
      const was = positions.current.get(id)
      const lift = was === undefined ? 0 : was - edge(slot, height)
      const played = playOnCopy(slot, host.copies, 'exit-slow', exitFrames, { zIndex: 0, offsetY: lift })
      const copy = played ? host.copies.lastElementChild as HTMLElement | null : null
      if (copy && lift > 0) {
        const { duration, easing, style } = motionTiming(slot, 'duration-slow', 'move')
        const travel = parseFloat(style?.getPropertyValue('--diya-internal-motion-travel') ?? '1') || 0
        if (duration && travel) copy.animate([{ transform: 'none' }, { transform: `translateY(${-lift}px)` }], { duration: duration * travel, easing, composite: 'add', fill: 'forwards' })
      } else if (played) gapDelay = true
      // Out of the layout now, so the others move in this same pass.
      slot.style.display = 'none'
      announced.current.delete(id)
      voices.current?.polite.forget(id)
      voices.current?.assertive.forget(id)
      remaining.current.delete(id)
      removeToast(id)
    }
    height = node?.clientHeight ?? 0
    // The others close the gap (or make room) by sliding, additively, on the move curve.
    const next = new Map<string, number>()
    const arriving: HTMLElement[] = []
    let shifted = false
    for (const slot of slots) {
      const id = slot.dataset.toast!
      if (id.startsWith('c') ? !slot.querySelector('.diya-alert') : entries.find((item) => item.id === id)?.status !== 'shown') continue
      const bottom = edge(slot, height)
      next.set(id, bottom)
      const before = positions.current.get(id)
      if (before === undefined) {
        arriving.push(slot)
        continue
      }
      const dy = before - bottom
      if (!dy || typeof slot.animate !== 'function' || slot.ownerDocument.hidden || host.region.dataset.still !== undefined) continue
      const { duration, easing, style } = motionTiming(slot, 'duration-slow', 'move')
      const travel = parseFloat(style?.getPropertyValue('--diya-internal-motion-travel') ?? '1') || 0
      if (!duration || !travel) continue
      shifted = true
      const delay = gapDelay ? duration / 2 : 0
      slot.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: duration * travel, easing, composite: 'add', delay, fill: 'backwards' })
    }
    // Make room, then arrive: when older toasts slide to make room, a newcomer's 12px rise and
    // fade start half the slow duration later, once they've cleared its slot, so nothing
    // see-through ever passes over it (T9). Into an empty stack, or under reduced motion, where
    // nothing slides, the enter is the usual one from @starting-style.
    if (shifted && hadToasts) {
      for (const slot of arriving) {
        const { duration, easing, style } = motionTiming(slot, 'duration-slow', 'enter')
        if (!duration || !style || typeof slot.animate !== 'function') continue
        const rise = style.getPropertyValue('--diya-internal-motion-distance-edge').trim() || '0px'
        // The CSS enter has already started; this one replaces it.
        slot.style.transition = 'none'
        const enter = slot.animate([{ opacity: 0, translate: `0 ${rise}` }, { opacity: 1, translate: '0 0' }], { duration, easing, delay: duration / 2, fill: 'backwards' })
        const done = () => { slot.style.transition = '' }
        enter.finished.then(done, done)
      }
    }
    positions.current = next
    // In the top layer while it holds a toast or an exit copy.
    if (next.size && host.popover && !host.region.matches(':popover-open')) raiseToastHost(host)
    if (!next.size && !host.copies.childElementCount) lowerToastHost(host)
    // Each toast is read once, from the always-present live region, as one text node.
    for (const entry of live) {
      const slot = slots.find((item) => item.dataset.toast === entry.id)
      const description = slot?.querySelector('.diya-alert-description')?.textContent?.trim() ?? ''
      const words = spoken(alertText[entry.tone], entry.title, description, entry.action ? t.actionHint(entry.action.label) : undefined)
      const key = `${entry.tone}|${entry.title}|${description}`
      // A same-id update speaks again only when its title, words or tone changed.
      if (announced.current.get(entry.id) === key) continue
      announced.current.set(entry.id, key)
      ;(entry.urgent ? voices.current?.assertive : voices.current?.polite)?.say(entry.id, words)
    }
    // <Toast>s too: their words are whatever they rendered.
    for (const component of components) {
      const slot = slots.find((item) => item.dataset.toast === component.key)
      const alert = slot?.querySelector<HTMLElement>('.diya-alert')
      if (!alert) continue
      const tone = alert.dataset.tone ?? 'info'
      const title = alert.querySelector('.diya-alert-title')?.textContent?.trim() ?? ''
      const description = alert.querySelector('.diya-alert-description')?.textContent?.trim() ?? ''
      const action = alert.querySelector('.diya-alert-action')?.textContent?.trim()
      const words = title
        ? spoken(alertText[tone as keyof typeof alertText] as string, title, description, action ? t.actionHint(action) : undefined)
        : [`${(alertText[tone as keyof typeof alertText] as string).replace(/^./, (first) => first.toLocaleUpperCase())}:`, description, action ? t.actionHint(action) : ''].filter(Boolean).join(' ')
      const key = `${tone}|${title}|${description}`
      if (announced.current.get(component.key) === key) continue
      announced.current.set(component.key, key)
      ;(component.urgent ? voices.current?.assertive : voices.current?.polite)?.say(component.key, words)
    }
    // A toast that has left takes its words with it.
    const present = new Set([...live.map((entry) => entry.id), ...components.map((component) => component.key)])
    for (const id of [...announced.current.keys()]) {
      if (present.has(id)) continue
      announced.current.delete(id)
      voices.current?.polite.forget(id)
      voices.current?.assertive.forget(id)
    }
  })

  // The pointer and focus flags, and an F8 walk, never outlive the toasts that set them: closing the last toast
  // with the pointer hides the list without a mouseleave, and WebKit and Firefox send no focusout
  // when a focused button is removed. Stale, either would freeze every later toast (T2).
  useClientLayoutEffect(() => {
    if (!showing) {
      walking.current = false
      origin.current = null
      if (pointer) setPointer(false)
      if (focusInside) setFocusInside(false)
    } else if (focusInside && !list.current?.contains(list.current.ownerDocument.activeElement)) setFocusInside(false)
  })

  // Timers run only while a toast shows, and all pause while the pointer or focus is in the
  // stack or the tab is hidden. A toast with an action never times out.
  const paused = pointer || focusInside || hidden
  const timing = live.map((entry) => `${entry.id}:${entry.version}:${entry.duration}:${entry.action ? 1 : 0}`).join(',')
  useEffect(() => {
    if (paused) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const started = Date.now()
    const running: { id: string; version: number; left: number }[] = []
    for (const entry of live) {
      if (entry.action || entry.duration <= 0) continue
      const known = remaining.current.get(entry.id)
      const left = known && known.version === entry.version ? known.left : entry.duration
      running.push({ id: entry.id, version: entry.version, left })
      timers.push(setTimeout(() => leaveToast(entry.id), left))
    }
    return () => {
      for (const timer of timers) clearTimeout(timer)
      const spent = Date.now() - started
      for (const { id, version, left } of running) remaining.current.set(id, { version, left: Math.max(0, left - spent) })
    }
  }, [timing, paused])

  useEffect(() => {
    if (!host) return
    const document = host.root.ownerDocument
    const visibility = () => setHidden(document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [host])

  // While toasts show: F8 reaches the newest one, and focus outside the stack is remembered so
  // Escape can return it. The listeners exist only then.
  useEffect(() => {
    if (!host || !showing) return
    const document = host.root.ownerDocument
    const remember = (event: Event) => { if (isConnectedFocusable(event.target as Element)) outside.current = event.target as HTMLElement }
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'F8' || event.defaultPrevented) return
      const newest = Array.from(document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast:not([data-leaving])'))
        .sort((a, b) => Number(b.dataset.order) - Number(a.dataset.order))[0]
      const button = newest?.querySelector<HTMLElement>(focusable)
      if (!button) return
      event.preventDefault()
      origin.current = isConnectedFocusable(document.activeElement) ? document.activeElement : null
      walking.current = true
      button.focus()
    }
    document.addEventListener('focusin', remember, true)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('focusin', remember, true)
      document.removeEventListener('keydown', keydown)
    }
  }, [host, showing])

  // A native modal that isn't DIYA's and holds focus when a toast arrives: the stack shows in it
  // until it closes.
  // Any toast arriving counts, a <Toast> as much as a toast() (1.1's <Toast> rendered in the open
  // dialog that held focus; T5).
  const newestOrder = items.length ? Math.max(...items.map((item) => item.order)) : undefined
  useEffect(() => {
    if (!host || newestOrder === undefined) return
    const document = host.root.ownerDocument
    let modal: HTMLDialogElement | null = null
    try { modal = document.activeElement?.closest<HTMLDialogElement>('dialog:modal') ?? null } catch { modal = document.activeElement?.closest<HTMLDialogElement>('dialog[open]') ?? null }
    if (!modal || modal === nativeModal.current || topModal(document) === modal) return
    nativeModal.current = modal
    placeRef.current()
    const closed = () => { if (nativeModal.current === modal) nativeModal.current = null; placeRef.current() }
    modal.addEventListener('close', closed, { once: true })
  }, [host, newestOrder])

  /** Where focus goes when a focused toast leaves: where F8 was pressed, else the last place focused outside the stack, else the next toast, else the topmost modal. Never the page's body. */
  function returnFocus(leaving: string, fallback?: HTMLElement | null) {
    const document = host?.root.ownerDocument
    if (!document) return
    for (const candidate of [origin.current, outside.current, fallback]) {
      if (isConnectedFocusable(candidate)) { candidate.focus(); origin.current = null; return }
    }
    const nextToast = Array.from(document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')).find((slot) => slot.dataset.toast !== leaving)?.querySelector<HTMLElement>(focusable)
    if (nextToast) { nextToast.focus(); return }
    const modal = topModal(document)
    modal?.querySelector<HTMLElement>(focusable)?.focus()
  }

  const returnFocusRef = useRef(returnFocus)
  returnFocusRef.current = returnFocus
  const closeFocusRef = useRef((id: string, fallback?: HTMLElement | null) => closeFocus(id, fallback))
  closeFocusRef.current = (id, fallback) => closeFocus(id, fallback)

  /** The close button, clicked while focused: focus moves to the next toast, else back. */
  function close(id: string) {
    closeFocus(id)
    leaveToast(id)
  }

  /** The toasts a person can reach, oldest first (the DOM's order and the screen's, top down). */
  const reachable = () => Array.from(list.current?.querySelectorAll<HTMLElement>(':scope > .diya-toast:not([data-leaving])') ?? [])
    .filter((slot) => slot.style.display !== 'none' && slot.querySelector(focusable))
  const controls = (slot: HTMLElement) => Array.from(slot.querySelectorAll<HTMLElement>(focusable))

  /** A focused toast's close button: focus moves to the toast next to it (the older one, else the newer), else back by the chain. */
  function closeFocus(id: string, fallback?: HTMLElement | null) {
    const document = host?.root.ownerDocument
    const slots = reachable()
    const slot = slots.find((item) => item.dataset.toast === id)
    if (!document || !slot?.contains(document.activeElement)) return
    const index = slots.indexOf(slot)
    const neighbor = slots[index - 1] ?? slots[index + 1]
    if (neighbor) controls(neighbor)[0].focus()
    else returnFocus(id, fallback)
  }

  /** The F8 walk ends: back to where F8 was pressed, else the last place focused outside the stack. */
  function leaveStack() {
    walking.current = false
    const candidates = [origin.current, outside.current]
    origin.current = null
    for (const candidate of candidates) {
      if (isConnectedFocusable(candidate)) { candidate.focus(); return true }
    }
    return false
  }

  function onKeyDown(event: globalThis.KeyboardEvent) {
    // After F8, Tab walks the stack from the newest toast to the oldest, then back to where F8 was
    // pressed; Shift+Tab goes the other way (T12). Within a toast, its own controls keep their
    // order. Focus that came in by Tab follows the page's order, through the toasts and on (R1).
    if (event.key === 'Tab' && !event.defaultPrevented) {
      if (!walking.current) return
      const target = event.target as HTMLElement
      const slots = reachable()
      const slot = slots.find((item) => item.contains(target))
      if (!slot) return
      const own = controls(slot)
      const index = slots.indexOf(slot)
      if (!event.shiftKey && own.at(-1) === target) {
        const older = slots[index - 1]
        if (older) { event.preventDefault(); controls(older)[0].focus() }
        else if (leaveStack()) event.preventDefault()
      } else if (event.shiftKey && own[0] === target) {
        const newer = slots[index + 1]
        if (newer) { event.preventDefault(); controls(newer).at(-1)!.focus() }
        else if (leaveStack()) event.preventDefault()
      }
      return
    }
    if (event.key !== 'Escape') return
    const slot = (event.target as HTMLElement).closest<HTMLElement>('.diya-toast')
    const id = slot?.dataset.toast
    if (!id) return
    // Only the toast: a Dialog around the stack doesn't also close.
    event.preventDefault()
    event.stopPropagation()
    if (id.startsWith('c')) {
      components.find((item) => item.key === id)?.dismiss()
      return
    }
    returnFocus(id)
    leaveToast(id)
  }

  // The list's own DOM listeners, not React props: a <Toast>'s content is portalled into its slot
  // from elsewhere in the React tree, so React would bubble its events past the list.
  const handlers = useRef({ onKeyDown })
  handlers.current = { onKeyDown }
  useEffect(() => {
    const node = list.current
    if (!host || !node) return
    // mouseover and mouseout bubble from any toast, the way React builds onMouseEnter, so
    // Testing Library's fireEvent.mouseEnter on a toast's text pauses it as it did in 1.1 (T6).
    const enter = () => setPointer(true)
    const leave = (event: MouseEvent) => { if (!node.contains(event.relatedTarget as Node | null)) setPointer(false) }
    const focusIn = () => setFocusInside(true)
    const focusOut = (event: globalThis.FocusEvent) => {
      if (node.contains(event.relatedTarget as Node)) return
      setFocusInside(false)
      // Focus left the stack: any F8 walk is over.
      walking.current = false
      origin.current = null
    }
    const keydown = (event: globalThis.KeyboardEvent) => handlers.current.onKeyDown(event)
    node.addEventListener('mouseover', enter)
    node.addEventListener('mouseout', leave)
    node.addEventListener('focusin', focusIn)
    node.addEventListener('focusout', focusOut)
    node.addEventListener('keydown', keydown)
    return () => {
      node.removeEventListener('mouseover', enter)
      node.removeEventListener('mouseout', leave)
      node.removeEventListener('focusin', focusIn)
      node.removeEventListener('focusout', focusOut)
      node.removeEventListener('keydown', keydown)
    }
  }, [host])

  if (!host) return null
  return createPortal(
    <div
      ref={list}
      className="diya-toast-list"
      role={items.length ? 'region' : undefined}
      aria-label={items.length ? t.label : undefined}
    >
      {items.map((item) => item.kind === 'slot'
        ? (
          <div key={item.id} className="diya-toast" data-toast={item.id} data-order={item.order}>
            {/* The <Toast> portals in here. From another provider, this carries that provider's
                look (theme, Glass, motion, class and style) and takes no box of its own. */}
            {item.slot.owner === owner
              ? <div ref={slotRef(item.slot.key)} className="diya-toast-scope" />
              : <div ref={slotRef(item.slot.key)} className={cx('diya-root diya-toast-scope', item.slot.look.className)} data-theme={item.slot.look.theme} data-glass={item.slot.look.glass} data-surface="false" data-motion={item.slot.look.motion} style={{ ...(item.slot.look.style as CSSProperties), display: 'contents' }} />}
          </div>
        )
        : (({ entry }) => (
        <div key={entry.id} className="diya-toast" data-toast={entry.id} data-order={entry.order} data-leaving={entry.status === 'leaving' ? '' : undefined}>
          <AlertInStackContext.Provider value={{ announce: false, dismissLabel: t.dismiss(entry.title) }}>
            <Alert
              tone={entry.tone}
              title={entry.title}
              urgent={entry.urgent}
              action={entry.action ? { label: entry.action.label, onClick: () => { returnFocus(entry.id); entry.action!.onClick(); leaveToast(entry.id) } } : undefined}
              onDismiss={() => close(entry.id)}
            >
              {entry.description}
            </Alert>
          </AlertInStackContext.Provider>
        </div>
      ))(item))}
    </div>,
    host.region,
  )
}
