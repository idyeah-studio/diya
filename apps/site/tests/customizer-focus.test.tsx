import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Appearance, AppearanceProvider } from '../app/Appearance'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { getSnapshot, resetStoreForTests, setBrandValue, setItemOption, setItemValue } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

function viewport() {
  const listeners = new Set<() => void>()
  const query = {
    matches: false,
    media: '(max-width: 1359px)',
    addEventListener: vi.fn((_event: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_event: string, listener: () => void) => listeners.delete(listener)),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList)
  return (small: boolean) =>
    act(() => {
      query.matches = small
      listeners.forEach((listener) => listener())
    })
}

function Preview() {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <header className="site-header">
        <Appearance />
      </header>
      <CatalogProvider>
        <ButtonLibrary />
      </CatalogProvider>
    </AppearanceProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  resetStoreForTests()
})

describe('Customize panel focus and page relationship', () => {
  it('opens as a labelled region, focuses its heading, and Escape restores the opener', async () => {
    viewport()
    const user = userEvent.setup()
    render(<Preview />)
    const opener = screen.getByRole('button', { name: 'Customize' })
    await user.click(opener)
    expect(opener.getAttribute('aria-expanded')).toBe('true')
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    expect(opener.getAttribute('aria-controls')).toBe(panel.id)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Customize Your brand' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary', { name: 'Customize Your brand' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('on small screens stays non-modal and reserves room instead of trapping the page', async () => {
    const resize = viewport()
    resize(true)
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const root = document.documentElement
    expect(root.dataset.customizeOpen).toBe('true')
    expect(root.style.getPropertyValue('--customize-sheet-height')).toMatch(/^\d+px$/)
    /* The preview and its controls stay usable while you edit. */
    expect(document.querySelector<HTMLElement>('.button-library')!.inert).toBe(false)
    expect(document.querySelector<HTMLElement>('.site-header')!.inert).toBe(false)
    expect(document.body.style.overflow).toBe('')
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    expect(screen.getByRole('complementary', { name: 'Customize Your brand' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Close customization' }))
    expect(root.dataset.customizeOpen).toBeUndefined()
    expect(root.style.getPropertyValue('--customize-sheet-height')).toBe('')
  })

  it('keeps a focused control focused across a breakpoint change', async () => {
    const resize = viewport()
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const corners = screen.getByRole('slider', { name: 'Corner radius' })
    act(() => corners.focus())
    resize(true)
    expect(document.activeElement).toBe(corners)
    resize(false)
    expect(document.activeElement).toBe(corners)
    expect(screen.getByRole('complementary', { name: 'Customize Your brand' })).toBeTruthy()
  })
})

describe('editing', () => {
  it('does not apply a half-typed hex value', async () => {
    viewport()
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    const field = within(panel).getByRole('textbox', { name: 'Brand hex' })
    await user.clear(field)
    await user.type(field, '#1F4')
    expect(getSnapshot().brand?.['colors.light.accent']).toBeUndefined()
    await user.type(field, 'E7A')
    /* One brand; Dark starts on a lighter version because this blue is hard to see there. */
    expect(getSnapshot().brand?.['colors.light.accent']).toBe('#1F4E7A')
    expect(getSnapshot().brand?.['colors.dark.accent']).toMatch(/^#[0-9A-F]{6}$/)
    expect(getSnapshot().brand?.['colors.dark.accent']).not.toBe('#1F4E7A')
  })

  it('picks a suggested brand, asks about Dark, and goes back to Neutral', async () => {
    viewport()
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    const brand = within(panel).getByRole('group', { name: /^Brand/ })
    expect((within(brand).getByRole('radio', { name: 'Neutral, DIYA’s default' }) as HTMLInputElement).checked).toBe(true)
    expect(within(panel).queryByRole('group', { name: 'Use this in Dark too?' })).toBeNull()
    /* The suggestions are bright: each reads on Dark as it is, so no question. */
    await user.click(within(brand).getByRole('radio', { name: 'Ocean, #0A7CFF' }))
    expect(getSnapshot().brand).toEqual({ 'colors.light.accent': '#0A7CFF', 'colors.dark.accent': '#0A7CFF' })
    expect(within(panel).queryByRole('group', { name: 'Use this in Dark too?' })).toBeNull()
    const hex = within(panel).getByRole('textbox', { name: 'Brand hex' })
    await user.clear(hex)
    await user.type(hex, '#1F4E7A')
    expect(getSnapshot().brand?.['colors.light.accent']).toBe('#1F4E7A')
    expect(within(panel).getByText(/Text on it: white in Light, near-black in Dark/)).toBeTruthy()
    /* This blue is hard to see on Dark, so Dark starts on the lighter suggestion. */
    const dark = within(panel).getByRole('group', { name: 'Use this in Dark too?' })
    expect((within(dark).getByRole('radio', { name: /^Lighter for Dark/ }) as HTMLInputElement).checked).toBe(true)
    expect(within(dark).getByRole('radio', { name: /^Same color #1F4E7A · hard to see on Dark/ })).toBeTruthy()
    await user.click(within(dark).getByRole('radio', { name: /^Same color/ }))
    expect(getSnapshot().brand).toEqual({ 'colors.light.accent': '#1F4E7A', 'colors.dark.accent': '#1F4E7A' })
    /* A light brand reads on Dark as it is: no question, the same color. */
    await user.click(within(brand).getByRole('radio', { name: 'Neutral, DIYA’s default' }))
    const field = within(panel).getByRole('textbox', { name: 'Brand hex' })
    await user.clear(field)
    await user.type(field, '#E0A458')
    expect(getSnapshot().brand).toEqual({ 'colors.light.accent': '#E0A458', 'colors.dark.accent': '#E0A458' })
    expect(within(panel).queryByRole('group', { name: 'Use this in Dark too?' })).toBeNull()
    expect(within(panel).getByText(/Near-black text on it/)).toBeTruthy()
    await user.click(within(brand).getByRole('radio', { name: 'Neutral, DIYA’s default' }))
    expect(getSnapshot().brand).toBeNull()
    expect(within(panel).getByRole('status').textContent).toBe('Brand back to Neutral, DIYA’s default.')
  })

  it('offers Undo after resetting the brand', async () => {
    viewport()
    setBrandValue('font', 'lora')
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customized' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    await user.click(within(panel).getByRole('button', { name: 'Reset brand' }))
    expect(getSnapshot().brand).toBeNull()
    await user.click(within(panel).getByRole('button', { name: 'Undo' }))
    expect(getSnapshot().brand).toEqual({ font: 'lora' })
  })

  it('lists the pairs that need fixing, with a way to fix each, and keeps Get theme open for business', async () => {
    viewport()
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    const field = within(panel).getByRole('textbox', { name: 'Text' })
    await user.clear(field)
    await user.type(field, '#EEEEEE')
    const getTheme = within(panel).getByRole('button', { name: 'Get theme' }) as HTMLButtonElement
    expect(getTheme.disabled).toBe(false)
    expect(document.getElementById(getTheme.getAttribute('aria-describedby')!)?.textContent).toMatch(/color pairs? above to get your theme\./)
    await user.click(within(panel).getAllByRole('button', { name: /^Adjust Text/ })[0])
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole('textbox', { name: 'Text' })))
  })
})

describe('reset and focus', () => {
  it('Undo after resetting an item restores its own settings exactly', async () => {
    viewport()
    setItemOption('button', 'shape', 'rounded')
    setItemValue('button', 'corners', 4)
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customized' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    await user.click(within(panel).getByRole('button', { name: 'Reset Button' }))
    expect(getSnapshot().items.button).toBeUndefined()
    await user.click(within(panel).getByRole('button', { name: 'Undo' }))
    expect(getSnapshot().items.button).toEqual({ overrides: { corners: 4 }, options: { shape: 'rounded' } })
  })

  it('returns focus to the control after Use default on Elevation and Glass', async () => {
    viewport()
    setBrandValue('elevation', 'lifted')
    setBrandValue('translucent', true)
    const user = userEvent.setup()
    render(<Preview />)
    await user.click(screen.getByRole('button', { name: 'Customized' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    await user.click(within(panel).getByRole('button', { name: 'Use default for Elevation' }))
    const elevation = within(panel).getByRole('group', { name: 'Elevation' })
    await waitFor(() => expect(document.activeElement).toBe(within(elevation).getByRole('radio', { name: 'Soft' })))
    await user.click(within(panel).getByRole('button', { name: 'Use default for Glass' }))
    await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole('switch', { name: 'Glass' })))
    expect(getSnapshot().brand).toBeNull()
  })

  it('edits the brand only, and names Button’s own settings plainly', async () => {
    viewport()
    setItemValue('button', 'colors.light.accent', '#1F4E7A')
    const user = userEvent.setup()
    render(<Preview />)
    /* Item colours saved before 1.0 stay stored but don't apply or mark the item. */
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    const panel = screen.getByRole('complementary', { name: 'Customize Your brand' })
    expect(within(panel).queryByRole('radio', { name: 'Button only' })).toBeNull()
    expect((within(panel).getByRole('textbox', { name: 'Brand hex' }) as HTMLInputElement).value).toBe('#262626')
    expect(within(panel).getByRole('heading', { name: 'Button’s own settings' })).toBeTruthy()
    expect(panel.textContent).not.toMatch(/Just for|Translucent|download/i)
    expect(within(panel).getByText(/Choose Rounded under Button’s own settings/)).toBeTruthy()
    await user.click(within(panel).getByRole('switch', { name: 'Glass' }))
    expect(within(panel).getByText((_, el) => el?.classList.contains('customize-switch-hint') === true && el.textContent === 'Your theme turns on glass.')).toBeTruthy()
    expect(getSnapshot().brand).toEqual({ translucent: true })
  })
})
