import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { toast } from '@idyeah/diya'
import { AppearanceProvider } from '../app/Appearance'
import { AlertLibrary } from '../components/AlertLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { readPlayground } from '../components/code/playground'
import { snippetFor } from '../components/code/snippets'
import { resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))

/*
 * The Toast page (the Alert page's Toast type) leads with toast(): Get code
 * calls it, and the options are toast()'s own. The preview's toast takes the
 * preview's provider (the Customize scope) and the page's one toast column.
 */
beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
})
afterEach(async () => {
  act(() => toast.dismiss())
  await act(async () => {})
})

function renderPage() {
  const view = render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <CatalogProvider>
        <AlertLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
  return { read: () => readPlayground(view.container.querySelector('.component-document')!) }
}

describe('the Toast page', () => {
  it('gives toast() in Get code, with toast()’s own options', async () => {
    const user = userEvent.setup()
    const page = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Toast' }))
    const options = screen.getByRole('group', { name: 'Options' })
    expect(within(options).getAllByRole('checkbox').map((box) => box.closest('label')!.textContent!.trim())).toEqual(['Action'])
    await user.click(screen.getByRole('radio', { name: 'Success' }))
    await user.click(within(options).getByRole('checkbox', { name: 'Action' }))
    const { code, functionProps } = snippetFor('alert', page.read())
    expect(code).toBe(`import { Button, toast } from '@idyeah/diya'

<Button
  variant="outline"
  onClick={() => toast({
    tone: 'success',
    title: 'Changes saved',
    description: 'Your project is up to date and ready to share.',
    action: { label: 'View project', onClick: viewProject },
  })}
>
  Show toast
</Button>`)
    expect(code).not.toMatch(/<Toast\b|useState|showToast/)
    expect(functionProps).toEqual(['onClick'])
  })

  it('shows its toast in the page’s one column, in the preview’s look, named for its title', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Toast' }))
    await user.click(screen.getByRole('button', { name: 'Show toast' }))
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' })
    expect(within(region).getByText('A new version is available')).toBeTruthy()
    expect(within(region).getByRole('button', { name: 'Dismiss: A new version is available' })).toBeTruthy()
    // One column: the catalog's own provider hosts the stack.
    expect(region.closest('.diya-root')!.classList.contains('catalog-provider')).toBe(true)
    // The preview's look: the toast sits under a stand-in for the Customize scope's provider.
    const look = within(region).getByText('A new version is available').closest('.diya-toast-scope')!
    expect(look.classList.contains('customize-scope--alert')).toBe(true)
    expect(look.getAttribute('data-theme')).toBe('light')
  })
})
