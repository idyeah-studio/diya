import { RULES, SETUP } from '../../components/reference/ai-docs'
import { SITE } from '../../components/reference/api'
import { DEFAULT_APPEARANCE, withOverrides } from '../customize/appearance'
import { contrast, mix, normalizeHex } from '../customize/color'
import { accentSet } from '../customize/tokens'
import { MCP_API, mcpEntries, type McpEntry, type McpProp, type McpSlot } from './catalog'

/*
 * The five MCP tools as plain functions: arguments in, Markdown out. Short,
 * plain and token-cheap, because an agent reads every word. server.ts wraps
 * them; tests call them directly.
 */

const API = MCP_API
const HEAD = `${API.package} ${API.version}`
const ASK = `${SITE}/ask`
const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const STOP = new Set(
  'a an the for with to of and or i we need want my our in on at component components ui use using show make build add some that this it is page screen like'.split(' ')
)

/** Words people say for things DIYA calls something else. Values are api.json ids. */
const SYNONYMS: Record<string, string[]> = {
  toggle: ['switch'], onoff: ['switch'], checkbox: ['choice'], checkboxes: ['choice'], radio: ['choice'], radios: ['choice'],
  modal: ['dialog'], confirm: ['dialog'], popup: ['dialog', 'popover'], sheet: ['drawer'], panel: ['drawer'], sidepanel: ['drawer'],
  dropdown: ['select', 'menu'], picker: ['select', 'combobox', 'date-picker'], autocomplete: ['combobox'], typeahead: ['combobox'],
  multiselect: ['combobox'], pick: ['select', 'combobox', 'choice'], choose: ['select', 'combobox', 'choice'], option: ['select', 'choice'],
  country: ['combobox'], timezone: ['combobox'], currency: ['select'],
  input: ['text-input'], field: ['text-input'], textfield: ['text-input'], email: ['text-input'], password: ['text-input'],
  textarea: ['text-area'], multiline: ['text-area'], calendar: ['calendar', 'date-picker'], date: ['date-picker'], daterange: ['date-picker'],
  day: ['calendar', 'date-picker'], booking: ['calendar'], appointment: ['calendar'], availability: ['calendar'], agenda: ['calendar'], schedule: ['calendar'],
  range: ['slider', 'date-picker'], sidebar: ['side-navigation'], nav: ['side-navigation', 'site-header'],
  navigation: ['side-navigation', 'site-header'], navbar: ['site-header'], topbar: ['site-header'], header: ['site-header', 'page-header'],
  title: ['page-header'], snackbar: ['toast'], notification: ['toast', 'alert'], banner: ['alert'], callout: ['alert'],
  warning: ['alert'], chart: ['data-viz'], graph: ['data-viz'], plot: ['data-viz'], kpi: ['metric'], stat: ['metric'],
  stats: ['metric'], grid: ['table'], datagrid: ['table'], rows: ['table'], empty: ['content-state'], zero: ['content-state'],
  nothing: ['content-state'], loading: ['content-state', 'progress'], stepper: ['wizard'], steps: ['wizard'], onboarding: ['wizard'],
  upload: ['file-upload'], dropzone: ['file-upload'], attach: ['file-upload'], chat: ['chatbot'], assistant: ['chatbot'],
  spinner: ['progress'], loader: ['progress'], chip: ['tag'], label: ['badge', 'tag'], count: ['badge'], collapse: ['accordion'],
  disclosure: ['accordion'], faq: ['accordion'], hint: ['tooltip'], help: ['tooltip', 'popover'], link: ['text-link'],
  anchor: ['text-link'], crumbs: ['breadcrumbs'], pager: ['pagination'], filter: ['search'], layout: ['stack', 'inline'],
  column: ['stack'], row: ['inline'], flex: ['stack', 'inline'], gap: ['stack', 'inline'], spacing: ['stack', 'inline'],
  theme: ['diya-provider'], provider: ['diya-provider'], dark: ['diya-provider'], brand: ['diya-provider'],
  motion: ['diya-provider'], animation: ['diya-provider'], transition: ['diya-provider'], reduce: ['diya-provider'],
  settings: ['form', 'switch', 'choice'], profile: ['form', 'avatar'], login: ['form', 'text-input'], signup: ['form', 'text-input'],
  user: ['avatar'], dashboard: ['metric', 'data-viz', 'table', 'side-navigation'], action: ['button'], cta: ['button'],
  submit: ['button', 'form'], save: ['button'], tile: ['card'], star: ['rating'], stars: ['rating'], review: ['rating'],
  reviews: ['rating'], score: ['rating', 'metric'], article: ['prose'], markdown: ['prose'], typography: ['prose'],
  docs: ['prose'], blog: ['prose'], changelog: ['prose'], terms: ['prose'], snippet: ['code-block'], pre: ['code-block'],
  clipboard: ['code-block'], monospace: ['code-block'],
}

