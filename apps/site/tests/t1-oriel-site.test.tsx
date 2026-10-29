// Lane T1 Oriel on the site: the landing's Oriel band and hero, the
// Relight "This screen is real" line, the catalog's Oriel door, and the
// invented names in the Relight mock. All of it lives on launched or
// catalog pages; the countdown carries none of it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AppearanceProvider } from '../app/Appearance'
import { ConceptLanding } from '../components/ConceptLanding'
import { CreateChip, InstallLine } from '../components/landing/CreateChip'
import { createCommand } from '../components/site/package-manager'
import { OrielBand } from '../components/landing/OrielBand'
import { ProScreen } from '../components/landing/ProScreen'
import { OrielDoor } from '../components/oriel/OrielDoor'
import { ORIEL_SCREEN_FOR_PATTERN, ORIEL_SCREENS, ORIEL_URL } from '../components/oriel/links'
import { PACKAGE_MANAGER_KEY } from '../components/site/package-manager'
import { patternIds } from '../lib/catalog-route'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const MICROSOFT_SAMPLES = /Northwind|Fabrikam|Contoso|Woodgrove|Coho|Tailspin|Wingtip|Litware|Fourth Coffee|Alpine Ski|Adventure Works|Proseware|Lamna|Trey Research|Wide World|Humongous|Relecloud|Lucerne|Blue Yonder|A\. Datum/

function Wrap({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <DiyaProvider>{children}</DiyaProvider>
    </AppearanceProvider>
  )
}

beforeEach(() => {
  try {
    localStorage.removeItem(PACKAGE_MANAGER_KEY)
  } catch {}
})
afterEach(() => vi.restoreAllMocks())

describe('the Oriel band on the launched landing', () => {
  it('leads with the approved line and opens Oriel, its source and each screen', () => {
    render(<OrielBand />)
    const band = screen.getByRole('region', { name: 'Don’t take the catalog’s word for it. Here’s a whole app.' })
    expect(within(band).getByRole('link', { name: 'Open Oriel' }).getAttribute('href')).toBe(ORIEL_URL)
    expect(within(band).getByRole('link', { name: 'Read the source' }).getAttribute('href')).toBe(
      'https://github.com/idyeah-studio/diya/tree/main/examples/oriel',
    )
    const screens = within(within(band).getByRole('list', { name: 'Oriel’s screens' })).getAllByRole('link')
    expect(screens.map((link) => link.getAttribute('href'))).toEqual([
      `${ORIEL_URL}/`,
      `${ORIEL_URL}/invoices`,
      `${ORIEL_URL}/customers`,
      `${ORIEL_URL}/settings`,
    ])
    expect(band.textContent).not.toMatch(/colour/)
    expect(band.querySelectorAll('[title]')).toHaveLength(0)
  })
})

describe('the hero leads with create-diya', () => {
  it('copies npm create diya@latest, and offers the install line underneath', () => {
    render(
      <Wrap>
        <CreateChip />
        <InstallLine />
      </Wrap>,
    )
    expect(screen.getByRole('group', { name: 'Start a new app with DIYA' }).textContent).toContain('npm create diya@latest')
    screen.getByRole('button', { name: 'Copy command: npm create diya@latest' })
    expect(document.body.textContent).toContain('Adding it to an app you have?')
    screen.getByRole('button', { name: 'Copy install command: npm install @idyeah/diya' })
  })

  it('follows the remembered package manager', () => {
    localStorage.setItem(PACKAGE_MANAGER_KEY, 'pnpm')
    render(
      <Wrap>
        <CreateChip />
        <InstallLine />
      </Wrap>,
    )
    screen.getByRole('button', { name: 'Copy command: pnpm create diya' })
    screen.getByRole('button', { name: 'Copy install command: pnpm add @idyeah/diya' })
    expect(['npm', 'pnpm', 'yarn', 'bun'].map((pm) => createCommand(pm as 'npm'))).toEqual([
      'npm create diya@latest',
      'pnpm create diya',
      'yarn create diya',
      'bun create diya',
    ])
  })
})

describe('the catalog door to Oriel', () => {
  it('sits under each pattern Oriel uses and links to its screen', () => {
    const { container, unmount } = render(<OrielDoor path="/explore?area=patterns&pattern=table" />)
    const link = within(container).getByRole('link', { name: 'See it in a real screen: Oriel’s Invoices' })
    expect(link.getAttribute('href')).toBe(ORIEL_SCREENS.invoices.href)
    unmount()
    for (const pattern of Object.keys(ORIEL_SCREEN_FOR_PATTERN)) expect(patternIds as readonly string[]).toContain(pattern)
  })

  it('says nothing for components or for patterns Oriel doesn’t use', () => {
    for (const path of ['/explore?area=components&component=button', '/explore?area=patterns&pattern=wizard', '/explore?area=pro']) {
      const { container, unmount } = render(<OrielDoor path={path} />)
      expect(container.innerHTML).toBe('')
      unmount()
    }
  })
})

describe('the Relight mock', () => {
  it('uses Oriel’s invented customers, not Microsoft’s sample names', () => {
    const { container } = render(
      <Wrap>
        <ProScreen />
      </Wrap>,
    )
    expect(container.textContent).toContain('Ferro Bikes')
    expect(container.textContent).toContain('Saltmarsh Coffee')
    expect(container.textContent).not.toMatch(MICROSOFT_SAMPLES)
  })
})

describe('the countdown', () => {
  it('carries none of it', async () => {
    const { container } = render(
      <AppearanceProvider initialTheme="dark" initialGlass={false}>
        <ConceptLanding initialSeconds={120} />
      </AppearanceProvider>,
    )
    await act(async () => {})
    expect(container.textContent).not.toMatch(/Oriel|create diya|sketch to a screen|catalog’s word/)
  })
})
