import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { isValidElement, type ReactNode } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { ConceptLanding } from '../components/ConceptLanding'
import { LaunchedLanding } from '../components/landing/LaunchedLanding'
import { LaunchCountdown } from '../components/LaunchCountdown'
import { REFRESH_TIMEOUT_MS, ZERO_HOLD_MS } from '../components/ConceptLanding'
import { LaunchMoment } from '../components/landing/LaunchMoment'
import { LAUNCH_PENDING_SCRIPT, LAUNCH_SIGNAL_KEY, LAUNCH_SIGNAL_WINDOW_MS } from '../components/landing/launch-signal'
import { SiteHeader } from '../components/site/SiteHeader'
import { LAUNCH_AT } from '../lib/launch'

const refresh = vi.fn()
// next/dynamic needs the Next bundler; here the islands load directly.
vi.mock('../components/landing/LandingStyles', () => ({ LandingStyles: () => null }))
vi.mock('../components/site/SiteStyles', () => ({ SiteStyles: () => null }))
vi.mock('../components/landing/islands', async () => ({
  SiteProvider: (await import('../components/site/SiteProvider')).SiteProvider,
  SiteHeader: (await import('../components/site/SiteHeader')).SiteHeader,
  InstallChip: (await import('../components/site/InstallChip')).InstallChip,
  CreateChip: (await import('../components/landing/CreateChip')).CreateChip,
  InstallLine: (await import('../components/landing/CreateChip')).InstallLine,
  PartsSheet: (await import('../components/landing/PartsSheet')).PartsSheet,
  GlassCards: (await import('../components/landing/GlassBand')).GlassCards,
  ProScreen: (await import('../components/landing/ProScreen')).ProScreen,
  ProWaitlist: (await import('../components/waitlist/ProWaitlist')).ProWaitlist,
  LaunchMoment: (await import('../components/landing/LaunchMoment')).LaunchMoment,
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const BEFORE = '2026-11-06T23:59:30-08:00'
const AFTER = '2026-11-07T00:00:00-08:00'

function WithAppearance({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider initialTheme="dark" initialGlass={false}>
      {children}
    </AppearanceProvider>
  )
}

// The Relight form asks the waitlist API for its status; answer here instead of the network.
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ open: true, formToken: '123.abc' }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  refresh.mockReset()
})