/** Things people ask for that DIYA doesn't have, with the honest answer. */
const GAPS: Record<string, string> = {
  icon: 'DIYA ships no icon set. Pass any React icon (for example from lucide-react) to icon slots.',
  carousel: `No carousel in DIYA ${API.version}.`,
  slideshow: `No carousel in DIYA ${API.version}.`,
  tree: `No tree view in DIYA ${API.version}.`,
  kanban: `No board or kanban in DIYA ${API.version}.`,
  colorpicker: `No color picker in DIYA ${API.version}.`,
  editor: `No rich-text editor in DIYA ${API.version}; Text Area covers plain text.`,
  skeleton: `No skeleton loader in DIYA ${API.version}; Content State and Table have loading states.`,
  appshell: `No AppShell in DIYA ${API.version}; compose Site Header, Side Navigation and Stack.`,
}

type Ranked = { entry: McpEntry; score: number }

function terms(query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word && !STOP.has(word))
  return [...new Set(words.flatMap((word) => (word.length > 3 && word.endsWith('s') ? [word, word.slice(0, -1)] : [word])))]
}

const startsWord = (text: string, term: string) => new RegExp(`\\b${term}`).test(text)

function rank(query: string): { terms: string[]; results: Ranked[] } {
  const wanted = terms(query)
  const phrase = norm(query)
  const scored = mcpEntries().map((entry) => {
    const use = (entry.catalog?.guidance.use ?? '').toLowerCase()
    const instead = (entry.catalog?.guidance.instead ?? '').toLowerCase()
    const description = (entry.component?.description ?? '').toLowerCase()
    const props = Object.keys(entry.component?.props ?? {}).map(norm)
    const titleWords = entry.title.toLowerCase().split(/\s+/)
    let score = [entry.exportName, entry.title, entry.id].some((key) => norm(key) === phrase) ? 20 : 0
    for (const term of wanted) {
      if (norm(entry.exportName) === term || norm(entry.title) === term) score += 12
      else if (titleWords.includes(term)) score += 6
      const synonyms = SYNONYMS[term]
      if (synonyms?.includes(entry.id)) score += 8 / synonyms.length + 4
      if (startsWord(use, term)) score += 2
      if (startsWord(instead, term)) score += 0.5
      if (startsWord(description, term)) score += 1
      if (props.includes(term)) score += 1
    }
    return { entry, score }
  })
  const sorted = scored.filter((s) => s.score >= 2).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
  // Keep the clear answers: anything under a third of the best match is noise.
  const best = sorted[0]?.score ?? 0
  return { terms: wanted, results: sorted.filter((s) => s.score >= best / 3) }
}

