import { customizeItems, type ItemId } from '../../lib/customize/registry'
import { acquisitionTotal, allocationData, channels, chartData } from '../catalog-data'
import type { Playground } from './playground'
import { CONTENT_TEXT, ICON_PATHS, isIcon } from './stand-ins'
import { FORMAT_FILE, FORMAT_SOURCE, INSTALL_COMMAND } from './content-examples'

export type Snippet = {
  /** Full step-3 code: import line(s), a blank line, then optional consts, then JSX. No DiyaProvider (that is step 2), no component function wrapper, no 'use client'. */
  code: string
  /** The same example as a whole .tsx file: 'use client' where needed, imports, sample data, state, handlers and one exported component. */
  file: string
  /** The file's suggested name, such as "TableExample.tsx". */
  fileName: string
  /** Stand-in icon components the code uses, such as "PlusIcon". The file draws them inline. */
  icons: string[]
  /** The code renders links (an `href`), which a router can take over through the provider's `linkComponent`. */
  links: boolean
  /** '@idyeah/diya/charts' only for Data Viz. */
  entry: '@idyeah/diya' | '@idyeah/diya/charts'
  /** Names of function-valued props the code passes (e.g. ['onClick'], ['render', 'rowLabel']). Empty when none. Drives a Next.js 'use client' note. */
  functionProps: string[]
  /** Patterns only: catalog item ids (from catalog-route componentIds) it is built from, in a sensible order. Omit for components. Must be true of the SDK source. */
  builtWith?: ItemId[]
  /** True only for Data Viz (needs the optional echarts@6 peer). */
  charts?: boolean
  /** Declarations a type check needs for free identifiers the code uses (e.g. "declare const save: () => void"). Not shown to users. */
  context?: string
}

type Options = Record<string, string | boolean>

/* ------------------------------------------------------------------------ */
/* A tiny code model, so every snippet is formatted the same way.            */
/* ------------------------------------------------------------------------ */

const WIDTH = 80

/**
 * How the complete file defines a free identifier: state (with a `set…`
 * partner), a handler (a function type) or sample data. `init` is the
 * initial state, the handler's arrow function or the data's value; `deps`
 * are identifiers the init itself uses.
 */
type Def = { name: string; type: string; init?: string; deps: readonly Raw[] }

/** Code written as-is. `decls` declare its free identifiers for the type check. */
class Raw {
  constructor(
    readonly code: string,
    readonly decls: readonly string[] = [],
    readonly isFunction = false,
    readonly defs: readonly Def[] = []
  ) {}
}
/** An arrow function `(params) => body`. */
class Fn {
  constructor(
    readonly params: string,
    readonly body: Js,
    readonly decls: readonly string[] = [],
    readonly deps: readonly Raw[] = []
  ) {}
}
/** A JSX element; name '' is a fragment. `inline` keeps short text children on the tag's line. */
class El {
  constructor(
    readonly name: string,
    readonly attrs: Attrs,
    readonly children: readonly Child[],
    readonly inline = false,
    readonly decls: readonly string[] = []
  ) {}
}
/** `{list.map((param) => (<body />))}` */
class MapExpr {
  constructor(
    readonly list: Raw,
    readonly param: string,
    readonly body: El
  ) {}
}
/** `{condition && (<body />)}` */
class When {
  constructor(
    readonly condition: Raw,
    readonly body: El
  ) {}
}

type Omitted = false | null | undefined
type Js = string | number | boolean | Raw | Fn | El | MapExpr | readonly Js[] | JsObject
interface JsObject {
  readonly [key: string]: Js | Omitted
}
type Attrs = Readonly<Record<string, Js | Omitted>>
type Child = string | Raw | El | MapExpr | When | Fn | Omitted

const isOmitted = (value: unknown): value is Omitted => value === false || value === null || value === undefined

function h(name: string, attrs: Attrs = {}, ...children: Child[]): El {
  return new El(name, attrs, children)
}
/** An element whose short text children stay on one line, e.g. `<small>Total visits</small>`. */
function hi(name: string, attrs: Attrs = {}, ...children: Child[]): El {
  return new El(name, attrs, children, true)
}
/** Siblings in a fragment, or the lone child itself when only one is shown. */
function group(...children: Child[]): El | false {
  const shown = children.filter((item) => !isOmitted(item) && item !== '')
  if (!shown.length) return false
  return shown.length === 1 && shown[0] instanceof El ? shown[0] : h('', {}, ...shown)
}
/**
 * A free identifier the snippet expects the app to own, e.g. state or a
 * handler. `init` is what the complete file starts it with (see Def).
 */
function v(name: string, type: string, init?: string, ...deps: Raw[]): Raw {
  return new Raw(name, [`declare const ${name}: ${type}`], type.trimStart().startsWith('('), [{ name, type, init, deps }])
}
/** Code that uses other free identifiers. */
function raw(code: string, ...deps: Raw[]): Raw {
  return new Raw(code, deps.flatMap((dep) => dep.decls), false, deps.flatMap((dep) => dep.defs))
}
function fn(params: string, body: Js, ...deps: Raw[]): Fn {
  return new Fn(params, body, deps.flatMap((dep) => dep.decls), deps)
}
/** An icon or app component the snippet leaves to the app, e.g. `<PlusIcon />`. */
function comp(name: string): El {
  return new El(name, {}, [], false, [`declare function ${name}(): import('react').ReactElement`])
}

const fits = (text: string, column: number) => !text.includes('\n') && column + text.length <= WIDTH
const indentRest = (code: string, indent: string) => code.split('\n').join(`\n${indent}`)
const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const objectKey = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key))

function js(value: Js, indent: string, column: number): string {
  if (value instanceof Raw) return indentRest(value.code, indent)
  if (value instanceof Fn) return arrow(value, indent, column)
  if (value instanceof El) return element(value, indent, column)
  if (value instanceof MapExpr) return mapped(value, indent)
  if (typeof value === 'string') return quote(value)
  if (typeof value !== 'object') return String(value)
  const inner = `${indent}  `
  if (Array.isArray(value)) {
    const items = value as readonly Js[]
    const flat = `[${items.map((item) => js(item, indent, 0)).join(', ')}]`
    if (fits(flat, column)) return flat
    return `[\n${items.map((item) => `${inner}${js(item, inner, inner.length)},`).join('\n')}\n${indent}]`
  }
  const entries = Object.entries(value as JsObject).filter(([, item]) => !isOmitted(item)) as [string, Js][]
  if (!entries.length) return '{}'
  const flat = `{ ${entries.map(([key, item]) => `${objectKey(key)}: ${js(item, indent, 0)}`).join(', ')} }`
  if (fits(flat, column)) return flat
  const lines = entries.map(([key, item]) => {
    const head = `${objectKey(key)}: `
    return `${inner}${head}${js(item, inner, inner.length + head.length)},`
  })
  return `{\n${lines.join('\n')}\n${indent}}`
}

function arrow(value: Fn, indent: string, column: number): string {
  const head = `(${value.params}) => `
  if (value.body instanceof El) {
    const flat = head + element(value.body, indent, column + head.length)
    if (fits(flat, column)) return flat
    const inner = `${indent}  `
    return `${head}(\n${inner}${element(value.body, inner, inner.length)}\n${indent})`
  }
  return head + js(value.body, indent, column + head.length)
}

function mapped(value: MapExpr, indent: string): string {
  const inner = `${indent}  `
  return `${value.list.code}.map((${value.param}) => (\n${inner}${element(value.body, inner, inner.length)}\n${indent}))`
}

function attribute(key: string, value: Js, indent: string, column: number, flat: boolean): string {
  if (value === true) return key
  if (typeof value === 'string') return `${key}="${value}"`
  const head = `${key}={`
  if (value instanceof El) {
    const one = `${head}${element(value, indent, column + head.length)}}`
    if (flat || fits(one, column)) return one
    const inner = `${indent}  `
    return `${head}\n${inner}${element(value, inner, inner.length)}\n${indent}}`
  }
  return `${head}${js(value, indent, column + head.length)}}`
}

function child(value: Exclude<Child, Omitted>, indent: string, column: number): string {
  if (typeof value === 'string') return value
  if (value instanceof El) return element(value, indent, column)
  if (value instanceof Raw) return `{${indentRest(value.code, indent)}}`
  if (value instanceof MapExpr) return `{${mapped(value, indent)}}`
  if (value instanceof Fn) return `{${arrow(value, indent, column + 1)}}`
  const flat = `{${value.condition.code} && ${element(value.body, indent, 0)}}`
  if (fits(flat, column)) return flat
  const inner = `${indent}  `
  return `{${value.condition.code} && (\n${inner}${element(value.body, inner, inner.length)}\n${indent})}`
}

function element(value: El, indent: string, column: number): string {
  const open = `<${value.name}`
  const close = `</${value.name}>`
  const attrs = Object.entries(value.attrs).filter(([, item]) => !isOmitted(item)) as [string, Js][]
  const children = value.children.filter((item) => !isOmitted(item) && item !== '') as Exclude<Child, Omitted>[]
  const end = children.length ? '>' : ' />'
  const flatAttrs = attrs.map(([key, item]) => attribute(key, item, indent, 0, true))
  const flatHead = `${open}${flatAttrs.map((text) => ` ${text}`).join('')}${end}`
  const inner = `${indent}  `
  const head = fits(flatHead, column)
    ? flatHead
    : `${open}\n${attrs
        .map(([key, item]) => `${inner}${attribute(key, item, inner, inner.length, false)}`)
        .join('\n')}\n${indent}${children.length ? '>' : '/>'}`
  if (!children.length) return head
  if (value.inline) {
    const flat = `${head}${children.map((item) => child(item, indent, 0)).join('')}${close}`
    if (fits(flat, column)) return flat
  }
  return `${head}\n${children.map((item) => `${inner}${child(item, inner, inner.length)}`).join('\n')}\n${indent}${close}`
}

/* ------------------------------------------------------------------------ */
/* Collecting imports, declarations and function-valued props.               */
/* ------------------------------------------------------------------------ */