describe('the time switch on the server', () => {
  it('serves the countdown before LAUNCH_AT and the launched landing from it', async () => {
    const { default: Home } = await import('../app/page')
    vi.stubEnv('DIYA_NOW', BEFORE)
    const before = await Home()
    expect(isValidElement(before) && before.type).toBe(ConceptLanding)
    expect((before.props as { initialSeconds: number }).initialSeconds).toBe(30)

    vi.stubEnv('DIYA_NOW', AFTER)
    const after = await Home()
    expect(isValidElement(after) && after.type).toBe(LaunchedLanding)
  })

  it('never lets DIYA_NOW move production', async () => {
    const { default: Home } = await import('../app/page')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('DIYA_NOW', AFTER)
    vi.spyOn(Date, 'now').mockReturnValue(LAUNCH_AT - 60_000)
    const page = await Home()
    expect(isValidElement(page) && page.type).toBe(ConceptLanding)
  })

  it('switches title, description and social card at the same moment, under one favicon', async () => {
    const { generateMetadata } = await import('../app/layout')
    vi.stubEnv('DIYA_NOW', BEFORE)
    const before = await generateMetadata()
    expect(before.title).toBe('DIYA — Components and patterns. In code.')
    expect(JSON.stringify(before.openGraph)).toContain('social-preview-v1.jpg')
    expect(before.icons).toEqual({
      icon: [
        { url: '/brand/diya-icon-v3.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/brand/diya-icon-v3-light-32.png', type: 'image/png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
        { url: '/brand/diya-icon-v3-dark-32.png', type: 'image/png', sizes: '32x32', media: '(prefers-color-scheme: dark)' },
      ],
      apple: { url: '/brand/diya-icon-v3-180.png', sizes: '180x180' },
    })

    vi.stubEnv('DIYA_NOW', AFTER)
    const after = await generateMetadata()
    expect(after.title).toBe('DIYA — React components and patterns, free under MIT')
    expect(after.description).toBe(
      '30 components, 13 patterns and 34 screens for React, with Light, Dark and Glass. Free, MIT, yours to own. npm install @idyeah/diya',
    )
    expect((after.openGraph as { title?: string }).title).toBe('DIYA — a library for your next app')
    const card = {
      url: '/social-preview-v7.jpg',
      type: 'image/jpeg',
      width: 1200,
      height: 630,
      alt: 'DIYA: a library for your next app. 40+ components and patterns, and 30+ screens, for React. Free, MIT, yours to own. npm install @idyeah/diya.',
    }
    expect((after.openGraph as { images?: unknown }).images).toEqual([card])
    expect((after.twitter as { images?: unknown }).images).toEqual([card])
    expect(JSON.stringify(after.openGraph)).not.toContain('Coming soon')
    expect(after.icons).toEqual(before.icons)
  })
})

describe('the countdown at zero', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ seconds: 0 }))))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function reachZero(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it('tells its parent once, when the visitor watched it reach zero', async () => {
    const onZero = vi.fn()
    render(<LaunchCountdown initialSeconds={2} onZero={onZero} />)
    await reachZero(2000)
    expect(onZero).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(onZero).toHaveBeenCalledTimes(1)
  })

  it('stays silent for a page that arrived at zero', () => {
    const onZero = vi.fn()
    render(<LaunchCountdown initialSeconds={0} onZero={onZero} />)
    expect(onZero).not.toHaveBeenCalled()
  })

  it('keeps “Coming soon” until then, with nothing new on the page', () => {
    render(<LaunchCountdown initialSeconds={90} />)
    expect(screen.getByText('Coming soon')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('swaps the heading for the launch line, then offers a reload if the page never arrives', () => {
    const { rerender } = render(<LaunchCountdown initialSeconds={0} phase="live" />)
    expect(screen.getByText('DIYA 1.0 is on npm. Happy Diwali.')).toBeTruthy()
    rerender(<LaunchCountdown initialSeconds={0} phase="failed" />)
    expect(screen.getByText('It’s live')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('DIYA has launched. Reload the page to see it.')
  })

  it('holds 600ms plus jitter, checks the server, marks the watched launch, then refreshes in place', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    render(
      <WithAppearance>
        <ConceptLanding initialSeconds={1} />
      </WithAppearance>,
    )
    await reachZero(1000)
    expect(screen.getByText('DIYA 1.0 is on npm. Happy Diwali.')).toBeTruthy()
    await reachZero(1399)
    expect(refresh).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY)).toBeNull()
    await reachZero(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(Number(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY))).toBe(Date.now())
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()
    // The refresh never replaced the page.
    await reachZero(REFRESH_TIMEOUT_MS)
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
  })

  for (const [failure, reply] of [
    ['a 5xx', () => Promise.resolve(new Response('', { status: 503 }))],
    ['the network', () => Promise.reject(new TypeError('Failed to fetch'))],
  ] as const)
    it(`stays on "It’s live" with a Reload button when ${failure} fails, and never refreshes into an error page`, async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const fetchMock = vi.fn(() => Promise.resolve(Response.json({ seconds: 0 })))
      vi.stubGlobal('fetch', fetchMock)
      render(
        <WithAppearance>
          <ConceptLanding initialSeconds={1} />
        </WithAppearance>,
      )
      await reachZero(1000)
      fetchMock.mockImplementation(reply as () => Promise<Response>)
      await reachZero(ZERO_HOLD_MS)
      expect(refresh).not.toHaveBeenCalled()
      expect(screen.getByText('It’s live')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
      expect(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY)).toBeNull()
      // They watched zero, so a reload by hand still brings the lighting.
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
      expect(reload).toHaveBeenCalledTimes(1)
      expect(Number(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY))).toBe(Date.now())
    })

  it('gives a sleeper no ceremony: zero after a long gap refreshes without marking the launch watched', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.setSystemTime(LAUNCH_AT - 120_000)
    const onZero = vi.fn()
    render(<LaunchCountdown initialSeconds={120} onZero={onZero} />)
    // The lid closes; the clock moves on two minutes and more.
    vi.setSystemTime(LAUNCH_AT + 30_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await reachZero(0)
    expect(onZero).toHaveBeenCalledWith({ watched: false })

    render(
      <WithAppearance>
        <ConceptLanding initialSeconds={120} />
      </WithAppearance>,
    )
    vi.setSystemTime(LAUNCH_AT + 200_000)
    act(() => {
      window.dispatchEvent(new Event('pageshow'))
    })
    await reachZero(0)
    expect(screen.queryByText('DIYA 1.0 is on npm. Happy Diwali.')).toBeNull()
    await reachZero(0)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(LAUNCH_SIGNAL_KEY)).toBeNull()
  })

  it('calls an ordinary one-second tick at zero watched', async () => {
    const onZero = vi.fn()
    render(<LaunchCountdown initialSeconds={2} onZero={onZero} />)
    await reachZero(2000)
    expect(onZero).toHaveBeenCalledWith({ watched: true })
  })
})

