// Writes dist/api.json (schema version 1) and copies api.schema.json beside it. Components and
// types are read from the built declarations, defaults from destructuring in src. Items, token
// groups and composition rules are hand-written in api-meta.mjs; token defaults come from
// styles.css and messages from each component's messages module.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { items as itemMeta, tokens as tokenMeta } from '../api-meta.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const output = resolve(process.argv[2] ?? join(root, 'dist', 'api.json'))

const entryFiles = { '.': 'dist/index.d.ts', './charts': 'dist/data-viz/index.d.ts' }
const program = ts.createProgram(Object.values(entryFiles).map(file => join(root, file)), {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
})
const checker = program.getTypeChecker()
const typeFlags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
const fromReact = node => /[\\/]node_modules[\\/](@types[\\/])?react[\\/]/.test(node?.getSourceFile().fileName ?? '')
const declarationOf = symbol => symbol.valueDeclaration ?? symbol.declarations?.[0]
const docs = symbol => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim() || undefined
const isOptional = symbol => (symbol.flags & ts.SymbolFlags.Optional) !== 0
const domElements = { Anchor: 'a', Button: 'button', Div: 'div', Form: 'form', Input: 'input', Select: 'select', TextArea: 'textarea' }

function typeString(type, at) {
  return checker.typeToString(type, at, typeFlags)
}

// The declared type, without the `| undefined` that optional properties pick up.
// A prop React's DOM types also declare reads from the component's own declaration.
function propType(symbol) {
  const declared = symbol.declarations?.filter(node => !fromReact(node))
  const declaration = declared?.length === 1 ? declared[0] : declarationOf(symbol)
  if ((symbol.declarations?.length === 1 || declared?.length === 1) && declaration?.type) {
    const type = checker.getTypeFromTypeNode(declaration.type)
    return { type, text: typeString(type, declaration), node: declaration.type }
  }
  const type = checker.getTypeOfSymbol(symbol)
  if (!isOptional(symbol) || !type.isUnion()) return { type, text: typeString(type, declaration) }
  const members = type.types.filter(member => !(member.flags & ts.TypeFlags.Undefined))
  const booleans = members.filter(member => member.flags & ts.TypeFlags.BooleanLiteral)
  const rest = members.filter(member => !(member.flags & ts.TypeFlags.BooleanLiteral)).map(member => typeString(member, declaration))
  return { type, text: [...rest, ...(booleans.length === 2 ? ['boolean'] : booleans.map(member => typeString(member, declaration)))].join(' | ') }
}

// Literal members in the order the source wrote them, following aliases such as AlertTone.
function literalsFromNode(node) {
  if (!node) return null
  if (ts.isParenthesizedTypeNode(node)) return literalsFromNode(node.type)
  if (ts.isUnionTypeNode(node)) {
    const parts = node.types.map(literalsFromNode)
    return parts.every(Boolean) ? parts.flat() : null
  }
  if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) return [node.literal.text]
    if (ts.isNumericLiteral(node.literal)) return [Number(node.literal.text)]
    if (ts.isPrefixUnaryExpression(node.literal) && ts.isNumericLiteral(node.literal.operand)) return [-Number(node.literal.operand.text)]
    return null
  }
  if (ts.isTypeReferenceNode(node) && !node.typeArguments) {
    let symbol = checker.getSymbolAtLocation(node.typeName)
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
    const alias = symbol?.declarations?.find(ts.isTypeAliasDeclaration)
    return alias ? literalsFromNode(alias.type) : null
  }
  return null
}

function literalValues({ type, node }) {
  const members = (type.isUnion() ? type.types : [type]).filter(member => !(member.flags & ts.TypeFlags.Undefined))
  if (members.length < 2 || !members.every(member => member.isStringLiteral() || member.isNumberLiteral())) return undefined
  const values = members.map(member => member.value)
  const ordered = literalsFromNode(node)
  if (ordered && ordered.length === values.length && ordered.every(value => values.includes(value))) return ordered
  return values
}

function describeProp(symbol, defaults) {
  const resolved = propType(symbol)
  const prop = { type: resolved.text, required: !isOptional(symbol) }
  const description = docs(symbol)
  if (description) prop.description = description
  const values = literalValues(resolved)
  if (values) prop.values = values
  // The checker orders literal unions by creation; keep the order the source wrote.
  if (values && resolved.node && ts.isUnionTypeNode(resolved.node)) prop.type = values.map(value => JSON.stringify(value)).join(' | ')
  if (Object.hasOwn(defaults, symbol.name)) prop.default = defaults[symbol.name]
  return prop
}