type Found = {
  names: Set<string>
  decls: Set<string>
  functionProps: Set<string>
  /** Free identifiers, in the order the code first uses them. */
  defs: Map<string, Def>
  /** App components the snippet leaves to the app (icons, tab content). */
  components: Set<string>
}

const emptyFound = (): Found => ({ names: new Set(), decls: new Set(), functionProps: new Set(), defs: new Map(), components: new Set() })

function addDefs(defs: readonly Def[], found: Found) {
  for (const def of defs) {
    const known = found.defs.get(def.name)
    if (!known || (known.init === undefined && def.init !== undefined)) found.defs.set(def.name, def)
    def.deps.forEach((dep) => walk(dep, found))
  }
}

function walk(value: unknown, found: Found, key?: string): void {
  if (isOmitted(value) || typeof value !== 'object') return
  if (value instanceof Raw) {
    value.decls.forEach((decl) => found.decls.add(decl))
    addDefs(value.defs, found)
    if (key && value.isFunction) found.functionProps.add(key)
  } else if (value instanceof Fn) {
    value.decls.forEach((decl) => found.decls.add(decl))
    value.deps.forEach((dep) => walk(dep, found))
    if (key) found.functionProps.add(key)
    walk(value.body, found)
  } else if (value instanceof El) {
    if (value.name) found.names.add(value.name)
    if (value.decls.some((decl) => decl.startsWith('declare function'))) found.components.add(value.name)
    value.decls.forEach((decl) => found.decls.add(decl))
    for (const [name, item] of Object.entries(value.attrs)) walk(item, found, name)
    value.children.forEach((item) => walk(item, found))
  } else if (value instanceof MapExpr) {
    walk(value.list, found)
    walk(value.body, found)
  } else if (value instanceof When) {
    walk(value.condition, found)
    walk(value.body, found)
  } else if (Array.isArray(value)) {
    value.forEach((item) => walk(item, found))
  } else {
    for (const [name, item] of Object.entries(value as JsObject)) walk(item, found, name)
  }
}

const MAIN_EXPORTS = new Set([
  'Accordion', 'Alert', 'Avatar', 'Badge', 'Breadcrumbs', 'Button', 'Card', 'Chatbot', 'Choice',
  'CodeBlock', 'Combobox', 'ContentState', 'DatePicker', 'Dialog', 'Drawer', 'FileUpload', 'Form', 'List', 'Menu',
  'Metric', 'PageHeader', 'Pagination', 'Popover', 'Progress', 'Prose', 'Search', 'Select', 'SideNavigation',
  'SiteHeader', 'Slider', 'Switch', 'Table', 'Tabs', 'Tag', 'TextArea', 'TextInput', 'TextLink', 'Toast',
  'Tooltip', 'Wizard',
])
const CHART_EXPORTS = new Set(['Chart', 'DataViz'])

/** Catalog component ids and the export each one documents. */
const COMPONENT_NAMES: Partial<Record<ItemId, string>> = {
  button: 'Button', 'text-input': 'TextInput', 'text-area': 'TextArea', select: 'Select',
  'date-picker': 'DatePicker', combobox: 'Combobox', choice: 'Choice', switch: 'Switch', slider: 'Slider',
  search: 'Search', link: 'TextLink', pagination: 'Pagination', tabs: 'Tabs', breadcrumbs: 'Breadcrumbs',
  menu: 'Menu', tag: 'Tag', metric: 'Metric', avatar: 'Avatar', list: 'List', accordion: 'Accordion',
  prose: 'Prose', 'code-block': 'CodeBlock',
  badge: 'Badge', alert: 'Alert', progress: 'Progress', tooltip: 'Tooltip', popover: 'Popover',
}

/**
 * What each pattern is built from. `internal` is what the pattern's own SDK
 * source renders (its imports); `slots` are components the snippet places in
 * the pattern's slots or content, listed only when the snippet uses them.
 */
const BUILT_WITH: Partial<Record<ItemId, { order: ItemId[]; internal: ItemId[] }>> = {
  'page-header': { order: ['breadcrumbs', 'tag', 'button', 'tabs'], internal: [] },
  'site-header': { order: ['button', 'search', 'menu', 'avatar'], internal: ['button', 'search'] },
  'side-navigation': { order: [], internal: [] },
  card: { order: ['tag', 'menu', 'avatar', 'button'], internal: [] },
  table: {
    order: ['search', 'tag', 'avatar', 'metric', 'menu', 'button', 'pagination'],
    internal: ['search', 'menu', 'button', 'pagination'],
  },
  'data-viz': { order: ['button'], internal: ['button'] },
  form: {
    order: ['text-input', 'select', 'date-picker', 'combobox', 'text-area', 'switch', 'button'],
    internal: ['button'],
  },
  wizard: { order: ['button'], internal: ['button'] },
  'file-upload': { order: ['button'], internal: ['button'] },
  chatbot: { order: ['button'], internal: ['button'] },
  dialog: { order: ['text-input', 'button'], internal: ['button'] },
  drawer: { order: ['text-input', 'button'], internal: ['button'] },
  'empty-state': { order: ['button'], internal: ['button'] },
}

type Const = { name: string; type?: string; value: Js }
type Spec = {
  jsx: El | When
  /** Custom JSX text when the tree needs hand layout; the tree still drives imports and declarations. */
  code?: string
  consts?: Const[]
  /** Exported types the code names, imported with `type`. */
  types?: string[]
  /** Extra context lines (type aliases, type imports) placed before the declarations. */
  context?: string[]
  /** Function-valued props that live inside hand-written code the tree cannot see. */
  functionProps?: string[]
}

function importLine(names: string[], entry: string): string {
  const flat = `import { ${names.join(', ')} } from '${entry}'`
  if (flat.length <= WIDTH) return flat
  return `import {\n${names.map((name) => `  ${name},`).join('\n')}\n} from '${entry}'`
}

function build(id: ItemId, spec: Spec): Snippet {
  const found = emptyFound()
  spec.consts?.forEach((item) => walk(item.value, found))
  walk(spec.jsx, found)
  spec.functionProps?.forEach((name) => found.functionProps.add(name))
  const charts = [...found.names].some((name) => CHART_EXPORTS.has(name))
  const entry = charts ? '@idyeah/diya/charts' : '@idyeah/diya'
  const exported = charts ? CHART_EXPORTS : MAIN_EXPORTS
  const names = [...found.names].filter((name) => exported.has(name)).sort()
  const types = [...(spec.types ?? [])].sort().map((name) => `type ${name}`)
  const consts = (spec.consts ?? []).map(({ name, type, value }) => {
    const head = `const ${name}${type ? `: ${type}` : ''} = `
    return head + js(value, '', head.length)
  })
  const jsx = spec.code ?? (spec.jsx instanceof El ? element(spec.jsx, '', 0) : child(spec.jsx, '', 0))
  const code = [importLine([...names, ...types], entry), ...consts, jsx].join('\n\n')
  const context = [...(spec.context ?? []), ...found.decls]
  const fileName = `${fileStem(id)}.tsx`
  const icons = [...found.components].filter(isIcon).sort()
  const links = /\bhref(=|: )/.test(code)
  const snippet: Snippet = { code, entry, functionProps: [...found.functionProps], file: '', fileName, icons, links }
  snippet.file = completeFile(id, spec, found, names, entry)
  const built = BUILT_WITH[id]
  if (built) {
    snippet.builtWith = built.order.filter(
      (item) => built.internal.includes(item) || found.names.has(COMPONENT_NAMES[item] ?? '')
    )
  }
  if (charts) snippet.charts = true
  if (context.length) snippet.context = context.join('\n')
  return snippet
}

/* ------------------------------------------------------------------------ */
/* The complete file.                                                        */
/* ------------------------------------------------------------------------ */