describe('the lighting after a full page load', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    // A lighting that is still under way.
    Element.prototype.animate = () => ({ finished: new Promise(() => {}), cancel() {} }) as unknown as Animation
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.launchMoment
  })

  it('plays once from the sessionStorage signal the countdown left, with nothing in memory', () => {
    // What the countdown's document wrote just before the browser reloaded.
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(Date.now() - 2000))
    document.documentElement.dataset.launchMoment = 'pending'
    render(
      <>
        <div data-launch-line-slot="" />
        <LaunchMoment />
      </>,
    )
    expect(document.querySelector('.ld-moment')).toBeTruthy()
    expect(document.querySelector('[data-launch-line-slot]')?.textContent).toBe('DIYA 1.0 is on npm. Happy Diwali.')
    expect(document.documentElement.dataset.launchMoment).toBeUndefined()
  })

  it('stays quiet when the signal is older than the window, or absent', () => {
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(Date.now() - LAUNCH_SIGNAL_WINDOW_MS - 1))
    document.documentElement.dataset.launchMoment = 'pending'
    const { unmount } = render(<LaunchMoment />)
    expect(document.querySelector('.ld-moment')).toBeNull()
    expect(document.documentElement.dataset.launchMoment).toBeUndefined()
    unmount()
    window.sessionStorage.clear()
    render(<LaunchMoment />)
    expect(document.querySelector('.ld-moment')).toBeNull()
  })

  it('veils the page before first paint only for a fresh signal', () => {
    const run = () => new Function(LAUNCH_PENDING_SCRIPT)()
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(Date.now() - 1000))
    run()
    expect(document.documentElement.dataset.launchMoment).toBe('pending')
    delete document.documentElement.dataset.launchMoment
    window.sessionStorage.setItem(LAUNCH_SIGNAL_KEY, String(Date.now() - 60_000))
    run()
    expect(document.documentElement.dataset.launchMoment).toBeUndefined()
  })
})

