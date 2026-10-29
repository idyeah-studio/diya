// Prose and CodeBlock: long-form content in DIYA's type, and code with a Copy button.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Card, CodeBlock, DiyaProvider, Prose, TextLink } from '../dist/index.js'
import { splitSelectors } from '../scripts/styles-transform.mjs'
import { parseRules } from './style-tokens'

const root = process.cwd()
const css = readFileSync(resolve(root, 'dist/styles.css'), 'utf8')
// The guard every Prose element rule ends with: not a DIYA element, and not inside one.
const GUARD = ":not(:where([class*='diya-'], .diya-prose [class*='diya-']:not(.diya-prose) *))"

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined })
}
afterEach(() => setClipboard(undefined))

describe('Prose', () => {
  it('renders a div around your content, with size, escape hatches and a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <DiyaProvider>
        <Prose ref={ref} className="mine" style={{ marginTop: 7 }} data-testid="prose" id="article">
          <h2>Release notes</h2>
          <p>Everything that changed.</p>
        </Prose>
        <Prose size="small" data-testid="small" />
      </DiyaProvider>
    )
    const node = screen.getByTestId('prose')
    expect(node.tagName).toBe('DIV')
    expect(ref.current).toBe(node)
    expect(node.className).toBe('diya-prose mine')
    expect(node.dataset.size).toBe('medium')
    expect(node.style.marginTop).toBe('7px')
    expect(node.id).toBe('article')
    expect(within(node).getByRole('heading', { level: 2, name: 'Release notes' })).toBeTruthy()
    expect(screen.getByTestId('small').dataset.size).toBe('small')
  })

  it('takes rendered HTML through dangerouslySetInnerHTML', () => {
    render(<DiyaProvider><Prose data-testid="prose" dangerouslySetInnerHTML={{ __html: '<h2>Terms</h2><p>Plain <a href="/privacy">words</a>.</p>' }} /></DiyaProvider>)
    const node = screen.getByTestId('prose')
    expect(within(node).getByRole('heading', { name: 'Terms' })).toBeTruthy()
    expect(within(node).getByRole('link', { name: 'words' }).getAttribute('href')).toBe('/privacy')
  })

  it('leaves DIYA components inside it as they are', () => {
    render(
      <DiyaProvider>
        <Prose>
          <p>See <TextLink href="/docs" inline>the docs</TextLink>.</p>
          <Card title="Plan" description="Monthly"><p>Card body</p></Card>
        </Prose>
      </DiyaProvider>
    )
    expect(screen.getByRole('link', { name: 'the docs' }).className).toBe('diya-text-link')
    const card = screen.getByRole('article', { name: 'Plan' })
    expect(card.className).toBe('diya-card')
    expect(within(card).getByText('Card body').closest('.diya-card-content')).toBeTruthy()
  })

  it('reaches only plain elements in its content: never DIYA components inside, nor anything outside', () => {
    const rules = parseRules(css).filter((rule) => rule.selector.includes('diya-prose'))
    expect(rules.length).toBeGreaterThan(40)
    const roots = new Set([
      '.diya-root .diya-prose',
      ".diya-root .diya-prose[data-size='small']",
      ".diya-root .diya-prose[data-size='large']",
      '.diya-root :is(.diya-prose, .diya-code-block)',
      ".diya-root[data-glass='true'] :is(.diya-prose, .diya-code-block)",
      ".diya-root[data-glass='true']:where([data-theme='light']) :is(.diya-prose, .diya-code-block)",
      ".diya-root[data-glass='true']:where([data-theme='system']) :is(.diya-prose, .diya-code-block)",
    ])
    const spacing = /^\.diya-root \.diya-prose (> \* \+ |> :is\(h1, h2, h3, h4, h5, h6\) \+ |:is\(li, blockquote, figure, dd\):not\(.+\) > \* \+ ):where\(\[class\*='diya-'\]\)$/
    // After the guard, only pseudo-classes and pseudo-elements of the same element may follow.
    const sameElement = /^(:{1,2}[\w-]+(\([^()]*\))?)*$/
    for (const rule of rules) {
      for (const selector of splitSelectors(rule.selector)) {
        if (roots.has(selector)) {
          // The root sets no text styles, so nothing inherits into components placed inside.
          const declared = rule.body.split(';').map((part) => part.split(':')[0].trim()).filter(Boolean)
          expect(declared.filter((name) => !name.startsWith('--') && !['min-width', 'max-width'].includes(name)), selector).toEqual([])
          continue
        }
        if (spacing.test(selector)) {
          expect(rule.body.split(';').map((part) => part.split(':')[0].trim()).filter(Boolean), selector).toEqual(['margin-block-start'])
          continue
        }
        expect(selector.startsWith('.diya-root .diya-prose '), selector).toBe(true)
        const at = selector.lastIndexOf(GUARD)
        expect(at, `${selector} has no guard`).toBeGreaterThan(0)
        expect(sameElement.test(selector.slice(at + GUARD.length)), selector).toBe(true)
      }
    }
  })

  it('sizes text only from the type scale, in step for each size', () => {
    const block = (selector: string) => {
      const body = css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)))
      return Object.fromEntries([...body.matchAll(/--diya-internal-prose-font-([a-z0-9]+):\s*var\(--diya-text-(\w+)\)/g)].map((m) => [m[1], m[2]]))
    }
    expect(block('.diya-root .diya-prose')).toEqual({ body: 'large', small: 'body', h1: 'display', h2: 'heading', h3: 'title', h4: 'large', mark: 'hero' })
    expect(block(".diya-root .diya-prose[data-size='small']")).toMatchObject({ body: 'body', small: 'caption', h1: 'heading', h2: 'title', h3: 'large', h4: 'body' })
    expect(block(".diya-root .diya-prose[data-size='large']")).toMatchObject({ body: 'title', small: 'large', h1: 'hero', h2: 'display', h3: 'heading', h4: 'title' })
  })

  it('needs no client directive, so it renders in Server Components', () => {
    const source = readFileSync(resolve(root, 'dist/prose/Prose.js'), 'utf8')
    expect(source).not.toContain('use client')
  })
})