/** search_components. `found` is false when nothing in DIYA fits, the signal /ask is for. */
export function searchComponents({ query, limit = 5 }: { query: string; limit?: number }) {
  const { terms: wanted, results } = rank(query)
  const gaps = [...new Set(wanted.map((term) => GAPS[term] ?? GAPS[term.replace(/s$/, '')]).filter(Boolean))]
  const top = results.slice(0, Math.min(Math.max(Math.trunc(limit), 1), 10))
  const out = [`${HEAD} · ${top.length ? `${top.length} for "${query}"` : `nothing for "${query}"`}`, '']
  if (gaps.length) out.push(...gaps, '')
  if (top.length) {
    top.forEach(({ entry }, index) => {
      const use = entry.catalog?.guidance.use ?? entry.component?.description ?? ''
      out.push(`${index + 1}. ${entry.title} · \`import { ${entry.exportName} } from '${entry.importFrom}'\`${entry.kind === 'pattern' ? ' · pattern' : ''}`)
      out.push(`   ${use}`)
      if (entry.catalog?.guidance.instead) out.push(`   Not quite? ${entry.catalog.guidance.instead}`)
    })
    out.push('', 'Next: get_component with a name, for its props and a complete file.')
  } else {
    out.push(`Nothing in DIYA fits that yet. Build it from Stack and Inline, or ask for it: ${ASK}`)
  }
  return { text: out.join('\n'), found: top.length > 0 }
}

function find(name: string) {
  const key = norm(name)
  const entries = mcpEntries()
  return (
    entries.find((e) => [e.exportName, e.id, e.title, e.catalog?.id].some((k) => k !== undefined && norm(k) === key)) ??
    entries.find((e) => e.variants.some((variant) => norm(variant) === key)) ??
    (SYNONYMS[key]?.length === 1 ? entries.find((e) => e.id === SYNONYMS[key][0]) : undefined)
  )
}

/** The api.json id get_component answers for this name, or null when DIYA has no such export. Never the name itself. */
export function componentIdFor(name: string): string | null {
  return find(name)?.id ?? null
}

const quoteDefault = (value: unknown) => (typeof value === 'string' ? `'${value}'` : JSON.stringify(value))
const propLine = ([name, prop]: [string, McpProp]) =>
  `- \`${name}${prop.required ? '' : '?'}: ${prop.type}${prop.default === undefined ? '' : ` = ${quoteDefault(prop.default)}`}\`${prop.description ? ` ${prop.description}` : ''}${prop.since ? ` Since ${prop.since}.` : ''}`
const sortProps = (props: Record<string, McpProp>) =>
  Object.entries(props).sort((a, b) => Number(b[1].required) - Number(a[1].required) || a[0].localeCompare(b[0]))

function slotLine(path: string, slot: Partial<McpSlot>) {
  const accepts = slot.accepts
  const what = accepts === 'any' ? 'any React content' : accepts?.length ? accepts.join(', ') : (slot.content ?? []).join(' or ') || 'content'
  return `- \`${path}\`: ${slot.as === 'render' ? 'a function that returns ' : ''}${what}${slot.multiple ? ', several' : ''}`
}

/** Exported types the props mention (one level deep), so an agent can build their values. */
function referencedTypes(entry: McpEntry) {
  const component = entry.component
  if (!component) return []
  const seen: string[] = []
  const scan = (text: string, depth: number) => {
    for (const [, name] of text.matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)) {
      if (name === component.propsType || seen.includes(name) || !API.types[name] || name.endsWith('Props')) continue
      seen.push(name)
      if (depth < 1) scan(API.types[name], depth + 1)
    }
  }
  for (const prop of Object.values(component.props)) scan(prop.type, 0)
  for (const mode of component.modes ?? []) for (const prop of Object.values(mode.props)) scan(prop.type, 0)
  return seen.map((name) => {
    const source = API.types[name]
    const generic = /^(<[^>]+>)\s*/.exec(source)
    return generic ? `type ${name}${generic[1]} = ${source.slice(generic[0].length)}` : `type ${name} = ${source}`
  })
}

/** README examples for exports that have no catalog page. */
const EXTRA_EXAMPLES: Record<string, string> = {
  Stack:
    '```tsx\n<Stack gap={5} as="section">\n  <PageHeader title="Billing" />\n  <Inline gap={2} justify="end">\n    <Button variant="outline">Cancel</Button>\n    <Button>Save</Button>\n  </Inline>\n</Stack>\n```\n`gap` takes a step from 0 to 8 (0, 4, 8, 12, 16, 24, 32, 48 and 64px) or any CSS length.',
  Inline:
    '```tsx\n<Inline gap={2} justify="end">\n  <Button variant="outline">Cancel</Button>\n  <Button>Save</Button>\n</Inline>\n```\nCenters its children and wraps them onto the next line when the row runs out of room.',
  DiyaProvider: 'get_setup has the app root; get_theme has brandColor, glass, fonts and motion.',
  Toast: 'Render it where the message belongs; it floats above the page and dismisses itself.',
}

