import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { version, type ReactNode } from 'react'
import { Button, DiyaProvider } from '../dist/index.js'

// P6 (QA-O-01): a label that starts with an element holding text keeps the space after it in its
// accessible name, as in 1.1.1, in happy-dom and with jsdom's display values. jsdom gives every
// element its default display (a span is inline), so dom-accessibility-api joins an inline span's
// trimmed text with no space: when the space sat inside the label's span, "<strong>Save</strong> now"
// read "Savenow". Here that's reproduced in happy-dom (whose display is empty) by reporting jsdom's
// default display; a real jsdom run is in the round's report.
const New = () => <span>New</span>
const labels: [string, ReactNode][] = [
  ['Save now', <><strong>Save</strong> now</>],
  ['⌘K Search', <><kbd>⌘K</kbd> Search</>],
  ['New Export', <><New /> Export</>],
]
const inline = new Set(['SPAN', 'STRONG', 'KBD', 'B', 'EM', 'I', 'A', 'SVG', 'CODE', 'SMALL'])
function jsdomDisplay() {
  const real = window.getComputedStyle.bind(window)
  return vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = real(element, pseudo)
    if (pseudo || style.getPropertyValue('display')) return style
    const display = inline.has(element.tagName.toUpperCase()) ? 'inline' : 'block'
    return new Proxy(style, { get: (target, key) => key === 'getPropertyValue' ? (name: string) => (name === 'display' ? display : target.getPropertyValue(name)) : key === 'display' ? display : Reflect.get(target, key) })
  })
}

describe(`a label that starts with an element keeps its space in the name (P6, React ${version})`, () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks() })
  for (const dom of ['happy-dom', 'jsdom display'] as const) {
    it.each(labels)(`%s, ${dom}: with loading given false, given true, and after a first load`, (name, label) => {
      if (dom === 'jsdom display') jsdomDisplay()
      const view = render(<DiyaProvider><Button loading={false}>{label}</Button><Button>{label}</Button></DiyaProvider>)
      const [given, late] = screen.getAllByRole('button')
      expect(screen.getAllByRole('button', { name })).toEqual([given, late])
      view.rerender(<DiyaProvider><Button loading>{label}</Button><Button loading>{label}</Button></DiyaProvider>)
      expect(screen.getAllByRole('button', { name })).toEqual([given, late])
      view.rerender(<DiyaProvider><Button loading={false}>{label}</Button><Button loading={false}>{label}</Button></DiyaProvider>)
      expect(screen.getAllByRole('button', { name })).toEqual([given, late])
    })
  }
})