const fileStem = (id: ItemId) => `${customizeItems[id].title.replace(/\s+/g, '')}Example`

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const isFunctionType = (type: string) => type.trimStart().startsWith('(')
const SIMPLE_TYPES = new Set(['string', 'number', 'boolean'])
/** Types TypeScript infers from a literal, so the file leaves them unwritten. */
const INFERRED_TYPES = new Set([...SIMPLE_TYPES, 'string[]', 'number[]'])
const TYPE_IMPORT = /import\((['"])(@idyeah\/diya(?:\/charts)?|react)\1\)\.(\w+)/g

/** Type imports a file needs, by module. */
type TypeImports = Map<string, Set<string>>

/** Replaces `import('module').Name` with `Name` and records the import. */
function cleanType(text: string, imports: TypeImports) {
  return text.replace(TYPE_IMPORT, (_match, _quote, module: string, name: string) => {
    if (!imports.has(module)) imports.set(module, new Set())
    imports.get(module)!.add(name)
    return name
  })
}

/** Splits `(a: A, b: { c: C; d: D }) => void` into its parameters, names and types. */
function parameters(type: string): { name: string; text: string }[] {
  let depth = 0
  let end = 0
  for (let i = 0; i < type.length; i++) {
    if ('([{<'.includes(type[i])) depth++
    if (')]}>'.includes(type[i]) && type[i - 1] !== '=') depth--
    if (depth === 0) {
      end = i
      break
    }
  }
  const inner = type.slice(type.indexOf('(') + 1, end)
  const parts: string[] = []
  let current = ''
  depth = 0
  for (const char of inner) {
    if ('([{<'.includes(char)) depth++
    if (')]}>'.includes(char)) depth--
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += char
  }
  if (current.trim()) parts.push(current)
  return parts.map((part) => ({ name: part.split(':')[0].trim(), text: part.trim() }))
}

/** A sensible first value for state of `type`, when the snippet names none. */
function initialFor(type: string) {
  if (type === 'string') return "''"
  if (type === 'number') return '0'
  if (type === 'boolean') return 'false'
  if (type.endsWith('[]')) return '[]'
  throw new Error(`No initial value for state of type ${type}`)
}

const indentLines = (code: string, indent: string) =>
  code
    .split('\n')
    .map((line) => (line ? indent + line : line))
    .join('\n')

/** One stroked icon, drawn the way the file's `Icon` helper draws every stand-in. */
const ICON_HELPER = `function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}`

/**
 * The snippet as a whole .tsx file that compiles as pasted in a fresh
 * Next.js App Router or Vite app, under strict TypeScript with unused
 * locals and parameters reported: sample data at module level, then one
 * component with the state, handlers and anything that reads them.
 */
function completeFile(id: ItemId, spec: Spec, found: Found, names: string[], entry: string): string {
  const typeImports: TypeImports = new Map()
  const defs = [...found.defs.values()]
  const byName = new Map(defs.map((def) => [def.name, def]))
  const setterOf = (name: string) => `set${capitalize(name)}`
  const isSetter = (def: Def) => /^set[A-Z]/.test(def.name) && byName.has(def.name.charAt(3).toLowerCase() + def.name.slice(4))
  const isState = (def: Def) => !isFunctionType(def.type) && byName.has(setterOf(def.name))
  const state = defs.filter(isState)
  const handlers = defs.filter((def) => isFunctionType(def.type) && !isSetter(def))
  const data = defs.filter((def) => !isFunctionType(def.type) && !isState(def))
  /* A setter whose value is never read still needs its state. */
  for (const def of defs.filter(isSetter)) {
    const base = def.name.charAt(3).toLowerCase() + def.name.slice(4)
    if (!found.defs.has(base)) throw new Error(`${id}: ${def.name} has no state`)
  }
  const local = new Set([...state.flatMap((def) => [def.name, setterOf(def.name)]), ...handlers.map((def) => def.name)])

  /* Snippet constants that read state or handlers live in the component. */
  const constUses = (value: Js) => {
    const uses = emptyFound()
    walk(value, uses)
    return [...uses.defs.keys()].some((name) => local.has(name))
  }
  const constCode = ({ name, type, value }: Const, indent: string) => {
    const head = `const ${name}${type ? `: ${cleanType(type, typeImports)}` : ''} = `
    return indentLines(head + js(value, '', head.length + indent.length), indent)
  }
  const inner = (spec.consts ?? []).filter((item) => constUses(item.value))
  const outer = (spec.consts ?? []).filter((item) => !constUses(item.value))

  const moduleParts: string[] = []
  for (const line of spec.context ?? []) moduleParts.push(cleanType(line, typeImports))
  /* Stand-ins go after the example, so it reads first; function declarations are hoisted. */
  const standIns: string[] = []
  const components = [...found.components].sort()
  if (components.some(isIcon)) standIns.push(`// Stand-ins for your own icons: DIYA ships none, and any React icon works.\n${ICON_HELPER}`)
  for (const name of components) {
    if (isIcon(name)) standIns.push(`function ${name}() {\n  return <Icon d="${ICON_PATHS[name]}" />\n}`)
    else if (CONTENT_TEXT[name]) standIns.push(`function ${name}() {\n  return <p>${CONTENT_TEXT[name]}</p>\n}`)
    else throw new Error(`${id}: no stand-in for ${name}`)
  }
  for (const def of data) {
    if (def.init === undefined) throw new Error(`${id}: ${def.name} needs sample data`)
    const type = cleanType(def.type, typeImports)
    moduleParts.push(`const ${def.name}${INFERRED_TYPES.has(type) ? '' : `: ${type}`} = ${cleanType(def.init, typeImports)}`)
  }
  for (const item of outer) moduleParts.push(constCode(item, ''))

  const body: string[] = []
  for (const def of state) {
    const type = cleanType(def.type, typeImports)
    const init = def.init ?? initialFor(type)
    const generic = SIMPLE_TYPES.has(type) ? '' : `<${type}>`
    body.push(`  const [${def.name}, ${setterOf(def.name)}] = useState${generic}(${indentRest(cleanType(init, typeImports), '  ')})`)
  }
  const statements: string[] = []
  for (const def of handlers) {
    if (def.init !== undefined) {
      statements.push(indentLines(`const ${def.name} = ${cleanType(def.init, typeImports)}`, '  '))
      continue
    }
    const params = parameters(cleanType(def.type, typeImports))
    const args = [`'${def.name}'`, ...params.map((param) => param.name)].join(', ')
    statements.push(`  function ${def.name}(${params.map((param) => param.text).join(', ')}) {\n    console.log(${args})\n  }`)
  }
  for (const item of inner) statements.push(constCode(item, '  '))

  const jsx = spec.code
    ? indentLines(spec.code, '    ')
    : spec.jsx instanceof El
      ? '    ' + element(spec.jsx, '    ', 4)
      : `    <>\n      ${child(spec.jsx, '      ', 6)}\n    </>`
  const sections = [...(body.length ? [body.join('\n')] : []), ...statements, `  return (\n${jsx}\n  )`]
  const component = `export default function ${fileStem(id)}() {\n${sections.join('\n\n')}\n}`

  const imports: string[] = []
  const react = [...(state.length ? ['useState'] : []), ...[...(typeImports.get('react') ?? [])].sort().map((t) => `type ${t}`)]
  if (react.length) imports.push(`import { ${react.join(', ')} } from 'react'`)
  const diyaTypes = new Set([...(spec.types ?? []), ...(typeImports.get(entry) ?? [])])
  imports.push(importLine([...names, ...[...diyaTypes].sort().map((t) => `type ${t}`)], entry))
  for (const [module, list] of typeImports) {
    if (module === 'react' || module === entry) continue
    imports.push(`import type { ${[...list].sort().join(', ')} } from '${module}'`)
  }
  const client = state.length > 0 || handlers.length > 0 || found.functionProps.size > 0
  return [...(client ? ["'use client'"] : []), imports.join('\n'), ...moduleParts, component, ...standIns].join('\n\n') + '\n'
}

/* ------------------------------------------------------------------------ */
/* Reading the playground.                                                   */
/* ------------------------------------------------------------------------ */

type Size = 'small' | 'medium' | 'large'

function one(p: Playground, key: string, fallback: string): string {
  const value = p[key]
  return typeof value === 'string' && value ? value : fallback
}
function on(p: Playground, key: string, option: string, fallback: boolean): boolean {
  const value = p[key]
  return Array.isArray(value) ? value.includes(option) : fallback
}
function sizeOf(p: Playground, fallback = 'Medium'): Size {
  const size = one(p, 'Size', fallback).toLowerCase()
  return size === 'small' || size === 'large' ? size : 'medium'
}
/** Medium is every sized component's default, so it is left out. */
const sized = (size: Size) => (size === 'medium' ? undefined : size)

/** The chosen colour tone of a swatch group ('Neutral', 'Success', … or 'Brand'). */
function toneOf<T extends string>(p: Playground, key: string, tones: readonly T[], fallback: T): T {
  const tone = one(p, key, fallback).toLowerCase() as T
  return tones.includes(tone) ? tone : fallback
}

const STRING_SETTER = '(value: string) => void'
const VOID = '() => void'

/* ------------------------------------------------------------------------ */
/* Components.                                                               */
/* ------------------------------------------------------------------------ */

function button(p: Playground, o: Options): Snippet {
  const kind = one(p, 'Type', o.kind === 'icon' ? 'Icon' : 'Normal') === 'Icon' ? 'icon' : 'normal'
  const size = sizeOf(p, typeof o.size === 'string' ? o.size[0].toUpperCase() + o.size.slice(1) : 'Medium')
  const leading = on(p, 'Icon', 'Leading', o.leadingIcon === true)
  const trailing = on(p, 'Icon', 'Trailing', o.trailingIcon === true)
  const state = one(p, 'State', 'Default')
  const shape = o.shape === 'rounded' ? 'rounded' : 'pill'
  const icon = kind === 'icon'
  return build('button', {
    jsx: h(
      'Button',
      {
        size: sized(size),
        /* Pill is Button's own default, so only the rounded corner is written. */
        shape: shape === 'rounded' && 'rounded',
        iconOnly: icon,
        'aria-label': icon && 'Add item',
        disabled: state === 'Disabled',
        loading: state === 'Loading',
        onClick: icon ? v('addItem', VOID) : v('handleContinue', VOID),
      },
      ...(icon ? [comp('PlusIcon')] : [leading && comp('PlusIcon'), 'Continue', trailing && comp('CheckIcon')])
    ),
  })
}

function textInput(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  return build('text-input', {
    jsx: h('TextInput', {
      label: 'Project name',
      hideLabel: !on(p, 'Options', 'Label', true),
      value: v('projectName', 'string'),
      onValueChange: v('setProjectName', STRING_SETTER),
      placeholder: 'e.g. Veylo',
      size: sized(sizeOf(p)),
      leadingIcon: on(p, 'Options', 'Leading icon', false) && comp('LayersIcon'),
      clearable: on(p, 'Options', 'Clear action', false),
      helperText: on(p, 'Options', 'Helper text', true) && 'Give your project a name you’ll recognize.',
      error: state === 'Error' && 'Enter a project name to continue.',
      disabled: state === 'Disabled',
      readOnly: state === 'Read-only',
    }),
  })
}

function textArea(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  return build('text-area', {
    jsx: h('TextArea', {
      label: 'Project description',
      hideLabel: !on(p, 'Options', 'Label', true),
      value: v('description', 'string'),
      onValueChange: v('setDescription', STRING_SETTER),
      placeholder: 'What are you working on?',
      maxLength: 240,
      size: sized(sizeOf(p)),
      showCount: on(p, 'Options', 'Count', false),
      resizable: !on(p, 'Options', 'Resize', true) && raw('false'),
      helperText: on(p, 'Options', 'Helper text', false) && 'A few words about your project.',
      error: state === 'Error' && 'Add a little more detail before continuing.',
      disabled: state === 'Disabled',
      readOnly: state === 'Read-only',
    }),
  })
}

function select(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  return build('select', {
    consts: [
      {
        name: 'teams',
        value: [
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'product', label: 'Product' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'archived', label: 'Archived team (unavailable)', disabled: true },
        ],
      },
    ],
    jsx: h('Select', {
      label: 'Team',
      hideLabel: !on(p, 'Options', 'Label', true),
      value: v('team', 'string'),
      onValueChange: v('setTeam', STRING_SETTER),
      options: raw('teams'),
      placeholder: 'Choose a team',
      size: sized(sizeOf(p)),
      leadingIcon: on(p, 'Options', 'Leading icon', false) && comp('LayersIcon'),
      helperText: on(p, 'Options', 'Helper text', true) && 'Choose the team this project belongs to.',
      error: state === 'Error' && 'Choose a team to continue.',
      disabled: state === 'Disabled',
    }),
  })
}

function datePicker(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  const range = one(p, 'Type', 'Single') === 'Range'
  const shared = {
    size: sized(sizeOf(p)),
    hideLabel: !on(p, 'Options', 'Label', true),
    helperText: on(p, 'Options', 'Helper text', true) && 'Select the dates for your project.',
    error: state === 'Error' && 'Choose a valid date to continue.',
    disabled: state === 'Disabled',
  }
  return build('date-picker', {
    jsx: h(
      'DatePicker',
      range
        ? {
            label: 'Reporting period',
            range: true,
            value: v('period', '{ start: string; end: string }', "{ start: '', end: '' }"),
            onValueChange: v('setPeriod', '(value: { start: string; end: string }) => void'),
            ...shared,
          }
        : {
            label: 'Due date',
            value: v('dueDate', 'string'),
            onValueChange: v('setDueDate', STRING_SETTER),
            ...shared,
          }
    ),
  })
}

function combobox(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  const multiple = one(p, 'Type', 'Single') === 'Multiple'
  return build('combobox', {
    consts: [
      {
        name: 'teams',
        value: [
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'product', label: 'Product' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'operations', label: 'Operations' },
          { value: 'archive', label: 'Archived team', disabled: true },
        ],
      },
    ],
    jsx: h('Combobox', {
      label: 'Team',
      options: raw('teams'),
      multiple,
      value: multiple ? v('selectedTeams', 'string[]') : v('team', 'string'),
      onValueChange: multiple
        ? v('setSelectedTeams', '(value: string[]) => void')
        : v('setTeam', STRING_SETTER),
      size: sized(sizeOf(p)),
      hideLabel: !on(p, 'Options', 'Label', true),
      helperText: on(p, 'Options', 'Helper text', true) && 'Search and choose your project team.',
      error: state === 'Error' && 'Choose a team to continue.',
      disabled: state === 'Disabled',
    }),
  })
}

function choice(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  const multiple = one(p, 'Type', 'Single') === 'Multiple'
  const descriptions = on(p, 'Options', 'Descriptions', false)
  const options = [
    { value: 'design', label: 'Design', description: descriptions && 'Shape the look and feel.' },
    { value: 'engineering', label: 'Engineering', description: descriptions && 'Bring the experience to life.' },
    { value: 'product', label: 'Product', description: descriptions && 'Decide what comes next.' },
  ]
  return build('choice', {
    consts: [{ name: 'areas', value: options }],
    jsx: h('Choice', {
      label: multiple ? 'Choose your interests' : 'Choose your focus',
      options: raw('areas'),
      multiple,
      value: multiple ? v('interests', 'string[]') : v('focus', 'string'),
      onValueChange: multiple ? v('setInterests', '(value: string[]) => void') : v('setFocus', STRING_SETTER),
      selectAll: multiple && on(p, 'Options', 'Select all', false),
      size: sized(sizeOf(p)),
      hideLabel: !on(p, 'Options', 'Label', true),
      helperText:
        on(p, 'Options', 'Helper text', false) && (multiple ? 'Choose any that apply.' : 'Choose one option.'),
      error: state === 'Error' && 'Please review your selection.',
      disabled: state === 'Disabled',
    }),
  })
}

function switchSnippet(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  return build('switch', {
    jsx: h('Switch', {
      label: 'Email notifications',
      hideLabel: !on(p, 'Options', 'Label', true),
      checked: v('notifications', 'boolean'),
      onCheckedChange: v('setNotifications', '(checked: boolean) => void'),
      size: sized(sizeOf(p)),
      helperText: on(p, 'Options', 'Helper text', false) && 'Keep up with important updates.',
      error: state === 'Error' && 'Notifications could not be updated. Try again.',
      disabled: state === 'Disabled',
    }),
  })
}

function slider(p: Playground): Snippet {
  const range = one(p, 'Type', 'Single') === 'Range'
  const step = Number(one(p, 'Step', '1'))
  return build('slider', {
    jsx: h('Slider', {
      label: 'Volume',
      range,
      value: range ? v('range', '[number, number]', '[20, 80]') : v('volume', 'number', '40'),
      onValueChange: range
        ? v('setRange', '(value: [number, number]) => void')
        : v('setVolume', '(value: number) => void'),
      step: step > 1 && step,
      showValues: !on(p, 'Options', 'Values', true) && raw('false'),
      showMarks: on(p, 'Options', 'Markers', false),
      disabled: one(p, 'State', 'Default') === 'Disabled',
    }),
  })
}

function search(p: Playground): Snippet {
  const state = one(p, 'State', 'Default')
  return build('search', {
    jsx: h('Search', {
      label: 'Search components',
      hideLabel: !on(p, 'Options', 'Label', true),
      value: v('query', 'string'),
      onValueChange: v('setQuery', STRING_SETTER),
      placeholder: 'Find a component…',
      /* The SDK's default shape is pill. */
      shape: one(p, 'Style', 'Rounded') === 'Rounded' && 'rounded',
      size: sized(sizeOf(p)),
      clearable: on(p, 'Options', 'Clear action', true),
      helperText: on(p, 'Options', 'Helper text', false) && 'Search by component name.',
      error: state === 'Error' && 'Search is unavailable. Try again.',
      disabled: state === 'Disabled',
      readOnly: state === 'Read-only',
    }),
  })
}

function link(p: Playground): Snippet {
  const inline = one(p, 'Type', 'Standalone') === 'Inline'
  const anchor = h(
    'TextLink',
    {
      href: '/docs/text-input',
      inline,
      leadingIcon: on(p, 'Options', 'Leading icon', false) && comp('LinkIcon'),
      trailingIcon: on(p, 'Options', 'Trailing icon', false) && comp('ArrowIcon'),
    },
    inline ? 'Text Input component' : 'Explore Text Input'
  )
  if (!inline) return build('link', { jsx: anchor })
  const sentence = h('p', {}, anchor)
  const code = `<p>\n  For field guidance, explore the{' '}\n  ${element(anchor, '  ', 2)}{' '}\n  before you begin.\n</p>`
  return build('link', { jsx: sentence, code })
}

function pagination(p: Playground): Snippet {
  const perPage = on(p, 'Options', 'Page size', true)
  return build('pagination', {
    jsx: h('Pagination', {
      page: v('page', 'number', '1'),
      total: one(p, 'State', 'Default') === 'Empty' ? 0 : 128,
      pageSize: perPage ? v('pageSize', 'number', '10') : 10,
      onPageChange: v('setPage', '(page: number) => void'),
      onPageSizeChange: perPage && v('setPageSize', '(size: number) => void'),
      showNumbers: !on(p, 'Options', 'Page numbers', true) && raw('false'),
      showCount: !on(p, 'Options', 'Result count', true) && raw('false'),
    }),
  })
}

function tabs(p: Playground): Snippet {
  const icons = on(p, 'Icon', 'Leading', false)
  const badge = one(p, 'Badge', 'None')
  const items = [
    { value: 'overview', label: 'Overview', icon: 'GridIcon', noun: 'milestones', count: 3, content: 'ProjectOverview' },
    { value: 'activity', label: 'Activity', icon: 'ActivityIcon', noun: 'updates', count: 2, content: 'ProjectActivity' },
    { value: 'files', label: 'Files', icon: 'FolderIcon', noun: 'files', count: 2, content: 'ProjectFiles' },
  ]
  return build('tabs', {
    jsx: h('Tabs', {
      label: 'Project',
      value: v('tab', 'string', "'overview'"),
      onValueChange: v('setTab', STRING_SETTER),
      variant: one(p, 'Type', 'Underline') === 'Pills' && 'pill',
      size: sized(sizeOf(p)),
      disabled: one(p, 'State', 'Default') === 'Disabled',
      items: items.map((item) => ({
        value: item.value,
        label: item.label,
        icon: icons && comp(item.icon),
        badge:
          badge === 'Count'
            ? { variant: 'count', count: item.count, label: item.noun }
            : badge === 'Indicator' && { variant: 'dot', label: `New ${item.noun}` },
        content: comp(item.content),
      })),
    }),
  })
}

function breadcrumbs(p: Playground): Snippet {
  return build('breadcrumbs', {
    jsx: h('Breadcrumbs', {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: 'Veylo', href: '/projects/veylo' },
        { label: 'Settings', href: '/projects/veylo/settings' },
      ],
      showHomeIcon: on(p, 'Options', 'Home icon', false),
      collapsed: on(p, 'Options', 'Collapse', false),
    }),
  })
}

