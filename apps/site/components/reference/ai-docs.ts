import { componentIds, patternIds } from '../../lib/catalog-route'
import type { ItemId } from '../../lib/customize/registry'
import { snippetFor } from '../code/snippets'
import { API, defaultText, itemReference, itemUrl, MCP_INSTALL, MCP_URL, publicTokens, SITE, type ItemReference } from './api'
import { guidance } from './guidance'

/*
 * The AI channel: /llms.txt, /llms-full.txt and each page's "Copy for AI"
 * brief, all written from the SDK's api.json, the catalog's guidance and
 * the same complete files Get code gives people.
 */

const ids: ItemId[] = [...componentIds, ...patternIds]
const fence = (language: string, code: string) => `\`\`\`${language}\n${code.trimEnd()}\n\`\`\``
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Install and the one-time provider setup, as Markdown. Also served by the MCP server. */
export const SETUP = `${fence('sh', `npm install ${API.package}`)}

Once, at the app's root (\`app/layout.tsx\` in Next.js, \`src/main.tsx\` in Vite):

${fence(
  'tsx',
  `import '${API.package}/styles.css'
import { DiyaProvider } from '${API.package}'

<DiyaProvider theme="system">{children}</DiyaProvider>`
)}`

/** The rules every DIYA screen follows, as a Markdown list. Also served by the MCP server. */
export const RULES = `- Every component renders inside \`DiyaProvider\`; popups, tooltips and toasts need it. Its \`theme\` defaults to \`"system"\` (follows the OS light or dark setting, in CSS, with no flash); pass \`"light"\` or \`"dark"\` to fix it. It paints its own background and text color; \`surface={false}\` leaves that to your page.
- Fields work controlled (\`value\` with \`onValueChange\`; Switch: \`checked\` with \`onCheckedChange\`) or uncontrolled (\`defaultValue\`; Switch: \`defaultChecked\`). Native \`name\`, \`onChange\` and \`onBlur\` reach the native control, so react-hook-form \`register()\` works on TextInput, TextArea, Select, Switch, Choice and Slider without a Controller. Labels are required, even when hidden with \`hideLabel\`.
- Lay screens out with \`Stack\` (vertical) and \`Inline\` (horizontal, wrapping): \`gap\` takes a spacing step (1–8) or any CSS length, plus \`align\`, \`justify\`, \`wrap\` and \`as\`.
- One brand color, set once: \`<DiyaProvider brandColor="#1F4E7A">\`, or \`{ light, dark }\`. Components take no color props; \`tone\` picks a status.
- Every component takes \`className\`, \`style\` and its root element's attributes. Theme with public \`--diya-*\` tokens on \`.diya-root\`, never by overriding internal classes. DIYA's CSS sits in \`@layer diya\`, so your CSS and Tailwind utilities win.
- Links: items with \`href\` render the provider's \`linkComponent\` (such as Next.js \`Link\`, passed from a \`'use client'\` providers file) or a plain anchor. Button takes \`href\` and \`asChild\`.
- DIYA ships no icon set. Pass any React icon (for example from lucide-react) to icon slots.
- Charts import from \`${API.package}/charts\` and need \`echarts@6\` installed.
- Next.js App Router: DIYA components are client components; a file that passes functions as props needs \`'use client'\`.`

function propsTable(reference: Pick<ItemReference, 'props' | 'extendsDom'>) {
  const rows = reference.props.map(([name, prop]) => {
    const fallback = defaultText(prop)
    return `| \`${name}\`${prop.required ? ' (required)' : ''} | \`${cell(prop.type)}\` | ${fallback ? `\`${cell(fallback)}\`` : ''} | ${cell(prop.description)} |`
  })
  const native = reference.extendsDom ? `\n\nAlso takes the native \`<${reference.extendsDom}>\` attributes.` : ''
  return `| Prop | Type | Default | Description |\n| --- | --- | --- | --- |\n${rows.join('\n')}${native}`
}

function guidanceText(id: ItemId) {
  const { use, instead, access } = guidance[id]
  return { when: instead ? `${use} ${instead}` : use, access }
}

/** One item: what it is, when to use it, its props and a complete example. `level` is its heading level. */
function itemSection(id: ItemId, level: 1 | 2, withSetup: boolean) {
  const reference = itemReference(id)
  if (!reference) return ''
  const h = '#'.repeat(level)
  const { when, access } = guidanceText(id)
  const snippet = snippetFor(id, {})
  const variants = reference.variants.length ? ` Also exported: ${reference.variants.map((name) => `\`${name}\``).join(', ')}.` : ''
  return [
    `${h} ${reference.title} (\`${reference.exportName}\`)`,
    `${reference.description}${variants}`,
    `Import from \`${reference.importFrom}\` · ${reference.kind} · ${reference.stability} since ${reference.since} · ${itemUrl(id)}`,
    ...(withSetup ? [`${h}# Install and set up`, SETUP] : []),
    `${h}# When to use`,
    when,
    `${h}# Props`,
    propsTable(reference),
    `${h}# Accessibility`,
    access,
    `${h}# Complete example (\`${snippet.fileName}\`)`,
    fence('tsx', snippet.file),
  ].join('\n\n')
}

