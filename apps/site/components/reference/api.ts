import api from './api-data'
import { componentIds } from '../../lib/catalog-route'
import { customizeItems, type ItemId } from '../../lib/customize/registry'
import { SITE } from '../../lib/site'

/** The parts of the SDK's api.json (schema v1) the site reads. */
export type ApiProp = {
  type: string
  description: string
  required: boolean
  default?: unknown
  values?: string[]
}
export type ApiComponent = { description: string; entry: string; extendsDom?: string; props: Record<string, ApiProp>; propsType?: string }
type ApiItem = {
  title: string
  kind: string
  stability: string
  since: string
  exports: { entry: string; name: string }[]
}
type ApiToken = { defaults?: { light?: string; dark?: string }; group?: string; kind?: string; setBy?: string }
type Api = {
  schemaVersion: number
  package: string
  version: string
  items: Record<string, ApiItem>
  components: Record<string, ApiComponent>
  tokens: Record<string, ApiToken>
}

export const API = api as unknown as Api

/** The export each catalog page documents. */
export const EXPORT_NAMES: Record<ItemId, string> = {
  button: 'Button', 'text-input': 'TextInput', 'text-area': 'TextArea', select: 'Select',
  'date-picker': 'DatePicker', calendar: 'Calendar', combobox: 'Combobox', choice: 'Choice', switch: 'Switch', slider: 'Slider',
  search: 'Search', link: 'TextLink', pagination: 'Pagination', tabs: 'Tabs', breadcrumbs: 'Breadcrumbs',
  menu: 'Menu', tag: 'Tag', metric: 'Metric', rating: 'Rating', avatar: 'Avatar', list: 'List',
  accordion: 'Accordion', prose: 'Prose', 'code-block': 'CodeBlock',
  badge: 'Badge', alert: 'Alert', progress: 'Progress', tooltip: 'Tooltip', popover: 'Popover',
  'page-header': 'PageHeader', 'site-header': 'SiteHeader', 'side-navigation': 'SideNavigation', card: 'Card',
  table: 'Table', 'data-viz': 'DataViz', form: 'Form', wizard: 'Wizard', 'file-upload': 'FileUpload',
  chatbot: 'Chatbot', dialog: 'Dialog', drawer: 'Drawer', 'empty-state': 'ContentState',
}

/** `TextLink` → `text-link`: the api.json id for an export from 1.0's id fix on. */
export const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

export { SITE }

/** DIYA's hosted MCP server: stateless, read-only, gated with the catalog. */
export const MCP_URL = `${SITE}/mcp`
const mcpEntry = { url: MCP_URL }
/** One line or link per editor, for the "Connect your editor" popover, llms.txt and the README. */
export const MCP_INSTALL = {
  claude: `claude mcp add --transport http diya ${MCP_URL}`,
  cursorJson: JSON.stringify({ mcpServers: { diya: mcpEntry } }, null, 2),
  /** Cursor's install link: the server's mcp.json entry, base64-encoded, with the name beside it. */
  cursorLink: `cursor://anysphere.cursor-deeplink/mcp/install?name=diya&config=${btoa(JSON.stringify(mcpEntry))}`,
  vscodeCommand: `code --add-mcp '${JSON.stringify({ name: 'diya', type: 'http', url: MCP_URL })}'`,
  /** VS Code's install link: the same object as --add-mcp, URI-encoded. */
  vscodeLink: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'diya', type: 'http', url: MCP_URL }))}`,
} as const

/** The catalog page for an item. */
export function itemUrl(id: ItemId) {
  return (componentIds as readonly string[]).includes(id) ? `${SITE}/explore?area=components&component=${id}` : `${SITE}/explore?pattern=${id}`
}

export type ItemReference = {
  id: ItemId
  title: string
  kind: 'component' | 'pattern'
  exportName: string
  /** '@idyeah/diya' or '@idyeah/diya/charts'. */
  importFrom: string
  description: string
  stability: string
  since: string
  /** Other exports that are variants of this item, such as Chart beside DataViz. */
  variants: string[]
  extendsDom?: string
  props: [string, ApiProp][]
}

/**
 * One catalog item as api.json describes it. The item is found by its
 * catalog id, or by its export name, so it reads both 1.0's ids and the
 * export-matching ids (`text-link`, `content-state`).
 */
export function itemReference(id: ItemId): ItemReference | null {
  const exportName = EXPORT_NAMES[id]
  const item =
    API.items[kebab(exportName)] ??
    Object.values(API.items).find((entry) => entry.exports.some((e) => e.name === exportName)) ??
    API.items[id]
  const component = API.components[exportName]
  if (!item || !component) return null
  const required = (a: [string, ApiProp], b: [string, ApiProp]) => Number(b[1].required) - Number(a[1].required)
  return {
    id,
    title: customizeItems[id].title,
    kind: customizeItems[id].kind,
    exportName,
    importFrom: component.entry === '.' ? API.package : `${API.package}/${component.entry.replace(/^\.\//, '')}`,
    description: component.description,
    stability: item.stability,
    since: item.since,
    variants: item.exports.map((e) => e.name).filter((name) => name !== exportName),
    extendsDom: component.extendsDom,
    props: Object.entries(component.props).sort((a, b) => required(a, b) || a[0].localeCompare(b[0])),
  }
}

/** A prop's default as code, or null when it has none. */
export function defaultText(prop: ApiProp): string | null {
  if (prop.default === undefined) return null
  return typeof prop.default === 'string' ? `'${prop.default}'` : JSON.stringify(prop.default)
}

/** Public tokens, minus anything api.json marks as replaced. */
export function publicTokens() {
  return Object.entries(API.tokens).filter(([name]) => name !== '--diya-brand')
}