function menu(p: Playground): Snippet {
  const type = one(p, 'Type', 'Actions')
  const disabled = one(p, 'State', 'Default') === 'Disabled'
  if (type !== 'Actions') {
    const single = type === 'Single'
    const current = single ? v('sortBy', 'string', "'Name'") : v('visibleColumns', 'string[]', "['Name', 'Status']")
    const update = single
      ? v('setSortBy', STRING_SETTER)
      : v(
          'toggleColumn',
          STRING_SETTER,
          [
            '(column: string) =>',
            '  setVisibleColumns((shown) =>',
            '    shown.includes(column) ? shown.filter((item) => item !== column) : [...shown, column]',
            '  )',
          ].join('\n'),
          v('setVisibleColumns', '(columns: string[]) => void')
        )
    const items = raw(
      [
        'columns.map((column) => ({',
        '  id: column,',
        '  label: column,',
        `  type: '${single ? 'radio' : 'checkbox'}',`,
        `  checked: ${single ? 'sortBy === column' : 'visibleColumns.includes(column)'},`,
        `  onSelect: () => ${update.code}(column),`,
        '}))',
      ].join('\n'),
      current,
      update
    )
    return build('menu', {
      consts: [{ name: 'columns', value: ['Name', 'Status', 'Updated'] }],
      jsx: h('Menu', { label: single ? 'Sort by' : 'Visible columns', disabled, items }),
      functionProps: ['onSelect'],
    })
  }
  const icons = on(p, 'Options', 'Icons', true)
  const shortcuts = on(p, 'Options', 'Shortcuts', false)
  const actions = [
    { id: 'rename', label: 'Rename', icon: 'EditIcon', shortcut: 'Alt+Shift+R', handler: 'renameProject' },
    { id: 'duplicate', label: 'Duplicate', icon: 'CopyIcon', shortcut: 'Alt+Shift+D', handler: 'duplicateProject' },
    { id: 'link', label: 'Copy link', icon: 'LinkIcon', shortcut: 'Alt+Shift+L', handler: 'copyLink' },
    { id: 'export', label: 'Export', icon: 'FileIcon', disabled: true, handler: 'exportProject' },
    ...(on(p, 'Options', 'Destructive', false)
      ? [{ id: 'delete', label: 'Delete project', icon: 'TrashIcon', destructive: true, handler: 'deleteProject' }]
      : []),
  ]
  return build('menu', {
    jsx: h('Menu', {
      label: 'Project actions',
      disabled,
      items: actions.map((item) => ({
        id: item.id,
        label: item.label,
        icon: icons && comp(item.icon),
        shortcut: shortcuts && item.shortcut,
        disabled: item.disabled,
        destructive: item.destructive,
        separatorBefore: item.destructive,
        onSelect: v(item.handler, VOID),
      })),
    }),
  })
}

