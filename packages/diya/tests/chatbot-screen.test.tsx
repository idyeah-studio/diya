// What a full-page assistant screen needs from Chatbot: a page heading of its own
// in place of Chatbot's header, and a streaming reply without a stale "Preparing" line.
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
})
