// Lane L3b: display, data and pattern components follow the shared SDK contract
// (escape hatches, refs, diya- classes, heading levels, one brand, tabular numerals).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRef, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Accordion, Alert, Avatar, Badge, Card, Chatbot, ContentState, DiyaProvider, List, Metric, PageHeader, Progress, Table, Tag, Toast, Wizard,
} from '../dist/index.js'
import { Chart, DataViz } from '../dist/data-viz/index.js'
import { DiyaProvider as SourceProvider } from '../src/DiyaProvider.js'
import { Chart as SourceChart, chartPalettes } from '../src/data-viz/DataViz.js'
import { BRAND_GROUNDS, DIYA_DEFAULT_BRAND, brandTokens } from '../src/internal/brand.js'

const chartMock = vi.hoisted(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), getOption: vi.fn(() => undefined) }))
vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => chartMock),
  format: { getTextRect: (text: string, font: string) => ({ width: text.length * Number.parseFloat(font) * .55, height: Number.parseFloat(font) }) },
}))

const root = process.cwd()
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const series = [{ name: 'Visits', values: [1, 2] }]
const chartProps = { type: 'bar' as const, categories: ['Mon', 'Tue'], series }
const steps = [{ id: 'one', label: 'Details', content: <p>Fields</p> }, { id: 'two', label: 'Review', content: <p>Check</p> }]

// Every owned component, its expected root element, and how to find that root.
const cases: [string, (props: Record<string, unknown>) => ReactElement, string][] = [
  ['Badge', (p) => <Badge variant="count" count={3} label="unread" {...p} />, 'SPAN'],
  ['Tag', (p) => <Tag {...p}>Design</Tag>, 'SPAN'],
  ['Alert', (p) => <Alert {...p}>Saved.</Alert>, 'DIV'],
  ['Avatar', (p) => <Avatar name="Ada Lovelace" {...p} />, 'SPAN'],
  ['Metric', (p) => <Metric value="2,481" label="Visits" {...p} />, 'DIV'],
  ['List', (p) => <List label="People" items={[{ id: 'a', label: 'Ada' }]} {...p} />, 'UL'],
  ['Accordion', (p) => <Accordion items={[{ id: 'a', label: 'One', content: 'Body' }]} {...p} />, 'DIV'],
  ['Progress', (p) => <Progress value={40} label="Upload" {...p} />, 'DIV'],
  ['Card', (p) => <Card title="Plan" {...p} />, 'ARTICLE'],
  ['PageHeader', (p) => <PageHeader title="Billing" {...p} />, 'SECTION'],
  ['Table', (p) => <Table label="People" rows={[{ id: 'a', name: 'Ada' }]} columns={[{ key: 'name', label: 'Name', render: (row) => row.name }]} rowLabel={(row) => row.name} {...p} />, 'DIV'],
  ['ContentState', (p) => <ContentState title="No projects yet" {...p} />, 'SECTION'],
  ['Wizard', (p) => <Wizard steps={steps} activeStep={0} onStepChange={() => {}} onComplete={() => {}} {...p} />, 'SECTION'],
  ['Chatbot', (p) => <Chatbot title="Help" messages={[]} value="" onValueChange={() => {}} onSend={() => {}} {...p} />, 'SECTION'],
  ['DataViz', (p) => <DataViz title="Visits" {...chartProps} {...p} />, 'ARTICLE'],
  ['Chart', (p) => <Chart label="Visits" {...chartProps} {...p} />, 'DIV'],
]

