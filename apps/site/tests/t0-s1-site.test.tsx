import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AppearanceProvider, useAppearance } from '../app/Appearance'
import { AtomicSidebar } from '../components/AtomicSidebar'
import { PreviewOptions } from '../components/PreviewControls'
import { SYSTEM_THEME_SCRIPT } from '../components/site/system-theme'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

describe('the phone catalog sheet', () => {
  it('opens the full list as a named modal dialog, and Escape returns focus to its key', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <AtomicSidebar current="button" />
      </DiyaProvider>
    )
    const key = screen.getByRole('button', { name: 'All components' })
    expect(key.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(key)
    const sheet = screen.getByRole('dialog', { name: 'Components' })
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(within(within(sheet).getByRole('navigation', { name: 'Choose a component' })).getAllByRole('link')).toHaveLength(29)
    expect(document.activeElement).toBe(within(sheet).getByRole('searchbox', { name: 'Search components' }))
    expect(document.documentElement.dataset.catalogSheet).toBe('open')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(key)
    expect(document.documentElement.dataset.catalogSheet).toBeUndefined()
  })

  it('closes from its Close key and when an item is chosen', async () => {
    const user = userEvent.setup()
    render(
      <DiyaProvider>
        <AtomicSidebar current="button" />
      </DiyaProvider>
    )
    await user.click(screen.getByRole('button', { name: 'All components' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'All components' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Switch' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('playground options', () => {
  it('are DIYA checkboxes in a fieldset named by its caption, one change per click', async () => {
    const user = userEvent.setup()
    const changes: [string, boolean][] = []
    render(
      <DiyaProvider>
        <PreviewOptions
          label="Icon"
          items={[
            { label: 'Leading', checked: true, onChange: (value) => changes.push(['Leading', value]) },
            { label: 'Trailing', checked: false, onChange: (value) => changes.push(['Trailing', value]), disabled: true },
          ]}
        />
      </DiyaProvider>
    )
    const group = screen.getByRole('group', { name: 'Icon' })
    expect(group.classList.contains('diya-choice')).toBe(true)
    expect((within(group).getByRole('checkbox', { name: 'Trailing' }) as HTMLInputElement).disabled).toBe(true)
    await user.click(within(group).getByRole('checkbox', { name: 'Leading' }))
    expect(changes).toEqual([['Leading', false]])
  })
})

describe('first visit', () => {
  afterEach(() => {
    delete document.documentElement.dataset.themeSource
    delete document.documentElement.dataset.theme
    document.cookie = 'diya-theme=; Max-Age=0; Path=/'
  })

  function mockScheme(light: boolean) {
    const listeners = new Set<() => void>()
    const query = { matches: light, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }
    vi.spyOn(window, 'matchMedia').mockImplementation(() => query as unknown as MediaQueryList)
    return { set: (value: boolean) => { query.matches = value; listeners.forEach((fn) => fn()) } }
  }

  function Probe() {
    const { theme, followsSystem, changeTheme } = useAppearance()
    return <button onClick={() => changeTheme('dark')}>{`${theme} ${followsSystem}`}</button>
  }

  it('follows the light or dark setting until a choice is saved', async () => {
    const scheme = mockScheme(true)
    document.documentElement.dataset.theme = 'dark'
    new Function(SYSTEM_THEME_SCRIPT)()
    expect(document.documentElement.dataset.themeSource).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')
    render(
      <AppearanceProvider initialTheme="dark" initialGlass={false}>
        <Probe />
      </AppearanceProvider>
    )
    expect(screen.getByRole('button').textContent).toBe('light true')
    act(() => scheme.set(false))
    expect(screen.getByRole('button').textContent).toBe('dark true')
    expect(document.documentElement.dataset.theme).toBe('dark')
    await userEvent.setup().click(screen.getByRole('button'))
    expect(screen.getByRole('button').textContent).toBe('dark false')
    expect(document.documentElement.dataset.themeSource).toBeUndefined()
    expect(document.cookie).toContain('diya-theme=dark')
    act(() => scheme.set(true))
    expect(screen.getByRole('button').textContent).toBe('dark false')
  })

  it('leaves a saved choice alone', () => {
    mockScheme(true)
    document.cookie = 'diya-theme=dark; Path=/'
    document.documentElement.dataset.theme = 'dark'
    new Function(SYSTEM_THEME_SCRIPT)()
    expect(document.documentElement.dataset.themeSource).toBeUndefined()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
