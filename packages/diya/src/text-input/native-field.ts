'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ForwardedRef, type RefObject } from 'react'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Points a forwarded ref and DIYA's own ref at the same node. */
export function useMergedRef<T>(forwarded: ForwardedRef<T>, own: { current: T | null }) {
  return useCallback((node: T | null) => {
    own.current = node
    if (typeof forwarded === 'function') forwarded(node)
    else if (forwarded) forwarded.current = node
  }, [forwarded, own])
}

/**
 * DIYA's own picture of an uncontrolled control's value, for the parts it draws itself
 * (clear button, count, fill). It rereads the DOM after every render and after a form
 * reset, so values written straight to the element, by react-hook-form for example, show up.
 */
export function useNativeMirror<T>(read: () => T | undefined, initial: T, same: (a: T, b: T) => boolean = Object.is) {
  const [value, setValue] = useState(initial)
  const reader = useRef(read)
  reader.current = read
  const sameRef = useRef(same)
  sameRef.current = same
  const sync = useCallback(() => {
    const next = reader.current()
    if (next !== undefined) setValue((previous) => sameRef.current(previous, next) ? previous : next)
  }, [])
  useClientLayoutEffect(sync)
  return [value, sync] as const
}

/** Calls `onReset` after the owning form has been reset, once the browser has restored default values. */
export function useFormReset(element: RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement | null>, onReset: () => void) {
  const callback = useRef(onReset)
  callback.current = onReset
  useEffect(() => {
    const form = element.current?.form
    if (!form) return
    // The reset event fires before the browser restores defaults; read them afterwards.
    const reset = () => queueMicrotask(() => callback.current())
    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  })
}

/** Sets a native control's value the way typing does, so React's onChange (and any form library) sees it. */
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as object
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(element, value)
  else element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}