describe('escape hatches and refs', () => {
  it.each(cases)('%s takes className, style, attributes and a ref on its root', (_name, make, tag) => {
    const ref = createRef<HTMLElement>()
    render(<DiyaProvider>{make({ ref, className: 'mine', style: { marginTop: 7 }, 'data-testid': 'root', id: 'own-id' })}</DiyaProvider>)
    const node = screen.getByTestId('root')
    expect(node.tagName).toBe(tag)
    expect(ref.current).toBe(node)
    expect(node.className.split(' ')).toContain('mine')
    expect(node.className.split(' ').some((name) => name.startsWith('diya-'))).toBe(true)
    expect(node.style.marginTop).toBe('7px')
    expect(node.id).toBe('own-id')
  })

  it('points a Toast ref at its Alert and keeps its classes', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DiyaProvider><Toast ref={ref} className="mine" onDismiss={() => {}}>Saved.</Toast></DiyaProvider>)
    expect(ref.current?.classList.contains('diya-alert')).toBe(true)
    expect(ref.current?.classList.contains('mine')).toBe(true)
  })

  it.each(cases)('%s renders only diya- prefixed classes', (_name, make) => {
    const { container } = render(<DiyaProvider>{make({})}</DiyaProvider>)
    // Select's hidden label (inside Table's pagination) is renamed by the fields lane.
    const others = new Set(['text-input-sr-only'])
    const classes = [...container.querySelectorAll('[class]')].flatMap((node) => [...node.classList])
    expect(classes.filter((name) => !name.startsWith('diya-') && !others.has(name))).toEqual([])
  })

  it('ships no unprefixed rules for the lane’s classes', () => {
    // The shared type-role list at the end of the file still names `.analytics-header h3`; it matches nothing now.
    const own = css.replace('.analytics-header h3, ', '')
    for (const old of ['analytics-', 'table-person', 'table-progress', 'table-resource', 'table-secondary']) {
      expect(own.match(new RegExp(`(?<![\\w-])\\.${old}`)), old).toBe(null)
    }
  })
})

describe('heading levels', () => {
  const levels: [string, (level?: 2) => ReactElement, string][] = [
    ['Card', (headingLevel) => <Card title="Plan" headingLevel={headingLevel} />, 'Plan'],
    ['Accordion', (headingLevel) => <Accordion headingLevel={headingLevel} items={[{ id: 'a', label: 'One', content: 'Body' }]} />, 'One'],
    ['Table', (headingLevel) => <Table label="People" headingLevel={headingLevel} rows={[]} columns={[]} rowLabel={() => ''} />, 'People'],
    ['ContentState', (headingLevel) => <ContentState title="Empty" headingLevel={headingLevel} />, 'Empty'],
    ['Wizard', (headingLevel) => <Wizard headingLevel={headingLevel} steps={steps} activeStep={0} onStepChange={() => {}} onComplete={() => {}} />, 'Details'],
    ['DataViz', (headingLevel) => <DataViz headingLevel={headingLevel} title="Visits" {...chartProps} />, 'Visits'],
  ]
  it.each(levels)('%s defaults to h3 and takes headingLevel', (_name, make, name) => {
    const { unmount } = render(<DiyaProvider>{make()}</DiyaProvider>)
    expect(screen.getByRole('heading', { name, level: 3 })).toBeTruthy()
    unmount()
    render(<DiyaProvider>{make(2)}</DiyaProvider>)
    expect(screen.getByRole('heading', { name, level: 2 })).toBeTruthy()
  })
})