function tag(p: Playground): Snippet {
  const tone = toneOf(p, 'Color', ['neutral', 'success', 'warning', 'error', 'info', 'brand'], 'neutral')
  const leading = one(p, 'Leading', 'None')
  const removable = on(p, 'Options', 'Removable', false)
  const body = h(
    'Tag',
    {
      key: raw('tag'),
      label: raw('tag'),
      tone: tone !== 'neutral' && tone,
      size: sized(sizeOf(p)),
      leading: leading === 'Dot' ? 'dot' : leading === 'Icon' && comp('LinkIcon'),
      onRemove: removable && fn('', raw('removeTag(tag)', v('removeTag', '(tag: string) => void'))),
    },
    raw('tag')
  )
  return build('tag', {
    consts: [{ name: 'tags', value: ['Design', 'Engineering', 'Product'] }],
    jsx: h('', {}, new MapExpr(raw('tags'), 'tag', body)),
  })
}

function metric(p: Playground): Snippet {
  return build('metric', {
    jsx: h('Metric', {
      label: on(p, 'Options', 'Label', true) && 'Revenue',
      value: '24,800',
      unit: 'USD',
      size: sized(sizeOf(p)),
      change: on(p, 'Options', 'Comparison', true) && {
        value: '12.8%',
        direction: 'up',
        meaning: 'positive',
        comparison: 'vs. last month',
      },
    }),
  })
}

function avatar(p: Playground): Snippet {
  const status = one(p, 'Status', 'None').toLowerCase()
  return build('avatar', {
    jsx: h('Avatar', {
      name: 'Alex Morgan',
      size: sized(sizeOf(p)),
      shape: one(p, 'Shape', 'Circle') === 'Rounded' && 'rounded',
      status: status !== 'none' && status,
    }),
  })
}

function list(p: Playground): Snippet {
  const leading = one(p, 'Leading', 'Icon')
  const description = on(p, 'Options', 'Description', true)
  const metadata = on(p, 'Options', 'Metadata', true)
  const disabled = one(p, 'State', 'Default') === 'Disabled'
  const open = v('openFile', STRING_SETTER)
  const files = [
    { id: 'brief', label: 'Project brief', text: 'The starting point for your next idea.', meta: 'Today', owner: 'Alex Morgan' },
    { id: 'research', label: 'Research notes', text: 'Observations worth keeping close.', meta: 'Yesterday', owner: 'Sam Lee' },
    { id: 'design', label: 'Design direction', text: 'A shared vision for what comes next.', meta: 'Sep 22', owner: 'Jordan Chen' },
  ]
  return build('list', {
    jsx: h('List', {
      label: 'Project files',
      size: sized(sizeOf(p)),
      divided: on(p, 'Options', 'Divider', true),
      items: files.map((file) => ({
        id: file.id,
        label: file.label,
        description: description && file.text,
        leading:
          leading === 'Icon'
            ? comp('FileIcon')
            : leading === 'Avatar' && h('Avatar', { name: file.owner, size: 'small' }),
        trailing: metadata && file.meta,
        disabled,
        onSelect: fn('', raw(`openFile('${file.id}')`, open)),
      })),
    }),
  })
}

function accordion(p: Playground): Snippet {
  return build('accordion', {
    jsx: h('Accordion', {
      multiple: one(p, 'Expand', 'Single') === 'Multiple',
      divided: one(p, 'Style', 'Divided') === 'Plain' && raw('false'),
      disabled: one(p, 'State', 'Default') === 'Disabled',
      items: [
        {
          id: 'included',
          label: 'What’s included?',
          content: 'Reusable components, thoughtful defaults, and the details that make an interface feel complete.',
        },
        {
          id: 'customize',
          label: 'Can I make it my own?',
          content: 'Adjust the tokens, spacing, and content to fit your product.',
        },
        {
          id: 'theme',
          label: 'Does it support both themes?',
          content: 'Light and dark are built in, with glass as an optional surface treatment.',
        },
      ],
    }),
  })
}

const formatSource = { name: 'formatSource', value: raw(`\`${FORMAT_SOURCE}\``) }

/** The article Prose shows, as JSX. The catalog page renders the same article. */
const PROSE_ARTICLE = `  <h2>Send your first invoice</h2>
  <p>
    Invoices go out from <strong>Billing</strong>. Each one gets a number, a due
    date and a link your client can pay from. Drafts save as you type.
  </p>
  <ol>
    <li>Choose a client, or add one with their billing email.</li>
    <li>
      Add line items. Amounts are in cents, so <code>12500</code> is $125.00.
    </li>
    <li>
      Press <kbd>⌘</kbd> <kbd>Enter</kbd> to send it, or save it as a draft.
    </li>
  </ol>
  <h3>Payment terms</h3>
  <p>
    Terms set the due date from the day you send. Most teams start with
    Net&nbsp;30 and change it for a client when they need to.
  </p>
  <table>
    <thead>
      <tr>
        <th>Term</th>
        <th>Due</th>
        <th>First reminder</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Due on receipt</td>
        <td>The same day</td>
        <td>After 3 days</td>
      </tr>
      <tr>
        <td>Net 15</td>
        <td>15 days after sending</td>
        <td>3 days before</td>
      </tr>
      <tr>
        <td>Net 30</td>
        <td>30 days after sending</td>
        <td>5 days before</td>
      </tr>
    </tbody>
  </table>
  <blockquote>
    <p>
      Send reminders from the invoice, not your inbox. Each one is logged, so
      nobody is chased twice.
    </p>
  </blockquote>
  <h3>Format amounts</h3>
  <p>
    Use one helper wherever amounts appear, so totals round the same way on
    every screen. <a href="/docs/currencies">Currencies</a> lists the rest.
  </p>
  <CodeBlock label="${FORMAT_FILE}" code={formatSource} />`

function prose(p: Playground): Snippet {
  const size = sized(sizeOf(p))
  const snippet = build('prose', {
    jsx: h('Prose', { size }, h('CodeBlock', { label: FORMAT_FILE, code: raw('formatSource') })),
    consts: [formatSource],
    code: `<Prose${size ? ` size="${size}"` : ''}>\n${PROSE_ARTICLE}\n</Prose>`,
  })
  /* Prose's links are your own anchors, so the provider's linkComponent doesn't take them over. */
  return { ...snippet, links: false }
}

function codeBlock(p: Playground): Snippet {
  const command = one(p, 'Content', 'File') === 'Command'
  const label = on(p, 'Options', 'Label', true)
  return build('code-block', {
    jsx: h('CodeBlock', {
      label: label && (command ? 'Shell' : FORMAT_FILE),
      code: command ? INSTALL_COMMAND : raw('formatSource'),
    }),
    consts: command ? [] : [formatSource],
  })
}

const BADGE_LABELS: Record<string, string> = {
  neutral: 'Status indicator',
  brand: 'Brand indicator',
  success: 'Healthy',
  warning: 'Needs attention',
  error: 'Issue detected',
  info: 'Information available',
}

function badge(p: Playground): Snippet {
  const tone = toneOf(p, 'Color', ['neutral', 'success', 'warning', 'error', 'info', 'brand'], 'neutral')
  const count = one(p, 'Variant', 'Dot') === 'Count'
  return build('badge', {
    jsx: h('Badge', {
      variant: count ? 'count' : 'dot',
      count: count && 8,
      size: sized(sizeOf(p)),
      tone: tone !== 'neutral' && tone,
      label: count ? 'unread notifications' : BADGE_LABELS[tone],
    }),
  })
}

const ALERT_EXAMPLES: Record<string, { title: string; text: string; action: string; handler: string }> = {
  brand: {
    title: 'Your workspace is ready',
    text: 'Everything is in place for your next project.',
    action: 'Open workspace',
    handler: 'openWorkspace',
  },
  info: {
    title: 'A new version is available',
    text: 'Update when you’re ready to get the latest improvements.',
    action: 'View updates',
    handler: 'viewUpdates',
  },
  success: {
    title: 'Changes saved',
    text: 'Your project is up to date and ready to share.',
    action: 'View project',
    handler: 'viewProject',
  },
  warning: {
    title: 'You have unsaved changes',
    text: 'Save your work before leaving this page.',
    action: 'Save changes',
    handler: 'saveChanges',
  },
  error: {
    title: 'Project brief unavailable',
    text: 'The file could not be loaded. Try again to review the brief.',
    action: 'Try again',
    handler: 'retry',
  },
}