export const COMPONENT_SECTIONS = ['props', 'accessibility', 'example', 'tokens', 'messages'] as const
export type ComponentSection = (typeof COMPONENT_SECTIONS)[number]

/** get_component */
export function getComponent({ name, include }: { name: string; include?: ComponentSection[] }) {
  const entry = find(name)
  if (!entry) {
    const near = rank(name).results.slice(0, 3).map(({ entry: e }) => e.exportName)
    return `No DIYA export called "${name}".${near.length ? ` Closest: ${near.join(', ')}.` : ''} search_components lists what exists.`
  }
  const want = new Set<ComponentSection>(include?.length ? include : ['props', 'accessibility', 'example'])
  const { item, component, catalog } = entry
  const needs = [
    item.requires.peers.length ? `needs ${item.requires.peers.map((peer) => `\`${peer}\``).join(', ')} installed` : '',
    item.requires.provider ? 'renders inside DiyaProvider' : '',
  ].filter(Boolean)
  const out = [
    `# ${entry.title} (\`${entry.exportName}\`) · ${entry.kind} · ${item.stability} since ${item.since}`,
    `\`import { ${entry.exportName} } from '${entry.importFrom}'\`${needs.length ? ` · ${needs.join(' · ')}` : ''}`,
    component?.description ?? '',
  ]
  if (item.stability !== 'stable') out.push('Experimental: its API may change in a minor release.')
  if (entry.variants.length) out.push(`Also exported: ${entry.variants.map((variant) => `\`${variant}\``).join(', ')}.`)
  if (catalog) out.push('', `When: ${catalog.guidance.use}${catalog.guidance.instead ? ` ${catalog.guidance.instead}` : ''}`)
  if (want.has('props') && component) {
    out.push('', '## Props', ...sortProps(component.props).map(propLine))
    if (component.extendsDom) out.push(`Also takes native \`<${component.extendsDom}>\` attributes, a ref, \`className\` and \`style\`.`)
    for (const mode of component.modes ?? []) {
      const when = Object.entries(mode.when).map(([key, value]) => `\`${key}={${JSON.stringify(value)}}\``).join(', ')
      const props = sortProps(mode.props).filter(([, prop]) => prop.type !== 'never')
      out.push('', `When ${when}${mode.default ? ' (the default)' : ''}:`, ...props.map(propLine))
    }
    const children = item.children.allowed ? slotLine('children', item.children) : '- `children`: not taken'
    out.push('', '## Content', children, ...Object.entries(item.slots).map(([path, slot]) => slotLine(path, slot)))
    if (item.state.length) {
      out.push(
        '',
        '## State',
        ...item.state.map((pair) => `- Controlled: \`${pair.value}\` with \`${pair.onChange}\`${pair.default ? `; uncontrolled: \`${pair.default}\`` : ''}.`)
      )
    }
    const types = referencedTypes(entry)
    if (types.length) out.push('', '## Types', '```ts', ...types, '```')
  }
  if (want.has('accessibility') && catalog) out.push('', '## Accessibility', catalog.guidance.access)
  if (want.has('tokens')) out.push('', '## Tokens it reads', item.tokens.map((token) => `\`${token}\``).join(', ') || 'None.')
  if (want.has('messages') && item.messages) {
    out.push(
      '',
      `## Built-in text (\`messages.${item.messages}\` on DiyaProvider)`,
      ...Object.entries(API.messages[item.messages] ?? {}).map(([key, message]) =>
        message.kind === 'function' ? `- \`${key}\`: \`${message.default}\`` : `- \`${key}\`: "${message.default}"`
      )
    )
  }
  if (want.has('example')) {
    if (catalog) out.push('', `## Complete file (\`${catalog.fileName}\`)`, '```tsx', catalog.file.trimEnd(), '```')
    else if (EXTRA_EXAMPLES[entry.exportName]) out.push('', '## Example', EXTRA_EXAMPLES[entry.exportName])
  }
  out.push('', `Catalog: ${catalog?.url ?? `${SITE}/explore`}`)
  return out.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n')
}

