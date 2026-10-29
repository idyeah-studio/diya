import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider } from '@idyeah/diya'
import { GetCodeDrawer } from '../components/GetCodeDrawer'

const guidance = 'Copy didn’t work. The code is selected; press Command+C or Ctrl+C.'
function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((complete, fail) => { resolve = complete; reject = fail })
  return { promise, resolve, reject }
}
function Harness() {
  const [open, setOpen] = useState(false)
  return <DiyaProvider><Button onClick={() => setOpen(true)}>Get Button code</Button>
    <GetCodeDrawer id="button" open={open} onOpenChange={setOpen} />
  </DiyaProvider>
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Get Button code' }))
  await screen.findByRole('button', { name: 'Copy install command' })
}

beforeEach(() => {
  window.localStorage.clear()
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})
afterEach(() => {
  document.getSelection()?.removeAllRanges()
  vi.unstubAllGlobals()
})

describe('Get code copy buttons', () => {
  it('each has its own name, shows Copied and announces it', async () => {
    const user = userEvent.setup()
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<Harness />)
    await open(user)
    const names = screen.getAllByRole('button', { name: /^Copy / }).map((button) => button.getAttribute('aria-label'))
    expect(names).toEqual(['Copy install command', 'Copy styles and provider', 'Copy Button example'])
    await user.click(screen.getByRole('button', { name: 'Copy styles and provider' }))
    expect(clipboard).toHaveBeenLastCalledWith(screen.getByRole('textbox', { name: 'Styles and provider' }).textContent)
    expect(screen.getByRole('button', { name: 'Copy styles and provider' }).textContent).toBe('Copied')
    expect((await screen.findByText('Styles and provider copied.')).getAttribute('role')).toBe('status')
  })

  it('selects and focuses the exact command after denial, then lets Copy succeed', async () => {
    const user = userEvent.setup()
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new DOMException('Clipboard blocked', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined)
    render(<Harness />)
    await open(user)
    const code = screen.getByRole('textbox', { name: 'Install command' })
    await user.click(screen.getByRole('button', { name: 'Copy install command' }))
    const notice = await screen.findByText(guidance)
    expect(notice.getAttribute('role')).toBe('status')
    expect(document.activeElement).toBe(code)
    expect(code.getAttribute('aria-describedby')).toBe(notice.id)
    expect(document.getSelection()?.toString()).toBe('npm install @idyeah/diya')
    expect(clipboard).toHaveBeenLastCalledWith('npm install @idyeah/diya')
    await user.click(screen.getByRole('button', { name: 'Copy install command' }))
    expect((await screen.findByText('Install command copied.')).getAttribute('role')).toBe('status')
    expect(screen.queryByText(guidance)).toBeNull()
  })

  it.each(['Control', 'Meta'])('keeps %s+A selection within the focused snippet', async modifier => {
    const user = userEvent.setup()
    render(<Harness />)
    await open(user)
    const dialog = screen.getByRole('dialog', { name: 'Get code' })
    const code = screen.getByRole('textbox', { name: 'Styles and provider' })
    act(() => {
      const range = document.createRange()
      range.selectNodeContents(dialog)
      document.getSelection()?.addRange(range)
      code.focus()
    })
    await user.keyboard(`{${modifier}>}a{/${modifier}}`)
    expect(document.getSelection()?.toString()).toBe(code.textContent)
    expect(document.activeElement).toBe(code)
  })

  it('ignores a duplicate press and a denial that lands after the drawer closed', async () => {
    const pending = deferred()
    const user = userEvent.setup()
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockReturnValueOnce(pending.promise).mockResolvedValueOnce(undefined)
    render(<Harness />)
    await open(user)
    const action = screen.getByRole('button', { name: 'Copy install command' })
    await user.dblClick(action)
    expect(clipboard).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Close drawer' }))
    const opener = screen.getByRole('button', { name: 'Get Button code' })
    await waitFor(() => expect(document.activeElement).toBe(opener))
    await act(async () => { pending.reject(new Error('Delayed clipboard denial')) })
    expect(document.activeElement).toBe(opener)
    expect(screen.queryByText(guidance)).toBeNull()
  })

  it('ignores an old result after the command changes with the package manager', async () => {
    const previous = deferred()
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockReturnValueOnce(previous.promise).mockResolvedValueOnce(undefined)
    render(<Harness />)
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Copy install command' }))
    await user.click(screen.getByRole('tab', { name: 'pnpm' }))
    const tab = screen.getByRole('tab', { name: 'pnpm' })
    await act(async () => { previous.reject(new Error('Old command denied')) })
    expect(document.activeElement).toBe(tab)
    expect(screen.queryByText(guidance)).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Install command' }).textContent).toBe('pnpm add @idyeah/diya')
    await user.click(screen.getByRole('button', { name: 'Copy install command' }))
    await screen.findByText('Install command copied.')
  })
})