/** The "Copy for AI" brief for one item page. */
export function itemBrief(id: ItemId) {
  return `${itemSection(id, 1, true)}

## Rules for ${API.package}

${RULES}

More: ${SITE}/llms-full.txt (every component and pattern) · ${SITE}/api.json (machine-readable) · ${MCP_URL} (MCP server for your editor)
`
}

/** /llms.txt: the index, per llmstxt.org. */
export function llmsIndex() {
  const line = (id: ItemId) => {
    const reference = itemReference(id)
    if (!reference) return ''
    const experimental = reference.stability === 'stable' ? '' : ' Experimental: its API may change in a minor release.'
    return `- [${reference.title}](${itemUrl(id)}): \`${reference.exportName}\`. ${reference.description}${experimental}`
  }
  return `# DIYA

> ${API.package} ${API.version}: React components and patterns for product UI, in Light, Dark and Glass. MIT. No Tailwind needed. Install one package, wrap the app in DiyaProvider, and import what you need.

${SETUP}

${RULES}

## Docs

- [Everything in one file](${SITE}/llms-full.txt): every component and pattern with props, guidance and a complete example, plus the public tokens
- [api.json](${SITE}/api.json): the same API, machine-readable (schema v${API.schemaVersion}); also shipped as \`${API.package}/api.json\`
- [MCP server](${MCP_URL}): connect Claude Code, Cursor or VS Code once, and your editor looks DIYA up while it writes: components, props, complete files and theming. Read-only, no account. Claude Code: \`${MCP_INSTALL.claude}\`
- [Catalog](${SITE}/explore): live playgrounds

## Components

${componentIds.map(line).filter(Boolean).join('\n')}

## Patterns

${patternIds.map(line).filter(Boolean).join('\n')}
`
}

/** /llms-full.txt: the whole library in one Markdown file. */
export function llmsFull() {
  const tokens = publicTokens()
    .map(([name, token]) => {
      const light = token.defaults?.light
      const dark = token.defaults?.dark
      const value = light && dark ? (light === dark ? `\`${light}\`` : `\`${light}\` light, \`${dark}\` dark`) : ''
      return `| \`${name}\` | ${token.group ?? ''} | ${value} |`
    })
    .join('\n')
  return `# DIYA, the full reference

> ${API.package} ${API.version}. Every component and pattern, from api.json. Index: ${SITE}/llms.txt

## Install and set up

${SETUP}

## Rules

${RULES}

## Public tokens

Set these on \`.diya-root\` (or a class on DiyaProvider) after importing the styles. They are stable through 1.x.

| Token | Group | Default |
| --- | --- | --- |
${tokens}

${ids.map((id) => itemSection(id, 2, false)).filter(Boolean).join('\n\n---\n\n')}

---

## Other exports

${otherExports()}
`
}

/** Exports no catalog page documents on its own: the provider, Toast, Chart. */
function otherExports() {
  const documented = new Set(ids.map((id) => itemReference(id)?.exportName))
  return Object.entries(API.components)
    .filter(([name]) => !documented.has(name))
    .map(([name, component]) => {
      const from = component.entry === '.' ? API.package : `${API.package}/${component.entry.replace(/^\.\//, '')}`
      const props = Object.entries(component.props).sort((a, b) => Number(b[1].required) - Number(a[1].required) || a[0].localeCompare(b[0]))
      return `### \`${name}\`\n\n${component.description} Import from \`${from}\`.\n\n${propsTable({ props, extendsDom: component.extendsDom })}`
    })
    .join('\n\n')
}