function domElement(propsType, sourceElement) {
  const inherited = propsType.getProperties().filter(symbol => fromReact(declarationOf(symbol)))
  if (!inherited.length) return undefined
  const named = new Set(inherited.map(symbol => declarationOf(symbol)?.parent?.name?.text).filter(Boolean))
  const specific = [...named].map(name => /^(\w+)HTMLAttributes$/.exec(name)?.[1]).find(Boolean)
  if (specific) return domElements[specific] ?? specific.toLowerCase()
  const handler = inherited.find(symbol => symbol.name === 'onClick')
  const element = handler && /<HTML(\w*)Element>/.exec(propType(handler).text)?.[1]
  return (element && domElements[element]) || sourceElement || 'element'
}

// --- Source defaults -------------------------------------------------------

const sourceFiles = new Map()
function sourceFor(declarationFile) {
  const base = relative(join(root, 'dist'), declarationFile).replace(/\.d\.ts$/, '')
  for (const extension of ['.tsx', '.ts']) {
    const file = join(root, 'src', base + extension)
    if (!existsSync(file)) continue
    if (!sourceFiles.has(file)) sourceFiles.set(file, ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX))
    return sourceFiles.get(file)
  }
  return undefined
}

function componentFunction(source, name) {
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue
      let init = declaration.initializer
      while (init && ts.isCallExpression(init)) init = init.arguments.find(arg => ts.isFunctionExpression(arg) || ts.isArrowFunction(arg) || ts.isCallExpression(arg))
      if (init && (ts.isFunctionExpression(init) || ts.isArrowFunction(init))) return init
    }
  }
  return undefined
}

function constantValue(source, node) {
  if (!node) return undefined
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return constantValue(source, node.expression)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { value: node.text }
  if (ts.isNumericLiteral(node)) return { value: Number(node.text) }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return { value: -Number(node.operand.text) }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return { value: true }
  if (node.kind === ts.SyntaxKind.FalseKeyword) return { value: false }
  if (node.kind === ts.SyntaxKind.NullKeyword) return { value: null }
  if (ts.isArrayLiteralExpression(node)) {
    const items = node.elements.map(element => constantValue(source, element))
    return items.every(Boolean) ? { value: items.map(item => item.value) } : undefined
  }
  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) return { value: {} }
  if (ts.isIdentifier(node)) {
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue
      const match = statement.declarationList.declarations.find(d => ts.isIdentifier(d.name) && d.name.text === node.text)
      if (match) return constantValue(source, match.initializer)
    }
  }
  return undefined
}

const defaultsCache = new Map()
function sourceDefaults(name, declarationFile, components) {
  if (defaultsCache.has(name)) return defaultsCache.get(name)
  defaultsCache.set(name, { defaults: {}, element: undefined })
  const source = declarationFile && sourceFor(declarationFile)
  const fn = source && componentFunction(source, name)
  const result = { defaults: {}, element: undefined }
  if (!fn?.parameters.length) return result
  const named = new Set()
  const rests = new Set()
  const props = new Set()
  const bind = pattern => {
    for (const element of pattern.elements) {
      if (element.dotDotDotToken) { if (ts.isIdentifier(element.name)) rests.add(element.name.text); continue }
      const key = element.propertyName ?? element.name
      const prop = ts.isIdentifier(key) || ts.isStringLiteral(key) ? key.text : undefined
      if (!prop) continue
      named.add(prop)
      const value = constantValue(source, element.initializer)
      if (value && !Object.hasOwn(result.defaults, prop)) result.defaults[prop] = value.value
    }
  }
  const param = fn.parameters[0].name
  if (ts.isObjectBindingPattern(param)) bind(param)
  else if (ts.isIdentifier(param)) props.add(param.text)
  const body = fn.body && ts.isBlock(fn.body) ? fn.body.statements : []
  for (const statement of body) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      const from = declaration.initializer
      if (ts.isObjectBindingPattern(declaration.name) && from && ts.isIdentifier(from) && (props.has(from.text) || rests.has(from.text))) bind(declaration.name)
    }
  }
  // Rest props spread onto another DIYA component inherit its defaults and its element; onto a DOM tag, they name the element.
  const visit = node => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const attributes = node.attributes.properties
      const spread = attributes.some(attr => ts.isJsxSpreadAttribute(attr) && ts.isIdentifier(attr.expression) && (rests.has(attr.expression.text) || props.has(attr.expression.text)))
      const tag = node.tagName.getText(source)
      if (spread && /^[a-z]/.test(tag)) result.element ??= tag
      if (spread && components.has(tag) && tag !== name) {
        const explicit = new Set(attributes.filter(ts.isJsxAttribute).map(attr => attr.name.getText(source)))
        const base = sourceDefaults(tag, components.get(tag), components)
        result.element ??= base.element
        for (const [prop, value] of Object.entries(base.defaults)) if (!named.has(prop) && !explicit.has(prop) && !Object.hasOwn(result.defaults, prop)) result.defaults[prop] = value
      }
    }
    ts.forEachChild(node, visit)
  }
  if (fn.body) visit(fn.body)
  defaultsCache.set(name, result)
  return result
}