export type Framework = 'next' | 'vite' | 'other'
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

const fence = (language: string, code: string) => ['```' + language, code, '```']

/** The root files get_setup hands out, by name. Also type-checked by the tests. */
export function setupFiles({ framework = 'next', tailwind = false }: { framework?: Framework; tailwind?: boolean }) {
  const pkg = API.package
  if (framework === 'next') {
    return {
      'app/providers.tsx': `'use client'\nimport Link from 'next/link'\nimport type { ReactNode } from 'react'\nimport { DiyaProvider } from '${pkg}'\n\nexport function Providers({ children }: { children: ReactNode }) {\n  return <DiyaProvider linkComponent={Link}>{children}</DiyaProvider>\n}`,
      'app/layout.tsx': `import type { ReactNode } from 'react'\nimport { Providers } from './providers'\n${tailwind ? "import './globals.css'" : `import '${pkg}/styles.css'`}\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <Providers>{children}</Providers>\n      </body>\n    </html>\n  )\n}`,
    }
  }
  return {
    'src/main.tsx': `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport { DiyaProvider } from '${pkg}'\n${tailwind ? "import './index.css'" : `import '${pkg}/styles.css'\nimport './index.css'`}\nimport App from './App'\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <DiyaProvider>\n      <App />\n    </DiyaProvider>\n  </StrictMode>,\n)`,
  }
}

/** get_setup */
export function getSetup({
  framework = 'next',
  tailwind = false,
  charts = false,
  packageManager = 'npm',
}: { framework?: Framework; tailwind?: boolean; charts?: boolean; packageManager?: PackageManager }) {
  const add = { npm: 'npm install', pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' }[packageManager]
  const where = framework === 'next' ? 'Next.js (App Router)' : framework === 'vite' ? 'Vite' : 'a React app'
  const out = [`# Set up ${HEAD} in ${where}`, '', '## 1. Install', ...fence('sh', `${add} ${API.package}${charts ? ' echarts@6' : ''}`)]
  let step = 2
  if (tailwind) {
    out.push(
      '',
      `## ${step++}. ${framework === 'next' ? 'app/globals.css' : 'src/index.css'} (Tailwind v4: DIYA above Tailwind's base, below its utilities)`,
      ...fence('css', `@layer theme, base, diya, components, utilities;\n@import "tailwindcss";\n@import "${API.package}/styles.css";`)
    )
  }
  const notes: Record<string, string> = {
    'app/providers.tsx': 'a client file, so Link and functions can reach the provider',
    'app/layout.tsx': 'the root layout',
    'src/main.tsx': framework === 'vite' ? 'the entry' : 'or wherever your app mounts',
  }
  for (const [file, code] of Object.entries(setupFiles({ framework, tailwind }))) {
    out.push('', `## ${step++}. ${file} (${notes[file]})`, ...fence('tsx', code))
  }
  if (charts) out.push('', `Charts import from \`${API.package}/charts\`.`)
  out.push(
    '',
    '## Rules',
    RULES,
    '',
    `These notes describe ${API.version}. If \`npm ls ${API.package}\` shows an older version, upgrade first; get_component says when each item arrived.`
  )
  return out.join('\n')
}

type Theme = 'light' | 'dark'
const THEMES: Theme[] = ['light', 'dark']
const themeName = (theme: Theme) => (theme === 'light' ? 'Light' : 'Dark')
export type ThemeArgs = {
  brandColor?: string | { light: string; dark: string }
  theme?: 'system' | 'light' | 'dark'
  glass?: boolean
  fontFamily?: string
  corners?: number
  /** Only a choice away from the device's own setting becomes a prop. */
  motion?: 'system' | 'reduced' | 'off'
}

/** The provider line get_theme recommends, as JSX. Also type-checked by the tests. */
export function themeProviderLine({ brandColor, theme, glass, fontFamily, corners, motion }: ThemeArgs) {
  const props: string[] = []
  if (typeof brandColor === 'string') props.push(`brandColor="${normalizeHex(brandColor)}"`)
  else if (brandColor) props.push(`brandColor={{ light: '${normalizeHex(brandColor.light)}', dark: '${normalizeHex(brandColor.dark)}' }}`)
  if (theme && theme !== 'system') props.push(`theme="${theme}"`)
  if (glass) props.push('glass')
  if (motion && motion !== 'system') props.push(`motion="${motion}"`)
  if (fontFamily) {
    // JSX attribute strings take no escapes: quote with whichever mark the stack doesn't use.
    props.push(!fontFamily.includes("'") ? `fontFamily='${fontFamily}'` : !fontFamily.includes('"') ? `fontFamily="${fontFamily}"` : `fontFamily={${JSON.stringify(fontFamily)}}`)
  }
  if (corners !== undefined) props.push(`style={{ '--diya-corner-scale': ${corners} } as CSSProperties}`)
  return `<DiyaProvider${props.length ? ` ${props.join(' ')}` : ''}>`
}

/** A shade of `color` that reaches 3:1 against `ground`, moving toward white on dark grounds and black on light ones. */
function visibleShade(color: string, ground: string, theme: Theme) {
  const toward = theme === 'dark' ? '#FFFFFF' : '#000000'
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(toward, color, step / 20)
    if (contrast(candidate, ground) >= 3) return candidate
  }
  return toward
}

