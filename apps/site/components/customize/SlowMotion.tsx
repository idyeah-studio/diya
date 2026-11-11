'use client'
import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { Switch } from '@idyeah/diya'

/**
 * Slow motion for the preview: every animation in the page's preview stage plays at a quarter
 * of its speed, to watch how DIYA moves. A catalog control, not part of anyone's theme: it lasts
 * for this browser tab's session, and it never touches site chrome, the Customize panel or the
 * catalog's page transitions.
 */
const KEY = 'diya:slow-motion'
const RATE = 0.25
const listeners = new Set<() => void>()
function read() {
  try {
    return window.sessionStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}
let on: boolean | null = null
const snapshot = () => (on ??= read())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function setSlowMotion(next: boolean) {
  on = next
  try {
    if (next) window.sessionStorage.setItem(KEY, 'on')
    else window.sessionStorage.removeItem(KEY)
  } catch {
    /* Private modes can refuse storage; the switch still works for this page. */
  }
  for (const listener of listeners) listener()
}
export function useSlowMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
/** Test helper: forget the remembered state. */
export function resetSlowMotionForTests() {
  on = null
}

/** The preview's parts inside a catalog page: its stages and the scopes that hold its popups. */
export const STAGE = '.component-preview-stage, .customize-scope'

/** Slows everything animating in the stages of the page around `anchor` while on; puts them back to full speed when off. */
export function useSlowStage(anchor: RefObject<HTMLElement | null>, slow: boolean) {
  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>('.component-document, main')
    if (!root) return
    const animations = () => Array.from(root.querySelectorAll<HTMLElement>(STAGE)).flatMap((stage) =>
      typeof stage.getAnimations === 'function' ? stage.getAnimations({ subtree: true }) : [],
    )
    if (!slow) return
    // The loop runs only while slow motion is on: new animations start at full speed, so each
    // frame catches the ones that just began.
    let frame = 0
    const tick = () => {
      for (const animation of animations()) if (animation.playbackRate !== RATE) animation.playbackRate = RATE
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(frame)
      for (const animation of animations()) animation.playbackRate = 1
    }
  }, [anchor, slow])
}

/** The switch, beside Customize and Get code, with a note while it's on. */
export function SlowMotionSwitch() {
  const slow = useSlowMotion()
  const anchor = useRef<HTMLDivElement>(null)
  useSlowStage(anchor, slow)
  return (
    <div ref={anchor} className="slow-motion" data-on={slow || undefined}>
      <Switch size="small" label="Slow motion (¼ speed)" checked={slow} onCheckedChange={setSlowMotion} />
    </div>
  )
}
