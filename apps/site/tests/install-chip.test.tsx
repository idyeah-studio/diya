import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { InstallChip } from '../components/site/InstallChip'
import {
  PACKAGE_MANAGER_KEY,
  installCommand,
  parsePackageManager,
  setPackageManager,
} from '../components/site/package-manager'

beforeEach(() => {
  window.localStorage.clear()
  setPackageManager('npm')
  window.localStorage.clear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
}

describe('install chip', () => {
  it('builds each manager’s command and reads either stored format', () => {
    expect(installCommand('npm')).toBe('npm install @idyeah/diya')
    expect(installCommand('pnpm')).toBe('pnpm add @idyeah/diya')
    expect(installCommand('yarn')).toBe('yarn add @idyeah/diya')
    expect(installCommand('bun')).toBe('bun add @idyeah/diya')
    expect(parsePackageManager('"bun"')).toBe('bun')
    expect(parsePackageManager('pip')).toBe('npm')
    expect(parsePackageManager(null)).toBe('npm')
  })

  it('shows the remembered package manager and remembers a new choice for every chip', () => {
    window.localStorage.setItem(PACKAGE_MANAGER_KEY, 'yarn')
    render(
      <>
        <InstallChip />
        <InstallChip variant="compact" />
      </>,
    )
    const buttons = screen.getAllByRole('button', { name: /^Copy install command/ })
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Copy install command: yarn add @idyeah/diya',
      'Copy install command: yarn add @idyeah/diya',
    ])
    fireEvent.change(screen.getByLabelText('Package manager'), { target: { value: 'bun' } })
    expect(window.localStorage.getItem(PACKAGE_MANAGER_KEY)).toBe('bun')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Copy install command: bun add @idyeah/diya',
      'Copy install command: bun add @idyeah/diya',
    ])
  })

  it('keeps working when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<InstallChip />)
    fireEvent.change(screen.getByLabelText('Package manager'), { target: { value: 'pnpm' } })
    expect(screen.getByRole('button', { name: 'Copy install command: pnpm add @idyeah/diya' })).toBeTruthy()
  })

  it('copies, says Copied for two seconds and announces it', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(() => Promise.resolve())
    stubClipboard(writeText)
    render(<InstallChip />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy install command: npm install @idyeah/diya' }))
    })
    expect(writeText).toHaveBeenCalledWith('npm install @idyeah/diya')
    expect(screen.getByText('Copied')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Install command copied.')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText('Copied')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
    vi.useRealTimers()
  })

  it('selects the full command and says how to copy it when the clipboard refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')))
    render(<InstallChip />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Copy install command/ }))
    })
    expect(screen.getByRole('status').textContent).toBe(
      'Copy didn’t work. The command is selected; press Command+C or Ctrl+C.',
    )
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(window.getSelection()?.toString().replace(/\s+/g, ' ').trim()).toBe('npm install @idyeah/diya')
  })
})

describe('one remembered package manager across the site', () => {
  it('a pick in Get code’s tabs updates the header and hero chips in the same tab, without a remount', async () => {
    const { PackageManagerTabs } = await import('../components/code/PackageManagerTabs')
    const { usePackageManagerChoice } = await import('../components/site/package-manager')
    function GetCodeTabs() {
      const [manager, setManager] = usePackageManagerChoice()
      return (
        <PackageManagerTabs value={manager} onChange={setManager}>
          <span />
        </PackageManagerTabs>
      )
    }
    render(
      <>
        <InstallChip variant="compact" />
        <InstallChip />
        <GetCodeTabs />
      </>,
    )
    const chips = screen.getAllByRole('button', { name: /^Copy install command/ })
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Copy install command: npm install @idyeah/diya',
      'Copy install command: npm install @idyeah/diya',
    ])
    fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }))
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Copy install command: pnpm add @idyeah/diya',
      'Copy install command: pnpm add @idyeah/diya',
    ])
    expect(screen.getByRole('tab', { name: 'pnpm' }).getAttribute('aria-selected')).toBe('true')
    // And back the other way: the hero's picker moves Get code's tab.
    fireEvent.change(screen.getByRole('combobox', { name: 'Package manager' }), { target: { value: 'bun' } })
    expect(screen.getByRole('tab', { name: 'bun' }).getAttribute('aria-selected')).toBe('true')
    expect(chips[0].getAttribute('aria-label')).toBe('Copy install command: bun add @idyeah/diya')
  })

  it('follows a choice made in another tab', () => {
    render(<InstallChip variant="compact" />)
    act(() => {
      window.localStorage.setItem(PACKAGE_MANAGER_KEY, 'yarn')
      window.dispatchEvent(new StorageEvent('storage', { key: PACKAGE_MANAGER_KEY, newValue: 'yarn' }))
    })
    expect(screen.getByRole('button', { name: 'Copy install command: yarn add @idyeah/diya' })).toBeTruthy()
  })
})
