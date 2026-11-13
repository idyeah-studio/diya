import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState, type ComponentProps, type ComponentType, type ReactNode } from 'react'
import { DiyaProvider, toast } from '@idyeah/diya'
import { AppearanceProvider, useAppearance } from '../app/Appearance'
import { CatalogProvider } from '../components/CatalogProvider'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { SETUP_COPIED_KEY } from '../components/GetCodeDrawer'
import { ScreensLibrary } from '../components/screens/ScreensLibrary'
import { PHONE_MAX_HEIGHT, phoneHeight } from '../components/screens/ScreenStage'
import { builtWith, namedImports, readScreenSource } from '../components/screens/screen-source'
import { CATEGORIES, screenById, screens, type ScreenEntry } from '../components/screens/screens-data'
import { resetStoreForTests } from '../lib/customize/store'
import { smallFontSizes } from './screens-rules'
import ActivityScreen from '../screens/activity'
import AgendaScreen from '../screens/agenda'
import AiScreen from '../screens/ai'
import ApiKeysScreen from '../screens/api-keys'
import BillingScreen from '../screens/billing'
import BookScreen from '../screens/book'
import ChangelogScreen from '../screens/changelog'
import DashboardScreen from '../screens/dashboard'
import FileManagerScreen from '../screens/file-manager'
import GettingStartedScreen from '../screens/getting-started'
import InboxScreen from '../screens/inbox'
import InvoiceScreen from '../screens/invoice'
import PricingScreen from '../screens/pricing'
import ProductScreen from '../screens/product'
import ProfileScreen from '../screens/profile'
import RecordDetailScreen from '../screens/record-detail'
import ResourceTableScreen from '../screens/resource-table'
import SettingsScreen from '../screens/settings'
import TaskListScreen from '../screens/task-list'
import TeamScreen from '../screens/team'
import WaitlistScreen from '../screens/waitlist'

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
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe('Whole pages, ready to paste')
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
    // Closed unless the page says the form is open: the heading stays, and after
    // the launch (the default) it says requests are paused, never "open with the launch".
    expect(document.getElementById('request')?.textContent).toContain('Requests are paused right now. Write to diya@idyeah.studio instead.')
    expect(document.getElementById('request')?.textContent).not.toContain('with the launch')
    expect(document.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('ends with the open request form, started from the poster a “Want this one?” link named', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ open: true, formToken: '1.a' }))
    render(
      <Shell>
        <ScreensLibrary screen={null} requestsOpen want="board" />
      </Shell>
    )
    await act(async () => {})
    const request = document.getElementById('request')!
    expect((within(request).getByRole('textbox', { name: 'What screen do you need?' }) as HTMLTextAreaElement).value).toBe('I’d like the Board screen.')
    expect(within(request).getByRole('button', { name: 'Send request' })).toBeTruthy()
    expect(within(page()).getAllByRole('heading', { level: 3 }).at(-1)!.textContent).toBe('Don’t see your screen?')
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
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe('Analytics dashboard')
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
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe('Board')
    expect(main.textContent).toContain('Coming soon')
    expect(within(main).getByRole('heading', { name: 'Waiting on drag and drop', level: 3 })).toBeTruthy()
    expect(within(main).getByRole('link', { name: 'Want this one? Tell me' }).getAttribute('href')).toBe('/explore?area=screens&want=board#request')
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

describe('the phone preview on a wide stage', () => {
  it('stays short enough to fit the window once the stage is in view, and never tiny', () => {
    expect(PHONE_MAX_HEIGHT).toBe(640)
    expect(phoneHeight(900)).toBe(640)
    expect(phoneHeight(1200)).toBe(640)
    expect(phoneHeight(768)).toBe(508)
    expect(phoneHeight(560)).toBe(420)
    // Before the window is measured (server render), the largest.
    expect(phoneHeight(0)).toBe(640)
  })
})

