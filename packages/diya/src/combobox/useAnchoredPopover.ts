'use client'
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { useDiyaPortal } from '../DiyaProvider.js'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

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
  const modal = anchor.current?.closest<HTMLDialogElement>('dialog[open]')
  // A provider inside the dialog already has a safe outlet; otherwise stay in the modal subtree.
  const portal = modal && !modal.contains(providerPortal) ? modal : providerPortal
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
    const height = node.getBoundingClientRect().height
    node.style.left = `${Math.max(12, Math.min(box.left, view.innerWidth - node.getBoundingClientRect().width - 12))}px`
    node.style.top = `${Math.max(12, box.bottom + height + 8 > view.innerHeight ? box.top - height - 8 : box.bottom + 8)}px`
  }, [open, portal, nativePopover, anchor, popup, width, contentKey])
  return portal
}
