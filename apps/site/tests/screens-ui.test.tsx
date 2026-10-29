import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactNode } from 'react'
import { AppearanceProvider, useAppearance } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { SETUP_COPIED_KEY } from '../components/GetCodeDrawer'
import { ScreensLibrary } from '../components/screens/ScreensLibrary'
import { builtWith, namedImports, readScreenSource } from '../components/screens/screen-source'
import { CATEGORIES, screenById, screens, type ScreenEntry } from '../components/screens/screens-data'
import { resetStoreForTests } from '../lib/customize/store'
import { smallFontSizes } from './screens-rules'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

const ALL = screens.map((entry) => entry.id)

/* The page column (the sidebar's group headings sit in the same main). */
const page = () => document.querySelector<HTMLElement>('.component-document')!

beforeEach(() => {
  // The preview frame is a real page; the test DOM doesn't load it.
  ;(window as unknown as { happyDOM?: { settings: { disableIframePageLoading: boolean } } }).happyDOM!.settings.disableIframePageLoading = true
  window.localStorage.clear()
  resetStoreForTests()
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
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

let appearance: ReturnType<typeof useAppearance> | null = null
function Grab() {
  appearance = useAppearance()
  return null
}

function Shell({ listed = ALL, children }: { listed?: readonly string[]; children: ReactNode }) {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      <Grab />
      <CatalogSearchProvider screens={listed}>
        <CatalogProvider>{children}</CatalogProvider>
      </CatalogSearchProvider>
    </AppearanceProvider>
  )
}

function renderScreen(entry: ScreenEntry) {
  const source = entry.status === 'poster' ? null : readScreenSource(entry.id)
  return render(
    <Shell>
      <ScreensLibrary screen={entry} source={source} builtWith={source ? builtWith(source) : []} />
    </Shell>
  )
}

describe('the Screens gallery', () => {
  it('shows every listed screen by category, posters last in theirs, and the request section', () => {
    render(
      <Shell>
        <ScreensLibrary screen={null} />
      </Shell>
    )
    const main = page()
    expect(within(main).getByRole('heading', { level: 2 }).textContent).toBe('Whole pages, ready to paste')
    expect(within(main).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([...CATEGORIES, 'Don’t see your screen?'])
    for (const category of CATEGORIES) {
      const section = within(main).getByRole('region', { name: category })
      const names = within(section).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)
      const entries = screens.filter((entry) => entry.category === category)
      expect(names).toEqual([...entries.filter((entry) => entry.status !== 'poster'), ...entries.filter((entry) => entry.status === 'poster')].map((entry) => entry.name))
    }
    const signIn = within(main).getByRole('link', { name: 'Sign in' })
    expect(signIn.getAttribute('href')).toBe('/explore?area=screens&screen=sign-in')
    expect(Array.from(signIn.closest('article')!.querySelectorAll('img')).map((image) => image.getAttribute('src'))).toEqual([
      '/screens/thumbs/sign-in-light.jpg',
      '/screens/thumbs/sign-in-dark.jpg',
    ])
    // Any screen still being built shows a quiet tile, no thumbnail (none are left at launch).
    for (const entry of screens.filter((item) => item.status === 'building')) {
      const building = within(main).getByRole('link', { name: entry.name }).closest('article')!
      expect(building.textContent, entry.id).toContain('In progress')
      expect(building.querySelector('img'), entry.id).toBeNull()
    }

    const board = within(main).getByRole('link', { name: 'Board' }).closest('article')!
    expect(board.textContent).toContain('Coming soon')
    expect(board.textContent).toContain('Waiting on drag and drop.')
    expect(within(board).getByRole('link', { name: 'Want this one?' }).getAttribute('href')).toBe('/explore?area=screens&want=board#request')
    const images = Array.from(board.querySelectorAll('img'))
    expect(images.map((image) => [image.getAttribute('src'), image.getAttribute('alt')])).toEqual([
      ['/screens/thumbs/board-light.jpg', ''],
      ['/screens/thumbs/board-dark.jpg', ''],
    ])
    expect(document.getElementById('request')?.textContent).toContain('Don’t see your screen?')
    expect(document.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('leaves out screens still being built when the build doesn’t list them', () => {
    render(
      <Shell listed={screens.filter((entry) => entry.status !== 'building').map((entry) => entry.id)}>
        <ScreensLibrary screen={null} />
      </Shell>
    )
    const main = page()
    expect(within(main).queryByText('In progress')).toBeNull()
    for (const entry of screens.filter((item) => item.status === 'building'))
      expect(within(main).queryByRole('link', { name: entry.name }), entry.id).toBeNull()
    expect(within(main).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)).toEqual(
      screens.filter((entry) => entry.status !== 'building').map((entry) => entry.name)
    )
    expect(within(main).getByRole('link', { name: 'Sign in' })).toBeTruthy()
  })
})

describe('one screen', () => {
  it('previews the screen in a real-viewport frame, with Desktop and Phone, Try this and Built with', async () => {
    const user = userEvent.setup()
    renderScreen(screenById('dashboard')!)
    const main = page()
    expect(within(main).getByRole('heading', { level: 2 }).textContent).toBe('Analytics dashboard')
    expect(within(main).getByRole('link', { name: 'All screens' }).getAttribute('href')).toBe('/explore?area=screens')
    const open = within(main).getByRole('link', { name: /Open full page/ })
    expect(open.getAttribute('href')).toBe('/screens-frame?screen=dashboard&theme=light&glass=0')
    expect(open.getAttribute('target')).toBe('_blank')
    const frame = main.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe('/screens-frame?screen=dashboard&theme=light&glass=0')
    expect(frame.getAttribute('aria-label')).toBe('Analytics dashboard, live preview at 1440 by 900')
    expect(frame.getAttribute('width')).toBe('1440')
    await user.click(within(main).getByRole('radio', { name: 'Phone' }))
    expect(frame.getAttribute('width')).toBe('390')
    expect(frame.getAttribute('height')).toBe('844')
    expect(main.querySelector('iframe')).toBe(frame)
    expect(within(main).getByRole('region', { name: 'Try this' }).textContent).toContain('Change the date range')
    const built = within(main).getByRole('region', { name: 'Built with' })
    expect(within(built).getByRole('link', { name: 'Content State' }).getAttribute('href')).toBe('/explore?pattern=empty-state')
    expect(document.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('follows the site’s Appearance by message, without reloading the frame', () => {
    renderScreen(screenById('sign-in')!)
    const frame = document.querySelector('iframe')!
    const post = vi.fn()
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: { postMessage: post } })
    act(() => appearance!.changeTheme('dark'))
    expect(post).toHaveBeenLastCalledWith({ source: 'diya-screens', type: 'appearance', theme: 'dark', glass: false }, window.location.origin)
    act(() => appearance!.changeGlass(true))
    expect(post).toHaveBeenLastCalledWith({ source: 'diya-screens', type: 'appearance', theme: 'dark', glass: true }, window.location.origin)
    expect(frame.getAttribute('src')).toBe('/screens-frame?screen=sign-in&theme=light&glass=0')
  })

  it('Get code installs lucide-react (and echarts for charts), folds the provider once copied, and gives the whole file', async () => {
    window.localStorage.setItem(SETUP_COPIED_KEY, '1')
    const user = userEvent.setup()
    renderScreen(screenById('dashboard')!)
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    const drawer = await screen.findByRole('dialog', { name: 'Get code' })
    expect(within(drawer).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)).toEqual([
      'Step 1: Install',
      'Step 2: Add the styles and provider',
      'Step 3: Save this file',
    ])
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('npm install @idyeah/diya lucide-react echarts@6')
    expect(within(drawer).queryByRole('textbox', { name: 'Styles and provider' })).toBeNull()
    await user.click(within(drawer).getByRole('button', { name: 'Show the styles and provider' }))
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' }).textContent).toContain('<DiyaProvider theme="light">')
    expect(drawer.textContent).toContain('app/dashboard/page.tsx')
    expect(drawer.textContent).toContain('src/Dashboard.tsx')
    expect(within(drawer).getByRole('textbox', { name: 'Analytics dashboard screen file' }).textContent).toBe(
      readFileSync(join(process.cwd(), 'screens/dashboard.tsx'), 'utf8')
    )
    expect(within(drawer).getByRole('button', { name: 'Download Dashboard.tsx' })).toBeTruthy()
    expect(document.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('installs without echarts when the screen has no charts', async () => {
    const user = userEvent.setup()
    renderScreen(screenById('sign-in')!)
    await user.click(screen.getByRole('button', { name: 'Get code' }))
    const drawer = await screen.findByRole('dialog', { name: 'Get code' })
    expect(within(drawer).getByRole('textbox', { name: 'Install command' }).textContent).toBe('npm install @idyeah/diya lucide-react')
    expect(within(drawer).getByRole('textbox', { name: 'Styles and provider' })).toBeTruthy()
  })

  it('shows a poster with what it waits on and the request link, and no code', () => {
    renderScreen(screenById('board')!)
    const main = page()
    expect(within(main).getByRole('heading', { level: 2 }).textContent).toBe('Board')
    expect(main.textContent).toContain('Coming soon')
    expect(within(main).getByRole('heading', { name: 'Waiting on drag and drop', level: 3 })).toBeTruthy()
    expect(within(main).getByRole('link', { name: 'Want this one? Tell us' }).getAttribute('href')).toBe('/explore?area=screens&want=board#request')
    expect(within(main).queryByRole('button', { name: 'Get code' })).toBeNull()
    expect(within(main).queryByRole('link', { name: /Open full page/ })).toBeNull()
    expect(main.querySelector('iframe')!.getAttribute('src')).toBe('/screens-frame?screen=board&theme=light&glass=0&poster=1')
  })
})

describe('Built with', () => {
  it('reads the file’s DIYA imports and links each one’s catalog page, in catalog order', () => {
    const source = "import { Stack, Button, type CardProps, TextInput as Field, Toast } from '@idyeah/diya'\nimport { DataViz } from '@idyeah/diya/charts'\nimport { Mail } from 'lucide-react'"
    expect(namedImports(source, '@idyeah/diya')).toEqual(['Stack', 'Button', 'TextInput', 'Toast'])
    expect(builtWith(source)).toEqual([
      { id: 'button', title: 'Button', href: '/explore?area=components&component=button' },
      { id: 'text-input', title: 'Text Input', href: '/explore?area=components&component=text-input' },
      { id: 'data-viz', title: 'Data Viz', href: '/explore?pattern=data-viz' },
    ])
    expect(readScreenSource('../package')).toBeNull()
    expect(readScreenSource('missing-screen')).toBeNull()
  })
})

describe('Screens CSS', () => {
  it('has no text under 13px', () => {
    const css = readFileSync(join(process.cwd(), 'components/screens/screens.css'), 'utf8')
    expect(smallFontSizes(css)).toEqual([])
    const frame = readFileSync(join(process.cwd(), 'screens-frame/src/index.css'), 'utf8')
    expect(smallFontSizes(frame)).toEqual([])
  })
})
