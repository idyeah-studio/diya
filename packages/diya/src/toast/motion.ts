'use client'
// The stack's motion bookkeeping, for ToastStack: where things are on screen, the shifts still
// waiting to start, and the exit copies still showing, so each change waits for whatever is in
// its way and nothing see-through passes over something visible (T9, R3, R4).
import { EXIT_ANIMATION } from '../internal/presence.js'

/** A shift of a toast's place in the column: `dy` px, added to whatever else moves it. Until `until` ms into it, it hasn't started moving. */
export type Shift = { animation: Animation; dy: number; until: number }
export const SHIFT_ANIMATION = 'diya-shift'
export const RIDE_ANIMATION = 'diya-ride'

/** A vertical stretch of the screen, in px from the viewport's top. */
export type Span = { top: number; bottom: number }
export const overlaps = (a: Span, b: Span) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
export const moved = (span: Span, by: number): Span => ({ top: span.top + by, bottom: span.bottom + by })

const time = (value: CSSNumberish | null | undefined) => (value == null ? 0 : Number(value))
/** How far into an animation it is, in ms. */
export const elapsed = (animation: Animation) => time(animation.currentTime)
/** How long an animation has left, in ms. */
export const remaining = (animation: Animation) => Math.max(0, time(animation.effect?.getComputedTiming().endTime) - elapsed(animation))
export const live = (animation: Animation) => animation.playState === 'running' || animation.playState === 'paused'

/** How far a node's transforms move it now, in px: the sum of its shifts. */
export function offsetY(node: Element) {
  const view = node.ownerDocument.defaultView
  const value = view?.getComputedStyle(node).transform
  if (!view || !value || value === 'none' || typeof view.DOMMatrixReadOnly !== 'function') return 0
  return new view.DOMMatrixReadOnly(value).m42
}

/** The exit copies still showing in the layer: where each is now, how far into its exit, how long it has left, and its ride with the stack, if any. */
export function showingCopies(layer: HTMLElement) {
  return Array.from(layer.children as HTMLCollectionOf<HTMLElement>).flatMap((copy) => {
    const animations = typeof copy.getAnimations === 'function' ? copy.getAnimations() : []
    const exit = animations.find((animation) => animation.id === EXIT_ANIMATION)
    if (!exit || !remaining(exit)) return []
    const box = copy.getBoundingClientRect()
    return [{ span: { top: box.top, bottom: box.bottom }, age: elapsed(exit), left: remaining(exit), ride: animations.find((animation) => animation.id === RIDE_ANIMATION && live(animation)) }]
  })
}
