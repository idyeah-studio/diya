import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { AlertLibrary } from '../components/AlertLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

/* UX-SITE-03: with Toast selected, Get code names what it hands out: toast(), not Alert. */
beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
  const dialog = Object.getPrototypeOf(document.createElement('dialog'))
  vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
})

async function openGetCode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Get code' }))
  return screen.findByRole('dialog', { name: 'Get code' })
}

function renderPage() {
  render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <AlertLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
}

describe('Get code on the Alert page', () => {
  it('says "Use toast()" and "Toast, as previewed" for a toast, with ToastExample.tsx', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Toast' }))
    const drawer = await openGetCode(user)
    expect(within(drawer).getByRole('heading', { name: 'Step 3: Use toast()' })).toBeTruthy()
    const code = within(drawer).getByRole('textbox', { name: 'Toast example' })
    expect(code.textContent).toContain('toast({')
    expect(drawer.textContent).toContain('Toast, as previewed')
    expect(drawer.textContent).not.toMatch(/Use Alert|Alert, as previewed/)
    await user.click(within(drawer).getByRole('tab', { name: 'Complete file' }))
    const file = within(drawer).getByRole('textbox', { name: 'Toast complete file' })
    expect(file.textContent).toContain('export default function ToastExample()')
    expect(drawer.textContent).toContain('Save it as ToastExample.tsx, then render <ToastExample /> inside the provider from step 2.')
  })

  it('still says "Use Alert" for an alert', async () => {
    const user = userEvent.setup()
    renderPage()
    const drawer = await openGetCode(user)
    expect(within(drawer).getByRole('heading', { name: 'Step 3: Use Alert' })).toBeTruthy()
    expect(drawer.textContent).toContain('Alert, as previewed')
  })
})
