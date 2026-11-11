// Motion in components that sit in the page: Button press and hover, the theme switch, and (in
// later sections) Tabs, Accordion, toggles, Progress and Chatbot. HappyDOM has no layout or Web
// Animations; tests supply what they need.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useLayoutEffect, useState } from 'react'
import { Accordion, Button, Chatbot, DiyaProvider, Progress, type ChatMessage } from '../dist/index.js'
import { renderToString } from 'react-dom/server'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const nextFrame = () => act(() => new Promise<void>((done) => requestAnimationFrame(() => done())))
afterEach(() => vi.restoreAllMocks())

describe('Button press and hover', () => {
  it('writes a press floor so a wide button shrinks at most about 2px a side', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(368)
    const pointerDown = vi.fn()
    render(<DiyaProvider><Button onPointerDownCapture={pointerDown}>Sign in</Button></DiyaProvider>)
    const button = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.pointerDown(button)
    const floor = Number(button.style.getPropertyValue('--diya-internal-button-press-floor'))
    expect(floor).toBeCloseTo(1 - 4 / 368, 6)
    // 368px at max(0.98, floor) loses 4px in all: 2px a side.
    expect(368 * (1 - Math.max(0.98, floor)) / 2).toBeCloseTo(2, 6)
    expect(pointerDown).toHaveBeenCalledOnce()
  })

  it('writes the floor on a keyboard press too, and for a link Button', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(120)
    render(<DiyaProvider><Button href="/plans">Plans</Button></DiyaProvider>)
    const link = screen.getByRole('link', { name: 'Plans' })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(Number(link.style.getPropertyValue('--diya-internal-button-press-floor'))).toBeCloseTo(1 - 4 / 120, 6)
  })

  it('presses with scale, landing at once, and eases the release back', () => {
    expect(css).toMatch(/\.diya-button:not\(:disabled, \[aria-disabled='true'\], \[aria-busy='true'\]\):active \{\s*scale: max\(var\(--diya-internal-motion-scale-press\), var\(--diya-internal-button-press-floor, 0\)\);\s*\}/)
    expect(css).not.toMatch(/filter:\s*brightness/)
    // Every rule that sets a Button's transition list includes scale, so whichever wins the
    // cascade, the release eases (a shared list without it once snapped the release back).
    const lists = [...css.matchAll(/([^{}]*\.diya-button[^{}]*)\{([^{}]*transition-property:[^;]*;)/g)]
      .filter(([, selector]) => !selector.includes('::after'))
      .map(([, selector, body]) => ({ selector: selector.trim(), list: /transition-property:([^;]*);/.exec(body)![1] }))
    expect(lists.length).toBeGreaterThan(0)
    for (const { selector, list } of lists) expect(list, selector).toContain('scale')
  })

  it('hovers a Solid or Destructive fill 10% toward its label color, as a layer under the label', () => {
    expect(css).toMatch(/\.diya-root \.diya-button::after \{\s*content: '';\s*position: absolute;\s*inset: -1px;\s*z-index: -1;\s*border-radius: inherit;\s*background-color: var\(--diya-internal-button-tint, transparent\);/)
    expect(css).toMatch(/\.diya-root \.diya-button \{\s*isolation: isolate;\s*\}/)
    expect(css).toMatch(/\.diya-button:is\(\[data-variant='solid'\], \[data-variant='destructive'\]\):not\(:disabled, \[aria-disabled='true'\]\):hover \{\s*--diya-internal-button-tint: color-mix\(in srgb, currentColor 10%, transparent\);\s*\}/)
    // Nothing on a Solid hover sets the background, so a background from className or style
    // keeps the tint over it.
    expect(css).not.toMatch(/\.diya-button:not\(:disabled, \[aria-disabled='true'\]\):hover \{[^}]*background/)
    expect(css).toMatch(/\.diya-button::after \{\s*transition-property: background-color;\s*transition-duration: var\(--diya-internal-duration-fast\);/)
  })

  it('under reduced motion, tints a pressed Solid or Destructive button 22% toward its label color', () => {
    const reduced = /\.diya-root\[data-motion='(reduced|system)'\] \.diya-button:is\(\[data-variant='solid'\], \[data-variant='destructive'\]\):not\(:disabled, \[aria-disabled='true'\]\):active \{\s*--diya-internal-button-tint: color-mix\(in srgb, currentColor 22%, transparent\);/g
    expect([...css.matchAll(reduced)].map((match) => match[1])).toEqual(['reduced', 'system'])
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.diya-root\[data-motion='system'\] \.diya-button/)
  })

})

describe('hover and selected colors', () => {
  // Every rule that eases colors over the fast duration, by its selector.
  const eased = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /transition-property:[^;]*(background-color|color)/.test(body) && /transition-duration: var\(--diya-internal-duration-fast\)/.test(body))
    .map(([, selector]) => selector.replace(/\s+/g, ' '))
    .join('\n')

  it('ease on every control that has a hover, selected or current color', () => {
    const siblings = [
      '.diya-button', '.diya-tab', '.diya-accordion-heading button', '.diya-list-row', '.diya-dialog-close', '.diya-site-nav :is(button, a)',
      '.diya-text-field-control', '.diya-select-control', '.diya-combobox-control',
      '.diya-side-navigation > :where(div) > :is(a, button)', '.diya-breadcrumbs a', '.diya-text-link',
      '.diya-table-sort', '.diya-table-clear', '.diya-table-expander button', '.diya-table tbody td',
      '.diya-calendar-grid button', '.diya-calendar-heading button', '.diya-inline-calendar button',
      '.diya-tag button', '.diya-alert-dismiss', '.diya-text-field-clear', '.diya-upload-drop', '.diya-wizard-steps li > span',
    ]
    for (const sibling of siblings) expect(eased, sibling).toContain(sibling)
    // Table's sort arrow brightens on hover.
    expect(css).toMatch(/\.diya-table-sort svg \{\s*transition-property: opacity;\s*transition-duration: var\(--diya-internal-duration-fast\);/)
  })

  it('leave menu items and list options instant, so a list never lags the pointer or the keys', () => {
    expect(eased).not.toMatch(/diya-menu-item|diya-combobox-options|diya-select-option/)
  })
})

describe('theme changes', () => {
  it('pause transitions for the frame that paints a new theme', async () => {
    const { container, rerender } = render(<DiyaProvider theme="light">Text</DiyaProvider>)
    const root = container.querySelector('.diya-root')!
    expect(root.hasAttribute('data-theme-change')).toBe(false)
    rerender(<DiyaProvider theme="dark">Text</DiyaProvider>)
    expect(root.hasAttribute('data-theme-change')).toBe(true)
    await nextFrame()
    await nextFrame()
    await nextFrame()
    expect(root.hasAttribute('data-theme-change')).toBe(false)
    // The pause closes the same gate motion="off" does.
    expect(css).toMatch(/\.diya-root\[data-theme-change\] \{\s*--diya-internal-motion: 0;\s*\}/)
  })

  it('puts the pause in the same commit as the new theme, before any child reads layout', () => {
    // A child that measures in a layout effect (as Tabs does) flushes style: by then the pause
    // must already be on the provider, or its transitions start with the new colors.
    const seen: (string | null)[] = []
    function Measures({ theme }: { theme: string }) {
      useLayoutEffect(() => { seen.push(`${theme}:${document.querySelector('.diya-root')!.getAttribute('data-theme-change')}`) }, [theme])
      return null
    }
    const { rerender } = render(<DiyaProvider theme="light"><Measures theme="light" /></DiyaProvider>)
    rerender(<DiyaProvider theme="dark"><Measures theme="dark" /></DiyaProvider>)
    expect(seen).toEqual(['light:null', 'dark:'])
  })
})

describe('Switch and Choice', () => {
  it('slides the Switch thumb with translate, mirrored right to left without relying on :dir()', () => {
    expect(css).toMatch(/\.diya-switch:checked \{\s*justify-content: start;\s*\}/)
    expect(css).toMatch(/\.diya-switch:checked::before \{\s*translate: var\(--diya-internal-switch-travel\) 0;/)
    // The attribute rule stands alone, so an engine that drops :dir() keeps it.
    expect(css).toMatch(/\.diya-root\[dir='rtl'\] \.diya-switch:checked::before,\s*\.diya-root \[dir='rtl'\] \.diya-switch:checked::before \{\s*translate: calc\(-1 \* var\(--diya-internal-switch-travel\)\) 0;/)
    expect(css).toMatch(/\n\.diya-root \.diya-switch:checked:dir\(rtl\)::before \{/)
  })

  it('keeps the Choice mark always present, grown in by a transition, never a keyframe', () => {
    expect(css).toMatch(/\.diya-choice-option input::before \{\s*content: '';\s*opacity: 0;/)
    expect(css).toMatch(/\.diya-choice-option input:is\(:checked, :indeterminate\)::before \{\s*opacity: 1;\s*scale: 1;\s*transition-duration: var\(--diya-internal-duration-fast\);/)
    // No animation hangs off a checked, indeterminate or selected state anywhere.
    const stateful = [...css.matchAll(/([^{}]*:(?:checked|indeterminate)[^{}]*)\{([^}]*)\}/g)]
    expect(stateful.length).toBeGreaterThan(5)
    for (const [, selector, body] of stateful) expect(body, selector.trim()).not.toMatch(/(^|[;\s])animation/)
  })
})

describe('Accordion', () => {
  const items = [{ id: 'ship', label: 'Shipping', content: 'Two days.' }, { id: 'return', label: 'Returns', content: 'Thirty days.' }]

  it('keeps hidden and its region, adds a body to clip, and turns one chevron', () => {
    const html = renderToString(<DiyaProvider><Accordion items={items} /></DiyaProvider>)
    expect(html).toMatch(/role="region"[^>]*hidden=""[^>]*class="diya-accordion-content"><div class="diya-accordion-body">Two days\.<\/div>/)
    expect(html.match(/d="M5 8l5 5 5-5"/g)).toHaveLength(2)
  })

  it('makes a closed section inert from the moment it closes, and an open one usable', () => {
    render(<DiyaProvider><Accordion items={items} /></DiyaProvider>)
    const shipping = screen.getByRole('button', { name: 'Shipping' })
    const region = document.getElementById(shipping.getAttribute('aria-controls')!)!
    expect(region.inert).toBe(true)
    fireEvent.click(shipping)
    expect(region.hidden).toBe(false)
    expect(region.inert).toBe(false)
    fireEvent.click(shipping)
    expect(region.hidden).toBe(true)
    expect(region.inert).toBe(true)
  })

  it('animates rows and opacity, and hides after its exit instead of switching display', () => {
    const hidden = css.match(/\.diya-root \.diya-accordion-content\[hidden\] \{([^}]*)\}/g)!.at(-1)!
    expect(hidden).toMatch(/display: grid;/)
    expect(hidden).toMatch(/grid-template-rows: 0fr;/)
    expect(hidden).toMatch(/visibility: hidden;/)
    expect(hidden).toMatch(/transition-delay: 0s, 0s, 0s, var\(--diya-internal-exit-slow\);/)
    // @starting-style is limited to popups, Toast, Dialog and Drawer: see t0-l1-styles.
    expect(css).toMatch(/\.diya-accordion-heading button\[aria-expanded='true'\] svg \{\s*rotate: 180deg;/)
  })

  it('lets an open section\'s content overflow once it has grown; a closed or closing one clips', () => {
    const body = css.match(/\.diya-root \.diya-accordion-body \{([^}]*)\}/)![1]
    expect(body).toMatch(/overflow: visible;/)
    expect(body).toMatch(/transition-property: overflow;/)
    expect(body).toMatch(/transition-delay: calc\(var\(--diya-internal-duration-slow\) \* var\(--diya-internal-motion-travel\)\);/)
    expect(body).toMatch(/transition-behavior: allow-discrete;/)
    expect(css).toMatch(/\.diya-accordion-content\[hidden\] > \.diya-accordion-body \{\s*overflow: hidden;\s*transition-delay: 0s;\s*\}/)
    // No rule clips an open section for good, as the first 1.1 draft did.
    expect(css).not.toMatch(/\.diya-root \.diya-accordion-body \{[^}]*overflow: hidden/)
  })
})

describe('Progress and loading rows', () => {
  it('eases a new value on the bar and the ring, and still sets the bar\'s width inline', () => {
    const { container, rerender } = render(<DiyaProvider><Progress label="Upload" value={20} /><Progress label="Sync" variant="circular" value={20} /></DiyaProvider>)
    rerender(<DiyaProvider><Progress label="Upload" value={60} /><Progress label="Sync" variant="circular" value={60} /></DiyaProvider>)
    expect((container.querySelector('.diya-progress-track > span') as HTMLElement).style.width).toBe('60%')
    expect(container.querySelector('.diya-progress-fill-circle')!.getAttribute('stroke-dashoffset')).toBe('40')
    expect(css).toMatch(/\.diya-progress-track > span \{\s*transition-property: width;/)
    expect(css).toMatch(/\.diya-progress-fill-circle \{\s*transition-property: stroke-dashoffset;/)
  })

  it('pulses Table\'s loading rows at full strength, as the Screens do, and adds no other keyframe', () => {
    expect(css).toMatch(/\.diya-table-skeleton \{\s*animation: diya-skeleton-pulse 1\.4s ease-in-out infinite;/)
    expect(css).toMatch(/@keyframes diya-skeleton-pulse \{ 50% \{ opacity: 0\.55; \} \}/)
    expect(css.match(/@keyframes [\w-]+/g)).toEqual(['@keyframes diya-progress-travel', '@keyframes diya-progress-spin', '@keyframes diya-progress-breathe', '@keyframes diya-skeleton-pulse'])
    // A fade: nothing in the Reduce Motion or motion settings stops it.
    expect(css).not.toMatch(/diya-table-skeleton[^{]*\{[^}]*animation:\s*none/)
  })
})

describe('Chatbot messages', () => {
  /** Web Animations and the provider's resolved medium time, for chat rows. */
  function webAnimations(duration = '0.16s') {
    const calls: { row: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = []
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      writable: true,
      value(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        calls.push({ row: this, keyframes, options })
        return { finished: Promise.resolve(), cancel() {} }
      },
    })
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo)
      if (!(element as HTMLElement).classList?.contains('diya-chat-message')) return style
      return new Proxy(style, {
        get(target, property) {
          if (property === 'animationDuration') return duration
          if (property === 'animationTimingFunction') return 'cubic-bezier(0.2, 0.7, 0.2, 1)'
          if (property === 'getPropertyValue') return (name: string) => name === '--diya-internal-motion-distance' ? '4px' : target.getPropertyValue(name)
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    return calls
  }
  afterEach(() => { delete (Element.prototype as { animate?: unknown }).animate })
  const chat = (messages: ChatMessage[]) => <DiyaProvider><Chatbot title="Assistant" messages={messages} value="" onValueChange={() => {}} onSend={() => {}} /></DiyaProvider>
  const first: ChatMessage[] = [{ id: '1', role: 'user', text: 'Hi' }, { id: '2', role: 'assistant', text: 'Hello' }]

  it('never animates the messages it starts with', () => {
    const calls = webAnimations()
    render(chat(first))
    expect(calls).toHaveLength(0)
  })

  it('raises only a message added after mount, and not one that streams in place', () => {
    const calls = webAnimations()
    const { rerender } = render(chat(first))
    rerender(chat([...first, { id: '3', role: 'user', text: 'Thanks' }]))
    expect(calls).toHaveLength(1)
    expect(calls[0].row.textContent).toContain('Thanks')
    expect(calls[0].keyframes).toEqual([{ opacity: 0, translate: '0 4px' }, { opacity: 1, translate: '0 0' }])
    expect(calls[0].options).toEqual({ duration: 160, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' })
    rerender(chat([...first, { id: '3', role: 'user', text: 'Thanks a lot' }]))
    expect(calls).toHaveLength(1)
  })

  it('stays still when the time is 0, as with motion off', () => {
    const calls = webAnimations('0s')
    const { rerender } = render(chat(first))
    rerender(chat([...first, { id: '3', role: 'user', text: 'Thanks' }]))
    expect(calls).toHaveLength(0)
  })
})

describe('Site Header phone menu', () => {
  it('opens like a popup and leaves through a discrete display transition, written as a longhand', () => {
    expect(css).toMatch(/\.diya-site-mobile-nav \{\s*transform-origin: 50% 0;\s*transition-property: opacity, scale, translate, display;[^}]*transition-behavior: normal, normal, normal, allow-discrete;/)
    expect(css).toMatch(/\.diya-site-mobile-nav\[hidden\] \{\s*opacity: 0;[^}]*pointer-events: none;/)
  })
})

describe('floating Chatbot', () => {
  /** Web Animations and the provider's resolved timing, for the chat panel and its copy. */
  function webAnimations(duration = '0.16s') {
    const calls: { target: HTMLElement; keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void }[] = []
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      writable: true,
      value(this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        let finish!: () => void
        const finished = new Promise<void>((resolve) => { finish = resolve })
        calls.push({ target: this, keyframes, options, finish })
        return { finished, cancel() {} }
      },
    })
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo)
      if (!(element as HTMLElement).classList?.contains('diya-chat')) return style
      const values: Record<string, string> = { '--diya-internal-motion-distance': '4px', '--diya-internal-motion-scale': '0.97' }
      return new Proxy(style, {
        get(target, property) {
          if (property === 'animationDuration') return duration
          if (property === 'animationTimingFunction') return 'ease'
          if (property === 'opacity') return '1'
          if (property === 'getPropertyValue') return (name: string) => values[name] ?? target.getPropertyValue(name)
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    return calls
  }
  afterEach(() => { delete (Element.prototype as { animate?: unknown }).animate })
  function Host({ startOpen = true }: { startOpen?: boolean }) {
    const [open, setOpen] = useState(startOpen)
    return <DiyaProvider><Chatbot title="Assistant" layout="floating" open={open} onOpenChange={setOpen} messages={[{ id: '1', role: 'assistant', text: 'Hello' }]} value="" onValueChange={() => {}} onSend={() => {}} /></DiyaProvider>
  }
  const copies = () => Array.from(document.querySelectorAll<HTMLElement>('.diya-chat[aria-hidden="true"]'))

  it('doesn\'t animate a chat that mounts open', () => {
    const calls = webAnimations()
    render(<Host />)
    expect(calls).toHaveLength(0)
  })

  it('closes at once, playing its exit on an inert copy that is never announced', async () => {
    const calls = webAnimations()
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    // The real chat is gone and "Open chat" is there, with focus.
    expect(screen.queryByRole('region', { name: 'Assistant' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open chat' }))
    const [copy] = copies()
    expect(copy.inert).toBe(true)
    expect(copy.querySelectorAll('[id], [role], [aria-label], [aria-live]')).toHaveLength(0)
    expect(calls).toHaveLength(1)
    expect(calls[0].options).toMatchObject({ duration: 160, easing: 'ease', fill: 'forwards' })
    expect(calls[0].keyframes.at(-1)).toMatchObject({ opacity: 0, scale: '0.97', translate: '0 4px' })
    await act(async () => { calls[0].finish() })
    expect(copies()).toHaveLength(0)
  })

  it('grows in when it opens again', () => {
    const calls = webAnimations()
    render(<Host startOpen={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(calls).toHaveLength(1)
    expect(calls[0].target.getAttribute('aria-label')).toBe('Assistant')
    expect(calls[0].keyframes[0]).toMatchObject({ opacity: 0, scale: '0.97', translate: '0 4px', transformOrigin: '100% 100%' })
  })

  it('makes no copy and plays nothing when the time is 0, as with motion off', () => {
    const calls = webAnimations('0s')
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(copies()).toHaveLength(0)
    expect(calls).toHaveLength(0)
  })
})
