import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'
import { AppearanceProvider } from '../app/Appearance'
import { SiteFooter } from '../components/site/SiteFooter'
import { PartsSheet } from '../components/landing/PartsSheet'
import { LaunchedLanding } from '../components/landing/LaunchedLanding'
import { STRUCTURED_DATA, structuredDataScript } from '../components/landing/structured-data'
import { API } from '../components/reference/api'
import { llmsFull, llmsIndex, MADE_BY } from '../components/reference/ai-docs'
import { catalogDescription } from '../lib/catalog-route-meta'
import { LAUNCHED_IMAGE } from '../lib/share-card'

/*
 * Findability: /mcp is reachable from the site, every
 * launched page has its own description and share card, the launched home
 * page says who makes DIYA in JSON-LD, and llms.txt says so too.
 */

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: () => {
    throw new Error('NEXT_REDIRECT')
  },
  useRouter: () => ({ refresh: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../components/landing/LandingStyles', () => ({ LandingStyles: () => null }))
vi.mock('../components/site/SiteStyles', () => ({ SiteStyles: () => null }))
vi.mock('../components/waitlist/diya-styles', () => ({}))
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
}))

const BEFORE = '2026-11-01T12:00:00Z'
const AFTER = '2026-11-07T08:00:30Z'
const ROOT = join(process.cwd(), '../..')

function launchedAt(now: string, preview = false) {
  vi.stubEnv('VERCEL', '')
  vi.stubEnv('VERCEL_ENV', '')
  vi.stubEnv('DIYA_NOW', now)
  vi.stubEnv('DIYA_CATALOG_PREVIEW', preview ? '1' : '')
}

function Themed({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider initialTheme="light" initialGlass={false}>
      {children}
    </AppearanceProvider>
  )
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ open: true, formToken: '123.abc' }))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('/mcp is reachable', () => {
  it('sits in the footer’s Get it column, between GitHub and the license', () => {
    render(
      <DiyaProvider>
        <SiteFooter />
      </DiyaProvider>
    )
    const get = screen.getByRole('group', { name: 'Get it' })
    expect(within(get).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['npm @idyeah/diya', 'https://www.npmjs.com/package/@idyeah/diya'],
      ['GitHub idyeah-studio/diya', 'https://github.com/idyeah-studio/diya'],
      ['MCP server', '/mcp'],
      ['MIT license', 'https://github.com/idyeah-studio/diya/blob/main/LICENSE'],
      ['Changelog', '/changelog'],
    ])
  })

  it('credits the audit in the fine print, with Crit8 opening in a new tab', () => {
    const { container } = render(
      <DiyaProvider>
        <SiteFooter />
      </DiyaProvider>
    )
    const fine = container.querySelector('.site-foot-fine p')!
    expect(fine.textContent?.replace(/\s+/g, ' ')).toContain('This site is built with DIYA and audited with Crit8.')
    const link = within(fine as HTMLElement).getByRole('link', { name: 'Crit8' })
    expect([link.getAttribute('href'), link.getAttribute('target'), link.hasAttribute('title')]).toEqual(['https://crit8.ai', '_blank', false])
  })

  it('has one line in “What’s in the package”, in the approved words, promising nothing unreleased', () => {
    const { container } = render(
      <Themed>
        <PartsSheet components={33} patterns={13} />
      </Themed>
    )
    const line = container.querySelector('.ld-sub-head p.ld-real')!
    expect(line.textContent?.replace(/\s+/g, ' ')).toBe(
      'Using a coding agent? Connect DIYA’s MCP server once, and your agent looks DIYA up while it writes. It’s also listed on Glama.'
    )
    const link = within(line as HTMLElement).getByRole('link', { name: 'DIYA’s MCP server' })
    expect(link.getAttribute('href')).toBe('/mcp')
    expect(link.hasAttribute('target')).toBe(false)
    const glama = within(line as HTMLElement).getByRole('link', { name: 'Glama' })
    expect(glama.getAttribute('href')).toBe('https://glama.ai/mcp/connectors/ai.diya13/diya')
    expect(glama.getAttribute('target')).toBe('_blank')
    // A plain anchor, never next/link: /mcp is also the MCP endpoint, and it answers Next's prefetch with a 405.
    for (const file of ['components/landing/PartsSheet.tsx', 'components/site/SiteFooter.tsx'])
      expect(readFileSync(join(__dirname, '..', file), 'utf8'), file).not.toMatch(/<Link[^>]*MCP_PATH/)
    expect(line.textContent).not.toMatch(/Screens?|Skills?|↗/)
  })

  it('shows Glama’s badge under that line, linked to the listing, large enough to read, with no referrer', () => {
    const { container } = render(
      <Themed>
        <PartsSheet components={33} patterns={13} />
      </Themed>
    )
    const badge = container.querySelector('.ld-sub-head a.ld-badge')!
    expect(badge.getAttribute('href')).toBe('https://glama.ai/mcp/connectors/ai.diya13/diya')
    expect(badge.getAttribute('target')).toBe('_blank')
    const img = badge.querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://glama.ai/mcp/connectors/ai.diya13/diya/badges/score.svg')
    expect(img.getAttribute('alt')).toBe('DIYA’s MCP connector and its score on Glama')
    // Glama draws it 110×20 with 11px words; at 1.3× they read at 14px.
    expect(Number(img.getAttribute('height'))).toBeGreaterThanOrEqual(26)
    expect(Number(img.getAttribute('width')) / Number(img.getAttribute('height'))).toBeCloseTo(110 / 20, 1)
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    // The privacy page says where the picture comes from.
    expect(readFileSync(join(__dirname, '..', 'app/privacy/page.tsx'), 'utf8')).toMatch(/served by Glama/)
  })
})

