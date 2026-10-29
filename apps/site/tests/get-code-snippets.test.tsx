import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ComponentType, ReactElement } from 'react'
import { AppearanceProvider } from '../app/Appearance'
import { ComboboxLibrary, DatePickerLibrary } from '../components/AdvancedInputsLibrary'
import { AlertLibrary } from '../components/AlertLibrary'
import { BadgeLibrary } from '../components/BadgeLibrary'
import { ButtonLibrary } from '../components/ButtonLibrary'
import { CardLibrary } from '../components/CardLibrary'
import { CatalogProvider } from '../components/CatalogProvider'
import { ChoiceLibrary } from '../components/ChoiceLibrary'
import { CollectionsLibrary } from '../components/CollectionsLibrary'
import { ContentLibrary } from '../components/ContentLibrary'
import { DataAtomsLibrary } from '../components/DataAtomsLibrary'
import { DataVizLibrary } from '../components/DataVizLibrary'
import { DialogLibrary } from '../components/DialogLibrary'
import { MoreAtomsLibrary } from '../components/MoreAtomsLibrary'
import { PageHeaderLibrary } from '../components/PageHeaderLibrary'
import { SelectLibrary } from '../components/SelectLibrary'
import { SiteHeaderLibrary } from '../components/SiteHeaderLibrary'
import { TableLibrary } from '../components/TableLibrary'
import { TabsLibrary } from '../components/TabsLibrary'
import { TextInputLibrary } from '../components/TextInputLibrary'
import { UtilityLibrary } from '../components/UtilityLibrary'
import { V1ApplicationLibrary } from '../components/V1ApplicationLibrary'
import { V1WorkflowLibrary } from '../components/V1WorkflowLibrary'
import { readPlayground, type Playground } from '../components/code/playground'
import { snippetFor, type Snippet } from '../components/code/snippets'
import { componentIds, patternIds } from '../lib/catalog-route'
import type { ItemId } from '../lib/customize/registry'
import { resetStoreForTests } from '../lib/customize/store'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
// The drawer is the consumer of this module; the pages only need their playgrounds.
vi.mock('../components/LibraryDownload', () => ({ LibraryDownload: () => null }))
// Keep Data Viz on its loading boundary; the playground controls are what matter here.
vi.mock('next/dynamic', () => ({
  default: (_load: unknown, options: { loading: ComponentType }) => options.loading,
}))

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
import { cases, ids, variants, type Case } from './snippet-cases'

/** Splits a snippet into imports, top-level statements and the JSX, as the drawer shows it. */
function parts(code: string) {
  const lines = code.split('\n')
  const blank = lines.indexOf('')
  const rest = lines.slice(blank + 1)
  const start = rest.findIndex((line) => /^[<{]/.test(line))
  return {
    imports: lines.slice(0, blank).join('\n'),
    statements: rest.slice(0, start).join('\n'),
    jsx: rest.slice(start).join('\n'),
  }
}

/** One in-memory program for every snippet: each becomes a module that renders it. */
function typeCheck(all: Case[]) {
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
    skipLibCheck: true,
    esModuleInterop: true,
  }
  const files = new Map<string, { label: string; text: string }>()
  all.forEach(({ label, snippet }, index) => {
    const { imports, statements, jsx } = parts(snippet.code)
    const text = [
      snippet.context ?? '',
      imports,
      statements,
      'export function Example() {',
      '  return (',
      '    <>',
      jsx,
      '    </>',
      '  )',
      '}',
      '',
    ].join('\n')
    files.set(join(app, 'tests', '__snippets__', `snippet-${index}.tsx`), { label, text })
  })
  const host = ts.createCompilerHost(options)
  const { getSourceFile, fileExists, readFile } = host
  host.getSourceFile = (fileName, language, ...rest) => {
    const file = files.get(fileName)
    return file
      ? ts.createSourceFile(fileName, file.text, language, true, ts.ScriptKind.TSX)
      : getSourceFile.call(host, fileName, language, ...rest)
  }
  host.fileExists = (fileName) => files.has(fileName) || fileExists.call(host, fileName)
  host.readFile = (fileName) => files.get(fileName)?.text ?? readFile.call(host, fileName)
  const program = ts.createProgram([...files.keys()], options, host)
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const file = diagnostic.file && files.get(diagnostic.file.fileName)
    const where =
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
        : 0
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    return file ? `${file.label}, line ${where}: ${message}\n${file.text}` : message
  })
}