function alert(p: Playground): Snippet {
  const tone = toneOf(p, 'Status', ['info', 'success', 'warning', 'error', 'brand'], 'info')
  const example = ALERT_EXAMPLES[tone]
  const toast = one(p, 'Type', 'Alert') === 'Toast'
  const dismiss = on(p, 'Options', 'Dismiss', false)
  const shared = {
    tone: tone !== 'info' && tone,
    title: on(p, 'Options', 'Title', true) && example.title,
    action: on(p, 'Options', 'Action', false) && { label: example.action, onClick: v(example.handler, VOID) },
  }
  if (!toast) {
    return build('alert', {
      jsx: h('Alert', { ...shared, onDismiss: dismiss && v('dismissAlert', VOID) }, example.text),
    })
  }
  const close = v('setShowToast', '(show: boolean) => void')
  return build('alert', {
    jsx: new When(
      v('showToast', 'boolean', 'true'),
      h(
        'Toast',
        { ...shared, showClose: !dismiss && raw('false'), onDismiss: fn('', raw('setShowToast(false)', close)) },
        example.text
      )
    ),
  })
}

function progress(p: Playground): Snippet {
  const indeterminate = one(p, 'Mode', 'Determinate') === 'Indeterminate'
  const value = Math.max(0, Math.min(100, Math.round(Number(one(p, 'Progress value', '60')) || 0)))
  return build('progress', {
    jsx: h('Progress', {
      label: 'Upload progress',
      value: !indeterminate && value,
      variant: one(p, 'Type', 'Linear') === 'Circular' && 'circular',
      showValue: !indeterminate && !on(p, 'Options', 'Percentage', true) && raw('false'),
    }),
  })
}

function tooltip(p: Playground): Snippet {
  const placement = one(p, 'Position', 'Top').toLowerCase()
  return build('tooltip', {
    jsx: h(
      'Tooltip',
      {
        content: 'Only invited people can access this project.',
        placement: placement !== 'top' && placement,
      },
      h('Button', { variant: 'quiet', iconOnly: true, 'aria-label': 'About project access' }, comp('InfoIcon'))
    ),
  })
}

function popover(p: Playground): Snippet {
  const content = h(
    '',
    {},
    h('Switch', {
      label: 'Notifications',
      checked: v('notifications', 'boolean', 'true'),
      onCheckedChange: v('setNotifications', '(checked: boolean) => void'),
      size: 'small',
    }),
    h('Switch', {
      label: 'Compact view',
      checked: v('compact', 'boolean'),
      onCheckedChange: v('setCompact', '(checked: boolean) => void'),
      size: 'small',
    }),
    h('Button', { size: 'small', onClick: raw('close') }, 'Done')
  )
  return build('popover', {
    jsx: h(
      'Popover',
      {
        label: 'Display preferences',
        placement: one(p, 'Position', 'Bottom') === 'Top' && 'top',
        disabled: one(p, 'State', 'Default') === 'Disabled',
      },
      fn('close', content)
    ),
    functionProps: ['onClick'],
  })
}

/* ------------------------------------------------------------------------ */
/* Patterns.                                                                 */
/* ------------------------------------------------------------------------ */

function pageHeader(p: Playground): Snippet {
  const show = (part: string) => on(p, 'Options', part, true)
  const primary = show('Primary action')
  const secondary = show('Secondary action')
  return build('page-header', {
    jsx: h('PageHeader', {
      title: 'Website launch',
      breadcrumbs:
        show('Breadcrumbs') &&
        h('Breadcrumbs', {
          items: [
            { label: 'Projects', href: '/projects' },
            { label: 'Website launch', href: '/projects/website-launch' },
          ],
        }),
      description:
        show('Description') &&
        'Bring the next version of your product to life. Keep the work, decisions, and people in one place.',
      tags:
        show('Tags') &&
        group(
          h('Tag', { label: 'In progress', leading: 'dot', tone: 'info' }, 'In progress'),
          h('Tag', { label: 'Design' }, 'Design')
        ),
      actions: group(
          secondary && h('Button', { variant: 'outline', onClick: v('follow', VOID) }, 'Follow'),
          primary && h('Button', { onClick: v('shareProject', VOID) }, 'Share project')
      ),
      navigation:
        show('Tabs') &&
        h('Tabs', {
          label: 'Project sections',
          items: v(
            'sections',
            "import('@idyeah/diya').TabItem[]",
            [
              '[',
              "  { value: 'overview', label: 'Overview', content: <p>Three milestones left before launch.</p> },",
              "  { value: 'activity', label: 'Activity', content: <p>Two updates since yesterday.</p> },",
              "  { value: 'files', label: 'Files', content: <p>The brief and the research notes.</p> },",
              ']',
            ].join('\n')
          ),
          value: v('section', 'string', "'overview'"),
          onValueChange: v('setSection', STRING_SETTER),
        }),
    }),
  })
}

function siteHeader(p: Playground): Snippet {
  const show = (part: string) => on(p, 'Options', part, true)
  const settings = show('Settings')
  const support = show('Support')
  const avatarShown = show('Avatar')
  const workspace = settings || support
  const workspaceActions = [
    ...(settings
      ? [
          {
            id: 'summaries',
            type: 'checkbox',
            label: 'Show project summaries',
            checked: v('showSummaries', 'boolean', 'true'),
            separatorBefore: avatarShown,
            onSelect: v('toggleSummaries', VOID, '() => setShowSummaries((on) => !on)', v('setShowSummaries', '(on: boolean) => void')),
          },
          {
            id: 'owners',
            type: 'checkbox',
            label: 'Show project owners',
            checked: v('showOwners', 'boolean'),
            onSelect: v('toggleOwners', VOID, '() => setShowOwners((on) => !on)', v('setShowOwners', '(on: boolean) => void')),
          },
        ]
      : []),
    ...(support
      ? [
          {
            id: 'search-tips',
            label: 'Search tips',
            separatorBefore: avatarShown || settings,
            onSelect: v('openSearchTips', VOID),
          },
          { id: 'about', label: 'About Veylo', onSelect: v('openAbout', VOID) },
        ]
      : []),
  ]
  const notifications =
    show('Notifications') &&
    h('Menu', {
      label: 'Notifications, 2 unread',
      triggerIcon: comp('BellIcon'),
      items: v(
        'notifications',
        "import('@idyeah/diya').MenuItem[]",
        [
          '[',
          "  { id: 'comment', label: 'Sam commented on Website launch', onSelect: () => {} },",
          "  { id: 'review', label: 'Jordan asked for your review', onSelect: () => {} },",
          ']',
        ].join('\n')
      ),
    })
  const workspaceMenu =
    !avatarShown &&
    workspace &&
    h('Menu', { label: 'Workspace actions', triggerIcon: comp('SettingsIcon'), items: raw('workspaceActions') })
  const accountItems: Js = workspace
    ? [{ id: 'profile', label: 'View profile', onSelect: v('openProfile', VOID) }, raw('...workspaceActions')]
    : [{ id: 'profile', label: 'View profile', onSelect: v('openProfile', VOID) }]
  const navigation = show('Navigation')
  return build('site-header', {
    consts: workspace ? [{ name: 'workspaceActions', type: 'MenuItem[]', value: workspaceActions }] : [],
    types: workspace ? ['MenuItem'] : [],
    jsx: h('SiteHeader', {
      brand: 'Veylo',
      brandLabel: 'Veylo home',
      brandHref: '/',
      items: navigation && [
        { value: 'projects', label: 'Projects' },
        { value: 'activity', label: 'Activity' },
        { value: 'people', label: 'People' },
      ],
      value: navigation && v('section', 'string', "'projects'"),
      onValueChange: navigation && v('setSection', STRING_SETTER),
      search: show('Search') && {
        value: v('query', 'string'),
        onValueChange: v('setQuery', STRING_SETTER),
        onSubmit: v('runSearch', STRING_SETTER),
        label: 'Search projects',
        placeholder: 'Search projects',
      },
      utilities: group(notifications, workspaceMenu),
      avatar:
        avatarShown &&
        h('Menu', {
          label: 'Account for Alex Morgan',
          triggerIcon: h('Avatar', { name: 'Alex Morgan', size: 'small' }),
          items: accountItems,
        }),
    }),
  })
}

function sideNavigation(p: Playground): Snippet {
  const item = (value: string, label: string, icon: string) => ({ value, label, icon: comp(icon) })
  return build('side-navigation', {
    consts: [
      {
        name: 'groups',
        value: [
          {
            id: 'work',
            label: 'Work',
            items: [
              item('projects', 'Projects', 'LayersIcon'),
              item('activity', 'Activity', 'ActivityIcon'),
              item('people', 'People', 'UsersIcon'),
            ],
          },
          {
            id: 'preferences',
            label: 'Preferences',
            items: [item('settings', 'Settings', 'SettingsIcon'), item('support', 'Support', 'HelpIcon')],
          },
        ],
      },
    ],
    jsx: h('SideNavigation', {
      brand: 'Veylo',
      collapsedBrand: 'v.',
      groups: raw('groups'),
      value: v('section', 'string', "'projects'"),
      onValueChange: v('setSection', STRING_SETTER),
      collapsed: on(p, 'Options', 'Collapsed', false),
      showGroups: !on(p, 'Options', 'Groups', true) && raw('false'),
    }),
  })
}

function card(p: Playground): Snippet {
  const show = (part: string, fallback: boolean) => on(p, 'Options', part, fallback)
  const primary = show('Primary action', true)
  const secondary = show('Secondary action', true)
  const menuShown = show('Menu', true)
  return build('card', {
    consts: menuShown
      ? [
          {
            name: 'cardActions',
            value: [
              { id: 'save', label: 'Save project', onSelect: v('saveProject', VOID) },
              { id: 'duplicate', label: 'Duplicate project', onSelect: v('duplicateProject', VOID) },
            ],
          },
        ]
      : [],
    jsx: h(
      'Card',
      {
        title: 'Website launch',
        description:
          show('Description', true) && 'A considered refresh, from the first impression to the final detail.',
        tags: show('Tag', true) && h('Tag', { label: 'In progress', leading: 'dot', tone: 'info' }, 'In progress'),
        media:
          show('Image', false) &&
          h('img', { src: '/images/website-launch.jpg', alt: 'Sculptural concrete architecture' }),
        actions:
          menuShown && h('Menu', { label: 'Card actions', triggerIcon: comp('MoreIcon'), items: raw('cardActions') }),
        footer: group(
            primary && h('Button', { onClick: v('viewProject', VOID) }, 'View project'),
            secondary && h('Button', { variant: 'quiet', onClick: v('saveProject', VOID) }, 'Save')
        ),
        divided: (primary || secondary) && show('Divider', true),
        shadow: show('Shadow', false),
      },
      show('Content', true) &&
        h(
          'div',
          {},
          h('Avatar', { name: 'Alex Morgan', size: 'small' }),
          hi('strong', {}, 'Alex Morgan'),
          hi('small', {}, 'Project owner')
        )
    ),
  })
}

