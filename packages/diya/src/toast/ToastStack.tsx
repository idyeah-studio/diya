'use client'
// A provider's toast stack: one region in today's spot, newest nearest the corner, 12px apart.
// The outermost provider's stack shows toast() toasts; every provider's stack holds its own
// <Toast>s, in slots they portal into. It follows the topmost open modal, sits in the top layer,
// announces each toast once, pauses while read, and answers F8 and Escape.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefCallback } from 'react'
import { createPortal } from 'react-dom'
import { Alert, AlertInStackContext } from '../alert/Alert.js'
import { alertMessages } from '../alert/messages.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { subscribeModals, topModal } from '../internal/modal-stack.js'
import { motionTiming, playOnCopy } from '../internal/presence.js'
import { announce, createToastHost, lowerToastHost, raiseToastHost, type ToastHost } from './host.js'
import { toastMessages } from './messages.js'
import { EMPTY_TOASTS, leaveToast, registerHost, removeToast, settleToasts, subscribeToasts, toastSnapshot, unregisterHost, type ToastEntry } from './queue.js'
import type { ToastRegistry, ToastSlotEntry } from './registry.js'

const LIMIT = 3
const PHONE_LIMIT = 2
const ENTER_MS = 240
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

type Item = { kind: 'queue'; id: string; order: number; entry: ToastEntry } | { kind: 'slot'; id: string; order: number; slot: ToastSlotEntry }