describe('Screens CSS', () => {
  it('has no text under 13px', () => {
    const css = readFileSync(join(process.cwd(), 'components/screens/screens.css'), 'utf8')
    expect(smallFontSizes(css)).toEqual([])
    const frame = readFileSync(join(process.cwd(), 'screens-frame/src/index.css'), 'utf8')
    expect(smallFontSizes(frame)).toEqual([])
    const request = readFileSync(join(process.cwd(), 'components/screens/ScreenRequest.css'), 'utf8')
    expect(smallFontSizes(request)).toEqual([])
  })

  it('shows the gallery as two columns of named pictures on a phone', () => {
    const css = readFileSync(join(process.cwd(), 'components/screens/screens.css'), 'utf8')
    const phone = css.slice(css.indexOf('@media (max-width: 640px)'))
    expect(phone).toMatch(/\.screens-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
    expect(phone).toMatch(/\.screens-card-text p \{ display: none; \}/)
  })
})

/*
 * E6: the 21 Screens that kept their own toast state call toast() instead. Each
 * one is rendered the way the preview frame renders it (StrictMode, one
 * DiyaProvider), driven to its toast, and the toast is looked for in the page's
 * one stack: exactly once, so a toast fired from an effect (twice under
 * StrictMode) would fail here.
 */
type User = ReturnType<typeof userEvent.setup>
type Raise = { id: string; Screen: ComponentType; title: string | RegExp; raise: (user: User) => Promise<void>; action?: string }

const LONG = { timeout: 4000 }
const openDialog = () => document.querySelector<HTMLDialogElement>('dialog[open]')!
/** Waits for a button that's ready to press: there, enabled and not busy. */
async function ready(name: string | RegExp, within: HTMLElement = document.body) {
  let found: HTMLElement | undefined
  await waitFor(() => {
    found = screen.getAllByRole('button', { name }).find((button) => within.contains(button) && !(button as HTMLButtonElement).disabled && button.getAttribute('aria-disabled') !== 'true' && button.getAttribute('aria-busy') !== 'true')
    expect(found).toBeTruthy()
  }, LONG)
  return found!
}
const confirmIn = async (user: User, name: string | RegExp) => user.click(await ready(name, openDialog()))

const RAISES: Raise[] = [
  { id: 'activity', Screen: ActivityScreen, title: 'Audit log exported', raise: async (user) => {
    await user.click(screen.getByRole('tab', { name: 'Audit log' }))
    await user.click(await ready(/Export CSV/))
  } },
  { id: 'agenda', Screen: AgendaScreen, title: 'Booking canceled', raise: async (user) => {
    await waitFor(() => expect(document.querySelector('.agenda-row[data-status="confirmed"]')).toBeTruthy())
    await user.click(document.querySelector<HTMLElement>('.agenda-row[data-status="confirmed"]')!)
    await user.click(await ready('Cancel booking'))
    await user.click(await ready('Cancel booking'))
  } },
  { id: 'ai', Screen: AiScreen, title: 'Chat deleted', raise: async (user) => {
    await user.click(screen.getAllByText('A toast for Ana’s wedding')[0])
    await user.click(screen.getByRole('button', { name: 'Chat options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await confirmIn(user, 'Delete chat')
  } },
  { id: 'api-keys', Screen: ApiKeysScreen, title: /^Test event (delivered|failed)$/, raise: async (user) => {
    await user.click(screen.getByRole('tab', { name: /Webhooks/ }))
    await user.click(await ready(/Send test event/))
  } },
  { id: 'billing', Screen: BillingScreen, title: 'Your plan is canceled', raise: async (user) => {
    await user.click(await ready('Cancel plan'))
    await confirmIn(user, 'Cancel plan')
  } },
  { id: 'book', Screen: BookScreen, title: 'Downloaded', raise: async (user) => {
    await waitFor(() => expect(document.querySelectorAll('.book-slot').length).toBeGreaterThan(1), LONG)
    await user.click([...document.querySelectorAll<HTMLElement>('.book-slot')].at(-1)!)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana Lima')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await user.click(await ready('Book it'))
    await user.click(await ready(/Add to calendar/))
  } },
  { id: 'changelog', Screen: ChangelogScreen, title: 'Idea sent', raise: async (user) => {
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    await user.click(await ready('Suggest an idea'))
    await user.type(within(openDialog()).getByRole('textbox', { name: 'Your idea' }), 'Dark mode for the mobile app')
    await confirmIn(user, 'Send idea')
  } },
  { id: 'dashboard', Screen: DashboardScreen, title: 'Export on its way', raise: async (user) => {
    await user.click(await ready(/^Export$/))
  } },
  { id: 'file-manager', Screen: FileManagerScreen, title: 'Created Receipts', raise: async (user) => {
    await user.click(await ready(/New folder/))
    const name = within(openDialog()).getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Receipts')
    await confirmIn(user, 'Create folder')
  } },
  { id: 'getting-started', Screen: GettingStartedScreen, title: 'First doc, written', raise: async (user) => {
    await user.click(await ready(/^Write your first doc/))
    await user.click(await ready('Open the brief', openDialog()))
  } },
  { id: 'inbox', Screen: InboxScreen, title: /^Marked \S+’s conversation as unread$/, raise: async (user) => {
    await user.click(await ready('Mark unread'))
  } },
  { id: 'invoice', Screen: InvoiceScreen, title: 'INV-2047 is paid', raise: async (user) => {
    await user.click(await ready(/Mark as paid/))
    await confirmIn(user, 'Mark as paid')
  } },
  { id: 'pricing', Screen: PricingScreen, title: 'Message sent', raise: async (user) => {
    await user.click(screen.getAllByRole('button', { name: 'Talk to sales' })[0])
    const dialog = openDialog()
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Ana Lima')
    await user.type(within(dialog).getByRole('textbox', { name: 'Work email' }), 'ana@example.com')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Company size' }), '50-100')
    await confirmIn(user, 'Send')
  } },
  { id: 'product', Screen: ProductScreen, title: 'Added to your bag', action: 'View bag', raise: async (user) => {
    await user.click(await ready('Add to bag'))
  } },
  { id: 'profile', Screen: ProfileScreen, title: 'Profile saved', raise: async (user) => {
    await user.click(await ready(/Edit profile/))
    const name = within(openDialog()).getByRole('textbox', { name: 'Name' })
    await user.type(name, ' Jr.')
    await user.click(await ready('Save changes', openDialog()))
  } },
  { id: 'record-detail', Screen: RecordDetailScreen, title: 'Customer ID copied', raise: async (user) => {
    await user.click(screen.getByRole('button', { name: /^More actions for / }))
    await user.click(await screen.findByRole('menuitem', { name: 'Copy customer ID' }))
  } },
  { id: 'resource-table', Screen: ResourceTableScreen, title: /^Exported 1 order$/, raise: async (user) => {
    await waitFor(() => expect(screen.getAllByRole('checkbox', { name: /^Select Order / }).length).toBeGreaterThan(0), LONG)
    await user.click(screen.getAllByRole('checkbox', { name: /^Select Order / })[0])
    await user.click(await ready('Export'))
  } },
  { id: 'settings', Screen: SettingsScreen, title: 'Profile saved', raise: async (user) => {
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), ' Jr.')
    await user.click(await ready('Save changes'))
  } },
  { id: 'task-list', Screen: TaskListScreen, title: /” is done$/, action: 'Undo', raise: async (user) => {
    await user.click(screen.getAllByRole('checkbox').find((box) => !(box as HTMLInputElement).checked)!)
  } },
  { id: 'team', Screen: TeamScreen, title: 'Invite sent again', raise: async (user) => {
    await user.click(screen.getAllByRole('button', { name: /^Resend invite to / })[0])
  } },
  { id: 'waitlist', Screen: WaitlistScreen, title: 'Link copied', raise: async (user) => {
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ana@example.com')
    await user.click(await ready('Join the waitlist'))
    await user.click(await ready(/Copy link/))
  } },
]

describe('each toast Screen raises its toast', () => {
  beforeEach(() => {
    // A fixed weekday, so every screen's sample dates and openings are the same on each run.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-12T17:00:00Z') })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sample')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    // As in browsers, a dialog's close event comes a task after close(), so StrictMode's
    // rehearsal unmount (close, then showModal again) doesn't read as the person closing it.
    vi.spyOn(Object.getPrototypeOf(document.createElement('dialog')), 'close').mockImplementation(function (this: HTMLDialogElement) {
      if (!this.open) return
      this.open = false
      setTimeout(() => this.dispatchEvent(new Event('close')))
    })
  })
  afterEach(async () => {
    act(() => toast.dismiss())
    await act(async () => {})
    vi.useRealTimers()
  })

  it('renders like the preview frame: StrictMode around one DiyaProvider', () => {
    // A toast fired from an effect would show twice in development under StrictMode, so the
    // frame keeps StrictMode and every case below renders under it.
    const frame = readFileSync(join(process.cwd(), 'screens-frame/src/main.tsx'), 'utf8')
    expect(frame).toMatch(/render\(\s*<StrictMode>\s*<Frame \/>\s*<\/StrictMode>/)
    expect(frame).toContain('<DiyaProvider theme={theme} glass={glass} className="screens-frame">')
  })

  it('would catch a Screen that toasts from an effect: under StrictMode it shows twice', async () => {
    function Saved() {
      useEffect(() => {
        toast({ title: 'Synced' })
      }, [])
      return null
    }
    render(<DiyaProvider theme="light"><Saved /></DiyaProvider>, { reactStrictMode: true })
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' })
    await waitFor(() => expect(within(region).getAllByText('Synced')).toHaveLength(2))
  })

  it('covers every Screen that imports toast', () => {
    const using = screens.filter((entry) => entry.status !== 'poster' && /\btoast\b/.test(namedImports(readScreenSource(entry.id) ?? '', '@idyeah/diya').join(' ')))
    expect(RAISES.map((entry) => entry.id)).toEqual(using.map((entry) => entry.id).sort())
    expect(RAISES).toHaveLength(21)
  })

  it.each(RAISES.map((entry) => [entry.id, entry] as const))('%s', async (_, { Screen, title, raise, action }) => {
    const user = userEvent.setup()
    render(<DiyaProvider theme="light"><Screen /></DiyaProvider>, { reactStrictMode: true })
    await act(async () => {})
    expect(screen.queryByRole('region', { name: 'Notifications (F8)' }), 'nothing toasts on load').toBeNull()
    await raise(user)
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' }, LONG)
    await waitFor(() => expect(within(region).getAllByText(title)).toHaveLength(1), LONG)
    // Raised with toast(), not a <Toast> element the screen renders.
    const shown = within(region).getByText(title)
    expect(shown.closest('.diya-toast')!.getAttribute('data-kind')).toBe('toast')
    // Every toast() toast has a close button named for it, and an action where the screen has one.
    expect(within(region).getByRole('button', { name: `Dismiss: ${shown.textContent}` })).toBeTruthy()
    if (action) expect(within(region).getByRole('button', { name: action })).toBeTruthy()
  }, 20_000)

  // UX-SITE-01: doing the same thing again updates its toast in place; it never stacks a twin.
  const exportHistory: Raise = { id: 'record-detail', Screen: RecordDetailScreen, title: 'Export on its way', raise: async (user) => {
    await user.click(screen.getByRole('button', { name: /^More actions for / }))
    await user.click(await screen.findByRole('menuitem', { name: 'Export history' }))
  } }
  it.each(['inbox', 'team', 'record-detail', 'activity', 'dashboard'])('%s: pressing again shows one toast, not two', async (id) => {
    const { Screen, title, raise } = id === 'record-detail' ? exportHistory : RAISES.find((entry) => entry.id === id)!
    const user = userEvent.setup()
    render(<DiyaProvider theme="light"><Screen /></DiyaProvider>, { reactStrictMode: true })
    await act(async () => {})
    await raise(user)
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' }, LONG)
    await waitFor(() => expect(within(region).getAllByText(title)).toHaveLength(1), LONG)
    await raise(user)
    // Let the second press finish its stubbed request and raise its toast.
    await act(() => new Promise((done) => setTimeout(done, 1500)))
    expect(within(screen.getByRole('region', { name: 'Notifications (F8)' })).getAllByText(title)).toHaveLength(1)
  }, 20_000)

  // VIS-SITE-01: agenda's Drawer stays open after its actions in 1.1, and its toast covered Rebook.
  it('agenda closes the booking Drawer before its toast, so the toast lands on the page', async () => {
    const user = userEvent.setup()
    const { raise, title } = RAISES.find((entry) => entry.id === 'agenda')!
    render(<DiyaProvider theme="light"><AgendaScreen /></DiyaProvider>, { reactStrictMode: true })
    await raise(user)
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' }, LONG)
    await waitFor(() => expect(within(region).getAllByText(title)).toHaveLength(1), LONG)
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect(region.closest('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rebook' })).toBeNull()
  })

  // SITE-FE-01: an action toast never times out, so task-list's Undo would follow the reader to every page.
  it('task-list’s Undo toast leaves with the Screen', async () => {
    const user = userEvent.setup()
    function App() {
      const [page, setPage] = useState<'tasks' | 'settings'>('tasks')
      return (
        <DiyaProvider theme="light">
          <button type="button" onClick={() => setPage('settings')}>Go to settings</button>
          {page === 'tasks' ? <TaskListScreen /> : <h1>Settings</h1>}
        </DiyaProvider>
      )
    }
    render(<App />, { reactStrictMode: true })
    await user.click(screen.getAllByRole('checkbox').find((box) => !(box as HTMLInputElement).checked)!)
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' })
    expect(within(region).getByRole('button', { name: 'Undo' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Go to settings' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Notifications (F8)' })).toBeNull(), LONG)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
  })

  it('task-list: Undo is the toast’s action, and puts the task back', async () => {
    const user = userEvent.setup()
    render(<DiyaProvider theme="light"><TaskListScreen /></DiyaProvider>, { reactStrictMode: true })
    const box = screen.getAllByRole('checkbox').find((item) => !(item as HTMLInputElement).checked) as HTMLInputElement
    const name = box.closest('label')!.textContent!.trim()
    await user.click(box)
    const region = await screen.findByRole('region', { name: 'Notifications (F8)' })
    within(region).getByText(`“${name}” is done`)
    await user.click(within(region).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Notifications (F8)' })).toBeNull(), LONG)
    expect((screen.getByRole('checkbox', { name }) as HTMLInputElement).checked).toBe(false)
    expect(screen.getByRole('status').textContent).toBe(`“${name}” is back in To do.`)
  })
})

// frontend.md step 11: the lone yes-or-no boxes on Sign in and Application are Checkboxes, not one-option groups.
describe('lone yes-or-no boxes are Checkboxes', () => {
  it.each([
    ['sign-in', 'Keep me signed in'],
    ['application', 'Keep my application on file for 12 months for other roles'],
  ])('%s: "%s"', async (id, label) => {
    const { default: Screen } = await import(`../screens/${id}.tsx`)
    render(<DiyaProvider theme="light"><Screen /></DiyaProvider>)
    await act(async () => {})
    const box = screen.getByRole('checkbox', { name: label }) as HTMLInputElement
    expect(box.className).toBe('diya-checkbox')
    expect(box.closest('fieldset')).toBeNull()
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(box.checked).toBe(true)
  })
})
