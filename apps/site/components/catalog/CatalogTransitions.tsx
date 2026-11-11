'use client'
import { createContext, useCallback, useContext, useEffect, useState, ViewTransition as Boundary, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

const TARGETS = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="tab"], [role="switch"], [tabindex]'

/**
 * Keeps the catalog usable while a page transition plays (UX-03). During a view transition the
 * page is a picture: a click lands on <html> and is lost, and focus can fall to <body>. So a
 * pointer press during one ends it at once, and its click is sent on to whatever is under the
 * pointer on the real page; a key press ends it too, so typing never goes into a picture.
 */
export function CatalogTransitions() {
  useEffect(() => {
    const start = document.startViewTransition as ((...args: unknown[]) => ViewTransition) | undefined
    if (typeof start !== 'function') return
    let running: ViewTransition | null = null
    let pressed: { x: number; y: number } | null = null
    // React starts the transitions; keep each one, to end it early.
    const recorded = function (this: Document, ...args: unknown[]) {
      const transition = start.apply(this, args)
      running = transition
      void transition.finished.finally(() => { if (running === transition) running = null }).catch(() => {})
      return transition
    }
    document.startViewTransition = recorded as unknown as Document['startViewTransition']
    const pointerdown = (event: PointerEvent) => {
      if (!running) return
      running.skipTransition()
      running = null
      event.preventDefault()
      pressed = { x: event.clientX, y: event.clientY }
    }
    const click = (event: MouseEvent) => {
      const point = pressed
      pressed = null
      if (!point || event.target !== document.documentElement) return
      event.preventDefault()
      event.stopPropagation()
      const target = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>(TARGETS)
      if (!target) return
      if (target.matches('input, select, textarea')) target.focus()
      else target.click()
    }
    const keydown = () => {
      if (!running) return
      running.skipTransition()
      running = null
    }
    document.addEventListener('pointerdown', pointerdown, true)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', keydown, true)
    return () => {
      if (document.startViewTransition === (recorded as unknown)) document.startViewTransition = start as unknown as Document['startViewTransition']
      document.removeEventListener('pointerdown', pointerdown, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', keydown, true)
    }
  }, [])
  return null
}

const Arm = createContext<() => void>(() => {})

/**
 * The catalog's one view-transition boundary. It animates only the commit that follows a sidebar
 * choice, which arms it: /explore is dynamic, so the page commits in a later transition than the
 * click, and a Link's transition type doesn't reach it. Back and forward, the header's links and
 * a choice from the phone sheet never arm it, so they change the page at once.
 */
export function CatalogTransitionBoundary({ children }: { children: ReactNode }) {
  const [armed, setArmed] = useState(false)
  const search = useSearchParams().toString()
  // Disarmed once the new page has committed, or soon if the click didn't change the page.
  useEffect(() => setArmed(false), [search])
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 2000)
    return () => window.clearTimeout(timer)
  }, [armed])
  const arm = useCallback(() => setArmed(true), [])
  return (
    <Arm.Provider value={arm}>
      <Boundary update={armed ? 'catalog-frame' : 'none'} default="none">
        {children}
      </Boundary>
    </Arm.Provider>
  )
}

/** Arms the page transition for the navigation this click starts. */
export function useCatalogTransition() {
  return useContext(Arm)
}
