import { snippetFor } from '../../components/code/snippets'
import { API, EXPORT_NAMES, itemReference, itemUrl } from '../../components/reference/api'
import { guidance, type Guidance } from '../../components/reference/guidance'
import { componentIds, patternIds } from '../catalog-route'
import type { ItemId } from '../customize/registry'

/*
 * What the MCP tools know, gathered once from the site's own sources: the
 * SDK's api.json (the parts the site's API type leaves out), the catalog's
 * guidance and the same complete files Get code hands out.
 */

export type McpProp = { type: string; description?: string; required: boolean; default?: unknown; values?: (string | number)[] }
export type McpSlot = { accepts: 'any' | string[]; content?: string[]; multiple?: boolean; as?: string }
type McpChildren = { allowed: boolean } & Partial<McpSlot>
type McpComponent = {
  description: string
  entry: string
  extendsDom?: string
  propsType?: string
  props: Record<string, McpProp>
  modes?: { when: Record<string, unknown>; default?: true; props: Record<string, McpProp> }[]
}
type McpItem = {
  kind: string
  title: string
  stability: string
  since: string
  exports: { name: string; entry: string }[]
  requires: { provider: boolean; peers: string[] }
  slots: Record<string, McpSlot>
  children: McpChildren
  state: { value: string; onChange: string; default?: string }[]
  tokens: string[]
  messages: string | null
}
type McpToken = {
  group: string
  kind: string
  pairsWith: string[]
  defaults: { light: string | null; dark: string | null }
  setBy?: string
}
export type McpApi = {
  package: string
  version: string
  items: Record<string, McpItem>
  components: Record<string, McpComponent>
  types: Record<string, string>
  tokens: Record<string, McpToken>
  messages: Record<string, Record<string, { kind: string; args?: string[]; default: string }>>
}

export type McpEntry = {
  /** The api.json id, such as `text-link`. */
  id: string
  exportName: string
  title: string
  kind: string
  importFrom: string
  item: McpItem
  component: McpComponent | undefined
  variants: string[]
  /** Present for the 40 catalog items: their page, guidance and complete file. */
  catalog?: { id: ItemId; url: string; guidance: Guidance; fileName: string; file: string }
}

export const MCP_API = API as unknown as McpApi

let cached: McpEntry[] | undefined

/** Every api.json item, joined to its catalog page when it has one. */
export function mcpEntries(): McpEntry[] {
  if (cached) return cached
  const catalogByExport = new Map<string, ItemId>(
    [...componentIds, ...patternIds].map((id) => [EXPORT_NAMES[id], id] as [string, ItemId])
  )
  cached = Object.entries(MCP_API.items).map(([id, item]) => {
    const exportName = item.exports[0].name
    const entry = item.exports[0].entry
    const catalogId = catalogByExport.get(exportName)
    const reference = catalogId ? itemReference(catalogId) : null
    const snippet = catalogId ? snippetFor(catalogId, {}) : null
    return {
      id,
      exportName,
      title: reference?.title ?? item.title,
      kind: item.kind,
      importFrom: entry === '.' ? MCP_API.package : `${MCP_API.package}/${entry.replace(/^\.\//, '')}`,
      item,
      component: MCP_API.components[exportName],
      variants: item.exports.slice(1).map((e) => e.name),
      catalog:
        catalogId && snippet
          ? { id: catalogId, url: itemUrl(catalogId), guidance: guidance[catalogId], fileName: snippet.fileName, file: snippet.file }
          : undefined,
    }
  })
  return cached
}
