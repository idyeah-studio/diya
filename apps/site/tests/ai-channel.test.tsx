import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiyaProvider } from '@idyeah/diya'
import { itemBrief, llmsFull, llmsIndex, screenLines } from '../components/reference/ai-docs'
import { screens, type ScreenStatus } from '../components/screens/screens-data'
import { API, EXPORT_NAMES, itemReference, itemUrl, kebab } from '../components/reference/api'
import { guidance } from '../components/reference/guidance'
import { ReferencePanel } from '../components/reference/ReferencePanel'
import { snippetFor } from '../components/code/snippets'
import { ids } from './snippet-cases'

/* The catalog's test config aliases @idyeah/diya to its JS entry, which hides
   the package's ./api.json export; read the installed file instead. */
vi.mock('../components/reference/api-data', async () => {
  const { readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  return { default: JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@idyeah/diya/dist/api.json'), 'utf8')) }
})
vi.mock('next/server', () => ({ connection: async () => undefined }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  },
}))

describe('api.json lookup', () => {
  it('finds every catalog item by its export, before and after ids match export names', () => {
    for (const id of ids) {
      const reference = itemReference(id)
      expect(reference, id).not.toBeNull()
      expect(reference!.props.length, id).toBeGreaterThan(0)
      expect(API.components[EXPORT_NAMES[id]], id).toBeDefined()
    }
    expect(kebab('TextLink')).toBe('text-link')
    expect(kebab('ContentState')).toBe('content-state')
    expect(kebab('DataViz')).toBe('data-viz')
  })

  it('has guidance and an accessibility note for every item', () => {
    for (const id of ids) {
      expect(guidance[id].use.length, id).toBeGreaterThan(20)
      expect(guidance[id].access.length, id).toBeGreaterThan(20)
    }
  })
})

describe('the AI channel', () => {
  it('llms.txt indexes every component and pattern with its catalog page', () => {
    const text = llmsIndex()
    expect(text.startsWith('# DIYA\n\n> @idyeah/diya')).toBe(true)
    expect(text).toContain('https://diya13.ai/llms-full.txt')
    expect(text).toContain('https://diya13.ai/api.json')
    for (const id of ids) expect(text, id).toContain(`](${itemUrl(id)}): \`${EXPORT_NAMES[id]}\``)
    expect(text).not.toMatch(/--diya-brand|#747CFF/i)
  })

  it('llms-full.txt carries props, guidance, a complete example per item, the tokens and the other exports', () => {
    const text = llmsFull()
    for (const id of ids) {
      const reference = itemReference(id)!
      expect(text, id).toContain(`## ${reference.title} (\`${reference.exportName}\`)`)
      for (const [name] of reference.props) expect(text, `${id}.${name}`).toContain(`| \`${name}\``)
      expect(text, id).toContain(snippetFor(id, {}).file.trimEnd())
    }
    expect(text).toContain('| `--diya-color-accent` |')
    expect(text).toContain('### `DiyaProvider`')
    expect(text).toContain('### `Toast`')
  })

  it('lists ready screens in llms.txt and llms-full.txt, never screens still being built or posters', () => {
    const entry = screens.find((screen) => screen.id === 'dashboard') as { status: ScreenStatus }
    const url = (id: string) => `https://diya13.ai/explore?area=screens&screen=${id}`
    for (const text of [llmsIndex(), llmsFull()])
      for (const screen of screens.filter((item) => item.status !== 'ready')) expect(text, screen.id).not.toContain(url(screen.id))
    if (!screens.some((screen) => screen.status === 'ready')) expect(llmsIndex()).not.toContain('## Screens')
    const before = entry.status
    entry.status = 'ready'
    try {
      for (const text of [llmsIndex(), llmsFull()]) {
        expect(text).toContain('## Screens')
        expect(text).toContain(
          `- [Analytics dashboard](${url('dashboard')}): ${(entry as unknown as { description: string }).description} One file: \`app/dashboard/page.tsx\` in Next.js or \`src/Dashboard.tsx\` in Vite; needs \`@idyeah/diya lucide-react echarts@6\`.`
        )
        for (const screen of screens.filter((item) => item.status === 'building')) expect(text, screen.id).not.toContain(url(screen.id))
      }
      expect(screenLines()).toHaveLength(screens.filter((screen) => screen.status === 'ready').length)
    } finally {
      entry.status = before
    }
  })

  it('a Copy for AI brief has install, provider, props and a complete example', () => {
    const brief = itemBrief('table')
    expect(brief).toMatch(/^# Table \(`Table`\)/)
    expect(brief).toContain('npm install @idyeah/diya')
    expect(brief).toContain("import '@idyeah/diya/styles.css'")
    expect(brief).toContain('<DiyaProvider theme="system">')
    expect(brief).toContain('| `rows` (required) | `T[]` |')
    expect(brief).toContain("```tsx\n'use client'")
    expect(brief).toContain('export default function TableExample()')
  })
})

describe('AI channel routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('404 before launch without the preview flag, like /explore, and serve after', async () => {
    const routes = [
      ['llms.txt', 'text/plain; charset=utf-8'],
      ['llms-full.txt', 'text/plain; charset=utf-8'],
      ['api.json', 'application/json; charset=utf-8'],
    ] as const
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '')
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('DIYA_NOW', '2026-11-06T12:00:00-08:00')
    for (const [route] of routes) {
      const { GET } = await import(`../app/${route}/route`)
      await expect(GET(), route).rejects.toThrow(/404/)
    }
    vi.stubEnv('DIYA_NOW', '2026-11-07T00:00:01-08:00')
    for (const [route, type] of routes) {
      const { GET } = await import(`../app/${route}/route`)
      const response: Response = await GET()
      expect(response.status, route).toBe(200)
      expect(response.headers.get('content-type'), route).toBe(type)
      expect((await response.text()).length, route).toBeGreaterThan(1000)
    }
    const { GET } = await import('../app/api.json/route')
    expect(JSON.parse(await (await GET()).text()).package).toBe('@idyeah/diya')
  })
})

describe('Reference panel', () => {
  it('shows guidance, accessibility and every prop under a playground, and copies a brief', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(
      <DiyaProvider>
        <ReferencePanel path="/explore?area=components&component=button" />
      </DiyaProvider>
    )
    const panel = screen.getByRole('region', { name: 'Using Button' })
    expect(within(panel).getByRole('heading', { name: 'When to use', level: 3 })).toBeTruthy()
    expect(within(panel).getByRole('heading', { name: 'Accessibility', level: 3 })).toBeTruthy()
    for (const [name] of itemReference('button')!.props) expect(within(panel).getByText(name, { selector: 'dt code' })).toBeTruthy()
    expect(panel.textContent).toContain('Also takes every native <button> attribute')
    await user.click(within(panel).getByRole('button', { name: 'Copy for AI' }))
    expect(writeText).toHaveBeenCalledWith(itemBrief('button'))
    expect(within(panel).getByRole('status').textContent).toBe('Button brief copied.')
  })

  it('renders nothing off an item page', () => {
    const { container } = render(<ReferencePanel path="/explore?area=pro" />)
    expect(container.innerHTML).toBe('')
  })
})
