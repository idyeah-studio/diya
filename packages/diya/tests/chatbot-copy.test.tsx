import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chatbot, DiyaProvider, type ChatMessage } from '../dist/index.js'

const messages: ChatMessage[] = [
  { id: 'first', role: 'assistant', text: 'First response' },
  { id: 'second', role: 'assistant', text: 'Second response' },
]
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('Chatbot async copy feedback', () => {
  it('keeps the newest copy result when an older request fails later', async () => {
    const old = deferred(), latest = deferred()
    const copy = vi.fn((message: ChatMessage) => message.id === 'first' ? old.promise : latest.promise)
    const user = userEvent.setup()
    render(<DiyaProvider><Chatbot title="Workspace chat" messages={messages} value="" onValueChange={() => {}} onSend={() => {}} onCopy={copy} /></DiyaProvider>)
    const [first, second] = screen.getAllByRole('button', { name: 'Copy' })
    await user.click(first)
    await user.click(second)
    await act(async () => latest.resolve())
    expect(screen.getByText('Response copied.')).toBeTruthy()
    await act(async () => old.reject(new Error('Old clipboard denied')))
    expect(screen.getByText('Response copied.')).toBeTruthy()
    expect(screen.queryByText('Copy unavailable in this browser.')).toBeNull()
    expect(copy.mock.calls.map(([message]) => message.id)).toEqual(['first', 'second'])
  })

  it('does not announce a stale completion after closing/reopening or replacing the copied message, and permits retry', async () => {
    const old = deferred(), changed = deferred()
    const copy = vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => changed.promise).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const example = (open: boolean, content = messages) => <DiyaProvider><Chatbot title="Workspace chat" layout="floating" open={open} onOpenChange={() => {}}
      messages={content} value="" onValueChange={() => {}} onSend={() => {}} onCopy={copy} /></DiyaProvider>
    const view = render(example(true))
    await user.click(screen.getAllByRole('button', { name: 'Copy' })[0])
    view.rerender(example(false))
    view.rerender(example(true))
    await act(async () => old.resolve())
    expect(screen.queryByText('Response copied.')).toBeNull()
    await user.click(screen.getAllByRole('button', { name: 'Copy' })[0])
    view.rerender(example(true, [{ ...messages[0], text: 'A replacement response' }]))
    await act(async () => changed.resolve())
    expect(screen.queryByText('Response copied.')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(copy).toHaveBeenLastCalledWith({ ...messages[0], text: 'A replacement response' })
    expect(await screen.findByText('Response copied.')).toBeTruthy()
  })
})
