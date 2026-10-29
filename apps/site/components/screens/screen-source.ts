import { readFileSync } from 'node:fs'
import path from 'node:path'
import { EXPORT_NAMES } from '../reference/api'
import { catalogHref } from '../catalog/catalog-index'
import { customizeItems, type ItemId } from '../../lib/customize/registry'
import { componentIds } from '../../lib/catalog-route'

/*
 * Server only. Get code hands out a screen's own file, so it is read from
 * disk here, the way /changelog reads the package's CHANGELOG.md. The files
 * ship with the deployment: next.config.mjs traces screens/*.tsx into the
 * /explore function (outputFileTracingIncludes).
 */
const SCREENS_DIR = path.join(process.cwd(), 'screens')

/** The text of screens/<id>.tsx, or null when there's no such file. */
export function readScreenSource(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) return null
  try {
    return readFileSync(path.join(SCREENS_DIR, `${id}.tsx`), 'utf8')
  } catch {
    return null
  }
}

/** The names a file imports from one module: `import { A, type B, C as D } from '<module>'` gives A and C. */
export function namedImports(source: string, module: string) {
  const names: string[] = []
  const pattern = /import\s*(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
  for (const [, typeOnly, list, from] of source.matchAll(pattern)) {
    if (from !== module || typeOnly) continue
    for (const part of list.split(',')) {
      const name = part.trim()
      if (!name || name.startsWith('type ')) continue
      names.push(name.split(/\s+as\s+/)[0].trim())
    }
  }
  return names
}

const ITEM_BY_EXPORT = new Map<string, ItemId>([
  ...(Object.entries(EXPORT_NAMES) as [ItemId, string][]).map(([id, name]) => [name, id] as const),
  // Chart is DataViz's lower-level sibling, documented on the same page.
  ['Chart', 'data-viz'],
])

export type BuiltWithItem = { id: ItemId; title: string; href: string }

/**
 * The DIYA components and patterns a screen file imports, each with its
 * catalog page, in catalog order. Layout helpers (Stack, Inline) and exports
 * without a page of their own (Toast) aren't listed.
 */
export function builtWith(source: string): BuiltWithItem[] {
  const names = new Set([...namedImports(source, '@idyeah/diya'), ...namedImports(source, '@idyeah/diya/charts')])
  const ids = [...names].map((name) => ITEM_BY_EXPORT.get(name)).filter((id): id is ItemId => !!id)
  const order = Object.keys(customizeItems)
  return [...new Set(ids)]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => ({
      id,
      title: customizeItems[id].title,
      href: catalogHref((componentIds as readonly string[]).includes(id) ? 'components' : 'patterns', id),
    }))
}
