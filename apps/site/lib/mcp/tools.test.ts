import { describe, expect, it } from 'vitest'
import { snippetFor } from '../../components/code/snippets'
import { EXPORT_NAMES } from '../../components/reference/api'
import { componentIds, patternIds } from '../catalog-route'
import { MCP_API, mcpEntries } from './catalog'
import { getComponent, getSetup, getTheme, listTokens, rulesResource, searchComponents } from './tools'

// Building the catalog index reads every complete file once; give a cold, loaded runner room.
const SLOW = 20_000
const ids = [...componentIds, ...patternIds]
const tokens = (text: string) => Math.ceil(text.length / 4)

describe('search_components', () => {
  it('answers plain words with the right first match', () => {
    const cases: [string, string][] = [
      ['toggle for email notifications', 'Switch'],
      ['modal to confirm deleting a project', 'Dialog'],
      ['pick a country from a long list', 'Combobox'],
      ['sidebar navigation', 'SideNavigation'],
      ['empty state when there are no projects', 'ContentState'],
      ['date range', 'DatePicker'],
      ['calendar to book an appointment', 'Calendar'],
      ['calendar', 'Calendar'],
      ['upload a CSV', 'FileUpload'],
      ['stepper for onboarding', 'Wizard'],
      ['kpi number', 'Metric'],
      ['data grid with sorting', 'Table'],
      ['bar chart', 'DataViz'],
      ['layout spacing between sections', 'Stack'],
      ['button', 'Button'],
      ['TextLink', 'TextLink'],
    ]
    for (const [query, first] of cases) {
      const { text, found } = searchComponents({ query })
      expect(found, query).toBe(true)
      expect(text.split('\n').find((line) => line.startsWith('1. ')), query).toContain(`import { ${first} }`)
    }
  }, SLOW)

  it('says so honestly when DIYA has nothing, and points to /ask', () => {
    const { text, found } = searchComponents({ query: 'carousel of testimonials' })
    expect(found).toBe(false)
    expect(text).toContain('No carousel in DIYA')
    expect(text).toContain('https://diya13.ai/ask')
    expect(searchComponents({ query: 'icons for the sidebar' }).text).toContain('DIYA ships no icon set')
  })

  it('keeps answers short and caps the list', () => {
    const { text } = searchComponents({ query: 'form', limit: 50 })
    expect(text.split('\n').filter((line) => /^\d+\. /.test(line)).length).toBeLessThanOrEqual(10)
    expect(tokens(searchComponents({ query: 'settings page' }).text)).toBeLessThan(500)
  })
})

