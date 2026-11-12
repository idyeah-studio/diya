import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AppearanceProvider } from '../app/Appearance'
import { CatalogSearchProvider } from '../components/CatalogSearchProvider'
import { ProPage } from '../components/catalog/ProPage'
import { ChangelogView, parseChangelog, plainText } from '../components/community/changelog'
import { CADENCE, MAINTAINER, NEW_REQUEST_URL } from '../components/community/links'
import { TrustBlock } from '../components/community/TrustBlock'
import { SiteFooter } from '../components/site/SiteFooter'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('../components/waitlist/diya-styles', () => ({}))

// The page reads the same file from the app folder, which is where the catalog tests run.
const CHANGELOG = readFileSync(path.join(process.cwd(), '../../packages/diya/CHANGELOG.md'), 'utf8')

let waitlistOpen = true
beforeEach(() => {
  waitlistOpen = true
  window.localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockImplementation((() =>
    Promise.resolve(
      new Response(JSON.stringify(waitlistOpen ? { open: true, formToken: '1.x' } : { open: false }), { status: 200 })
    )) as typeof fetch)
})

const env = { ...process.env }
afterEach(() => {
  process.env = { ...env }
})

describe('the changelog reader', () => {
  const changelog = parseChangelog(CHANGELOG)

  it('reads the real CHANGELOG.md: versions, sections, lists and tables, without its own H1', () => {
    const headings = changelog.blocks.filter((block) => block.type === 'heading')
    expect(headings.some((block) => block.type === 'heading' && block.text === 'Changelog')).toBe(false)
    expect(headings.find((block) => block.type === 'heading' && block.level === 2)).toMatchObject({ id: 'v1.1.1' })
    expect(changelog.blocks.filter((block) => block.type === 'table').length).toBeGreaterThanOrEqual(3)
    expect(changelog.links['1.1.1']).toBe('https://github.com/idyeah-studio/diya/releases/tag/v1.1.1')
    expect(changelog.links['1.1.0']).toBe('https://github.com/idyeah-studio/diya/releases/tag/v1.1.0')
    expect(changelog.links['1.0.1']).toBe('https://github.com/idyeah-studio/diya/releases/tag/v1.0.1')
    expect(changelog.links['1.0.0']).toBe('https://github.com/idyeah-studio/diya/releases/tag/v1.0.0')
  })

  it('renders as page content with a dated version heading, scrollable tables and no raw Markdown', () => {
    const { container } = render(<ChangelogView changelog={changelog} />)
    const version = screen.getByRole('heading', { level: 2, name: /1\.0\.0/ })
    expect(version.querySelector('time')?.getAttribute('dateTime')).toBe('2026-11-07')
    expect(version.textContent).toContain('November 7, 2026')
    expect(within(version).getByRole('link', { name: '1.0.0' }).getAttribute('href')).toContain('/releases/tag/v1.0.0')
    expect(screen.getAllByRole('heading', { level: 3, name: 'Added' }).length).toBeGreaterThanOrEqual(2)
    screen.getByRole('heading', { level: 4, name: 'Values and callbacks' })
    const table = screen.getByRole('region', { name: 'Props, table' })
    expect(table.getAttribute('tabindex')).toBe('0')
    // An escaped pipe stays inside its cell.
    expect(table.textContent).toContain("role: 'status' | 'alert'")
    const text = container.textContent ?? ''
    expect(text).toContain('@diya/ui')
    expect(text).not.toMatch(/\*\*|\]\(|&#64;|<code>|\\\|/)
    expect(container.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('never turns a script or data URL into a link, and builds no HTML from the file', () => {
    const hostile = parseChangelog(
      '## Notes\n\n[click](javascript:alert(1)) <script>x</script> [ref]\n\n[ref]: data:text/html,hi\n'
    )
    const { container } = render(<ChangelogView changelog={hostile} />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>x</script>')
    expect(plainText('**Bold** and `code`')).toBe('Bold and code')
  })
})

describe('trust block', () => {
  it('names the maintainer and the cadence in the footer, with the checks as plain links', () => {
    render(
      <DiyaProvider>
        <SiteFooter />
      </DiyaProvider>
    )
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: MAINTAINER.name }).getAttribute('href')).toBe(MAINTAINER.url)
    expect(footer.textContent).toContain(CADENCE)
    const checks = within(footer).getByRole('list', { name: 'Checks you can verify' })
    expect(
      within(checks)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['CI', 'Bundle size', 'npm provenance'])
    expect(footer.querySelector('img')).toBeNull()
    // No Sponsors URL yet, so no mention of it.
    expect(footer.textContent).not.toMatch(/sponsor/i)
  })

  it('links the on-site changelog and the request page, and drops Skills & Prompts', () => {
    render(
      <DiyaProvider>
        <SiteFooter />
      </DiyaProvider>
    )
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Changelog' }).getAttribute('href')).toBe('/changelog')
    expect(within(footer).getByRole('link', { name: 'Ask for a component' }).getAttribute('href')).toBe('/ask')
    const library = within(footer).getByRole('group', { name: 'Library' })
    expect(within(library).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Components', '/explore?area=components'],
      ['Patterns', '/explore?area=patterns'],
      ['Screens', '/explore?area=screens'],
      ['Ask for a component', '/ask'],
    ])
    expect(footer.textContent).not.toMatch(/Skills|Coming|colour|licence/)
    expect(footer.textContent).not.toMatch(/vishal@/i)
  })

  it('explains each check on the changelog page', () => {
    render(
      <DiyaProvider>
        <TrustBlock variant="page" />
      </DiyaProvider>
    )
    expect(screen.getByText('Maintainer')).toBeTruthy()
    expect(screen.getByText(CADENCE)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'npm provenance' }).getAttribute('href')).toContain(
      'npmjs.com/package/@idyeah/diya'
    )
  })
})

