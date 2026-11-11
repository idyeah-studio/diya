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
