import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// The default suite exercises the popup fallback. Native top-layer/inert behavior
// requires a real browser; one regression explicitly supplies a native API stub.
function disableNativePopover() {
  if (typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: undefined })
  }
}
disableNativePopover()

if (typeof document !== 'undefined') {
  const prototype = Object.getPrototypeOf(document.createElement('dialog'))
  Object.defineProperty(prototype, 'showModal', { configurable: true, writable: true, value: function (this: HTMLDialogElement) {
    this.open = true
    this.setAttribute('open', '')
    this.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')?.focus()
  } })
  Object.defineProperty(prototype, 'close', { configurable: true, writable: true, value: function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  } })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  disableNativePopover()
})
