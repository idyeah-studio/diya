'use client'
// Field's parts, shared by Field and DIYA's own fields: ids, the help or error line, the error
// that waits for a press to end, and the one announcement when an error appears on a field
// you've just left. Hooks and render functions only, with no component of their own, so a
// field's tree and its useId values don't move.
import { useEffect, useId, useRef, useState, type HTMLAttributes, type RefObject } from 'react'
import { useDiyaMessages } from '../DiyaProvider.js'
import { fieldMessages } from '../field/messages.js'
import { announcePolite } from './announce.js'
import { useClientLayoutEffect } from './layout-effect.js'
import { afterRelease, pressedIn, watchPointer } from './pointer.js'

declare module '../messages.js' {
  interface DiyaMessages {
    field: typeof fieldMessages
  }
}

/** Marks DIYA's own fields, so Field can warn when it wraps one. The value is the field's name. */
export const DIYA_FIELD = Symbol.for('@idyeah/diya/field')
export function markField<T extends object>(component: T, name: string): T {
  ;(component as Record<symbol, string>)[DIYA_FIELD] = name
  return component
}

/** The control's id (yours, else generated) and its help line's id, with the field's own suffix. */
export function useFieldIds(id: string | undefined, suffix: 'description' | 'help') {
  const generated = useId()
  const controlId = id ?? generated
  return { id: controlId, descriptionId: `${controlId}-${suffix}` }
}

/** The help or error line, with the "!" glyph before an error, or nothing when there's neither. */
export function renderDescription({ id, className, error, helperText, ...rest }: { id: string; className: string; error?: string; helperText?: string } & HTMLAttributes<HTMLParagraphElement> & Record<`data-${string}`, unknown>) {
  const text = error || helperText
  if (!text) return null
  return (
    <p id={id} className={className} {...rest}>
      {error && <span aria-hidden="true">!</span>}
      {text}
    </p>
  )
}

/**
 * The error to show. An error that appears or changes while a pointer is pressed outside the
 * field waits until that press ends, so leaving a field by clicking a button never moves the
 * button out from under the pointer (MOT-1.2-04); it shows in the task after the click. A clear
 * is never held, and a blur by keyboard shows at once. Show `aria-invalid` from this value too.
 */
export function useShownError(error: string | undefined, wrapper: RefObject<HTMLElement | null>) {
  const shownRef = useRef(error)
  const [, release] = useState(0)
  const node = wrapper.current
  const pressed = node && error && error !== shownRef.current ? pressedIn(node.ownerDocument) : null
  const holding = !!pressed && !node!.contains(pressed)
  const shown = holding ? shownRef.current : error
  useClientLayoutEffect(() => { shownRef.current = shown })
  useEffect(() => {
    const document = wrapper.current?.ownerDocument
    if (!document) return
    return watchPointer(document)
  }, [])
  useEffect(() => {
    const document = wrapper.current?.ownerDocument
    if (!holding || !document) return
    return afterRelease(document, () => release((count) => count + 1))
  }, [holding, error])
  return shown
}

// Errors that appear in one task are counted per document: one is spoken; several (a submit)
// say nothing, and the field that receives focus reads its own.
const batches = new WeakMap<Document, string[]>()
function speak(document: Document, text: string) {
  let batch = batches.get(document)
  if (!batch) {
    const created: string[] = []
    batches.set(document, created)
    batch = created
    setTimeout(() => {
      batches.delete(document)
      if (created.length === 1) announcePolite(created[0])
    }, 0)
  }
  batch.push(text)
}

/** Whether focus is in the field, or in the popup it controls (DatePicker's calendar). */
function focusWithin(node: HTMLElement) {
  const active = node.ownerDocument.activeElement
  if (!active) return false
  if (node.contains(active)) return true
  for (const owner of Array.from(node.querySelectorAll('[aria-controls]'))) {
    const popup = node.ownerDocument.getElementById(owner.getAttribute('aria-controls') ?? '')
    if (popup?.contains(active)) return true
  }
  return false
}

/**
 * Says "Label: error" once, politely, through the page's live region, when an error appears on a
 * field that doesn't have focus (one you've just left). For a control focus can't be pointed at
 * (an iframe), it says it again each time focus arrives there with the error set: `arrived`
 * counts arrivals. With no provider's stack, it says nothing.
 */
export function useErrorAnnouncement(label: string, shown: string | undefined, wrapper: RefObject<HTMLElement | null>, arrived = 0) {
  const t = useDiyaMessages('field', fieldMessages)
  const said = useRef(shown)
  useEffect(() => {
    const node = wrapper.current
    const before = said.current
    said.current = shown
    if (!node || !shown || shown === before || focusWithin(node)) return
    speak(node.ownerDocument, t.errorAnnouncement(label, shown))
  }, [shown])
  useEffect(() => {
    const node = wrapper.current
    if (!arrived || !node || !said.current) return
    speak(node.ownerDocument, t.errorAnnouncement(label, said.current))
  }, [arrived])
}