async function renderPage(page: () => Promise<ReactElement>) {
  const element = await page()
  return render(
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      {element}
    </AppearanceProvider>
  )
}

describe('/ask and /changelog', () => {
  it('are 404s before launch without the preview flag', async () => {
    process.env.DIYA_NOW = '2026-11-01T00:00:00Z'
    delete process.env.DIYA_CATALOG_PREVIEW
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    const ask = (await import('../app/ask/page')).default
    const changelog = (await import('../app/changelog/page')).default
    await expect(ask()).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(changelog()).rejects.toThrow('NEXT_NOT_FOUND')
    // Nothing about either page leaks through the 404's head.
    expect(await (await import('../app/ask/page')).generateMetadata()).toEqual({})
    expect(await (await import('../app/changelog/page')).generateMetadata()).toEqual({})
  })

  it('open at launch: /ask explains a good request and hands off to GitHub Discussions', async () => {
    process.env.DIYA_NOW = '2026-11-07T08:00:01Z'
    const ask = (await import('../app/ask/page')).default
    await renderPage(ask)
    screen.getByRole('heading', { level: 1, name: 'What should DIYA have next?' })
    screen.getByRole('heading', { level: 2, name: 'What makes a good request' })
    expect(screen.getByRole('link', { name: 'Ask on GitHub' }).getAttribute('href')).toBe(NEW_REQUEST_URL)
    expect(document.body.textContent).toContain('I read every one')
  })

  it('open in a preview build: /changelog renders the SDK changelog under the trust list', async () => {
    process.env.DIYA_NOW = '2026-11-01T00:00:00Z'
    process.env.DIYA_CATALOG_PREVIEW = '1'
    const changelog = (await import('../app/changelog/page')).default
    await renderPage(changelog)
    screen.getByRole('heading', { level: 1, name: 'Changelog' })
    screen.getByRole('heading', { level: 2, name: /1\.0\.0/ })
    expect(document.body.textContent).toContain(CADENCE)
  })
})

describe('the Relight page in the catalog', () => {
  function page() {
    return render(
      <AppearanceProvider initialTheme="light" initialGlass={false}>
        <DiyaProvider>
          <CatalogSearchProvider>
            <ProPage />
          </CatalogSearchProvider>
        </DiyaProvider>
      </AppearanceProvider>
    )
  }

  it('reuses the three steps, links the parts, and ends with the waitlist', async () => {
    const { container } = page()
    await act(async () => {})
    screen.getByRole('heading', { level: 1, name: 'From a sketch to a screen you own.' })
    const steps = container.querySelector('ol.rl-steps')!
    expect(
      Array.from(steps.children).map((li) => li.querySelector('.rl-step-label')?.textContent?.replace(/^\d/, ''))
    ).toEqual([
      'Your screenshot or sketch: a rough pen sketch of an invoices screen, on a paper napkin.',
      'A few questions: who opens this screen most, and what should they do first. You answer with a click.',
      'Your screen, in DIYA: the same billing screen, rebuilt as React code from DIYA parts.',
    ])
    expect(screen.getByRole('link', { name: 'Table' }).getAttribute('href')).toBe(
      '/explore?area=patterns&pattern=table'
    )
    const join = screen.getByRole('region', { name: 'Get on the list' })
    within(join).getByRole('button', { name: 'Join the Relight waitlist' })
    expect(container.textContent).not.toMatch(/this sidebar|opens soon/)
  })

  it('hides the whole join block when the list is closed, so no stub is left', async () => {
    waitlistOpen = false
    const { container } = page()
    await act(async () => {})
    const join = container.querySelector('[data-waitlist-block]')!
    expect(join.querySelector('[data-waitlist-closed]')).not.toBeNull()
    expect(join.matches(':has([data-waitlist-closed])')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Join the Relight waitlist' })).toBeNull()
    expect(container.textContent).not.toMatch(/opens soon|setting it up/i)
    // The pictures stay.
    expect(container.querySelector('ol.rl-steps')).not.toBeNull()
  })
})