/** Functions the snippet relies on: declared handlers, setters and app components, and render-prop callbacks like Popover's `close`. */
function knownFunctions(snippet: Snippet) {
  const context = snippet.context ?? ''
  return new Set(
    [
      ...context.matchAll(/declare const (\w+): \(/g),
      ...context.matchAll(/declare function (\w+)\(/g),
      ...snippet.code.matchAll(/^\s*\{\((\w+)\) =>/gm),
    ].map((match) => match[1])
  )
}

describe('Get code snippets', () => {
  it('covers every catalog item, with a non-default playground that changes the code', () => {
    expect(ids).toHaveLength(40)
    for (const id of ids) {
      const base = snippetFor(id, {}).code
      expect(variants[id].length, id).toBeGreaterThan(0)
      for (const variant of variants[id]) {
        expect(snippetFor(id, variant.playground, variant.options).code, id).not.toBe(base)
      }
    }
  })

  it('type-checks every snippet against the installed @idyeah/diya 1.0 types', () => {
    const button = snippetFor('button', {}, { shape: 'rounded' })
    const broken: Case[] = [
      { label: 'unknown value', id: 'button', snippet: { ...button, code: button.code.replace('"rounded"', '"square"') } },
      { label: 'unknown prop', id: 'button', snippet: { ...button, code: button.code.replace('shape=', 'corner=') } },
    ]
    const errors = typeCheck([...cases, ...broken])
    /* The check is real: exactly the two deliberately broken snippets fail. */
    expect(errors.filter((error) => !/^unknown (value|prop),/.test(error))).toEqual([])
    expect(errors.filter((error) => /^unknown (value|prop),/.test(error))).toHaveLength(2)
  }, 60_000)

  it('keeps the agreed shape: imports, a blank line, then code; nothing from steps 1 and 2', () => {
    for (const { label, id, snippet } of cases) {
      const { imports, jsx } = parts(snippet.code)
      expect(imports, label).toMatch(/^import \{[\s\S]+\} from '@idyeah\/diya(\/charts)?'$/)
      expect(imports, label).toContain(`from '${snippet.entry}'`)
      expect(jsx.length, label).toBeGreaterThan(0)
      expect(snippet.code, label).not.toMatch(/DiyaProvider|'use client'|export function|function Example|\t/)
      expect(snippet.code, label).not.toMatch(/\bPro\b|preview|colour|catalog/i)
      expect(snippet.code.split('\n').every((line) => line === line.trimEnd()), label).toBe(true)
      const dataViz = id === 'data-viz'
      expect(snippet.entry, label).toBe(dataViz ? '@idyeah/diya/charts' : '@idyeah/diya')
      expect(snippet.charts ?? false, label).toBe(dataViz)
    }
  })

  it('lists exactly the function-valued props the code passes', () => {
    for (const { label, snippet } of cases) {
      const { code } = snippet
      for (const name of snippet.functionProps) expect(code, `${label}: ${name}`).toMatch(new RegExp(`\\b${name}(=\\{|: )`))
      const passed = new Set(
        [...code.matchAll(/(\w+)(?:=\{|: )\(?[\w, ]*\)? =>/g)].map((match) => match[1])
      )
      const functions = knownFunctions(snippet)
      for (const match of code.matchAll(/(\w+)(?:=\{|: )(\w+)(?=[},\s])/g)) {
        if (functions.has(match[2])) passed.add(match[1])
      }
      expect([...passed].sort(), label).toEqual([...new Set(snippet.functionProps)].sort())
    }
  })

  it('names only what each pattern is really built from', () => {
    const sources: Partial<Record<ItemId, string>> = {
      'page-header': 'page-header/PageHeader.tsx',
      'site-header': 'site-header/SiteHeader.tsx',
      'side-navigation': 'application-patterns/SideNavigation.tsx',
      card: 'card/Card.tsx',
      table: 'table/Table.tsx',
      'data-viz': 'data-viz/DataViz.tsx',
      form: 'workflow/Form.tsx',
      wizard: 'workflow/Wizard.tsx',
      'file-upload': 'workflow/FileUpload.tsx',
      chatbot: 'application-patterns/Chatbot.tsx',
      dialog: 'dialog/Dialog.tsx',
      drawer: 'workflow/Drawer.tsx',
      'empty-state': 'workflow/ContentState.tsx',
    }
    const exportName = (id: string) => {
      const dts = readFileSync(join(app, 'node_modules/@idyeah/diya/dist/index.d.ts'), 'utf8')
      const match = dts.match(new RegExp(`export \\{ (\\w+)[^}]*\\} from '\\./${id}/`))
      return match?.[1]
    }
    for (const { label, id, snippet } of cases) {
      if ((componentIds as readonly string[]).includes(id)) {
        expect(snippet.builtWith, label).toBeUndefined()
        continue
      }
      const source = readFileSync(join(app, '../../packages/diya/src', sources[id]!), 'utf8')
      /* Components the pattern's own source renders (not shared helpers such as badge-utils). */
      const internal = componentIds.filter((part) => source.includes(`from '../${part}/${exportName(part)}.js'`))
      expect(snippet.builtWith, label).toBeDefined()
      for (const part of internal) expect(snippet.builtWith, `${label} renders ${part}`).toContain(part)
      for (const part of snippet.builtWith!) {
        expect(componentIds as readonly string[], label).toContain(part)
        const name = exportName(part)
        expect(name, part).toBeTruthy()
        const used = new RegExp(`<${name}\\b`).test(snippet.code)
        expect((internal as readonly string[]).includes(part) || used, `${label} built with ${part}`).toBe(true)
      }
    }
  })
})

describe('readPlayground', () => {
  it('skips visually hidden text in option labels (1.0 and Tier 0 class names)', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <fieldset><legend>Size</legend>
        <label><input type="radio" checked><span class="diya-sr-only">Choose </span>Large</label>
        <label><input type="radio"><span class="text-input-sr-only">Choose </span>Small</label>
      </fieldset>
      <label><input type="checkbox" role="switch" checked aria-label="Shadow"></label>`
    expect(readPlayground(root)).toEqual({ Size: 'Large', Shadow: 'true' })
  })

  it('reads radios, checkboxes and lone controls, and skips the Customize panel and dialogs', () => {
    const root = document.createElement('div')
    root.className = 'component-document'
    root.innerHTML = `
      <fieldset><legend> Size </legend>
        <label><input type="radio" name="s"><span>Small</span></label>
        <label><input type="radio" name="s" checked><span>Large</span></label>
      </fieldset>
      <fieldset><legend>Options</legend>
        <label><input type="checkbox" checked> Label </label>
        <label><input type="checkbox"> Helper text</label>
        <label><input type="checkbox" checked>Clear action</label>
      </fieldset>
      <fieldset disabled><legend>Icon</legend>
        <label><input type="checkbox" checked>Leading</label>
      </fieldset>
      <fieldset><legend>Size</legend>
        <label><input type="radio" name="t" checked><span>Medium</span></label>
      </fieldset>
      <fieldset><legend>Color</legend>
        <label><input type="radio" name="c" aria-label="Neutral"><span><span aria-hidden="true">•</span><span>Neutral</span></span></label>
        <label><input type="color" aria-label="Brand color" value="#FF5500" data-selected="true"><span>Brand</span></label>
      </fieldset>
      <label for="kind">Type</label>
      <select id="kind"><option>Standard</option><option selected>Loading</option></select>
      <input type="range" aria-label="Progress value" value="35">
      <div class="customize-inspector">
        <fieldset><legend>Shape</legend><label><input type="radio" checked><span>Pill</span></label></fieldset>
      </div>
      <div role="dialog"><fieldset><legend>Trapped</legend><label><input type="checkbox" checked>No</label></fieldset></div>
      <dialog><label for="d">Dialog field</label><select id="d"><option>No</option></select></dialog>
      <div class="customize-scope"><fieldset><legend>Choose your focus</legend><label><input type="radio" checked><span>Design</span></label></fieldset></div>
    `
    document.body.append(root)
    expect(readPlayground(root)).toEqual({
      Size: 'Large',
      Options: ['Label', 'Clear action'],
      Icon: [],
      Color: 'Brand',
      'Brand color': '#ff5500',
      Type: 'Loading',
      'Progress value': '35',
    })
    root.remove()
  })
})

describe('Get code follows the live playground', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetStoreForTests()
    const dialog = Object.getPrototypeOf(document.createElement('dialog'))
    vi.spyOn(dialog, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
      this.open = true
    })
    vi.spyOn(dialog, 'close').mockImplementation(function (this: HTMLDialogElement) {
      this.open = false
    })
  })

  function renderPage(page: ReactElement) {
    const view = render(
      <AppearanceProvider initialTheme="light" initialGlass={false}>
        <CatalogProvider>{page}</CatalogProvider>
      </AppearanceProvider>
    )
    const root = view.container.querySelector('.component-document')!
    return { read: () => readPlayground(root) }
  }

  /** Each catalog page, as /explore renders it. */
  const pages: Record<ItemId, () => ReactElement> = {
    button: () => <ButtonLibrary />,
    'text-input': () => <TextInputLibrary />,
    'text-area': () => <MoreAtomsLibrary component="text-area" />,
    select: () => <SelectLibrary />,
    'date-picker': () => <DatePickerLibrary />,
    combobox: () => <ComboboxLibrary />,
    choice: () => <ChoiceLibrary />,
    switch: () => <MoreAtomsLibrary component="switch" />,
    slider: () => <UtilityLibrary component="slider" />,
    search: () => <MoreAtomsLibrary component="search" />,
    link: () => <DataAtomsLibrary component="link" />,
    pagination: () => <DataAtomsLibrary component="pagination" />,
    tabs: () => <TabsLibrary />,
    breadcrumbs: () => <UtilityLibrary component="breadcrumbs" />,
    menu: () => <CollectionsLibrary component="menu" />,
    tag: () => <DataAtomsLibrary component="tag" />,
    metric: () => <DataAtomsLibrary component="metric" />,
    avatar: () => <MoreAtomsLibrary component="avatar" />,
    list: () => <CollectionsLibrary component="list" />,
    accordion: () => <CollectionsLibrary component="accordion" />,
    prose: () => <ContentLibrary component="prose" />,
    'code-block': () => <ContentLibrary component="code-block" />,
    badge: () => <BadgeLibrary />,
    alert: () => <AlertLibrary />,
    progress: () => <UtilityLibrary component="progress" />,
    tooltip: () => <MoreAtomsLibrary component="tooltip" />,
    popover: () => <CollectionsLibrary component="popover" />,
    'page-header': () => <PageHeaderLibrary />,
    'site-header': () => <SiteHeaderLibrary />,
    'side-navigation': () => <V1ApplicationLibrary pattern="side-navigation" />,
    card: () => <CardLibrary />,
    table: () => <TableLibrary />,
    'data-viz': () => <DataVizLibrary />,
    form: () => <V1WorkflowLibrary pattern="form" />,
    wizard: () => <V1WorkflowLibrary pattern="wizard" />,
    'file-upload': () => <V1WorkflowLibrary pattern="file-upload" />,
    chatbot: () => <V1ApplicationLibrary pattern="chatbot" />,
    dialog: () => <DialogLibrary />,
    drawer: () => <V1WorkflowLibrary pattern="drawer" />,
    'empty-state': () => <V1WorkflowLibrary pattern="empty-state" />,
  }

  it.each(ids)('%s: the untouched playground gives the default code', (id) => {
    const page = renderPage(pages[id]())
    const read = page.read()
    expect(Object.keys(read).length, id).toBeGreaterThan(0)
    expect(snippetFor(id, read).code, id).toBe(snippetFor(id, {}).code)
  })

  it('Button: size, type and state change the code', async () => {
    const user = userEvent.setup()
    const page = renderPage(<ButtonLibrary />)
    expect(page.read()).toEqual({ Type: 'Normal', Size: 'Medium', Icon: [], State: 'Default' })
    expect(snippetFor('button', page.read(), { shape: 'pill' }).code).toBe(
      "import { Button } from '@idyeah/diya'\n\n<Button onClick={handleContinue}>\n  Continue\n</Button>"
    )
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    await user.click(screen.getByRole('checkbox', { name: 'Leading' }))
    expect(page.read()).toMatchObject({ Size: 'Large', Icon: ['Leading'] })
    expect(snippetFor('button', page.read()).code).toContain('<Button size="large" onClick={handleContinue}>\n  <PlusIcon />\n  Continue')
    await user.click(screen.getByRole('radio', { name: 'Icon' }))
    await user.click(screen.getByRole('radio', { name: 'Loading' }))
    const read = page.read()
    expect(read).toMatchObject({ Type: 'Icon', Icon: [], State: 'Loading' })
    const code = snippetFor('button', read, { shape: 'rounded' }).code
    expect(code).toContain('iconOnly')
    expect(code).toContain('aria-label="Add item"')
    expect(code).toContain('loading')
    // Pill is Button's default, so only the rounded corner is written.
    expect(code).toContain('shape="rounded"')
  })

  it('Table: the Type select and options change the code', async () => {
    const user = userEvent.setup()
    const page = renderPage(<TableLibrary />)
    expect(page.read()).toEqual({
      Type: 'Standard',
      Density: 'Comfortable',
      Options: ['Search', 'Filters', 'Selection', 'Actions', 'Pagination'],
    })
    expect(snippetFor('table', page.read()).code).toContain('defaultPageSize={5}')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Sticky columns')
    await user.click(screen.getByRole('radio', { name: 'Compact' }))
    await user.click(screen.getByRole('checkbox', { name: 'Pagination' }))
    const read = page.read()
    expect(read).toMatchObject({ Type: 'Sticky columns', Density: 'Compact' })
    const code = snippetFor('table', read).code
    expect(code).toContain('sticky')
    expect(code).toContain('density="compact"')
    expect(code).toContain('pagination={false}')
    expect(code).toContain('<Avatar')
  })

  it('Data Viz: chart type and options change the code', async () => {
    const user = userEvent.setup()
    const page = renderPage(<DataVizLibrary />)
    expect(page.read()).toMatchObject({ Type: 'Line', Variant: 'Standard', Data: 'Light' })
    expect(snippetFor('data-viz', page.read()).code).toContain('type="line"')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Bar')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Variant' }), 'Horizontal')
    await user.click(screen.getByRole('checkbox', { name: 'Legend' }))
    const snippet = snippetFor('data-viz', page.read())
    expect(snippet.code).toContain('type="bar"')
    expect(snippet.code).toContain('variant="horizontal"')
    expect(snippet.code).toContain('legend={false}')
    expect(snippet.entry).toBe('@idyeah/diya/charts')
  })
})