// --- Exported types --------------------------------------------------------

// Declaration text with file-local helper aliases (ComboboxBase, Selection) inlined.
function typeText(declaration) {
  const source = declaration.getSourceFile()
  const exported = new Set(checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map(symbol => symbol.name))
  const locals = new Map(source.statements.filter(ts.isTypeAliasDeclaration).filter(d => !exported.has(d.name.text)).map(d => [d.name.text, d]))
  const transform = context => {
    const visit = node => {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && locals.has(node.typeName.text) && !node.typeArguments) {
        return ts.factory.createParenthesizedType(ts.visitNode(locals.get(node.typeName.text).type, visit))
      }
      if (ts.isStringLiteral(node)) return ts.factory.createStringLiteral(node.text)
      return ts.visitEachChild(node, visit, context)
    }
    return node => ts.visitNode(node, visit)
  }
  const [node] = ts.transform(declaration.type, [transform]).transformed
  const printer = ts.createPrinter({ removeComments: true })
  const text = printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']').trim()
  const params = declaration.typeParameters?.map(param => printer.printNode(ts.EmitHint.Unspecified, param, source).replace(/\s+/g, ' '))
  return params?.length ? `<${params.join(', ')}> ${text}` : text
}

// --- Components ------------------------------------------------------------

function describeComponent(name, entry, target, componentFiles, propsTypes) {
  const declaration = declarationOf(target)
  const signature = checker.getTypeOfSymbolAtLocation(target, declaration).getCallSignatures()[0]
  const component = { entry, props: {} }
  const description = docs(target) ?? (propsTypes.has(`${name}Props`) ? docs(propsTypes.get(`${name}Props`)) : undefined)
  if (description) component.description = description
  if (propsTypes.has(`${name}Props`)) component.propsType = `${name}Props`
  const typeParameters = signature.getTypeParameters()
  if (typeParameters?.length) {
    component.typeParameters = typeParameters.map(param => {
      const constraint = param.getConstraint()
      return constraint ? `${typeString(param, declaration)} extends ${typeString(constraint, declaration)}` : typeString(param, declaration)
    })
  }
  const param = signature.getParameters()[0]
  if (!param) return component
  const propsType = checker.getTypeOfSymbolAtLocation(param, declaration)
  const { defaults, element } = sourceDefaults(name, declaration.getSourceFile().fileName, componentFiles)
  // A prop is the component's own when its props type declares it, even if React's DOM types declare it too (Tag's required `children`).
  const own = type => type.getProperties().filter(symbol => !fromReact(declarationOf(symbol)) || symbol.declarations?.some(node => !fromReact(node)))
  const branches = propsType.isUnion() ? propsType.types.filter(type => type.getProperties().length) : []
  if (branches.length > 1) {
    const perBranch = branches.map(type => new Map(own(type).map(symbol => [symbol.name, symbol])))
    const names = [...new Set(perBranch.flatMap(map => [...map.keys()]))].sort()
    const signatureOf = symbol => `${isOptional(symbol)}:${propType(symbol).text}`
    const literalOf = symbol => {
      const type = checker.getTypeOfSymbol(symbol)
      const members = (type.isUnion() ? type.types : [type]).filter(member => !(member.flags & ts.TypeFlags.Undefined))
      if (members.length !== 1) return undefined
      const [member] = members
      if (member.flags & ts.TypeFlags.BooleanLiteral) return { value: typeString(member) === 'true' }
      if (member.isStringLiteral() || member.isNumberLiteral()) return { value: member.value }
      return undefined
    }
    const discriminant = names.find(prop => {
      if (!perBranch.every(map => map.has(prop))) return false
      const literals = perBranch.map(map => literalOf(map.get(prop)))
      return literals.every(Boolean) && new Set(literals.map(literal => JSON.stringify(literal.value))).size === branches.length
    })
    if (discriminant) {
      for (const prop of names) {
        const symbols = perBranch.map(map => map.get(prop))
        if (prop !== discriminant && symbols.every(Boolean) && new Set(symbols.map(signatureOf)).size === 1) component.props[prop] = describeProp(symbols[0], defaults)
      }
      const literals = perBranch.map(map => literalOf(map.get(discriminant)).value)
      const kinds = new Set(literals.map(value => typeof value))
      // Each branch documents its own mode, so the switch describes them all.
      const described = [...new Set(perBranch.map(map => docs(map.get(discriminant))).filter(Boolean))].join(' ')
      component.props[discriminant] = {
        type: kinds.size === 1 && kinds.has('boolean') ? 'boolean' : literals.map(value => JSON.stringify(value)).join(' | '),
        required: perBranch.every(map => !isOptional(map.get(discriminant))),
        ...(described ? { description: described } : {}),
        ...(kinds.has('boolean') ? {} : { values: literals }),
      }
      component.modes = perBranch.map((map, index) => {
        const mode = { when: { [discriminant]: literals[index] }, props: {} }
        if (isOptional(map.get(discriminant))) mode.default = true
        for (const [prop, symbol] of map) if (prop !== discriminant && !Object.hasOwn(component.props, prop)) mode.props[prop] = describeProp(symbol, defaults)
        return mode
      }).sort((a, b) => Number(!!b.default) - Number(!!a.default) || JSON.stringify(a.when).localeCompare(JSON.stringify(b.when)))
    }
  }
  if (!component.modes) for (const symbol of own(propsType)) component.props[symbol.name] = describeProp(symbol, defaults)
  const dom = domElement(propsType, element)
  if (dom) component.extendsDom = dom
  return component
}