describe('CodeBlock', () => {
  const code = "import { Button } from '@idyeah/diya'\n\n<Button>Save</Button>\n"

  it('shows the code in a labelled region the keyboard can reach, with a Copy button', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DiyaProvider><CodeBlock ref={ref} code={code} label="app/page.tsx" className="mine" data-testid="block" /></DiyaProvider>)
    const block = screen.getByTestId('block')
    expect(ref.current).toBe(block)
    expect(block.className).toBe('diya-code-block mine')
    expect(within(block).getByText('app/page.tsx')).toBeTruthy()
    const region = screen.getByRole('region', { name: 'app/page.tsx code' })
    expect(region.tagName).toBe('PRE')
    expect(region.tabIndex).toBe(0)
    expect(region.querySelector('code')!.textContent).toBe(code)
    expect(screen.getByRole('button', { name: 'Copy' }).getAttribute('type')).toBe('button')
    // The polite live region is there before anything happens, empty.
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('names the region "Code" without a label, and takes translated strings', () => {
    const { unmount } = render(<DiyaProvider><CodeBlock code="npm install @idyeah/diya" /></DiyaProvider>)
    expect(screen.getByRole('region', { name: 'Code' })).toBeTruthy()
    unmount()
    render(<DiyaProvider messages={{ codeBlock: { copy: 'Copier', namedCode: (label) => `Code ${label}` } }}><CodeBlock code="x" label="Shell" /></DiyaProvider>)
    expect(screen.getByRole('region', { name: 'Code Shell' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copier' })).toBeTruthy()
  })

  it('copies the exact code and says "Copied" politely, then goes back to Copy', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    setClipboard(writeText)
    vi.useFakeTimers()
    render(<DiyaProvider><CodeBlock code={code} label="TypeScript" /></DiyaProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    expect(writeText).toHaveBeenCalledWith(code)
    expect(screen.getByRole('status').textContent).toBe('Copied')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('selects the code and says so when the clipboard refuses', async () => {
    setClipboard(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')))
    render(<DiyaProvider><CodeBlock code="pnpm add @idyeah/diya" /></DiyaProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Couldn’t copy. The code is selected, so you can copy it yourself.')
    expect(status.dataset.failed).toBe('true')
    expect(window.getSelection()?.toString()).toBe('pnpm add @idyeah/diya')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('handles a browser without the clipboard API the same way', async () => {
    setClipboard(undefined)
    render(<DiyaProvider><CodeBlock code="yarn add @idyeah/diya" /></DiyaProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    expect(screen.getByRole('status').textContent).toContain('Couldn’t copy')
  })

  it('drops a result that arrives after the code changed', async () => {
    let finish!: () => void
    setClipboard(() => new Promise<void>((done) => { finish = done }))
    const view = render(<DiyaProvider><CodeBlock code="one" /></DiyaProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy' })) })
    view.rerender(<DiyaProvider><CodeBlock code="two" /></DiyaProvider>)
    await act(async () => finish())
    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('works inside Prose and keeps its own styles there', () => {
    render(<DiyaProvider><Prose><p>Install it:</p><CodeBlock code="npm install @idyeah/diya" /></Prose></DiyaProvider>)
    const region = screen.getByRole('region', { name: 'Code' })
    expect(region.closest('.diya-prose')).toBeTruthy()
    // Prose's pre and code rules end in the guard, so this pre (inside a diya- element) is out of their reach.
    expect(region.closest('.diya-code-block')).toBeTruthy()
    for (const selector of ['.diya-root .diya-prose pre', '.diya-root .diya-prose code']) {
      const rule = parseRules(css).find((item) => item.selector.startsWith(selector))
      expect(rule?.selector.endsWith(GUARD), selector).toBe(true)
    }
  })
})