export function ToastStack({ portal, outermost, registry }: { portal: HTMLElement | null; outermost: boolean; registry: ToastRegistry }) {
  const t = useDiyaMessages('toast', toastMessages)
  const alertText = useDiyaMessages('alert', alertMessages)
  const [host, setHost] = useState<ToastHost | null>(null)
  const [token] = useState(() => ({}))
  const snapshot = useSyncExternalStore(host ? subscribeToasts : noHost, toastSnapshot, () => EMPTY_TOASTS)
  const phone = useSyncExternalStore(narrow.subscribe, narrow.matches, serverFalse)
  const [pointer, setPointer] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [hidden, setHidden] = useState(false)
  const components = useSyncExternalStore(registry.subscribe, registry.entries, registry.entries)
  // A touch (a <Toast>'s words changed) re-renders the stack, so it announces them.
  useSyncExternalStore(registry.subscribe, registry.version, registry.version)
  // Every provider gets a stack once it holds a <Toast>; the outermost has one from the start.
  const [wanted, setWanted] = useState(outermost)
  if (!wanted && (outermost || components.length > 0)) setWanted(true)
  const active = !!host && outermost && snapshot.hosts[0] === token
  const entries = useMemo(() => (active ? snapshot.entries.filter((entry) => entry.status !== 'waiting').sort((a, b) => a.order - b.order) : []), [active, snapshot])
  const live = entries.filter((entry) => entry.status === 'shown')
  const items: Item[] = [
    ...entries.map((entry) => ({ kind: 'queue' as const, id: entry.id, order: entry.order, entry })),
    ...components.map((slot) => ({ kind: 'slot' as const, id: `c${slot.key}`, order: slot.order, slot })),
  ].sort((a, b) => a.order - b.order)
  const showing = live.length + components.length > 0
  // Stable ref callbacks, one per <Toast>, so slots don't detach and reattach on every render.
  const slotRefs = useRef(new Map<number, RefCallback<HTMLDivElement>>())
  const slotRef = (key: number) => {
    let callback = slotRefs.current.get(key)
    if (!callback) {
      callback = (element) => {
        registry.setSlot(key, element)
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
  const outside = useRef<HTMLElement | null>(null)
  const nativeModal = useRef<HTMLDialogElement | null>(null)

  // The host: made in the browser only, so the server markup is unchanged.
  useClientLayoutEffect(() => {
    if (!portal || !wanted) return
    const made = createToastHost(portal.ownerDocument)
    portal.append(made.root)
    registry.setCopies(made.copies)
    // Out of the top layer once the last exit has played and nothing shows.
    const view = portal.ownerDocument.defaultView
    const observer = view && typeof view.MutationObserver === 'function'
      ? new view.MutationObserver(() => { if (!made.copies.childElementCount && !made.region.querySelector('.diya-toast-list > .diya-toast')) lowerToastHost(made) })
      : null
    observer?.observe(made.copies, { childList: true })
    setHost(made)
    return () => {
      observer?.disconnect()
      registry.setCopies(null)
      made.root.remove()
      setHost(null)
    }
  }, [portal, wanted, registry])

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
  useEffect(() => { registry.setPaused(pointer || focusInside) }, [pointer, focusInside, registry])

  // After each commit: exits for leaving toasts, the shift for the others, the enter order, the
  // top layer, and what a screen reader hears.
  useClientLayoutEffect(() => {
    if (!host) return
    const node = list.current
    const slots = node ? Array.from(node.querySelectorAll<HTMLElement>(':scope > .diya-toast')) : []
    // In the top layer before anything is measured: a popover that isn't open lays out as nothing,
    // so a toast measured there would seem to have moved its whole height (T1).
    if (slots.some((slot) => slot.firstElementChild && !slot.hasAttribute('data-leaving')) && host.popover && !host.region.matches(':popover-open')) raiseToastHost(host)
    const height0 = node?.clientHeight ?? 0
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
      const lift = was === undefined ? 0 : was - (slot.offsetTop - height0)
      playOnCopy(slot, host.copies, 'exit-slow', exitFrames, { zIndex: 0, offsetY: lift })
      announced.current.delete(id)
      remaining.current.delete(id)
      removeToast(id)
    }
    // The others close the gap (or make room) by sliding, additively, on the move curve.
    const next = new Map<string, number>()
    const height = node?.clientHeight ?? 0
    for (const slot of slots) {
      const id = slot.dataset.toast!
      if (id.startsWith('c') ? !slot.firstElementChild : entries.find((item) => item.id === id)?.status !== 'shown') continue
      const top = slot.offsetTop - height
      next.set(id, top)
      const before = positions.current.get(id)
      if (before === undefined) {
        // Arriving: under the older toasts while it rises, so they slide off it.
        if (host.region.dataset.still === undefined) {
          slot.dataset.entering = ''
          setTimeout(() => { delete slot.dataset.entering }, ENTER_MS)
        }
        continue
      }
      const dy = before - top
      if (!dy || typeof slot.animate !== 'function' || slot.ownerDocument.hidden || host.region.dataset.still !== undefined) continue
      const { duration, easing, style } = motionTiming(slot, 'duration-slow', 'move')
      const travel = parseFloat(style?.getPropertyValue('--diya-internal-motion-travel') ?? '1') || 0
      if (!duration || !travel) continue
      slot.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: duration * travel, easing, composite: 'add' })
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
      announce(entry.urgent ? host.assertive : host.polite, words)
    }
    // <Toast>s too: their words are whatever they rendered.
    for (const component of components) {
      const slot = slots.find((item) => item.dataset.toast === `c${component.key}`)
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
      if (announced.current.get(`c${component.key}`) === key) continue
      announced.current.set(`c${component.key}`, key)
      announce(component.urgent ? host.assertive : host.polite, words)
    }
  })

  // The pointer and focus flags never outlive the toasts that set them: closing the last toast
  // with the pointer hides the list without a mouseleave, and WebKit and Firefox send no focusout
  // when a focused button is removed. Stale, either would freeze every later toast (T2).
  useClientLayoutEffect(() => {
    if (!showing) {
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
      if (isConnectedFocusable(document.activeElement)) origin.current = document.activeElement
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
  const newestOrder = live.at(-1)?.order
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
  function returnFocus(leaving: string) {
    const document = host?.root.ownerDocument
    if (!document) return
    for (const candidate of [origin.current, outside.current]) {
      if (isConnectedFocusable(candidate)) { candidate.focus(); origin.current = null; return }
    }
    const nextToast = Array.from(document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')).find((slot) => slot.dataset.toast !== leaving)?.querySelector<HTMLElement>(focusable)
    if (nextToast) { nextToast.focus(); return }
    const modal = topModal(document)
    modal?.querySelector<HTMLElement>(focusable)?.focus()
  }

  /** The close button, clicked while focused: focus moves to the next toast, else back. */
  function close(id: string) {
    const document = host?.root.ownerDocument
    const slot = list.current?.querySelector<HTMLElement>(`:scope > .diya-toast[data-toast="${CSS.escape(id)}"]`)
    if (document && slot?.contains(document.activeElement)) {
      const nextToast = Array.from(list.current!.querySelectorAll<HTMLElement>(':scope > .diya-toast')).find((item) => item !== slot)?.querySelector<HTMLElement>(focusable)
      if (nextToast) nextToast.focus()
      else returnFocus(id)
    }
    leaveToast(id)
  }

  function onKeyDown(event: globalThis.KeyboardEvent) {
    if (event.key !== 'Escape') return
    const slot = (event.target as HTMLElement).closest<HTMLElement>('.diya-toast')
    const id = slot?.dataset.toast
    if (!id) return
    // Only the toast: a Dialog around the stack doesn't also close.
    event.preventDefault()
    event.stopPropagation()
    if (id.startsWith('c')) {
      components.find((item) => `c${item.key}` === id)?.dismiss()
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
    const enter = () => setPointer(true)
    const leave = () => setPointer(false)
    const focusIn = () => setFocusInside(true)
    const focusOut = (event: globalThis.FocusEvent) => { if (!node.contains(event.relatedTarget as Node)) setFocusInside(false) }
    const keydown = (event: globalThis.KeyboardEvent) => handlers.current.onKeyDown(event)
    node.addEventListener('mouseenter', enter)
    node.addEventListener('mouseleave', leave)
    node.addEventListener('focusin', focusIn)
    node.addEventListener('focusout', focusOut)
    node.addEventListener('keydown', keydown)
    return () => {
      node.removeEventListener('mouseenter', enter)
      node.removeEventListener('mouseleave', leave)
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
        ? <div key={item.id} ref={slotRef(item.slot.key)} className="diya-toast" data-toast={item.id} data-order={item.order} />
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
