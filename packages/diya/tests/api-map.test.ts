import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { exportSources, styleTokens } from './style-tokens'

const root = process.cwd()
const work = mkdtempSync(join(tmpdir(), 'diya-api-'))

type Prop = { type: string; required: boolean; description?: string; values?: (string | number)[]; default?: unknown }
type Mode = { when: Record<string, unknown>; default?: true; props: Record<string, Prop> }
type Accepts = 'any' | string[]
type Slot = { accepts: Accepts; content?: string[]; multiple?: boolean; as?: string }
type Item = {
  kind: string
  title: string
  stability: string
  since: string
  exports: { name: string; entry: string }[]
  requires: { provider: boolean; peers: string[] }
  slots: Record<string, Slot>
  children: { allowed: boolean } & Partial<Slot>
  state: { value: string; onChange: string; default?: string }[]
  tokens: string[]
  messages: string | null
}
type Api = {
  schemaVersion: number
  package: string
  version: string
  entries: Record<string, { values: string[]; types: string[] }>
  items: Record<string, Item>
  components: Record<string, { entry: string; props: Record<string, Prop>; modes?: Mode[]; extendsDom?: string }>
  types: Record<string, string>
  tokens: Record<string, { group: string; kind: string; pairsWith: string[]; defaults: { light: string | null; dark: string | null }; setBy?: string }>
  messages: Record<string, Record<string, { kind: string; args?: string[]; default: string }>>
}

function generate(name: string) {
  const file = join(work, name)
  execFileSync(process.execPath, [resolve(root, 'scripts/build-api.mjs'), file], { cwd: root, stdio: 'pipe' })
  return readFileSync(file, 'utf8')
}

let text = ''
let api: Api
beforeAll(() => {
  text = generate('api.json')
  api = JSON.parse(text)
}, 60_000)
afterAll(() => rmSync(work, { recursive: true, force: true }))

const entryFiles = { '.': 'dist/index.js', './charts': 'dist/data-viz/index.js' }
const isComponent = (value: unknown, name = '') =>
  !/^use[A-Z]/.test(name) && (typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value))
const allProps = (name: string) => {
  const component = api.components[name]
  return Object.assign({}, component.props, ...(component.modes ?? []).map(mode => mode.props)) as Record<string, Prop>
}

// --- Type text paths: `items[].content`, `search.value` ----------------------

/** The type of `field` in an object type's text, such as `{ id: string; content: ReactNode; }`. */
function fieldType(objectText: string, field: string) {
  const body = objectText.replace(/^<[^>]*>\s*/, '').trim()
  if (!body.startsWith('{')) return undefined
  let depth = 0
  let start = -1
  for (let index = 0; index < body.length; index++) {
    const char = body[index]
    if ('{([<'.includes(char)) depth++
    else if ('})]'.includes(char) || (char === '>' && body[index - 1] !== '=')) depth--
    if (depth === 1 && start < 0) start = index + 1
    else if (depth === 1 && char === ';') {
      const match = /^(readonly\s+)?([\w$]+)\??:\s*([\s\S]*)$/.exec(body.slice(start, index).trim())
      if (match?.[2] === field) return match[3].trim()
      start = index + 1
    }
  }
  return undefined
}

const named = (typeText: string) => api.types[typeText.trim()] ?? typeText
function elementType(typeText: string) {
  const bare = typeText.trim().replace(/^readonly\s+/, '')
  const generic = /^([\w$]+)<[^>]*>\[\]$/.exec(bare)
  if (generic) return named(generic[1])
  if (bare.endsWith('[]')) return named(bare.slice(0, -2).replace(/^\((.*)\)$/, '$1'))
  return undefined
}

/** The type text a prop path resolves to on a component, or undefined. */
function pathType(component: string, path: string) {
  const [first, ...rest] = path.split('.')
  let type: string | undefined = allProps(component)[first.replace(/\[\]$/, '')]?.type
  if (type && first.endsWith('[]')) type = elementType(type)
  for (const segment of rest) {
    if (!type) return undefined
    type = fieldType(named(type), segment.replace(/\[\]$/, ''))
    if (type && segment.endsWith('[]')) type = elementType(type)
  }
  return type
}