describe('each launched page has its own description and share card', () => {
  const card = (metadata: { openGraph?: unknown; twitter?: unknown }) => ({
    og: metadata.openGraph as { title: string; description: string; url: string; siteName: string; images: unknown[] },
    x: metadata.twitter as { card: string; title: string; description: string; images: unknown[] },
  })

  it('catalog pages: title, description and canonical address, with the site’s name and image', async () => {
    launchedAt(AFTER)
    const { generateMetadata } = await import('../app/explore/page')
    for (const [query, path, title] of [
      [{ pattern: 'table' }, '/explore?pattern=table', 'Table — DIYA'],
      [{ area: 'components', component: 'link' }, '/explore?area=components&component=link', 'Text Link — DIYA'],
      [{ area: 'screens', screen: 'pricing' }, '/explore?area=screens&screen=pricing', 'Pricing: Screens — DIYA'],
      [{ area: 'screens' }, '/explore?area=screens', 'Screens — DIYA'],
      [{ area: 'motion' }, '/explore?area=motion', 'Motion — DIYA'],
    ] as const) {
      const metadata = await generateMetadata({ searchParams: Promise.resolve({ ...query }) })
      const description = metadata.description!
      expect(metadata.title).toBe(title)
      expect(description).not.toContain('40+')
      expect(metadata.alternates).toEqual({ canonical: path })
      const { og, x } = card(metadata)
      expect(og).toEqual({ title, description, type: 'website', siteName: 'DIYA', url: path, images: [LAUNCHED_IMAGE] })
      expect(x).toEqual({ card: 'summary_large_image', title, description, images: [LAUNCHED_IMAGE] })
    }
    const table = await generateMetadata({ searchParams: Promise.resolve({ pattern: 'table' }) })
    expect(table.description).toBe(catalogDescription({ area: 'patterns', id: 'table' }))
  })

  it('catalog pages keep the site’s card in a preview before launch, as before', async () => {
    launchedAt(BEFORE, true)
    const { generateMetadata } = await import('../app/explore/page')
    expect(await generateMetadata({ searchParams: Promise.resolve({ pattern: 'table' }) })).toEqual({
      title: 'Table — DIYA',
      alternates: { canonical: '/explore?pattern=table' },
    })
  })

  it('/ask, /changelog and /mcp: their own card at launch, the same em dash, unindexed in a preview', async () => {
    const pages = [
      ['../app/ask/page', '/ask', 'Ask for a component — DIYA'],
      ['../app/changelog/page', '/changelog', 'Changelog — DIYA'],
      ['../app/diya-mcp-page/page', '/mcp', 'MCP server — DIYA'],
    ] as const
    launchedAt(AFTER)
    for (const [file, path, title] of pages) {
      const metadata = await (await import(file)).generateMetadata()
      expect(metadata.title).toBe(title)
      expect(metadata.robots).toBeUndefined()
      const { og, x } = card(metadata)
      expect(og).toEqual({ title, description: metadata.description, type: 'website', siteName: 'DIYA', url: path, images: [LAUNCHED_IMAGE] })
      expect(x.title).toBe(title)
    }
    // A preview before launch: no card of its own, and still unindexed.
    launchedAt(BEFORE, true)
    for (const [file, path, title] of pages) {
      const metadata = await (await import(file)).generateMetadata()
      expect(metadata).toEqual({ title, description: metadata.description, alternates: { canonical: path }, robots: { index: false, follow: false } })
    }
  })

  it('the home page keeps its own card, from the same image', async () => {
    launchedAt(AFTER)
    const metadata = await (await import('../app/layout')).generateMetadata()
    expect(card(metadata).og.url).toBe('/')
    expect(card(metadata).og.images).toEqual([LAUNCHED_IMAGE])
  })
})