function table(p: Playground): Snippet {
  const type = one(p, 'Type', 'Standard')
  const compact = one(p, 'Density', 'Comfortable') === 'Compact'
  const option = (name: string) => on(p, 'Options', name, true)
  const rich = type === 'Rich content' || type === 'Sticky columns'
  const selection = option('Selection')
  const actions = option('Actions')
  const paged = option('Pagination')
  const statusTag = hi(
    'Tag',
    { label: raw('row.status'), size: 'small', leading: 'dot', tone: raw('statusTone[row.status]') },
    raw('row.status')
  )
  const columns: Js[] = [
    { key: 'name', label: 'Project', width: 210, sortValue: fn('row', raw('row.name')), render: fn('row', raw('row.name')) },
    {
      key: 'owner',
      label: 'Owner',
      width: 180,
      sortValue: fn('row', raw('row.owner')),
      render: rich
        ? fn('row', h('span', {}, h('Avatar', { name: raw('row.owner'), size: 'small' }), raw('row.owner')))
        : fn('row', raw('row.owner')),
    },
    { key: 'status', label: 'Status', width: 142, sortValue: fn('row', raw('row.status')), render: fn('row', statusTag) },
    {
      key: 'budget',
      label: 'Budget',
      width: 124,
      numeric: true,
      sortValue: fn('row', raw('row.budget')),
      render: fn('row', raw('currency.format(row.budget)')),
    },
    ...(rich
      ? [
          {
            key: 'progress',
            label: 'Progress',
            width: 160,
            numeric: true,
            sortValue: fn('row', raw('row.progress')),
            render: fn('row', h('progress', { 'aria-label': raw('`${row.name} progress`'), max: 100, value: raw('row.progress') })),
          },
          { key: 'updated', label: 'Updated', width: 138, sortValue: fn('row', raw('row.updated')), render: fn('row', raw('row.updated')) },
          {
            key: 'visitors',
            label: 'Visitors',
            width: 120,
            numeric: true,
            render: fn('row', h('Metric', { size: 'small', value: raw('row.visitors'), change: raw('row.visitorsChange') })),
          },
        ]
      : []),
  ]
  const projectType = rich
    ? 'type Project = { id: string; name: string; owner: string; status: string; budget: number; progress: number; updated: string; visitors: string; visitorsChange: import("@idyeah/diya").MetricChange }'
    : 'type Project = { id: string; name: string; owner: string; status: string; budget: number }'
  return build('table', {
    context: [projectType],
    types: ['TableColumn', 'Tone'],
    consts: [
      {
        name: 'statusTone',
        type: 'Record<string, Tone>',
        value: { Planned: 'neutral', 'In progress': 'info', 'In review': 'warning', Blocked: 'error', Complete: 'success' },
      },
      {
        name: 'currency',
        value: raw(
          "new Intl.NumberFormat('en-US', {\n  style: 'currency',\n  currency: 'USD',\n  maximumFractionDigits: 0,\n})"
        ),
      },
      { name: 'columns', type: 'TableColumn<Project>[]', value: columns },
    ],
    jsx: h('Table', {
      label: 'Projects',
      rows: type === 'Empty' ? [] : v('projects', 'Project[]', projectRows(rich)),
      columns: raw('columns'),
      rowLabel: fn('row', raw('row.name')),
      searchText: option('Search') && fn('row', raw('`${row.name} ${row.owner} ${row.status}`')),
      filterOptions: option('Filters') && [
        {
          key: 'status',
          label: 'Status',
          options: ['Planned', 'In progress', 'In review', 'Blocked', 'Complete'],
          getValue: fn('row', raw('row.status')),
        },
        {
          key: 'owner',
          label: 'Owner',
          options: v('owners', 'string[]', "['Alex Morgan', 'Sam Lee', 'Jordan Chen']"),
          getValue: fn('row', raw('row.owner')),
        },
      ],
      density: compact && 'compact',
      /* Bulk actions turn row checkboxes on by default. */
      selectable: selection ? !actions : actions && raw('false'),
      sticky: type === 'Sticky columns',
      loading: type === 'Loading',
      pagination: !paged && raw('false'),
      defaultPageSize: paged && 5,
      pageSizeOptions: paged && [5, 10, 25],
      bulkActions: actions && [{ label: 'Archive', onAction: v('archiveProjects', '(ids: string[]) => void') }],
      onRowOpen: actions && v('openProject', '(row: Project) => void'),
    }),
  })
}

const PROJECTS = [
  { id: 'website', name: 'Website launch', owner: 'Alex Morgan', status: 'In progress', budget: 48000, progress: 64, updated: 'Today', visitors: '12.4k', change: 'up' },
  { id: 'mobile', name: 'Mobile app', owner: 'Sam Lee', status: 'In review', budget: 72000, progress: 82, updated: 'Yesterday', visitors: '8.1k', change: 'up' },
  { id: 'brand', name: 'Brand refresh', owner: 'Jordan Chen', status: 'Planned', budget: 26000, progress: 12, updated: 'Oct 14', visitors: '3.2k', change: 'flat' },
  { id: 'billing', name: 'Billing update', owner: 'Alex Morgan', status: 'Blocked', budget: 18000, progress: 40, updated: 'Oct 12', visitors: '1.9k', change: 'down' },
  { id: 'help', name: 'Help center', owner: 'Sam Lee', status: 'Complete', budget: 12000, progress: 100, updated: 'Oct 9', visitors: '5.6k', change: 'up' },
  { id: 'onboarding', name: 'Onboarding emails', owner: 'Jordan Chen', status: 'In progress', budget: 9000, progress: 55, updated: 'Oct 7', visitors: '2.7k', change: 'up' },
] as const

/** Sample rows for the complete Table file, as TypeScript source. */
function projectRows(rich: boolean) {
  const change = {
    up: { value: '+8%', direction: 'up', meaning: 'positive' },
    down: { value: '−4%', direction: 'down', meaning: 'negative' },
    flat: { value: '0%', direction: 'flat', meaning: 'neutral' },
  }
  const rows = PROJECTS.map(({ id, name, owner, status, budget, progress, updated, visitors, change: trend }) =>
    rich
      ? { id, name, owner, status, budget, progress, updated, visitors, visitorsChange: change[trend] }
      : { id, name, owner, status, budget }
  )
  return js(rows, '', 30)
}

const CHART_TYPES = ['line', 'area', 'bar', 'donut', 'pie', 'combo', 'treemap'] as const
const CHART_VARIANTS: Record<string, string[]> = {
  bar: ['standard', 'stacked', 'horizontal'],
  line: ['standard', 'smooth'],
  area: ['standard', 'stacked'],
  donut: ['standard', 'thin'],
}

const chartChannels = (dense: boolean) => channels.slice(0, dense ? 6 : 3)
const channelTotals = (dense: boolean) =>
  chartChannels(dense).map((channel) => ({ name: channel.name, value: chartData.reduce((sum, row) => sum + row[channel.key], 0) }))
const datumSource = (data: { name: string; value: number }[]) => js(data, '', 30)
/** The playground's series, as TypeScript source; a combo draws its last series as a line. */
function seriesSource(dense: boolean, combo: boolean) {
  const list = chartChannels(dense)
  const rows = list.map((channel, index) => {
    const line = combo && index === list.length - 1 ? ", type: 'line'" : ''
    return `  { name: '${channel.name}', values: [${chartData.map((row) => row[channel.key]).join(', ')}]${line} },`
  })
  return `[\n${rows.join('\n')}\n]`
}

function dataViz(p: Playground): Snippet {
  const type = toneOf(p, 'Type', CHART_TYPES, 'line')
  const variant = one(p, 'Variant', 'Standard').toLowerCase()
  const dense = one(p, 'Data', 'Light') === 'Dense'
  const option = (name: string) => on(p, 'Options', name, name !== 'Shadow')
  const treemap = type === 'treemap'
  const cartesian = ['line', 'area', 'bar', 'combo'].includes(type)
  const header = option('Header')
  const footer = option('Footer')
  const total = treemap ? '1,240' : acquisitionTotal(dense ? 'Dense' : 'Light').toLocaleString('en-US')
  return build('data-viz', {
    jsx: h('DataViz', {
      type,
      variant: (CHART_VARIANTS[type] ?? []).includes(variant) && variant !== 'standard' && variant,
      title: treemap ? 'Resource allocation' : 'Acquisition overview',
      showHeader: !header && raw('false'),
      description:
        header && (treemap ? 'How resources are distributed across teams.' : 'How people discover your product.'),
      actions: option('Period') && hi('span', {}, 'Jan–Jun 2026'),
      summary: option('Metric') && h('', {}, total, hi('small', {}, treemap ? 'Total allocation' : 'Total visits')),
      categories: cartesian && v('months', 'string[]', `[${chartData.map((row) => `'${row.name}'`).join(', ')}]`),
      series: cartesian && v('channels', "import('@idyeah/diya/charts').ChartSeries[]", seriesSource(dense, type === 'combo')),
      data:
        !cartesian &&
        (treemap
          ? v('allocation', "import('@idyeah/diya/charts').ChartDatum[]", datumSource(allocationData(dense ? 'Dense' : 'Light')))
          : v('channelTotals', "import('@idyeah/diya/charts').ChartDatum[]", datumSource(channelTotals(dense)))),
      legend: !treemap && !option('Legend') && raw('false'),
      grid: cartesian && !option('Grid') && raw('false'),
      tooltip: !option('Tooltip') && raw('false'),
      footer: footer && 'Source: product analytics',
      showDataToggle: !footer && raw('false'),
      shadow: option('Shadow'),
    }),
  })
}