/** get_theme */
export function getTheme(args: ThemeArgs) {
  const { brandColor } = args
  const source = typeof brandColor === 'string' ? { light: brandColor, dark: brandColor } : brandColor
  const hex = source && { light: normalizeHex(source.light), dark: normalizeHex(source.dark) }
  if (hex && (!hex.light || !hex.dark)) {
    return `brandColor takes a hex color, such as "#1F4E7A", or { light, dark } with one for each theme. ${JSON.stringify(brandColor)} isn't one.`
  }
  const appearance = withOverrides(
    DEFAULT_APPEARANCE,
    hex ? { 'colors.light.accent': hex.light!, 'colors.dark.accent': hex.dark! } : {}
  )
  const sets = { light: accentSet(appearance, 'light'), dark: accentSet(appearance, 'dark') }
  const out = [
    `# Theme for ${HEAD}`,
    '',
    ...fence('tsx', themeProviderLine(args)),
    ...(args.corners !== undefined ? ["The corner scale needs `import type { CSSProperties } from 'react'`."] : []),
    '',
    "That's the whole theme. DIYA works out the rest, so don't set these tokens yourself:",
    '',
    '| Token | Light | Dark |',
    '| --- | --- | --- |',
    `| \`--diya-color-accent\` | ${THEMES.map((t) => `\`${sets[t].accent}\` (text on it ${contrast(sets[t].text, sets[t].accent).toFixed(1)}:1)`).join(' | ')} |`,
    `| \`--diya-color-accent-text\` | ${THEMES.map((t) => `\`${sets[t].text}\``).join(' | ')} |`,
    `| \`--diya-color-accent-soft\` | ${THEMES.map((t) => `\`${sets[t].soft}\``).join(' | ')} |`,
    `| \`--diya-color-accent-ink\` | ${THEMES.map((t) => `\`${sets[t].ink}\``).join(' | ')} |`,
  ]
  const notes: string[] = []
  if (hex) {
    for (const theme of THEMES) {
      const ground = appearance.colors[theme].background
      const accent = sets[theme].accent
      const ratio = contrast(accent, ground)
      if (ratio < 3) {
        const shade = visibleShade(accent, ground, theme)
        const pair = { ...hex, [theme]: shade }
        notes.push(
          `In ${themeName(theme)}, ${accent} sits at ${ratio.toFixed(1)}:1 against the page (${ground}), so solid buttons stand out less than DIYA's own; their labels still read. If you'd like them to stand out, ${theme} could use ${shade}: \`brandColor={{ light: '${pair.light}', dark: '${pair.dark}' }}\`.`
        )
      }
      if (sets[theme].ink !== accent) notes.push(`In ${themeName(theme)}, brand-colored text uses ${sets[theme].ink} so it reads at 4.5:1.`)
    }
  }
  if (notes.length) out.push('', '## Notes', ...notes.map((note) => `- ${note}`))
  out.push(
    '',
    '## Other settings',
    '- Corners: `--diya-corner-scale` (0 square, 1 default, 2 round) scales every control radius.',
    '- Font: `fontFamily` on the provider sets `--diya-font`.',
    '- Glass: `glass` gives headers, popups and tabs a translucent, blurred finish.',
    '- Anything else: public `--diya-*` tokens on `.diya-root` (list_tokens). Never override DIYA\'s internal `.diya-*` classes.',
    `- Try it live: ${SITE}/explore (Customize).`
  )
  return out.join('\n')
}

