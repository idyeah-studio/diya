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
import { isControl, isPlace } from '../internal/opener.js'
import { motionTiming, playOnCopy } from '../internal/presence.js'
import { createAnnouncer, createToastHost, lowerToastHost, raiseToastHost, type ToastHost } from './host.js'
import { elapsed, live as playing, moved, offsetY, overlaps, remaining as timeLeft, RIDE_ANIMATION, SHIFT_ANIMATION, showingCopies, type Shift, type Span } from './motion.js'
import { toastMessages } from './messages.js'
import { EMPTY_TOASTS, leaveToast, providerAbove, registerHost, removeToast, setToastCopies, setToastFocus, setToastSay, setToastUnsay, setToastSlotElement, setToastsPaused, settleToasts, subscribeToasts, toastSnapshot, unregisterHost, type ToastEntry, type ToastSlot } from './queue.js'

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
  // The element in the stack that focus last went to.
  const focused = useRef<Element | null>(null)
  // Where focus was when it came into the stack from outside, for this visit only: where × sends
  // it back (G8). Forgotten when focus leaves the stack or the stack empties (H2).
  const cameFrom = useRef<HTMLElement | null>(null)
  const nativeModal = useRef<HTMLDialogElement | null>(null)
  // Each toast's shifts, so one still waiting to start can fold into the next (R3).
  const moving = useRef(new WeakMap<HTMLElement, Shift[]>())

  // The host: made in the browser only, so the server markup is unchanged.
  useClientLayoutEffect(() => {
    // Outermost on the page for this React, not only in this copy's React tree: a provider from
    // another copy of the package (or another root) inside a provider of the same React makes no
    // stack, so the page keeps one, in its outermost provider (R8). Another React's provider
    // above doesn't count: an app on another React keeps its own stack (S5).
    if (!portal || !outermost || !portal.parentElement || providerAbove(portal.parentElement)) return
    const made = createToastHost(portal.ownerDocument)
    portal.append(made.root)
    // Out of the top layer once the last exit has played and nothing shows.
    const view = portal.ownerDocument.defaultView
    const observer = view && typeof view.MutationObserver === 'function'
      ? new view.MutationObserver(() => {
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
    // A field's error announcement speaks through this stack's polite region, with any toast
    // said in the same frame (step 5).
    let said = 0
    setToastSay((text, options) => {
      // Said from inside the app's own modal dialog: the region moves there first, where a
      // screen reader can reach it, as a toast's does (G9).
      followRef.current(options?.node)
      voices.current?.polite.say(options?.key ?? `field:${++said}`, text)
    })
    setToastUnsay((key) => voices.current?.polite.forget(key))
    // A <Toast> leaving, by its slot's key.
    setToastFocus((leaving, fallback, adjacent) => (adjacent ? closeFocusRef.current(`slot:${leaving}`, fallback) : returnFocusRef.current(`slot:${leaving}`, fallback)))
    return () => {
      setToastCopies(null)
      setToastFocus(null)
      setToastSay(null)
      setToastUnsay(null)
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
    // A <Toast> already dismissed doesn't count: it's leaving (S1).
    if (active) settleToasts((phone ? PHONE_LIMIT : LIMIT) - components.filter((slot) => !slot.leaving).length)
  }, [active, phone, snapshot, components])

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
    const animate = !!node && typeof node.animate === 'function' && !node.ownerDocument.hidden && host.region.dataset.still === undefined
    // The column moves on this stack's provider's motion, whoever's toasts are in it.
    const column = animate && node ? motionTiming(node, 'duration-slow', 'move') : undefined
    const travel = parseFloat(column?.style?.getPropertyValue('--diya-internal-motion-travel') ?? '1') || 0
    const slow = column?.duration ?? 0
    let height = node?.clientHeight ?? 0
    // Leaving: the exit plays on a copy under the live toasts, then the entry goes.
    for (const slot of slots) {
      const id = slot.dataset.toast!
      const key = slot.dataset.key!
      const entry = slot.dataset.kind === 'toast' ? entries.find((item) => item.id === id) : undefined
      if (entry?.status !== 'leaving') continue
      if (slot.contains(slot.ownerDocument.activeElement)) returnFocus(key)
      // Under the live toasts (z-index 1), inside the stack's own layer, where the toast was on
      // screen: if a toast arrived in this same commit, the leaving one has already moved up by
      // the newcomer's height (T3). One that left to make room from the top rides up with the
      // stack; with a live toast still above it (one with an action, which never times out), it
      // fades where it is instead, so it never slides up under that toast (R4).
      const was = positions.current.get(key)
      const lift = was === undefined ? 0 : was - edge(slot, height)
      // An exit copy still showing above it counts too: a copy never rides up into another (S1).
      const top = slot.getBoundingClientRect().top + lift
      const above = slots.slice(0, slots.indexOf(slot)).some((other) => other.style.display !== 'none' && (other.dataset.kind === 'slot' ? !!other.querySelector('.diya-alert') : entries.find((item) => item.id === other.dataset.toast)?.status === 'shown'))
        || (animate && showingCopies(host.copies).some((shown) => shown.span.bottom <= top + 1))
      // A slide already under way (a <Toast> arrives in two commits: its empty place, then its
      // content) goes on on the copy, from where the toast's place is, so the copy keeps up with
      // the toasts below it (R10).
      const sliding = animate ? slot.getAnimations().filter((animation) => animation.id === SHIFT_ANIMATION && playing(animation)) : []
      const now = sliding.length ? offsetY(slot) : 0
      const played = playOnCopy(slot, host.copies, 'exit-slow', exitFrames, { zIndex: 0, offsetY: lift - now })
      const copy = played ? host.copies.lastElementChild as HTMLElement | null : null
      for (const animation of copy ? sliding : []) {
        const effect = animation.effect as KeyframeEffect
        const timing = effect.getTiming()
        const carried = copy!.animate(effect.getKeyframes(), { duration: timing.duration, easing: timing.easing, delay: timing.delay, composite: effect.composite, fill: timing.fill })
        carried.currentTime = animation.currentTime
      }
      if (copy && lift > 0 && !above && column?.duration && travel) {
        copy.animate([{ transform: 'none' }, { transform: `translateY(${-lift}px)` }], { duration: column.duration * travel, easing: column.easing, composite: 'add', fill: 'forwards' }).id = RIDE_ANIMATION
      }
      // Out of the layout now, so the others move in this same pass.
      slot.style.display = 'none'
      announced.current.delete(key)
      voices.current?.polite.forget(key)
      voices.current?.assertive.forget(key)
      remaining.current.delete(id)
      removeToast(id)
    }
    height = node?.clientHeight ?? 0
    // Where a toast's place is on screen now, without its shifts or its enter.
    const origin = node ? node.getBoundingClientRect().top - node.offsetTop : 0
    const span = (slot: HTMLElement): Span => ({ top: origin + slot.offsetTop, bottom: origin + slot.offsetTop + slot.offsetHeight })
    // The others close the gap (or make room) by sliding, additively, on the move curve. A shift
    // still waiting to start folds into this one, so two changes close together never send a
    // toast one way and then back (R3).
    const next = new Map<string, number>()
    const arriving: HTMLElement[] = []
    const movers: { slot: HTMLElement; dy: number; span: Span; now: number }[] = []
    // What a newcomer may have to wait for: toasts still on their way out of its place.
    const obstacles: { span: Span; clear: number }[] = []
    for (const slot of slots) {
      const id = slot.dataset.toast!
      const key = slot.dataset.key!
      if (slot.dataset.kind === 'slot' ? !slot.querySelector('.diya-alert') : entries.find((item) => item.id === id)?.status !== 'shown') continue
      const bottom = edge(slot, height)
      next.set(key, bottom)
      const before = positions.current.get(key)
      if (before === undefined) {
        arriving.push(slot)
        continue
      }
      let dy = before - bottom
      const shifts = (moving.current.get(slot) ?? []).filter((shift) => playing(shift.animation))
      if (dy && shifts.length) {
        // Its place moved again while it's still sliding, or waiting to: every shift under way
        // folds into this one, which starts from where the toast is now. It turns from there,
        // never going on the old way first, and never one way and then back (R3, S2).
        for (const shift of shifts) {
          dy += shift.dy * (1 - (Number(shift.animation.effect?.getComputedTiming().progress) || 0))
          shift.animation.cancel()
        }
        moving.current.set(slot, [])
        if (Math.abs(dy) >= 0.5) movers.push({ slot, dy, span: span(slot), now: 0 })
        continue
      }
      moving.current.set(slot, shifts)
      const kept = shifts
      const now = animate ? offsetY(slot) : 0
      if (dy) movers.push({ slot, dy, span: span(slot), now })
      else if (now) obstacles.push({ span: moved(span(slot), now), clear: Math.max(0, ...kept.map((shift) => timeLeft(shift.animation))) })
    }
    // A shift whose path crosses an exit copy fading where it is waits until the copy has mostly
    // faded, so a see-through toast never slides over it (T9). A copy sinks as it fades, so one
    // that a toast rises into from below waits until the copy has gone (R4). The column moves
    // together.
    const copies = animate ? showingCopies(host.copies) : []
    let wait = 0
    for (const mover of movers) {
      const path = { top: mover.span.top + Math.min(0, mover.dy), bottom: mover.span.bottom + Math.max(0, mover.dy) }
      for (const copy of copies) {
        if (copy.ride || !overlaps(path, copy.span)) continue
        const rising = mover.dy > 0 && copy.span.top < mover.span.top + mover.dy
        wait = Math.max(wait, rising ? copy.left : slow / 2 - copy.age)
      }
    }
    for (const mover of movers) {
      if (!column || !slow || !travel) continue
      const animation = mover.slot.animate([{ transform: `translateY(${mover.dy}px)` }, { transform: 'none' }], { duration: slow * travel, easing: column.easing, composite: 'add', delay: wait, fill: 'backwards' })
      animation.id = SHIFT_ANIMATION
      moving.current.get(mover.slot)!.push({ animation, dy: mover.dy, until: wait })
      if (mover.dy > 0) obstacles.push({ span: moved(mover.span, mover.dy + mover.now), clear: wait + slow / 2 })
    }
    // Make room, then arrive: a newcomer's 12px rise and fade wait until whatever is in its place
    // has cleared it, so nothing see-through ever passes over it (T9, R3): a toast sliding out of
    // the way has, half the slow duration after it starts; an exit copy fading there, once it's
    // gone. Into an empty stack, where nothing is in the way, the enter is the usual one from
    // @starting-style. Its rise and fade are its own provider's.
    for (const slot of arriving) {
      const place = span(slot)
      let delay = 0
      for (const obstacle of obstacles) if (overlaps(obstacle.span, place)) delay = Math.max(delay, obstacle.clear)
      for (const copy of copies) if (overlaps(copy.span, place)) delay = Math.max(delay, copy.ride ? slow / 2 - elapsed(copy.ride) : copy.left)
      if (delay <= 0 || !animate) continue
      const { duration, easing, style } = motionTiming(slot, 'duration-slow', 'enter')
      if (!duration || !style) continue
      const rise = style.getPropertyValue('--diya-internal-motion-distance-edge').trim() || '0px'
      // The CSS enter has already started; this one replaces it.
      slot.style.transition = 'none'
      const enter = slot.animate([{ opacity: 0, translate: `0 ${rise}` }, { opacity: 1, translate: '0 0' }], { duration, easing, delay, fill: 'backwards' })
      const done = () => { slot.style.transition = '' }
      enter.finished.then(done, done)
    }
    positions.current = next
    // In the top layer while it holds a toast or an exit copy.
    if (next.size && host.popover && !host.region.matches(':popover-open')) raiseToastHost(host)
    if (!next.size && !host.copies.childElementCount) lowerToastHost(host)
    // Each toast is read once, from the always-present live region, as one text node.
    for (const entry of live) {
      const key = `toast:${entry.id}`
      const slot = slots.find((item) => item.dataset.key === key)
      const description = slot?.querySelector('.diya-alert-description')?.textContent?.trim() ?? ''
      const words = spoken(alertText[entry.tone], entry.title, description, entry.action ? t.actionHint(entry.action.label) : undefined)
      const said = `${entry.tone}|${entry.title}|${description}`
      // A same-id update speaks again only when its title, words or tone changed.
      if (announced.current.get(key) === said) continue
      announced.current.set(key, said)
      ;(entry.urgent ? voices.current?.assertive : voices.current?.polite)?.say(key, words)
    }
    // <Toast>s too: their words are whatever they rendered.
    for (const component of components) {
      const key = `slot:${component.key}`
      const slot = slots.find((item) => item.dataset.key === key)
      const alert = slot?.querySelector<HTMLElement>('.diya-alert')
      if (!alert) continue
      const tone = alert.dataset.tone ?? 'info'
      const title = alert.querySelector('.diya-alert-title')?.textContent?.trim() ?? ''
      const description = alert.querySelector('.diya-alert-description')?.textContent?.trim() ?? ''
      const action = alert.querySelector('.diya-alert-action')?.textContent?.trim()
      const words = title
        ? spoken(alertText[tone as keyof typeof alertText] as string, title, description, action ? t.actionHint(action) : undefined)
        : [`${(alertText[tone as keyof typeof alertText] as string).replace(/^./, (first) => first.toLocaleUpperCase())}:`, description, action ? t.actionHint(action) : ''].filter(Boolean).join(' ')
      const said = `${tone}|${title}|${description}`
      if (announced.current.get(key) === said) continue
      announced.current.set(key, said)
      ;(component.urgent ? voices.current?.assertive : voices.current?.polite)?.say(key, words)
    }
    // A toast that has left takes its words with it.
    const present = new Set([...live.map((entry) => `toast:${entry.id}`), ...components.map((component) => `slot:${component.key}`)])
    for (const id of [...announced.current.keys()]) {
      if (present.has(id)) continue
      announced.current.delete(id)
      voices.current?.polite.forget(id)
      voices.current?.assertive.forget(id)
    }
  })

  // The pointer and focus flags, and an F8 walk, never outlive the toasts that set them: closing the last toast
  // with the pointer hides the list without a mouseleave, and WebKit and Firefox send no focusout
  // when a focused button is removed. Stale, either would freeze every later toast (T2). The
  // focus flag follows the element focus went to, not where focus is now: Testing Library's
  // fireEvent.focus doesn't move focus, and pauses toasts as it did in 1.1 (R6).
  useClientLayoutEffect(() => {
    if (!showing) {
      // Where focus was is forgotten too: by the next toast it may be behind a modal (R5).
      walking.current = false
      origin.current = null
      outside.current = null
      cameFrom.current = null
      if (pointer) setPointer(false)
      if (focusInside) setFocusInside(false)
    } else if (focusInside && !(focused.current?.isConnected && list.current?.contains(focused.current))) setFocusInside(false)
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
  /** If `inside` is in a native modal that isn't DIYA's, the stack (and its live regions) moves into it until it closes. */
  const followNativeModal = (inside: Element | null | undefined) => {
    if (!host || !inside) return
    const document = host.root.ownerDocument
    let modal: HTMLDialogElement | null = null
    try { modal = inside.closest<HTMLDialogElement>('dialog:modal') } catch { modal = inside.closest<HTMLDialogElement>('dialog[open]') }
    if (!modal || modal === nativeModal.current || topModal(document) === modal) return
    nativeModal.current = modal
    placeRef.current()
    const closed = () => { if (nativeModal.current === modal) nativeModal.current = null; placeRef.current() }
    modal.addEventListener('close', closed, { once: true })
  }
  const followRef = useRef(followNativeModal)
  followRef.current = followNativeModal
  useEffect(() => {
    if (!host || newestOrder === undefined) return
    followNativeModal(host.root.ownerDocument.activeElement)
  }, [host, newestOrder])

  /** Focuses a place to return to, if it can take focus now: not behind the topmost modal, not
   *  inert. Behind a modal, focus() does nothing, so the next place in the chain is tried (R5). */
  function takesFocus(candidate: Element | null | undefined) {
    if (!isConnectedFocusable(candidate) || candidate.closest('[inert]')) return false
    const modal = topModal(candidate.ownerDocument)
    if (modal && !modal.contains(candidate)) return false
    candidate.focus()
    return candidate.ownerDocument.activeElement === candidate
  }

  /** Where focus goes when a focused toast leaves: where F8 was pressed, else where focus came into the stack from, else (a <Toast>) where it was raised, else the last place focused outside the stack, else the next toast, else the topmost modal. Never the page's body. */
  function returnFocus(leaving: string, fallback?: HTMLElement | null) {
    const document = host?.root.ownerDocument
    if (!document) return
    // A <Toast>'s own place (where it was raised, as in 1.1.1) comes before the last place
    // focused outside the stack, which a click in Safari can leave on a Dialog itself (R5).
    // Where focus came into the stack from comes before a <Toast>'s raise point: a click on ×
    // while typing goes back to the field, not the button that raised the toast (G8). Past where
    // F8 was pressed, focus never returns to <body> or a modal's own element, which a click in
    // Safari focuses instead of the control (UX-H-01); a heading that held focus is kept
    // (UX-78-01).
    for (const [index, candidate] of [origin.current, cameFrom.current, fallback, outside.current].entries()) {
      if (index > 0 && !isPlace(candidate)) continue
      if (takesFocus(candidate)) { origin.current = null; return }
    }
    const nextToast = Array.from(document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')).find((slot) => slot.dataset.key !== leaving)?.querySelector<HTMLElement>(focusable)
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
    closeFocus(`toast:${id}`)
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
    const slot = slots.find((item) => item.dataset.key === id)
    if (!document || !slot) return
    // A click on × in Safari leaves focus on <body>, or on the Dialog around the stack: back by the
    // chain, where the person was (UX-R3-01, H3).
    if (!slot.contains(document.activeElement) && !isControl(document.activeElement)) { returnFocus(id, fallback); return }
    if (!slot.contains(document.activeElement)) return
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
      if (takesFocus(candidate)) return true
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
    if (!slot || !id) return
    // Only the toast: a Dialog around the stack doesn't also close.
    event.preventDefault()
    event.stopPropagation()
    // A <Toast> or a toast() by what it is, never by the spelling of its id (R7).
    if (slot.dataset.kind === 'slot') {
      components.find((item) => item.key === id)?.dismiss()
      return
    }
    returnFocus(slot.dataset.key!)
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
    const focusIn = (event: globalThis.FocusEvent) => {
      focused.current = event.target as Element
      // Coming in from outside (or from <body>, which leaves nothing to go back to), this visit's
      // entry point replaces any earlier one (H2).
      const from = event.relatedTarget as HTMLElement | null
      if (!from || !node.contains(from)) cameFrom.current = from
      setFocusInside(true)
    }
    // In Safari a press on × or Undo never moves focus into the stack: where focus was is read at
    // the press instead (UX-H-01). Chromium and Firefox record it on focusin too.
    const press = () => {
      const active = node.ownerDocument.activeElement
      if (active && !node.contains(active) && isPlace(active)) cameFrom.current = active as HTMLElement
    }
    const focusOut = (event: globalThis.FocusEvent) => {
      if (node.contains(event.relatedTarget as Node)) return
      setFocusInside(false)
      // The visit is over: where it came in from is forgotten with it (H2).
      cameFrom.current = null
      // Focus left the stack: any F8 walk is over.
      walking.current = false
      origin.current = null
    }
    const keydown = (event: globalThis.KeyboardEvent) => handlers.current.onKeyDown(event)
    node.addEventListener('mouseover', enter)
    node.addEventListener('mouseout', leave)
    node.addEventListener('focusin', focusIn)
    node.addEventListener('pointerdown', press, true)
    node.addEventListener('focusout', focusOut)
    node.addEventListener('keydown', keydown)
    return () => {
      node.removeEventListener('mouseover', enter)
      node.removeEventListener('mouseout', leave)
      node.removeEventListener('focusin', focusIn)
      node.removeEventListener('pointerdown', press, true)
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
          // From another provider, its place in the column moves the way that provider does:
          // its enter and its exit copy read these (R2). The column's shifts are this stack's.
          <div key={`slot:${item.id}`} className="diya-toast" data-toast={item.id} data-kind="slot" data-key={`slot:${item.id}`} data-order={item.order} style={item.slot.owner === owner ? undefined : item.slot.motion?.() as CSSProperties | undefined}>
            {/* The <Toast> portals in here. From another provider, this carries that provider's
                look (theme, Glass, motion, class and style) and takes no box of its own. */}
            {item.slot.owner === owner
              ? <div ref={slotRef(item.slot.key)} className="diya-toast-scope" />
              : <div ref={slotRef(item.slot.key)} className={cx('diya-root diya-toast-scope', item.slot.look.className)} data-theme={item.slot.look.theme} data-glass={item.slot.look.glass} data-surface="false" data-motion={item.slot.look.motion} style={{ ...(item.slot.look.style as CSSProperties), display: 'contents' }} />}
          </div>
        )
        : (({ entry }) => (
        <div key={`toast:${entry.id}`} className="diya-toast" data-toast={entry.id} data-kind="toast" data-key={`toast:${entry.id}`} data-order={entry.order} data-leaving={entry.status === 'leaving' ? '' : undefined}>
          <AlertInStackContext.Provider value={{ announce: false, dismissLabel: t.dismiss(entry.title) }}>
            <Alert
              tone={entry.tone}
              title={entry.title}
              urgent={entry.urgent}
              action={entry.action ? { label: entry.action.label, onClick: () => { returnFocus(`toast:${entry.id}`); entry.action!.onClick(); leaveToast(entry.id) } } : undefined}
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