describe('who makes DIYA, for machines', () => {
  it('the launched home page carries one JSON-LD graph: the site, the studio and the source', () => {
    const { container } = render(
      <Themed>
        <LaunchedLanding />
      </Themed>
    )
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)
    const graph = JSON.parse(scripts[0].textContent ?? '')['@graph'] as Record<string, unknown>[]
    expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'Organization', 'SoftwareSourceCode'])
    expect(graph[0]).toMatchObject({ name: 'DIYA', url: 'https://diya13.ai/' })
    // The studio: a name and an address, and nothing about people or where they live.
    expect(Object.keys(graph[1]).sort()).toEqual(['@id', '@type', 'name', 'url'])
    expect(graph[1]).toMatchObject({ name: 'IDYeah Studio', url: 'https://www.idyeah.studio' })
    expect(graph[2]).toMatchObject({
      name: 'DIYA',
      alternateName: '@idyeah/diya',
      codeRepository: 'https://github.com/idyeah-studio/diya',
      programmingLanguage: 'TypeScript',
      version: API.version,
    })
    expect(String(graph[2].license)).toMatch(/LICENSE$/)
    expect(JSON.stringify(graph)).not.toMatch(/SoftwareApplication|address|email|Vishal|founder|employee/i)
  })

  it('reads the version from the package, and escapes every “<”', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages/diya/package.json'), 'utf8')) as { version: string }
    expect(STRUCTURED_DATA['@graph'][2]).toMatchObject({ version: pkg.version })
    const script = structuredDataScript({ name: '</script><script>alert(1)</script>' })
    expect(script).not.toContain('<')
    expect(JSON.parse(script)).toEqual({ name: '</script><script>alert(1)</script>' })
  })

  it('never reaches the countdown', () => {
    for (const file of ['components/ConceptLanding.tsx', 'components/LaunchCountdown.tsx', 'app/page.tsx'])
      expect(readFileSync(join(process.cwd(), file), 'utf8'), file).not.toMatch(/ld\+json|structured-data/)
  })

  it('llms.txt and llms-full.txt say who makes DIYA, with GitHub, npm and the changelog', () => {
    expect(MADE_BY).toBe(
      'Made by [IDYeah Studio](https://www.idyeah.studio). Source on [GitHub](https://github.com/idyeah-studio/diya), the package on [npm](https://www.npmjs.com/package/@idyeah/diya), and every release in the [Changelog](https://diya13.ai/changelog).'
    )
    const index = llmsIndex()
    expect(index.startsWith('# DIYA\n\n> @idyeah/diya')).toBe(true)
    // Right under the summary, before the setup.
    expect(index.indexOf(MADE_BY)).toBeLessThan(index.indexOf('npm install @idyeah/diya'))
    expect(index.indexOf(MADE_BY)).toBeGreaterThan(index.indexOf('> @idyeah/diya'))
    expect(llmsFull()).toContain(`Index: https://diya13.ai/llms.txt\n\n${MADE_BY}\n`)
  })
})

describe('words', () => {
  it('the changelog no longer calls 1.1.0 a preview, and the root copy matches the package’s', () => {
    const changelog = readFileSync(join(ROOT, 'packages/diya/CHANGELOG.md'), 'utf8')
    expect(changelog).not.toContain('Becomes 1.1.0 after the preview check')
    expect(changelog).toContain('## [1.1.0] - 2026-11-11\n\n### Added')
    expect(readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')).toBe(changelog)
  })

  it('/ask names its “I” once, as the maintainer', async () => {
    launchedAt(AFTER)
    const ask = (await import('../app/ask/page')).default
    render(<Themed>{await ask()}</Themed>)
    const lede = document.querySelector('.wp-lede')!
    expect(lede.textContent?.replace(/\s+/g, ' ')).toBe(
      'Requests live in GitHub Discussions, where anyone can add a vote or their own case. I’m Vishal Mehta, DIYA’s maintainer. I read every request, and the most-wanted shape the next release.'
    )
    expect(document.querySelector('main')?.textContent?.match(/Vishal Mehta/g)).toHaveLength(1)
  })
})