describe('the launched landing', () => {
  it('uses the approved strings, anchors and links', () => {
    const { container } = render(
      <WithAppearance>
        <LaunchedLanding />
      </WithAppearance>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'A library for your next app.' })).toBeTruthy()
    expect(container.querySelector('section#pro')).toBeTruthy()
    const text = container.textContent ?? ''
    for (const line of [
      '30 components, 13 patterns and 34 screens for React. Free, MIT, yours to own.',
      'Explore the library',
      'What’s in the package',
      'One install. Nothing held back for later.',
      'Relight, Coming to DIYA Pro',
      'From a sketch to a screen you own.',
      'Any picture of a screen. A screenshot, a wireframe, a whiteboard photo, a napkin sketch.',
      'Any kind of app. Dashboards, settings, sign-up flows, landing pages, admin tools.',
      'Invoices are just the example. The same pieces build a booking tool, a CRM, or your settings page.',
      'Don’t take the catalog’s word for it. Here’s a whole app.',
      'Adding it to an app you have?',
      'The fine print, in large print.',
      'Pro’s code needs nothing from us but @idyeah/diya.',
      'Library screens stay free and MIT. Relight’s screens are yours.',
      'DIYA is made by IDYeah Studio.',
      'First lit on 7 November 2026, the eve of Diwali.',
    ])
      expect(text).toContain(line)
    // The Appearance panel's own copy is phase B's (app/Appearance.tsx).
    const ours = `${container.querySelector('main')?.textContent} ${container.querySelector('footer')?.textContent}`
    expect(ours).not.toMatch(/Translucent|colour|licence|C·\d|P·\d|Expandable rows/)
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/explore?area=components')
    expect(hrefs).toContain('/explore?area=patterns')
    expect(hrefs).toContain('/privacy')
    expect(hrefs.filter((href) => href?.startsWith('/explore?area=patterns&pattern='))).toHaveLength(13)
    expect(container.querySelectorAll('[title]')).toHaveLength(0)
    // Relight step 1 is a napkin sketch: decorative, described by its label.
    const sketch = container.querySelector('.ld-stages .ld-shot[data-sketch="napkin"]')!
    expect(sketch.getAttribute('aria-hidden')).toBe('true')
    expect(sketch.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('.ld-stages .ld-stage-label')?.textContent).toBe(
      '1Your screenshot or sketch: a rough pen sketch of an invoices screen, on a paper napkin.',
    )
    expect(container.textContent).not.toContain('billing-old.png')
    // The public promises, in order: four since S11.
    expect(Array.from(container.querySelectorAll('section.ld-promise ol > li')).map((li) => li.textContent?.trim())).toEqual([
      'The library stays MIT.',
      'Pro never gets a component the library lacks.',
      'Pro’s code needs nothing from us but @idyeah/diya.',
      'Library screens stay free and MIT. Relight’s screens are yours.',
    ])
    // Screens: three pictures in the page's theme, each linking its screen, and the way to all of them.
    const shots = Array.from(container.querySelectorAll('.ld-screens-list a'))
    expect(shots.map((a) => [a.textContent?.replace('→', '').trim(), a.getAttribute('href')])).toEqual([
      ['Analytics dashboard', '/explore?area=screens&screen=dashboard'],
      ['Pricing', '/explore?area=screens&screen=pricing'],
      ['Product listing with filters', '/explore?area=screens&screen=listing'],
    ])
    for (const shot of shots)
      expect(Array.from(shot.querySelectorAll('img')).map((img) => [img.getAttribute('data-theme-image'), img.getAttribute('alt')])).toEqual([
        ['light', ''],
        ['dark', ''],
      ])
    expect(screen.getByRole('link', { name: 'All 34 screens' }).getAttribute('href')).toBe('/explore?area=screens')
    const main = container.querySelector('main')!
    expect(within(main).getByRole('button', { name: 'Copy command: npm create diya@latest' })).toBeTruthy()
    expect(within(main).getByRole('button', { name: 'Copy install command: npm install @idyeah/diya' })).toBeTruthy()
  })
})

describe('site header', () => {
  it('marks the current library area and keeps Relight out', () => {
    render(
      <WithAppearance>
        <SiteHeader current="patterns" />
      </WithAppearance>,
    )
    const links = Array.from(screen.getByRole('navigation', { name: 'Library' }).querySelectorAll('a'))
    expect(links.map((a) => a.textContent)).toEqual(['Components', 'Patterns', 'Screens'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/explore?area=components', '/explore?area=patterns', '/explore?area=screens'])
    expect(links[0].getAttribute('aria-current')).toBeNull()
    expect(links[1].getAttribute('aria-current')).toBe('page')
    expect(links[2].getAttribute('aria-current')).toBeNull()
    expect(document.body.textContent).not.toContain('Relight')
    expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/idyeah-studio/diya')
  })

  it('opens the phone menu with aria-expanded, and Escape closes it back to the button', () => {
    render(
      <WithAppearance>
        <SiteHeader />
      </WithAppearance>,
    )
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Menu' }).textContent).toContain('Copy install')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})
