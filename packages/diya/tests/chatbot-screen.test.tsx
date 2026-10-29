// What a full-page assistant screen needs from Chatbot: a page heading of its own
// in place of Chatbot's header, and a streaming reply without a stale "Preparing" line
// or a Copy button for half a reply, and a user bubble as wide as its words.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chatbot, DiyaProvider, type ChatMessage, type ChatbotProps } from '../dist/index.js'

const noop = () => {}
const chat = (props: Partial<ChatbotProps> = {}) => <DiyaProvider>
  <Chatbot title="Lumen" description="Swift answers in a moment." messages={[]} value="" onValueChange={noop} onSend={noop} {...props} />
</DiyaProvider>

describe('Chatbot header', () => {
  it('hides the header with showHeader={false} and keeps the title as the region and log names', () => {
    const view = render(chat())
    expect(screen.getByText('Lumen')).toBeTruthy()
    expect(screen.getByText('Swift answers in a moment.')).toBeTruthy()
    view.rerender(chat({ showHeader: false }))
    expect(screen.queryByText('Lumen')).toBeNull()
    expect(screen.queryByText('Swift answers in a moment.')).toBeNull()
    const region = screen.getByRole('region', { name: 'Lumen' })
    expect(region.querySelector('header')).toBeNull()
    expect(screen.getByRole('log', { name: 'Lumen messages' })).toBeTruthy()
  })

  it('keeps a floating chat’s close button when the header is hidden', () => {
    const messages: ChatMessage[] = []
    render(chat({ showHeader: false, layout: 'floating', onOpenChange: noop, messages }))
    expect(screen.getByRole('button', { name: 'Close chat' })).toBeTruthy()
    expect(screen.queryByText('Lumen')).toBeNull()
  })
})

describe('Chatbot while a reply is on its way', () => {
  const question: ChatMessage = { id: '1', role: 'user', text: 'Plan a weekend in Kyoto' }
  const reply: ChatMessage = { id: '2', role: 'assistant', text: 'Here’s a calm' }

  it('shows "Preparing a response…" only until the reply’s first words arrive', () => {
    const view = render(chat({ messages: [question], loading: true }))
    const log = () => screen.getByRole('log', { name: 'Lumen messages' })
    expect(screen.getByText('Preparing a response…')).toBeTruthy()
    expect(log().hasAttribute('aria-busy')).toBe(false)
    view.rerender(chat({ messages: [question, reply], loading: true }))
    expect(screen.queryByText('Preparing a response…')).toBeNull()
    expect(log().getAttribute('aria-busy')).toBe('true')
    view.rerender(chat({ messages: [question, { ...reply, text: 'Here’s a calm, affordable weekend.' }] }))
    expect(screen.queryByText('Preparing a response…')).toBeNull()
  })

  it('offers Copy on a reply once it is no longer being written, including one stopped partway', () => {
    const earlier: ChatMessage = { id: '0', role: 'assistant', text: 'Hello again.' }
    const view = render(chat({ messages: [earlier, question, reply], loading: true, onStop: noop }))
    const copies = () => screen.queryAllByRole('button', { name: 'Copy' }).map(button => button.closest('article')?.textContent)
    // Streaming: earlier replies keep Copy, the one being written has none.
    expect(copies()).toEqual([expect.stringContaining('Hello again.')])
    // Stopped: what was written so far can be copied.
    view.rerender(chat({ messages: [earlier, question, reply], onStop: noop }))
    expect(copies()).toEqual([expect.stringContaining('Hello again.'), expect.stringContaining('Here’s a calm')])
  })
})

describe('Chatbot message width', () => {
  const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some((part) => part.trim() === selector))
    .map(([, , body]) => body).join(';')

  it('sizes a user bubble to its text, up to the message width, in every layout', () => {
    expect(rules('.diya-root .diya-chat-message')).toMatch(/max-width:\s*90%/)
    expect(rules(".diya-root .diya-chat-message[data-role='user']")).toMatch(/width:\s*fit-content/)
    // No layout sets the bubble's width back.
    for (const [selector] of css.matchAll(/[^{}]+(?=\{)/g)) {
      if (selector.includes('diya-chat-message') && selector.includes('data-presentation')) throw new Error(`layout rule for messages: ${selector}`)
    }
  })
})