const isNode = (type: string) => /\bReactNode\b/.test(type) && !/=>/.test(type)
// A render function, alone or beside a plain node: `ReactNode | ((close: () => void) => ReactNode)`.
const isRender = (type: string) => /=>\s*ReactNode\)?$/.test(type)

/** Every ReactNode prop of a component, with paths into arrays of object types. */
function nodePaths(component: string) {
  const paths: string[] = []
  const walk = (typeText: string, prefix: string, seen: string[]) => {
    const element = elementType(typeText)
    if (!element || seen.includes(element)) return
    const body = element.replace(/^<[^>]*>\s*/, '')
    for (const match of body.matchAll(/(?:^\{|;)\s*(?:readonly\s+)?([\w$]+)\??:/g)) {
      const field = fieldType(element, match[1])
      const path = `${prefix}[].${match[1]}`
      if (!field) continue
      if (isNode(field) || isRender(field)) paths.push(path)
      else walk(field, path, [...seen, element])
    }
  }
  for (const [name, prop] of Object.entries(allProps(component))) {
    if (name === 'children') continue
    if (isNode(prop.type) || isRender(prop.type)) paths.push(name)
    else walk(prop.type, name, [])
  }
  return paths.sort()
}

describe('API map', () => {
  it('names the package and both entries', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    expect(api.schemaVersion).toBe(1)
    expect(api.package).toBe(pkg.name)
    expect(api.version).toBe(pkg.version)
    expect(Object.keys(api.entries)).toEqual(['.', './charts'])
  })

  it('validates against api.schema.json, which ships beside it', () => {
    const schema = JSON.parse(readFileSync(resolve(root, 'api.schema.json'), 'utf8'))
    const validate = new Ajv2020({ strict: true, strictRequired: false, allowUnionTypes: true, allErrors: true }).compile(schema)
    for (const document of [api, JSON.parse(readFileSync(resolve(root, 'dist/api.json'), 'utf8'))]) {
      expect(validate(document), JSON.stringify(validate.errors, null, 2)).toBe(true)
    }
    expect(readFileSync(resolve(root, 'dist/api.schema.json'), 'utf8')).toBe(readFileSync(resolve(root, 'api.schema.json'), 'utf8'))
    expect(validate({ ...api, schemaVersion: 2 })).toBe(false)
    expect(validate({ ...api, items: { ...api.items, Button: api.items.button } })).toBe(false)
  })

  it('splits each entry into values and types, disjoint and complete', async () => {
    for (const [entry, file] of Object.entries(entryFiles)) {
      const module = await import(/* @vite-ignore */ resolve(root, file))
      const { values, types } = api.entries[entry]
      expect(values).toEqual(Object.keys(module).sort())
      expect(values.filter(name => types.includes(name))).toEqual([])
      const source = readFileSync(resolve(root, file.replace(/^dist/, 'src').replace(/\.js$/, '.ts')), 'utf8')
      const declared = [...source.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)]
        .flatMap(match => match[1].split(',').map(part => part.trim().replace(/^type\s+/, '')).filter(Boolean))
      expect([...values, ...types].sort()).toEqual([...new Set(declared)].sort())
      for (const name of types) expect(api.types[name], name).toBeDefined()
    }
  })

  it('covers every runtime component export, each in one item', async () => {
    const owners = new Map<string, string[]>()
    for (const [id, item] of Object.entries(api.items)) {
      for (const { name, entry } of item.exports) {
        owners.set(name, [...(owners.get(name) ?? []), id])
        expect(api.components[name]?.entry, `${id}: ${name}`).toBe(entry)
      }
    }
    for (const [entry, file] of Object.entries(entryFiles)) {
      const module = await import(/* @vite-ignore */ resolve(root, file))
      const components = Object.entries(module).filter(([name, value]) => isComponent(value, name)).map(([name]) => name)
      expect(components.length).toBeGreaterThan(0)
      for (const name of components) {
        expect(api.components[name], name).toBeDefined()
        expect(api.components[name].entry).toBe(entry)
        expect(api.entries[entry].values).toContain(name)
        expect(owners.get(name), `${name} needs exactly one item`).toHaveLength(1)
      }
    }
    expect(Object.keys(api.items)).toHaveLength(44)
    expect(api.items['data-viz'].exports.map(({ name }) => name)).toEqual(['DataViz', 'Chart'])
    expect(api.items['data-viz'].requires.peers).toEqual(['echarts'])
    // Ids are the first export's name in kebab-case.
    for (const [id, item] of Object.entries(api.items)) expect(item.exports[0].name.replace(/(?<!^)([A-Z])/g, '-$1').toLowerCase(), id).toBe(id)
    expect(api.items.chatbot.stability).toBe('experimental')
    expect(api.items['data-viz'].stability).toBe('experimental')
    expect(api.items['diya-provider'].requires.provider).toBe(false)
  })

  it('names a ReactNode prop in every slot, and lists every ReactNode prop as a slot', () => {
    for (const [id, item] of Object.entries(api.items)) {
      const [primary, ...variants] = item.exports.map(({ name }) => name)
      for (const [path, slot] of Object.entries(item.slots)) {
        const type = pathType(primary, path)
        expect(type, `${id}.slots.${path}`).toBeDefined()
        expect(slot.as === 'render' ? isRender(type!) : isNode(type!), `${id}.slots.${path}: ${type}`).toBe(true)
      }
      for (const name of [primary, ...variants]) {
        for (const path of nodePaths(name)) expect(item.slots[path], `${id}: ${name}.${path} is not a slot`).toBeDefined()
      }
    }
  })

  it('accepts only item ids that exist', () => {
    const ids = new Set(Object.keys(api.items))
    for (const [id, item] of Object.entries(api.items)) {
      const rules: [string, Accepts | undefined][] = [...Object.entries(item.slots).map(([path, slot]): [string, Accepts] => [path, slot.accepts]), ['children', item.children.accepts]]
      for (const [where, accepts] of rules) {
        if (Array.isArray(accepts)) for (const target of accepts) expect(ids.has(target), `${id}.${where} accepts ${target}`).toBe(true)
      }
      for (const slot of [...Object.values(item.slots), item.children]) {
        for (const kind of slot.content ?? []) expect(['text', 'icon', 'image']).toContain(kind)
      }
    }
  })

  it('matches children rules to the component', () => {
    for (const [id, item] of Object.entries(api.items)) {
      const name = item.exports[0].name
      const children = allProps(name).children
      if (!item.children.allowed) expect(children, `${id} takes children`).toBeUndefined()
      else {
        expect(children ?? api.components[name].extendsDom, `${id} has no children`).toBeDefined()
        if (children) expect(item.children.as === 'render' ? isRender(children.type) : isNode(children.type), `${id}: ${children.type}`).toBe(true)
      }
    }
  })

  it('pairs each state value with a real change callback', () => {
    expect(api.items.select.state).toEqual([{ value: 'value', onChange: 'onValueChange', default: 'defaultValue' }])
    expect(api.items.switch.state).toEqual([{ value: 'checked', onChange: 'onCheckedChange', default: 'defaultChecked' }])
    for (const id of ['text-input', 'text-area', 'choice', 'slider', 'combobox', 'date-picker', 'search'])
      expect(api.items[id].state, id).toEqual([{ value: 'value', onChange: 'onValueChange', default: 'defaultValue' }])
    for (const [id, item] of Object.entries(api.items)) {
      const name = item.exports[0].name
      for (const pair of item.state) {
        expect(pathType(name, pair.value), `${id}: ${pair.value}`).toBeDefined()
        expect(pathType(name, pair.onChange), `${id}: ${pair.onChange}`).toMatch(/=>\s*void$/)
        if (pair.default) expect(pathType(name, pair.default), `${id}: ${pair.default}`).toBeDefined()
      }
      // A prop `x` beside `onXChange` (or `value` beside onValueChange) is a pair, and must be listed.
      const props = allProps(name)
      for (const prop of Object.keys(props)) {
        const match = /^on(\w+)Change$/.exec(prop)
        if (!match) continue
        const value = match[1][0].toLowerCase() + match[1].slice(1)
        if (props[value]) expect(item.state.some(pair => pair.value === value && pair.onChange === prop), `${id}: ${value}/${prop}`).toBe(true)
      }
      // An uncontrolled starting prop for a state value is named as that pair's default.
      for (const pair of item.state) {
        const starting = `default${pair.value[0].toUpperCase()}${pair.value.slice(1)}`
        if (!pair.value.includes('.') && props[starting]) expect(pair.default, `${id}: ${starting}`).toBe(starting)
      }
    }
  })

  it('uses only tokens that exist in styles.css', () => {
    const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8')
    const provider = readFileSync(resolve(root, 'src/DiyaProvider.tsx'), 'utf8')
    const exists = (name: string) => new RegExp(`${name}(?![\\w-])`).test(css) || (!!api.tokens[name]?.setBy && provider.includes(`'${name}'`))
    for (const [name, token] of Object.entries(api.tokens)) {
      expect(exists(name), name).toBe(true)
      expect(name).not.toMatch(/^--diya-internal-/)
      for (const other of token.pairsWith) expect(api.tokens[other]?.pairsWith, `${name} -> ${other}`).toContain(name)
    }
    // Every public token the stylesheet uses is in the map.
    const used = new Set([...css.matchAll(/--diya-(?!internal-)[\w-]+/g)].map(match => match[0]))
    expect([...used].filter(name => !api.tokens[name])).toEqual([])
    for (const [id, item] of Object.entries(api.items)) {
      for (const name of item.tokens) expect(api.tokens[name], `${id}: ${name}`).toBeDefined()
    }
  })

  it('lists every token each item’s styles reach', () => {
    const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8')
    const sources = exportSources(root)
    const publicTokens = new Set(Object.keys(api.tokens))
    for (const [id, item] of Object.entries(api.items)) {
      const files = item.exports.map(({ name }) => sources.get(name)!)
      const reached = styleTokens(css, files, publicTokens, item.kind === 'provider')
      expect(reached.filter(name => !item.tokens.includes(name)), id).toEqual([])
    }
  })

  it('reads token defaults from the stylesheet and the provider', () => {
    expect(api.tokens['--diya-color-accent']).toMatchObject({ group: 'actions', kind: 'color', pairsWith: ['--diya-color-accent-text'], setBy: 'DiyaProvider.brandColor', defaults: { light: '#262626', dark: '#e8e8e8' } })
    expect(api.tokens['--diya-color-accent-text'].defaults).toEqual({ light: '#fafafa', dark: '#1c1c1c' })
    expect(api.tokens['--diya-radius-control'].defaults).toEqual({ light: 'calc(6px * var(--diya-corner-scale, 1))', dark: 'calc(6px * var(--diya-corner-scale, 1))' })
    expect(api.tokens['--diya-space-4'].defaults).toEqual({ light: '16px', dark: '16px' })
    expect(api.tokens['--diya-font'].setBy).toBe('DiyaProvider.fontFamily')
    expect(api.tokens['--diya-corner-scale'].defaults).toEqual({ light: '1', dark: '1' })
    expect(api.tokens['--diya-color-scrim'].defaults).toEqual({ light: null, dark: null })
  })

  it('describes every messages namespace and key', async () => {
    const { defaultMessages } = await import(/* @vite-ignore */ resolve(root, 'dist/index.js'))
    expect(Object.keys(api.messages).sort()).toEqual(Object.keys(defaultMessages).sort())
    for (const [namespace, keys] of Object.entries(api.messages)) {
      expect(Object.keys(keys).sort(), namespace).toEqual(Object.keys(defaultMessages[namespace]).sort())
      for (const [key, message] of Object.entries(keys)) {
        const value = defaultMessages[namespace][key]
        if (message.kind === 'string') expect(message.default).toBe(value)
        else {
          expect(message.kind).toBe('function')
          expect(typeof value).toBe('function')
          expect(message.args).toHaveLength(value.length)
        }
      }
    }
    expect(api.messages.tag.remove).toEqual({ kind: 'function', args: ['label'], default: '(label: string) => `Remove ${label}`' })
    for (const [id, item] of Object.entries(api.items)) {
      if (item.messages !== null) expect(api.messages[item.messages], `${id}: ${item.messages}`).toBeDefined()
    }
  })

  it('lists Button shape values', () => {
    expect(api.components.Button.props.shape.values).toEqual(['pill', 'rounded'])
    expect(api.components.Button.props.shape.default).toBe('pill')
    expect(api.components.Button.extendsDom).toBe('button')
    expect(api.components.Button.props.onClick).toBeUndefined()
  })

  it('keeps discriminated modes apart', () => {
    const valueTypes = (name: string) => api.components[name].modes?.map(mode => [mode.when, mode.props.value.type, mode.props.onValueChange.type])
    expect(valueTypes('Combobox')).toEqual([
      [{ multiple: false }, 'string', '(value: string) => void'],
      [{ multiple: true }, 'string[]', '(value: string[]) => void'],
    ])
    expect(valueTypes('Slider')).toEqual([
      [{ range: false }, 'number', '(value: number) => void'],
      [{ range: true }, '[number, number]', '(value: [number, number]) => void'],
    ])
    expect(valueTypes('Choice')?.map(([, value]) => value)).toEqual(['string', 'string[]'])
    expect(valueTypes('DatePicker')?.map(([, value]) => value)).toEqual(['string', 'DateRange'])
    expect(api.components.DatePicker.props.label.required).toBe(true)
    for (const name of ['Combobox', 'Choice', 'Slider', 'DatePicker']) {
      expect(api.components[name].modes?.[0].default).toBe(true)
      expect(api.components[name].props.value).toBeUndefined()
      expect(api.components[name].props.onValueChange).toBeUndefined()
    }
  })

  it('uses size, not fieldSize', () => {
    expect(api.components.TextInput.props.size.values).toEqual(['small', 'medium', 'large'])
    expect(api.components.TextInput.props.fieldSize).toBeUndefined()
    expect(api.components.TextInput.extendsDom).toBe('input')
  })

  it('describes the frozen Table surface', async () => {
    const props = api.components.Table.props
    for (const name of ['filterOptions', 'bulkActions', 'onRowOpen']) expect(props[name], name).toBeDefined()
    for (const name of ['renderExpanded', 'onArchive', 'archiveLabel', 'onInspect', 'inspectLabel', 'filter', 'filters', 'actions', 'selection']) expect(props[name], name).toBeUndefined()
    expect(props.selectable).toBeDefined()
    expect(props.defaultPageSize.default).toBe(10)
    expect(props.pageSizeOptions).toBeDefined()
    // The open item's default label lives in messages; openLabel still overrides it.
    expect(props.openLabel).toBeDefined()
    const { defaultMessages } = await import(/* @vite-ignore */ resolve(root, 'dist/index.js'))
    expect(defaultMessages.table.open).toBe('View details')
  })

  it('includes DiyaProvider props', () => {
    const props = api.components.DiyaProvider.props
    expect(Object.keys(props)).toEqual(expect.arrayContaining(['children', 'theme', 'glass', 'brandColor', 'fontFamily']))
    expect(props.theme.values).toEqual(['light', 'dark', 'system'])
    expect(props.theme.default).toBe('system')
    expect(props.surface.default).toBe(true)
  })

  // Regenerates the map from the TypeScript program, which is slow on shared CI runners.
  it('is byte-identical across runs', () => {
    expect(generate('again.json')).toBe(text)
    expect(text.endsWith('}\n')).toBe(true)
  }, 30_000)

  it('carries no absolute paths', () => {
    expect(text).not.toContain(root)
    expect(text).not.toMatch(/"\/(Users|private|tmp|home)\//)
    expect(text).not.toMatch(/[A-Za-z]:\\\\/)
  })
})