// --- Messages --------------------------------------------------------------

// Each namespace of defaultMessages, read from the module that defines it; functions keep their source.
function describeMessages() {
  const parse = file => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
  const index = parse(join(root, 'src', 'messages-defaults.ts'))
  const modules = new Map()
  for (const statement of index.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const file = join(root, 'src', statement.moduleSpecifier.text.replace(/\.js$/, '.ts'))
    for (const element of statement.importClause?.namedBindings?.elements ?? []) modules.set(element.name.text, file)
  }
  const objectNamed = (source, name) => {
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue
      const match = statement.declarationList.declarations.find(d => ts.isIdentifier(d.name) && d.name.text === name)
      if (match?.initializer && ts.isObjectLiteralExpression(match.initializer)) return match.initializer
    }
    throw new Error(`messages: no object literal ${name} in ${relative(root, source.fileName)}`)
  }
  const messages = {}
  for (const property of objectNamed(index, 'defaultMessages').properties) {
    const namespace = property.name.text
    const identifier = ts.isShorthandPropertyAssignment(property) ? property.name.text : property.initializer.text
    const source = parse(modules.get(identifier))
    messages[namespace] = {}
    for (const entry of objectNamed(source, identifier).properties) {
      const value = entry.initializer
      if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
        messages[namespace][entry.name.text] = { kind: 'string', default: value.text }
      } else if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        messages[namespace][entry.name.text] = { kind: 'function', args: value.parameters.map(param => param.name.getText(source)), default: value.getText(source) }
      } else {
        throw new Error(`messages: ${namespace}.${entry.name.text} is neither a string nor a function`)
      }
    }
  }
  return messages
}

// --- Tokens ----------------------------------------------------------------

// Custom properties declared by top-level `.diya-root` rules, in order; light adds its own rules.
function rootDeclarations(css) {
  const blocks = { dark: {}, light: {} }
  const stack = []
  let buffer = ''
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; continue }
    if (char !== '}') { buffer += char; continue }
    const selector = stack.pop()
    const target = stack.length ? undefined : selector === '.diya-root' ? ['dark', 'light'] : selector === ".diya-root[data-theme='light']" ? ['light'] : undefined
    for (const part of target ? buffer.split(';') : []) {
      const colon = part.indexOf(':')
      const name = part.slice(0, colon).trim()
      // A provider-set token reads a private variable first; its fallback is the default.
      const value = part.slice(colon + 1).replace(/\s+/g, ' ').trim().replace(/^var\(--diya-internal-[\w-]+, (.+)\)$/, '$1')
      if (name.startsWith('--diya-')) for (const theme of target) blocks[theme][name] = value
    }
    buffer = ''
  }
  return blocks
}

function describeTokens(provider) {
  const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8')
  const declared = rootDeclarations(css)
  const tokens = {}
  for (const [name, meta] of Object.entries(tokenMeta)) {
    const token = { ...meta }
    if (Object.hasOwn(declared.dark, name)) {
      token.defaults = { light: declared.light[name], dark: declared.dark[name] }
    } else if (meta.setBy) {
      const value = provider.props[meta.setBy.split('.')[1]]?.default ?? null
      token.defaults = { light: value, dark: value }
    } else {
      // Not declared: the fallback every var() reference shares, or null when it is left unset.
      const fallbacks = new Set([...css.matchAll(new RegExp(`var\\(\\s*${name}\\s*,\\s*([^()]+?)\\s*\\)`, 'g'))].map(match => match[1]))
      const value = fallbacks.size === 1 ? [...fallbacks][0] : null
      token.defaults = { light: value, dark: value }
    }
    tokens[name] = token
  }
  return tokens
}

