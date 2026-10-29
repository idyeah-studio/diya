import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DiyaProvider } from '@idyeah/diya'
import { GetCodeDrawer } from '../components/GetCodeDrawer'
import { createCommand } from '../components/site/package-manager'
import { PACKAGE_MANAGERS } from '../components/site/package-manager'
import { resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <DiyaProvider>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <GetCodeDrawer id="button" open={open} onOpenChange={setOpen} />
    </DiyaProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
    this.open = false
  })
})

describe('Get code: No app yet?', () => {
  it('offers create-diya in step 1, in the chosen package manager', { timeout: 10_000 }, async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const drawer = await screen.findByRole('dialog', { name: 'Get code' })
    const step1 = within(drawer).getByRole('region', { name: 'Step 1: Install' })
    expect(step1.textContent).toContain('No app yet? npm create diya@latest sets up Next.js or Vite with the styles and provider already in place. Then skip to step 3.')
    expect(step1.textContent).toContain('Working in Claude Code or Cursor? Connect your editor once and it fetches this for you.')
    expect(within(step1).getByRole('link', { name: 'Connect your editor' }).getAttribute('href')).toBe('https://github.com/idyeah-studio/diya#use-it-with-an-ai-editor')
    await user.click(within(step1).getByRole('tab', { name: 'pnpm' }))
    expect(within(drawer).getByRole('region', { name: 'Step 1: Install' }).textContent).toContain('No app yet? pnpm create diya sets up')
  })

  it('has a create command for every package manager', () => {
    expect(PACKAGE_MANAGERS.map(createCommand)).toEqual(['npm create diya@latest', 'pnpm create diya', 'yarn create diya', 'bun create diya'])
  })
})