describe('Badge and Tag', () => {
  it('draws a dot only when asked, and a count never shows the label', () => {
    render(<DiyaProvider><Badge variant="dot" tone="success" label="Online" /><Badge variant="count" count={4} label="unread" /></DiyaProvider>)
    const dot = screen.getByRole('img', { name: 'Online' })
    expect(dot.dataset.variant).toBe('dot')
    expect(dot.textContent).toBe('')
    expect(screen.getByRole('img', { name: '4 unread' }).textContent).toBe('4')
  })

  it('never renders a stray dot when a count is missing', () => {
    // A JavaScript caller that leaves out `variant` gets the count path, which hides at 0.
    const loose = { label: 'New' } as unknown as Parameters<typeof Badge>[0]
    const { container } = render(<DiyaProvider><Badge {...loose} /></DiyaProvider>)
    expect(container.querySelector('.diya-badge')).toBe(null)
  })

  it('takes its brand from tokens, with no inline colour and no brandColor prop', () => {
    render(<DiyaProvider><Badge variant="dot" tone="brand" label="New" /><Tag tone="brand">Beta</Tag><Alert tone="brand">Note</Alert></DiyaProvider>)
    for (const node of document.querySelectorAll<HTMLElement>('.diya-badge, .diya-tag, .diya-alert')) expect(node.getAttribute('style')).toBe(null)
    for (const file of ['badge/Badge.tsx', 'tag/Tag.tsx', 'alert/Alert.tsx', 'data-viz/DataViz.tsx']) {
      const source = readFileSync(resolve(root, 'src', file), 'utf8')
      expect(source, file).not.toMatch(/brandColor|useDiyaBrandColor|--diya-brand/)
    }
  })

  it('tints the brand Tag softly with readable ink, and gives the brand Alert its accent', () => {
    const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[[\]().]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
    const tag = rule(".diya-root .diya-tag[data-color='brand']")
    expect(tag).toMatch(/background:\s*var\(--diya-color-accent-soft,/)
    expect(tag).toMatch(/color:\s*var\(--diya-color-accent-ink,/)
    expect(rule(".diya-root .diya-alert[data-tone='brand']")).toMatch(/--diya-internal-alert-accent:\s*var\(--diya-color-accent\)/)
  })

  it('names a Tag’s remove button from its children when label is left out', async () => {
    const remove = vi.fn()
    render(<DiyaProvider><Tag onRemove={remove}><strong>Design</strong> team</Tag></DiyaProvider>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Design team' }))
    expect(remove).toHaveBeenCalledOnce()
  })
})

describe('Table', () => {
  type Person = { uuid: string; name: string }
  const people: Person[] = [{ uuid: 'p-1', name: 'Ada' }, { uuid: 'p-2', name: 'Grace' }]
  const columns = [{ key: 'name', label: 'Name', render: (row: Person) => row.name }]

  it('identifies rows with getRowId, for keys, selection and actions', async () => {
    const user = userEvent.setup()
    const remove = vi.fn()
    const selection = vi.fn()
    render(<DiyaProvider><Table label="People" rows={people} columns={columns} rowLabel={(row) => row.name} getRowId={(row) => row.uuid} onSelectionChange={selection} bulkActions={[{ label: 'Remove', onAction: remove }]} /></DiyaProvider>)
    await user.click(screen.getByRole('checkbox', { name: 'Select Grace' }))
    expect(selection).toHaveBeenLastCalledWith(['p-2'])
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(remove).toHaveBeenCalledWith(['p-2'])
  })

  it('accepts number ids as strings, and explains a missing id instead of failing later', async () => {
    const user = userEvent.setup()
    const selection = vi.fn()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<DiyaProvider><Table label="Numbers" rows={[{ id: 7, name: 'Seven' }]} columns={[{ key: 'name', label: 'Name', render: (row: { name: string }) => row.name }]} rowLabel={(row) => row.name} onSelectionChange={selection} /></DiyaProvider>)
    await user.click(screen.getByRole('checkbox', { name: 'Select Seven' }))
    expect(selection).toHaveBeenLastCalledWith(['7'])
    unmount()
    render(<DiyaProvider><Table label="Loose" rows={people} columns={columns} rowLabel={(row) => row.name} /></DiyaProvider>)
    expect(within(screen.getByRole('table', { name: 'Loose' })).getAllByRole('row')).toHaveLength(3)
    expect(error.mock.calls.some(([message]) => String(message).includes('getRowId'))).toBe(true)
  })

  it('can hide its visible title and keep its caption and accessible name', () => {
    render(<DiyaProvider><Table label="People" showTitle={false} rows={people} columns={columns} rowLabel={(row) => row.name} getRowId={(row) => row.uuid} /></DiyaProvider>)
    expect(screen.queryByRole('heading')).toBe(null)
    expect(screen.getByRole('table', { name: 'People' })).toBeTruthy()
    expect(document.querySelector('.diya-table-toolbar')).toBe(null)
  })

  it('gives the per-page picker room for three digits and no longer forces a sticky or wide minimum', () => {
    expect(css).not.toMatch(/\.diya-table\[data-sticky\] table \{ min-width/)
    expect(css).not.toMatch(/\.diya-table\[data-rich\] table \{ min-width/)
    expect(css).toMatch(/\.diya-table \.diya-pagination-size \.diya-select-field \{ width:84px; \}/)
  })
})

describe('numerals', () => {
  // DIYA Sans's tabular 0 and 1 now share the default figures' design (no slash, no foot;
  // apps/diya/scripts/fonts/tabular_figures.py), so data figures are tabular and columns line up.
  it('sets data figures in tabular DIYA Sans, never proportional or monospace', () => {
    for (const selector of ['.diya-metric-number', '.diya-table .diya-table-numeric', '.diya-analytics-data', '.diya-donut-total strong', '.diya-progress-value']) {
      const escaped = selector.replace(/[[\]().']/g, '\\$&')
      expect(css, selector).toMatch(new RegExp(`${escaped}\\s*\\{[^}]*font-variant-numeric:\\s*tabular-nums`))
    }
    const own = css.split('\n').filter((line) => /diya-(metric|table|analytics|donut|progress|badge)/.test(line))
    expect(own.filter((line) => /proportional-nums|monospace/.test(line))).toEqual([])
  })
})

describe('chart colours', () => {
  const channel = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (hex: string) => { const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return 0.2126 * channel(n[0]) + 0.7152 * channel(n[1]) + 0.0722 * channel(n[2]) }
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
  // The raised surface each theme paints charts on, read from the stylesheet.
  const raised = (theme: 'light' | 'dark') => {
    const block = theme === 'dark' ? css.match(/\n\.diya-root \{([^}]*)\}/)![1] : css.match(/\n\.diya-root\[data-theme='light'\] \{([^}]*)\}/)![1]
    const value = block.match(/--diya-color-raised:\s*(#[0-9a-f]{3,6});/i)![1]
    return value.length === 4 ? '#' + [...value.slice(1)].map((c) => c + c).join('') : value
  }

  // Vivid hues are bright on purpose: 3:1 on the dark card, at least 2:1 on white. Every chart also
  // carries its legend, tooltips and a data table, so color is never the only way to read a value.
  it.each([['light', 2], ['dark', 3]] as const)('keeps every %s series at %s:1 or more on the surface', (theme, floor) => {
    for (const color of chartPalettes[theme]) expect(ratio(color, raised(theme)), color).toBeGreaterThanOrEqual(floor)
  })

  it('leads with the Vivid palette when no brand is set', () => {
    render(<SourceProvider theme="light"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    const option = chartMock.setOption.mock.calls.at(-1)![0] as { color: string[] }
    expect(option.color).toEqual(chartPalettes.light)
    expect(JSON.stringify(option)).not.toMatch(/#7563c6|#20999d|#495659|#18282b/i)
  })

  const firstSeries = () => (chartMock.setOption.mock.calls.at(-1)![0] as { color: string[] }).color[0].toLowerCase()
  afterEach(() => vi.unstubAllGlobals())
  // A system scheme stub: matchMedia answers the dark query with `dark`.
  const scheme = (dark: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'), media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  }))

  it.each([
    ['light', false, '#b4532a'],
    ['dark', false, '#e7a37e'],
    ['system', false, '#b4532a'],
    ['system', true, '#e7a37e'],
  ] as const)('follows brandColor { light, dark } under theme="%s" (system dark: %s)', (theme, dark, expected) => {
    scheme(dark)
    render(<SourceProvider theme={theme} brandColor={{ light: '#b4532a', dark: '#e7a37e' }}><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    expect(firstSeries()).toBe(expected)
  })

  it.each([
    ['light', false],
    ['dark', false],
    ['system', false],
    ['system', true],
  ] as const)('follows a single brandColor under theme="%s" (system dark: %s)', (theme, dark) => {
    scheme(dark)
    render(<SourceProvider theme={theme} brandColor="#b4532a"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    const resolved = theme === 'system' ? (dark ? 'dark' : 'light') : theme
    // The brand where it reaches 3:1 on the raised surface (Light), its readable ink where it does not (Dark).
    const { accent, accentInk } = brandTokens('#b4532a', resolved)
    expect(firstSeries()).toBe((ratio(accent.toLowerCase(), BRAND_GROUNDS[resolved].raised) >= 3 ? accent : accentInk).toLowerCase())
    if (resolved === 'light') expect(firstSeries()).toBe('#b4532a')
  })

  it('lets the palette lead when the brand is neutral (DIYA’s default ink or any gray)', () => {
    render(<SourceProvider theme="dark"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    expect(firstSeries()).toBe(chartPalettes.dark[0])
    expect(DIYA_DEFAULT_BRAND.dark).not.toBe(chartPalettes.dark[0])
    render(<SourceProvider theme="light" brandColor="#555555"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    expect(firstSeries()).toBe(chartPalettes.light[0])
  })

  it('moves a palette colour that reads as the brand’s twin to the back', () => {
    render(<SourceProvider theme="light" brandColor="#007aff"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    const colors = (chartMock.setOption.mock.calls.at(-1)![0] as { color: string[] }).color
    expect(colors[0].toLowerCase()).toBe('#007aff')
    expect(colors).toHaveLength(1 + chartPalettes.light.length)
    expect([...colors.slice(1)].sort()).toEqual([...chartPalettes.light].sort())
    // The blue twin of a blue brand follows the orange instead of leading.
    expect(colors.slice(1).indexOf('#007aff')).toBeGreaterThan(colors.slice(1).indexOf('#ff9500'))
  })

  it('falls back to the readable accent ink when the brand is too pale for the surface', () => {
    render(<SourceProvider theme="light" brandColor="#f5f0d0"><SourceChart label="Visits" {...chartProps} /></SourceProvider>)
    const { accent, accentInk } = brandTokens('#f5f0d0', 'light')
    expect(ratio(accent.toLowerCase(), BRAND_GROUNDS.light.raised)).toBeLessThan(3)
    // The ink leads when it still has colour; a near-gray ink steps aside like any neutral brand.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(accentInk.slice(i, i + 2), 16))
    expect(firstSeries()).toBe(Math.max(r, g, b) - Math.min(r, g, b) < 16 ? chartPalettes.light[0] : accentInk.toLowerCase())
  })

  it('keeps a caller palette', () => {
    render(<SourceProvider><SourceChart label="Visits" {...chartProps} palette={['#123456']} /></SourceProvider>)
    expect((chartMock.setOption.mock.calls.at(-1)![0] as { color: string[] }).color).toEqual(['#123456'])
  })
})

describe('surfaces', () => {
  it('draws PageHeader on its own panel by default, and straight on the page with surface={false}', () => {
    render(<DiyaProvider><PageHeader title="Billing" /><PageHeader title="Invoices" surface={false} /></DiyaProvider>)
    expect(screen.getByRole('region', { name: 'Billing' }).getAttribute('data-surface')).toBe('true')
    expect(screen.getByRole('region', { name: 'Invoices' }).getAttribute('data-surface')).toBe('false')
    const plain = css.match(/\.diya-page-header\[data-surface='false'\]\s*\{([^}]*)\}/)?.[1] ?? ''
    for (const rule of ['padding: 0', 'border: 0', 'background: none', 'box-shadow: none', 'backdrop-filter: none']) expect(plain).toContain(rule)
  })

  it('gives every in-page surface one corner token', () => {
    expect(css).toMatch(/--diya-radius-surface:\s*calc\(16px \* var\(--diya-corner-scale, 1\)\)/)
    for (const selector of ['.diya-card {', '.diya-analytics-card {', '.diya-workflow-surface {', '.diya-table-scroll {', '.diya-page-header {'])
      expect(css.slice(css.indexOf(selector)).split('}')[0], selector).toMatch(/border-radius:\s*var\(--diya-radius-surface\)/)
  })

  it('lines a List in a Card or Drawer up with its title, and leaves button rows their inset', () => {
    expect(css).toMatch(/:is\(\.diya-card-content, \.diya-drawer-body\) \.diya-list > li > div\.diya-list-row \{ padding-inline:0; \}/)
    expect(css).not.toMatch(/\.diya-drawer-body\) \.diya-list > li > button/)
  })

  it('aligns a Switch that has helper text with its label line', () => {
    expect(css).toMatch(/\.diya-switch-field:has\(\.diya-switch-description\) \{ align-items: flex-start; \}/)
  })
})

describe('Metric change chip', () => {
  it('shows a change that means something as a vivid tint behind its label, and leaves neutral changes plain', () => {
    render(<DiyaProvider><Metric value="$42,900" change={{ value: '5%', direction: 'up', meaning: 'positive', comparison: 'vs September' }} /></DiyaProvider>)
    expect(document.querySelector('.diya-metric-change')!.getAttribute('data-meaning')).toBe('positive')
    expect(css).toMatch(/\.diya-metric-change\[data-meaning='positive'\] \{ background: var\(--diya-color-success-surface\); \}/)
    expect(css).toMatch(/\.diya-metric-change\[data-meaning='negative'\] \{ background: var\(--diya-color-error-surface\); \}/)
    expect(css).not.toMatch(/\.diya-metric-change\[data-meaning='neutral'\] \{[^}]*background/)
  })
})

describe('quiet surfaces and type', () => {
  it('lifts in-page surfaces with a soft shadow and the faintest edge', () => {
    expect(css).toMatch(/:is\(\.diya-card, \.diya-analytics-card, \.diya-workflow-surface, \.diya-app-pattern-surface, \.diya-table \.diya-table-scroll\) \{\s*border-color: var\(--diya-internal-surface-border\);/)
    expect(css).toMatch(/--diya-internal-surface-border: color-mix\(in srgb, var\(--diya-color-text\) 8%, transparent\)/)
  })

  it('keeps surface titles at 15px and page titles at the heading size, so content leads', () => {
    expect(css).toMatch(/\.diya-card-title, \.diya-analytics-title, \.diya-project-form-title[^{]*\{\s*font-size: var\(--diya-text-body\);\s*font-weight: 550;/)
    expect(css.slice(css.indexOf('.diya-page-header-title,'))).toMatch(/^[^}]*font-size: var\(--diya-text-heading\);[^}]*font-weight: 540;/)
    expect(css).toMatch(/\.diya-metric\[data-size='large'\] \.diya-metric-number \{ font-size: var\(--diya-text-display\); \}/)
  })
})

describe('Card height', () => {
  it('fills the height it is given, keeping its footer at the bottom', () => {
    expect(css).toMatch(/\.diya-root \.diya-card \{ display:flex; flex-direction:column; \}/)
    expect(css).toMatch(/\.diya-root \.diya-card-body \{ padding:24px; flex:1; display:flex; flex-direction:column; \}/)
    expect(css).toMatch(/\.diya-root \.diya-card-content \{ flex:1; \}/)
  })
})

describe('Glass material', () => {
  const glass = css.slice(css.indexOf("@supports (backdrop-filter: blur(14px)) {\n  .diya-root[data-glass='true'] {\n    --diya-internal-blur: blur(28px) saturate(1.15);"))
  const block = glass.slice(0, glass.indexOf('\n}\n'))
  it('makes every surface see-through glass, cards the clearest and floating layers denser', () => {
    expect(glass.length).toBeGreaterThan(0)
    for (const layer of ['header', 'overlay', 'popup', 'tabs', 'outline', 'field'])
      expect(block).toMatch(new RegExp(`--diya-internal-${layer}-fill: color-mix\\(in srgb, var\\(--diya-color-raised\\) [5-8]\\d%, transparent\\);`))
    expect(block).toContain('--diya-internal-content-fill: color-mix(in srgb, var(--diya-color-raised) 34%, transparent);')
    expect(block).toContain('--diya-internal-content-fill: color-mix(in srgb, var(--diya-color-raised) 35%, transparent);')
    expect(block).toContain('--diya-internal-surface-border: var(--diya-internal-glass-edge);')
    expect(block).toMatch(/:is\(\.diya-card, \.diya-analytics-card[^)]*\) \{\s*background-image: var\(--diya-internal-glass-sheen\);/)
    for (const layer of ['pattern', 'workflow', 'application', 'analytics', 'table'])
      expect(block).toContain(`--diya-internal-${layer}-fill: var(--diya-internal-content-fill);`)
    expect(block).toMatch(/\.diya-root\[data-glass='true'\] \.diya-table \{ --diya-internal-table-surface: transparent; \}/)
  })

  it('never lifts saturation past 1.15, so a backdrop arrives as light rather than a color wash', () => {
    const lifts = [...block.matchAll(/saturate\(([\d.]+)\)/g)].map((m) => Number(m[1]))
    expect(lifts.length).toBeGreaterThan(0)
    for (const lift of lifts) expect(lift).toBeLessThanOrEqual(1.15)
    expect(block).toContain('--diya-internal-content-blur: blur(18px) saturate(1.15) brightness(0.92);')
  })

  it('makes the Site Header and toasts glass, since they float', () => {
    expect(block).toMatch(/\.diya-root\[data-glass='true'\] \.diya-site-header-container \{\s*background: var\(--diya-internal-header-fill\);/)
    expect(block).toMatch(/\.diya-toast-region \.diya-alert \{\s*--diya-internal-alert-fill: var\(--diya-internal-toast-fill\);/)
  })

  it('turns solid under Increase Contrast, which Safari passes through', () => {
    const contrast = css.slice(css.indexOf('@media (prefers-contrast: more) {\n  .diya-root[data-glass'))
    for (const token of ['header', 'overlay', 'content']) expect(contrast).toContain(`--diya-internal-${token}-fill: var(--diya-color-raised);`)
  })

  it('falls back to solid surfaces when people ask for less transparency', () => {
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-transparency: reduce)'))
    for (const token of ['header', 'overlay', 'pattern', 'workflow', 'table']) expect(reduced).toContain(`--diya-internal-${token}-fill: var(--diya-color-raised);`)
    expect(reduced).toContain('--diya-internal-backdrop: none;')
  })

  it('draws a pill Tabs track as a capsule in Glass, like its thumb', () => {
    expect(css).toMatch(/\.diya-root\[data-glass='true'\] \.diya-tabs\[data-variant='pill'\] \.diya-tab-list \{\s*border-radius: 999px;\s*\}/)
  })
})