// --- Map -------------------------------------------------------------------

const api = { schemaVersion: 1, package: pkg.name, version: pkg.version, entries: {}, items: {}, components: {}, types: {}, tokens: {}, messages: {} }
const exportsByEntry = Object.entries(entryFiles).map(([entry, file]) => {
  const module = checker.getSymbolAtLocation(program.getSourceFile(join(root, file)))
  return [entry, checker.getExportsOfModule(module).map(symbol => ({ symbol, target: symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol }))]
})
const isComponent = ({ symbol, target }) => {
  const declaration = target.valueDeclaration
  return !!declaration && /^[A-Z]/.test(symbol.name) && checker.getTypeOfSymbolAtLocation(target, declaration).getCallSignatures().length > 0
}
const componentFiles = new Map(exportsByEntry.flatMap(([, list]) => list.filter(isComponent).map(({ symbol, target }) => [symbol.name, target.valueDeclaration.getSourceFile().fileName])))
const exportEntry = new Map()
for (const [entry, list] of exportsByEntry) {
  const names = flag => list.filter(({ target }) => target.flags & flag).map(({ symbol }) => symbol.name).sort()
  api.entries[entry] = { values: names(ts.SymbolFlags.Value), types: names(ts.SymbolFlags.Type & ~ts.SymbolFlags.Value) }
  const propsTypes = new Map(list.filter(({ target }) => target.flags & ts.SymbolFlags.TypeAlias).map(({ symbol, target }) => [symbol.name, target]))
  for (const item of list) {
    exportEntry.set(item.symbol.name, entry)
    const alias = item.target.declarations?.find(ts.isTypeAliasDeclaration)
    if (alias) api.types[item.symbol.name] ??= typeText(alias)
    // An interface, such as DiyaMessages, as the object type its merged declarations make.
    const declared = item.target.flags & ts.SymbolFlags.Interface && checker.getDeclaredTypeOfSymbol(item.target)
    if (declared) api.types[item.symbol.name] ??= `{ ${declared.getProperties().sort((a, b) => (a.name < b.name ? -1 : 1)).map(property => `${property.name}: ${typeString(checker.getTypeOfSymbol(property), declarationOf(property))};`).join(' ')} }`
    if (isComponent(item)) api.components[item.symbol.name] ??= describeComponent(item.symbol.name, entry, item.target, componentFiles, propsTypes)
  }
}

for (const [id, meta] of Object.entries(itemMeta)) {
  const { exports: names, requires, ...rest } = meta
  api.items[id] = {
    ...rest,
    exports: names.map(name => {
      if (!exportEntry.has(name)) throw new Error(`items.${id}: ${name} is not exported`)
      return { name, entry: exportEntry.get(name) }
    }),
    requires: { provider: true, peers: [], ...requires },
  }
}
api.tokens = describeTokens(api.components.DiyaProvider)
api.messages = describeMessages()

// Strings must match what the built module ships.
const { defaultMessages } = await import(pathToFileURL(join(root, 'dist', 'messages-defaults.js')).href)
for (const [namespace, keys] of Object.entries(api.messages)) {
  for (const [key, message] of Object.entries(keys)) {
    const value = defaultMessages[namespace]?.[key]
    if (message.kind === 'string' ? value !== message.default : typeof value !== 'function') throw new Error(`messages: ${namespace}.${key} differs from dist`)
  }
}
if (Object.keys(defaultMessages).sort().join() !== Object.keys(api.messages).sort().join()) throw new Error('messages: namespaces differ from dist')

const sortKeys = value => Array.isArray(value)
  ? value.map(sortKeys)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]))
    : value
const json = `${JSON.stringify(sortKeys(api), null, 2)}\n`
if (json.includes(root) || json.includes(root.split(sep).join('/'))) throw new Error('api.json would contain an absolute path')
writeFileSync(output, json)
copyFileSync(join(root, 'api.schema.json'), join(dirname(output), 'api.schema.json'))
console.log(`api.json: ${Object.keys(api.items).length} items, ${Object.keys(api.components).length} components, ${Object.keys(api.types).length} types, ${Object.keys(api.tokens).length} tokens -> ${output}`)
