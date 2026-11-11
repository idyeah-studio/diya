'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useClientLayoutEffect } from '../internal/layout-effect.js'
import { useDiyaPortal } from '../DiyaProvider.js'

const tabbableSelector = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, object, embed, audio[controls], video[controls], summary, [contenteditable], [tabindex]'

/** Preserve the trigger's logical tab order when popup controls live in a portal. */
export function adjacentTabStop(anchor: HTMLElement, surface: HTMLElement | null, backwards: boolean) {
  const document = anchor.ownerDocument
  const view = document.defaultView
  const modal = anchor.closest<HTMLDialogElement>('dialog[open]')
  const stops = Array.from((modal ?? document).querySelectorAll<HTMLElement>(tabbableSelector)).filter((element) => {
    if (surface?.contains(element) || element.matches(':disabled')) return false
    const editable = element.hasAttribute('contenteditable') && element.contentEditable !== 'false' && !element.parentElement?.isContentEditable
    if (element.tabIndex < 0 && (element.hasAttribute('tabindex') || !editable)) return false
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.hidden || ancestor.hasAttribute('inert')) return false
      const style = view?.getComputedStyle(ancestor)
      if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' || style?.contentVisibility === 'hidden') return false
      if (ancestor !== element && ancestor.tagName === 'DETAILS' && !ancestor.hasAttribute('open')) {
        const summary = Array.from(ancestor.children).find((child) => child.tagName === 'SUMMARY')
        if (!summary?.contains(element)) return false
      }
    }
    return true
  })
  const ordered = stops.filter((element) => {
    if (element.tagName !== 'INPUT') return true
    const radio = element as HTMLInputElement
    return radio.type !== 'radio' || !radio.name || radio.checked || !stops.some((candidate) => {
      if (candidate.tagName !== 'INPUT') return false
      const other = candidate as HTMLInputElement
      return other.type === 'radio' && other.name === radio.name && other.form === radio.form && other.checked
    })
  }).map((element, index) => ({ element, index, order: Math.max(0, element.tabIndex) })).sort((a, b) => {
    if (a.order === b.order) return a.index - b.index
    if (a.order === 0) return 1
    if (b.order === 0) return -1
    return a.order - b.order
  })
  const index = ordered.findIndex(({ element }) => element === anchor)
  if (index < 0) return undefined
  const next = index + (backwards ? -1 : 1)
  return ordered[modal ? (next + ordered.length) % ordered.length : next]?.element
}

/** Native top-layer popover when available; the same scoped portal is the fallback. */
export function useAnchoredPopover<T extends HTMLElement>(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  popup: RefObject<T | null>,
  width: 'anchor' | number,
  contentKey: unknown,
) {
  const providerPortal = useDiyaPortal()
  // A provider inside the dialog already has a safe outlet; otherwise stay in the modal subtree.
  // Chosen while open and kept through the exit, so a closing popup stays where it was.
  const outlet = useRef<HTMLElement | null>(null)
  if (open || !outlet.current) {
    const modal = anchor.current?.closest<HTMLDialogElement>('dialog[open]')
    outlet.current = modal && !modal.contains(providerPortal) ? modal : providerPortal
  }
  const portal = outlet.current
  const [nativePopover, setNativePopover] = useState(false)
  useEffect(() => {
    setNativePopover(typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function')
  }, [])
  useClientLayoutEffect(() => {
    const node = popup.current
    const trigger = anchor.current
    if (!open || !node || !trigger) return
    if (nativePopover) {
      // Set through the DOM so React 18's public HTML attribute types stay supported.
      node.setAttribute('popover', 'manual')
      try { node.showPopover() }
      catch { node.removeAttribute('popover'); setNativePopover(false); return }
    } else node.removeAttribute('popover')
    const view = trigger.ownerDocument.defaultView
    if (!view) return
    const box = trigger.getBoundingClientRect()
    const availableWidth = Math.max(0, view.innerWidth - 24)
    const availableHeight = Math.max(0, view.innerHeight - 24)
    node.style.width = `${Math.min(width === 'anchor' ? box.width : width, availableWidth)}px`
    const maximum = Number.parseFloat(view.getComputedStyle(node).maxHeight)
    node.style.maxHeight = `${Math.min(Number.isFinite(maximum) ? maximum : availableHeight, availableHeight)}px`
    node.style.overflowY = 'auto'
    // Layout size, not the rectangle: while the popup scales in, its rectangle is smaller.
    const height = node.offsetHeight
    const left = Math.max(12, Math.min(box.left, view.innerWidth - node.offsetWidth - 12))
    const above = box.bottom + height + 8 > view.innerHeight
    node.style.left = `${left}px`
    node.style.top = `${Math.max(12, above ? box.top - height - 8 : box.bottom + 8)}px`
    node.dataset.side = above ? 'top' : 'bottom'
    // It grows from the field's center, on the edge nearest the field.
    node.style.setProperty('--diya-internal-overlay-origin', `${Math.round(box.left + box.width / 2 - left)}px ${above ? '100%' : '0'}`)
  }, [open, portal, nativePopover, anchor, popup, width, contentKey])
  return portal
}