describe('get_component', () => {
  it('gives every catalog item its props, guidance and the same complete file Get code gives', () => {
    for (const id of ids) {
      const text = getComponent({ name: EXPORT_NAMES[id] })
      const snippet = snippetFor(id, {})
      expect(text, id).toContain(`import { ${EXPORT_NAMES[id]} } from '@idyeah/diya`)
      expect(text, id).toContain('## Props')
      expect(text, id).toContain('## Accessibility')
      expect(text, id).toContain(`## Complete file (\`${snippet.fileName}\`)\n\`\`\`tsx\n${snippet.file.trimEnd()}\n\`\`\``)
      expect(tokens(text), id).toBeLessThan(2500)
    }
  }, SLOW)

  it('covers every api.json item, including the provider and layout', () => {
    expect(mcpEntries().map((entry) => entry.id).sort()).toEqual(Object.keys(MCP_API.items).sort())
    for (const entry of mcpEntries()) expect(getComponent({ name: entry.exportName }), entry.id).toMatch(/^# /)
    expect(getComponent({ name: 'Stack' })).toContain('<Stack gap={5} as="section">')
  }, SLOW)

  it('finds items by title, catalog id and everyday name', () => {
    expect(getComponent({ name: 'side navigation', include: ['props'] })).toMatch(/^# Side Navigation \(`SideNavigation`\)/)
    expect(getComponent({ name: 'text-input', include: ['props'] })).toMatch(/^# Text Input/)
    expect(getComponent({ name: 'Modal', include: ['props'] })).toMatch(/^# Dialog/)
    expect(getComponent({ name: 'Chart', include: ['props'] })).toMatch(/^# Data Viz/)
    expect(getComponent({ name: 'Carousel' })).toMatch(/^No DIYA export called "Carousel"\./)
  })

  it('names the uncontrolled prop for every field that has one', () => {
    expect(getComponent({ name: 'Switch', include: ['props'] })).toContain('- Controlled: `checked` with `onCheckedChange`; uncontrolled: `defaultChecked`.')
    for (const name of ['TextInput', 'TextArea', 'Choice', 'Slider'])
      expect(getComponent({ name, include: ['props'] }), name).toContain('- Controlled: `value` with `onValueChange`; uncontrolled: `defaultValue`.')
  })

  it('writes generic types the way TypeScript reads them', () => {
    expect(getComponent({ name: 'Table', include: ['props'] })).toContain('type TableColumn<T> = { key: string;')
  })

  it('returns only the sections asked for', () => {
    const text = getComponent({ name: 'Tag', include: ['messages', 'tokens'] })
    expect(text).toContain('## Built-in text (`messages.tag` on DiyaProvider)')
    expect(text).toContain('## Tokens it reads')
    expect(text).not.toContain('## Props')
    expect(text).not.toContain('## Complete file')
  })
})

describe('get_theme', () => {
  it('derives the same accent tokens as DiyaProvider and offers a shade when a color looks faint', () => {
    const text = getTheme({ brandColor: '#1f4e7a', glass: true })
    expect(text).toContain('<DiyaProvider brandColor="#1F4E7A" glass>')
    expect(text).toContain('| `--diya-color-accent-ink` | `#1F4E7A` |')
    expect(text).toMatch(/In Dark, #1F4E7A sits at 2\.\d:1 against the page \(#111113\).*If you'd like them to stand out, dark could use #[0-9A-F]{6}/)
    expect(text).not.toMatch(/colour/i)
  })

  it('stays quiet for colors that already read, and refuses what isn’t a hex color', () => {
    expect(getTheme({ brandColor: { light: '#262626', dark: '#E8E8E8' } })).not.toContain('## Notes')
    expect(getTheme({})).toContain('<DiyaProvider>')
    expect(getTheme({ brandColor: 'blue' })).toMatch(/^brandColor takes a hex color/)
  })
})

describe('get_setup and list_tokens', () => {
  it('gives the Next.js files, the Tailwind layer order and the rules', () => {
    const text = getSetup({ framework: 'next', tailwind: true, packageManager: 'pnpm', charts: true })
    expect(text).toContain('pnpm add @idyeah/diya echarts@6')
    expect(text).toContain('@layer theme, base, diya, components, utilities;')
    expect(text).toContain("## 3. app/providers.tsx")
    expect(text).toContain('<DiyaProvider linkComponent={Link}>')
    expect(text).toContain('Every component renders inside `DiyaProvider`')
    expect(getSetup({ framework: 'vite' })).toContain('## 2. src/main.tsx (the entry)')
  })

  it('lists tokens by group and explains which ones the provider owns', () => {
    expect(listTokens({ group: 'actions' })).toContain('- `--diya-color-accent` `#262626` / `#e8e8e8` · set by `DiyaProvider.brandColor`, not directly')
    expect(listTokens({ group: 'nope' })).toMatch(/^No token group "nope"\. Groups: /)
    expect(listTokens({})).not.toContain('--diya-brand`')
  })

  it('serves the setup and rules as a resource', () => {
    expect(rulesResource()).toMatch(/^# @idyeah\/diya \d+\.\d+\.\d+/)
    expect(rulesResource()).toContain('npm install @idyeah/diya')
  })
})

describe('what an agent reads, word for word', () => {
  it.each([
    ['search: toggle', () => searchComponents({ query: 'toggle for email notifications' }).text],
    ['search: carousel', () => searchComponents({ query: 'carousel of testimonials' }).text],
    ['get_component: Switch', () => getComponent({ name: 'Switch' })],
    ['get_component: Side Navigation props', () => getComponent({ name: 'side navigation', include: ['props'] })],
    ['get_setup: next + tailwind', () => getSetup({ framework: 'next', tailwind: true })],
    ['get_setup: vite', () => getSetup({ framework: 'vite' })],
    ['get_theme: #1F4E7A + glass', () => getTheme({ brandColor: '#1F4E7A', glass: true })],
    ['get_theme: #F5C542', () => getTheme({ brandColor: '#F5C542' })],
    ['list_tokens: space', () => listTokens({ group: 'space' })],
  ])('%s', (_, output) => {
    expect(output()).toMatchSnapshot()
  })
})
