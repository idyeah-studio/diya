'use client'
import { useState, type RefObject } from 'react'
import { useClientLayoutEffect } from './layout-effect.js'

// The longest a closed surface stays mounted. Exits take 160ms at most; this also covers a
// slowed-down preview, and a browser that never settles an animation.
const EXIT_CAP_MS = 1000

/**
 * Keeps a surface mounted while its exit plays. Render the node while `present`, and mark it
 * closing while `closing`. The wait is on the node's own running animations: with none (motion
 * off, a zero duration, jsdom or happy-dom) it unmounts synchronously, as 1.0 did. Reopening
 * mid-exit keeps the same node. `immediate` skips the exit, for closes the reader didn't cause
 * in place, such as a scroll.
 */
export function usePresence(open: boolean, ref: RefObject<HTMLElement | null>, immediate = false) {
  const [present, setPresent] = useState(open)
  // Derived in render, so reopening never unmounts.
  if (open && !present) setPresent(true)
  const closing = present && !open

  useClientLayoutEffect(() => {
    if (!closing) return
    const node = ref.current
    if (!node) {
      setPresent(false)
      return
    }
    const page = node.ownerDocument
    // Only the node's own exit: not its children's hovers, not its pseudo-elements.
    const running = immediate || page.hidden || typeof node.getAnimations !== 'function'
      ? []
      : node.getAnimations().filter((animation) => {
        const effect = animation.effect as KeyframeEffect | null
        return effect?.target === node && !effect.pseudoElement
      })
    if (!running.length) {
      setPresent(false)
      return
    }
    // A DOM property, not JSX: React 18 and 19 disagree on how to write inert as an attribute.
    // The closing node takes no focus, clicks or screen reader.
    node.inert = true
    let live = true
    const done = () => { if (live) setPresent(false) }
    // allSettled: a reopen cancels the exit, which rejects `finished`; `live` then drops the result.
    void Promise.allSettled(running.map((animation) => animation.finished)).then(done)
    const cap = setTimeout(done, EXIT_CAP_MS)
    // A hidden tab may never finish an animation.
    const hidden = () => { if (page.hidden) done() }
    page.addEventListener('visibilitychange', hidden)
    return () => {
      live = false
      clearTimeout(cap)
      page.removeEventListener('visibilitychange', hidden)
      node.inert = false
    }
  }, [closing, immediate, ref])

  return { present: present || open, closing }
}

/**
 * For a native dialog that has just closed: inert while its exit plays, so a closing Dialog or
 * Drawer takes no clicks, focus or screen reader (Safari still hit-tests it). Released when the
 * exit ends, so a dialog reopened another way is never left inert; reopening clears it first.
 */
export function inertWhileExiting(node: HTMLElement) {
  const running = typeof node.getAnimations === 'function' ? node.getAnimations() : []
  if (!running.length) return
  node.inert = true
  const release = () => { if (!node.matches('[open]')) node.inert = false }
  const cap = setTimeout(release, EXIT_CAP_MS)
  void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
    clearTimeout(cap)
    release()
  })
}

/** A time from computed style, such as '0.16s', in milliseconds. */
const milliseconds = (time: string) => parseFloat(time) * (/ms$/.test(time.trim()) ? 1 : 1000)

/**
 * The provider's resolved timing for a Web Animations call on `node`: one of the gated times
 * (such as 'duration-medium' or 'exit-slow') and a curve ('enter', 'exit' or 'move'), with every
 * motion setting applied. A duration of 0 means don't animate. The node's own inline timing is
 * put back afterwards; `style` stays live, for reading the motion distances.
 */
export function motionTiming(node: HTMLElement, time: string, curve: string) {
  const view = node.ownerDocument.defaultView
  const { animationDuration, animationTimingFunction } = node.style
  node.style.animationDuration = `var(--diya-internal-${time})`
  node.style.animationTimingFunction = `var(--diya-ease-${curve})`
  const style = view ? view.getComputedStyle(node) : undefined
  const duration = style ? milliseconds(style.animationDuration) : 0
  const easing = style?.animationTimingFunction || 'ease'
  node.style.animationDuration = animationDuration
  node.style.animationTimingFunction = animationTimingFunction
  return { duration: duration > 0 ? duration : 0, easing, style }
}

/**
 * Plays an exit on a copy of `node`, appended to `parent` and fixed where the node was, so the
 * component can go at once: a host can unmount it, or show what replaces it, straight away. The
 * copy is a picture: no ids, roles or ARIA, hidden from assistive tech, inert and click-through,
 * removed when the exit ends or after a second at most. Nothing plays with motion off, without
 * the Web Animations API (jsdom, happy-dom) or in a hidden tab. `frames` gets the copy's computed
 * style, for the motion distances, and the node's opacity at that moment.
 */
export function playOnCopy(node: HTMLElement | null | undefined, parent: Element | null | undefined, time: string, frames: (style: CSSStyleDeclaration, opacity: string) => Keyframe[]) {
  if (!node || !parent || typeof node.animate !== 'function' || node.ownerDocument.hidden) return
  const view = node.ownerDocument.defaultView
  if (!view) return
  const box = node.getBoundingClientRect()
  const opacity = view.getComputedStyle(node).opacity
  const copy = node.cloneNode(true) as HTMLElement
  for (const element of [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))]) {
    for (const { name } of Array.from(element.attributes)) if (name === 'id' || name === 'role' || name.startsWith('aria-')) element.removeAttribute(name)
  }
  copy.setAttribute('aria-hidden', 'true')
  copy.inert = true
  Object.assign(copy.style, {
    position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
    right: 'auto', bottom: 'auto', margin: '0', zIndex: '1200', pointerEvents: 'none', transition: 'none',
  })
  parent.append(copy)
  const { duration, easing, style } = motionTiming(copy, time, 'exit')
  if (!duration || !style) {
    copy.remove()
    return
  }
  const animation = copy.animate(frames(style, opacity), { duration, easing, fill: 'forwards' })
  const cap = setTimeout(() => copy.remove(), EXIT_CAP_MS)
  const done = () => { clearTimeout(cap); copy.remove() }
  animation.finished.then(done, done)
}