/** The project fields the workflow previews share. */
function projectFields(helper: boolean) {
  return [
    h('TextInput', {
      label: 'Project name',
      value: v('projectName', 'string'),
      onValueChange: v('setProjectName', STRING_SETTER),
      placeholder: 'e.g. Veylo launch',
      helperText: helper && 'Choose a name your team will recognize.',
      required: true,
    }),
    h('TextInput', {
      label: 'Owner email',
      type: 'email',
      value: v('email', 'string'),
      onValueChange: v('setEmail', STRING_SETTER),
      placeholder: 'you@example.com',
      required: true,
    }),
  ]
}

function form(p: Playground): Snippet {
  const helper = on(p, 'Options', 'Helper text', true)
  const extended = on(p, 'Options', 'Additional fields', true)
  const extra = [
    h('Select', {
      label: 'Priority',
      value: v('priority', 'string', "'normal'"),
      onValueChange: v('setPriority', STRING_SETTER),
      options: raw('priorities'),
    }),
    h('DatePicker', { label: 'Due date', value: v('dueDate', 'string'), onValueChange: v('setDueDate', STRING_SETTER) }),
    h('Combobox', {
      label: 'Team',
      multiple: true,
      value: v('team', 'string[]'),
      onValueChange: v('setTeam', '(value: string[]) => void'),
      options: raw('teams'),
    }),
    h('TextArea', {
      label: 'Description',
      value: v('notes', 'string'),
      onValueChange: v('setNotes', STRING_SETTER),
      rows: 3,
      maxLength: 500,
      showCount: true,
    }),
    h('Switch', {
      label: 'Project updates',
      checked: v('updates', 'boolean', 'true'),
      onCheckedChange: v('setUpdates', '(checked: boolean) => void'),
    }),
  ]
  return build('form', {
    consts: extended
      ? [
          {
            name: 'priorities',
            value: [
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ],
          },
          {
            name: 'teams',
            value: [
              { value: 'design', label: 'Design' },
              { value: 'engineering', label: 'Engineering' },
              { value: 'product', label: 'Product' },
            ],
          },
        ]
      : [],
    jsx: h(
      'Form',
      {
        title: 'Create a project',
        description: helper && 'Project details, ownership, and preferences.',
        submitLabel: 'Create project',
        onSubmit: v(
          'createProject',
          '(event: import("react").FormEvent<HTMLFormElement>) => void',
          [
            '(event: import("react").FormEvent<HTMLFormElement>) => {',
            '  event.preventDefault()',
            "  console.log('createProject', { projectName, email })",
            '}',
          ].join('\n'),
          v('projectName', 'string'),
          v('email', 'string')
        ),
        onCancel: on(p, 'Options', 'Secondary action', true) && v('resetForm', VOID),
        noValidate: true,
      },
      ...projectFields(helper),
      ...(extended ? extra : [])
    ),
  })
}

function wizard(p: Playground): Snippet {
  return build('wizard', {
    consts: [
      {
        name: 'steps',
        value: [
          { id: 'details', label: 'Details', title: 'Start with the essentials', content: comp('ProjectDetails') },
          { id: 'preferences', label: 'Preferences', title: 'Make it work for your team', content: comp('ProjectPreferences') },
          { id: 'review', label: 'Review', title: 'Ready to create', content: comp('ProjectReview') },
        ],
      },
    ],
    jsx: h('Wizard', {
      label: 'Create project',
      steps: raw('steps'),
      activeStep: v('step', 'number', '0'),
      onStepChange: v('setStep', '(step: number) => void'),
      onComplete: v('createProject', VOID),
      completeLabel: 'Create project',
      orientation: one(p, 'Layout', 'Horizontal') === 'Vertical' && 'vertical',
      showStepCount: !on(p, 'Options', 'Step count', true) && raw('false'),
    }),
  })
}

function fileUpload(p: Playground): Snippet {
  return build('file-upload', {
    jsx: h('FileUpload', {
      files: v('files', 'File[]'),
      onFilesChange: v('setFiles', '(files: File[]) => void'),
      multiple: on(p, 'Options', 'Multiple files', true),
      accept: '.pdf,.png,.jpg,.jpeg,.webp',
      maxBytes: raw('10 * 1024 * 1024'),
      helperText: on(p, 'Options', 'Helper text', true) && 'PDF, PNG, JPG or WebP · Up to 10 MB per file.',
      onReject: v('showRejections', "(rejections: { file: File; reason: 'type' | 'size' }[]) => void"),
    }),
  })
}

function chatbot(p: Playground): Snippet {
  const layout = one(p, 'Type', 'Embedded').toLowerCase()
  const floating = layout === 'floating'
  return build('chatbot', {
    jsx: h('Chatbot', {
      title: 'Project assistant',
      description: 'Ask about your projects, files, and next steps.',
      layout: layout !== 'embedded' && (layout === 'full-page' ? 'full-page' : 'floating'),
      open: floating && v('open', 'boolean'),
      onOpenChange: floating && v('setOpen', '(open: boolean) => void'),
      welcome: 'What would you like to work on?',
      suggestions:
        on(p, 'Options', 'Suggestions', true) && ['Summarize project updates', 'Help me plan the next step', 'Find a project file'],
      showTimestamps: on(p, 'Options', 'Timestamps', false),
      messages: v(
        'messages',
        "import('@idyeah/diya').ChatMessage[]",
        "[\n  { id: '1', role: 'assistant', text: 'Hi! Ask me about your projects.' },\n]"
      ),
      value: v('draft', 'string'),
      onValueChange: v('setDraft', STRING_SETTER),
      onSend: v(
        'send',
        '(text: string, attachments: readonly File[]) => void',
        [
          '(text: string) => {',
          "  setMessages((current) => [...current, { id: String(current.length + 1), role: 'user', text }])",
          "  setDraft('')",
          '}',
        ].join('\n'),
        v('setMessages', "(messages: import('@idyeah/diya').ChatMessage[]) => void"),
        v('setDraft', STRING_SETTER)
      ),
      attachments: v('attachments', 'File[]'),
      onAttachmentsChange: v('setAttachments', '(files: File[]) => void'),
    }),
  })
}

function dialog(p: Playground): Snippet {
  const size = one(p, 'Size', 'Medium').toLowerCase()
  const name = v('projectName', 'string', "'Website launch'")
  return build('dialog', {
    jsx: h(
      'Dialog',
      {
        trigger: h('Button', { variant: 'outline' }, 'Edit project'),
        title: 'Project details',
        description: on(p, 'Options', 'Description', true) && 'Update the name people see across your project.',
        size: size !== 'medium' && size,
        showClose: !on(p, 'Options', 'Close button', true) && raw('false'),
        divided: on(p, 'Options', 'Divider', false),
        confirmDisabled: raw('!projectName.trim()', name),
        onConfirm: v('saveName', VOID),
        onDismiss: v('discardChanges', VOID),
      },
      h('TextInput', {
        label: 'Project name',
        value: name,
        onValueChange: v('setProjectName', STRING_SETTER),
        required: true,
        maxLength: 80,
      })
    ),
  })
}

function drawer(p: Playground): Snippet {
  const footerShown = on(p, 'Options', 'Footer', true)
  const setOpen = v('setOpen', '(open: boolean) => void')
  const actions = [
    h('Button', { variant: 'quiet', onClick: fn('', raw('setOpen(false)', setOpen)) }, 'Cancel'),
    h('Button', { onClick: v('saveProject', VOID) }, 'Save changes'),
  ]
  return build('drawer', {
    jsx: h(
      '',
      {},
      h('Button', { onClick: fn('', raw('setOpen(true)', setOpen)) }, 'Open drawer'),
      h(
        'Drawer',
        {
          open: v('open', 'boolean'),
          onOpenChange: setOpen,
          title: 'Project details',
          description: on(p, 'Options', 'Description', true) && 'Edit project ownership and schedule.',
          side: one(p, 'Position', 'Right') === 'Left' && 'left',
          footer: footerShown && h('', {}, ...actions),
        },
        ...projectFields(false),
        !footerShown && h('div', {}, ...actions)
      )
    ),
  })
}

const CONTENT_STATES: Record<string, { title: string; text: string; action: string; handler: string }> = {
  Empty: { title: 'No projects yet', text: 'Give your next idea a place to grow.', action: 'Create project', handler: 'createProject' },
  'No results': {
    title: 'No matching projects',
    text: 'Try another search or clear your filters.',
    action: 'Clear filters',
    handler: 'clearFilters',
  },
  Error: {
    title: 'Projects could not be loaded',
    text: 'Try again to load the projects.',
    action: 'Try again',
    handler: 'retry',
  },
}

function emptyState(p: Playground): Snippet {
  const type = one(p, 'Type', 'Empty')
  const state = CONTENT_STATES[type] ?? CONTENT_STATES.Empty
  return build('empty-state', {
    jsx: h('ContentState', {
      title: state.title,
      description: state.text,
      urgent: type === 'Error',
      action: on(p, 'Options', 'Action', true) && { label: state.action, onClick: v(state.handler, VOID) },
    }),
  })
}

const SNIPPETS: Record<ItemId, (p: Playground, o: Options) => Snippet> = {
  button,
  'text-input': textInput,
  'text-area': textArea,
  select,
  'date-picker': datePicker,
  combobox,
  choice,
  switch: switchSnippet,
  slider,
  search,
  link,
  pagination,
  tabs,
  breadcrumbs,
  menu,
  tag,
  metric,
  avatar,
  list,
  accordion,
  prose,
  'code-block': codeBlock,
  badge,
  alert,
  progress,
  tooltip,
  popover,
  'page-header': pageHeader,
  'site-header': siteHeader,
  'side-navigation': sideNavigation,
  card,
  table,
  'data-viz': dataViz,
  form,
  wizard,
  'file-upload': fileUpload,
  chatbot,
  dialog,
  drawer,
  'empty-state': emptyState,
}

/** The step-3 code for `id`, matching the playground's current values. */
export function snippetFor(id: ItemId, playground: Playground, options: Options = {}): Snippet {
  return SNIPPETS[id](playground, options)
}