/** list_tokens */
export function listTokens({ group }: { group?: string }) {
  const all = Object.entries(API.tokens).filter(([name]) => name !== '--diya-brand')
  const groups = [...new Set(all.map(([, token]) => token.group))]
  const picked = group ? all.filter(([, token]) => token.group === group) : all
  if (!picked.length) return `No token group "${group}". Groups: ${groups.join(', ')}.`
  const value = ({ light, dark }: { light: string | null; dark: string | null }) =>
    light == null && dark == null ? 'unset' : light === dark ? `\`${light}\`` : `\`${light}\` / \`${dark}\``
  const out = [
    `# Public tokens · ${HEAD}${group ? ` · ${group}` : ''}`,
    'Set them on `.diya-root`, or in `style` on DiyaProvider. Values are Light / Dark.',
  ]
  for (const name of groups) {
    const rows = picked.filter(([, token]) => token.group === name)
    if (!rows.length) continue
    out.push('', `## ${name}`)
    for (const [token, meta] of rows) {
      const setBy = meta.setBy ? ` · set by \`${meta.setBy}\`, not directly` : ''
      const since = meta.since ? ` · since ${meta.since}` : ''
      const pairs = meta.pairsWith.length ? ` · change with ${meta.pairsWith.map((other) => `\`${other}\``).join(', ')}` : ''
      out.push(`- \`${token}\` ${value(meta.defaults)}${since}${setBy}${pairs}`)
    }
  }
  return out.join('\n')
}

/** The diya://rules resource. */
export function rulesResource() {
  return `# ${HEAD}\n\n${SETUP}\n\n## Rules\n\n${RULES}\n`
}

export const SERVER_INSTRUCTIONS = `DIYA (${API.package}) is a React component library with its own CSS: no Tailwind classes needed, and no component takes color props.
Before you write DIYA code: call get_setup once per app; use search_components to pick; call get_component for every component you use and pass only the props it lists. Start from its complete file.
Lay screens out with Stack and Inline. Theme with get_theme (one brandColor on DiyaProvider), never by overriding .diya-* classes.`

/** The build_screen prompt's text. */
export function buildScreenPrompt({ screen, framework }: { screen: string; framework?: string }) {
  return `Build ${screen} with DIYA (${API.package}).

1. Call get_setup${framework ? ` with framework "${framework}"` : ''} and check that the app root has DiyaProvider and the styles import. Add them if not.
2. List the parts of the screen. For each, call search_components and pick one.
3. Call get_component for every component you picked. Use only the props it lists, and start from its complete file.
4. Lay the screen out with Stack and Inline instead of hand-written flex CSS. One solid Button per area; the rest outline or quiet.
5. If the brand color is known, call get_theme and set it once on DiyaProvider.
6. Run the project's type check and fix anything it reports.`
}

export { HEAD as MCP_HEAD }
