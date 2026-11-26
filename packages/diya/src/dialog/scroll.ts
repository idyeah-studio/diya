'use client'
// Dialog's scrolling body: the description and the body scroll between the pinned title row and
// the buttons. While the dialog is open this keeps three things true:
// - the hairlines: data-scrolled on the column once the body has scrolled from the top, and
//   data-more while there's more below (CSS draws them);
// - keyboard scrolling: the scroller is a Tab stop only when it overflows and holds nothing
//   focusable, so it can be scrolled without a pointer (and never adds a stop otherwise);
// - an alert your code adds inside the body is scrolled into view, without moving focus.
import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], area[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), iframe, audio[controls], video[controls], summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])'

function mark(node: Element | null, name: string, on: boolean) {
  if (!node) return
  if (on) node.setAttribute(name, '')
  else node.removeAttribute(name)
}

/** The alert an added node is, or holds, or sits in (its words changed), inside `scroller`. */
function alertIn(added: Node, scroller: HTMLElement): Element | null {
  const element = added.nodeType === 1 ? (added as Element) : added.parentElement
  if (!element || !scroller.contains(element)) return null
  return element.closest('[role="alert"]') ?? element.querySelector('[role="alert"]')
}

export function useScrollArea(scroller: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const node = scroller.current
    if (!open || !node) return
    const column = node.parentElement
    const update = () => {
      const room = node.scrollHeight - node.clientHeight
      const overflows = room > 1
      mark(column, 'data-scrolled', overflows && node.scrollTop > 0.5)
      mark(column, 'data-more', overflows && node.scrollTop < room - 0.5)
      // The scroller's own focus doesn't count as something focusable inside.
      const stop = overflows && !node.querySelector(FOCUSABLE)
      if (stop) node.tabIndex = 0
      else if (node.hasAttribute('tabindex') && document.activeElement !== node) node.removeAttribute('tabindex')
    }
    const View = node.ownerDocument.defaultView
    const resize = View && 'ResizeObserver' in View ? new View.ResizeObserver(update) : null
    const watchSizes = () => {
      resize?.observe(node)
      for (const child of Array.from(node.children)) resize?.observe(child)
    }
    const mutations = View && 'MutationObserver' in View ? new View.MutationObserver((records) => {
      const alerts = new Set<Element>()
      for (const record of records) {
        const changed = record.type === 'characterData' ? [record.target] : Array.from(record.addedNodes)
        for (const added of changed) {
          const alert = alertIn(added, node)
          if (alert) alerts.add(alert)
        }
      }
      for (const alert of alerts) if (typeof (alert as HTMLElement).scrollIntoView === 'function') (alert as HTMLElement).scrollIntoView({ block: 'nearest' })
      watchSizes()
      update()
    }) : null
    update()
    watchSizes()
    mutations?.observe(node, { childList: true, subtree: true, characterData: true })
    node.addEventListener('scroll', update, { passive: true })
    return () => {
      node.removeEventListener('scroll', update)
      resize?.disconnect()
      mutations?.disconnect()
      mark(column, 'data-scrolled', false)
      mark(column, 'data-more', false)
    }
  }, [open])
}
