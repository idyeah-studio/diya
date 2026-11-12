'use client'
// Development only, best effort: while a DIYA modal is open, a visible fixed or absolute subtree
// added outside it, and outside every DIYA provider, is almost always a third-party popup that
// the modal makes unclickable. Dialog and Drawer call this while they're open.
import { subscribeModals, topModal } from './modal-stack.js'
import { warnOnce } from './warn.js'

const watching = new WeakSet<Document>()

export function watchForStrayPopups(document: Document) {
  const view = document.defaultView
  if (watching.has(document) || !view || typeof view.MutationObserver !== 'function' || !document.body) return
  watching.add(document)
  const observer = new view.MutationObserver((records) => {
    const modal = topModal(document)
    if (!modal) return
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node.nodeType !== 1) continue
        const element = node as HTMLElement
        if (modal.contains(element) || element.closest('.diya-root')) continue
        const style = view.getComputedStyle(element)
        if ((style.position !== 'fixed' && style.position !== 'absolute') || style.display === 'none' || style.visibility === 'hidden') continue
        const box = element.getBoundingClientRect()
        if (!box.width || !box.height) continue
        warnOnce("DIYA: a popup opened outside the open Dialog, so it can't be clicked. Pass useDiyaPortalContainer() to your popup library as its portal container.")
        return
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  // Stops when the last modal closes.
  const stop = subscribeModals(document, () => {
    if (topModal(document)) return
    observer.disconnect()
    stop()
    watching.delete(document)
  })
}
