import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MCP_API, mcpEntries } from './catalog'
import { getComponent, getSetup, getTheme, type ThemeArgs } from './tools'

const app = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** Every fenced block in an answer, with the heading line above it. */
function blocks(markdown: string, language: string) {
  return [...markdown.matchAll(new RegExp(`## ([^\\n]+)\\n\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'g'))].map(([, heading, code]) => ({ heading, code }))
}

/** Each file the MCP hands out, as an agent would paste it. */
function filesFromAnswers() {
  const files: Record<string, string> = {}
  for (const entry of mcpEntries()) {
    if (!entry.catalog) continue
    const [file] = blocks(getComponent({ name: entry.exportName, include: ['example'] }), 'tsx')
    files[`components/${entry.catalog.fileName}`] = file.code
  }
  for (const framework of ['next', 'vite'] as const) {
    for (const tailwind of [false, true]) {
      const root = `${framework}${tailwind ? '-tailwind' : ''}`
      for (const { heading, code } of blocks(getSetup({ framework, tailwind }), 'tsx')) {
        files[`${root}/${heading.replace(/^\d+\. /, '').replace(/ \(.*$/, '')}`] = code
      }
      if (framework === 'vite') files[`${root}/src/App.tsx`] = 'export default function App() {\n  return null\n}'
    }
  }
  const themes: ThemeArgs[] = [
    {},
    { brandColor: '#1F4E7A', glass: true },
    { brandColor: { light: '#9F802B', dark: '#F5C542' }, theme: 'dark', fontFamily: '"Inter", sans-serif', corners: 1.5 },
  ]
  themes.forEach((args, index) => {
    const line = /```tsx\n(<DiyaProvider[^\n]*>)\n```/.exec(getTheme(args))![1]
    const types = ['ReactNode', ...(line.includes('CSSProperties') ? ['CSSProperties'] : [])].sort().join(', ')
    files[`themes/Themed${index}.tsx`] = `import type { ${types} } from 'react'\nimport { DiyaProvider } from '@idyeah/diya'\n\nexport function Themed${index}({ children }: { children: ReactNode }) {\n  return (\n    ${line}\n      {children}\n    </DiyaProvider>\n  )\n}`
  })
  return files
}

/**
 * The same strictest-of-Vite-and-Next settings as the Get code check
 * (tests/get-code-files.test.tsx), plus Next.js and Node types for the
 * setup files.
 */
function typeCheck(files: Record<string, string>) {
  const out = process.env.DIYA_MCP_FILES_OUT ?? join(app, 'node_modules', '.cache', 'diya-mcp-files')
  rmSync(out, { recursive: true, force: true })
  for (const [name, code] of Object.entries(files)) {
    mkdirSync(dirname(join(out, name)), { recursive: true })
    writeFileSync(join(out, name), `${code}\n`)
  }
  const sdk = join(app, 'node_modules/@idyeah/diya/dist')
  writeFileSync(
    join(out, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        verbatimModuleSyntax: true,
        isolatedModules: true,
        skipLibCheck: true,
        noEmit: true,
        types: ['node'],
        typeRoots: [join(app, 'node_modules/@types')],
        paths: {
          '@idyeah/diya': [join(sdk, 'index.d.ts')],
          '@idyeah/diya/charts': [join(sdk, 'data-viz/index.d.ts')],
          'next/link': [join(app, 'node_modules/next/link.d.ts')],
          react: [join(app, 'node_modules/@types/react')],
          'react/*': [join(app, 'node_modules/@types/react/*')],
          'react-dom/client': [join(app, 'node_modules/@types/react-dom/client.d.ts')],
        },
      },
      include: ['**/*.tsx'],
    })
  )
  try {
    execFileSync(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '-p', out], { cwd: out, encoding: 'utf8' })
    return { out, errors: [] as string[] }
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? String(error)
    const errors = output.split('\n').filter((line) => /error TS/.test(line))
    return { out, errors: errors.length ? errors : [output] }
  }
}

describe('every file the MCP hands out', () => {
  it('compiles with tsc --noEmit against the SDK types: 39 complete files, the setup files and the themed providers', () => {
    const files = filesFromAnswers()
    expect(Object.keys(files).filter((name) => name.startsWith('components/'))).toHaveLength(39)
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['next/app/providers.tsx', 'next/app/layout.tsx', 'next-tailwind/app/layout.tsx', 'vite/src/main.tsx', 'vite-tailwind/src/main.tsx'])
    )
    // The check is real: this one file must fail, and only for its invented prop.
    files['zz/Broken.tsx'] = files['components/SwitchExample.tsx'].replace('onCheckedChange=', 'onToggle=')
    const { out, errors } = typeCheck(files)
    expect(errors.filter((error) => !error.startsWith('zz/Broken.tsx')), `files in ${out}`).toEqual([])
    expect(errors.filter((error) => error.startsWith('zz/Broken.tsx'))).toHaveLength(1)
    if (!process.env.DIYA_MCP_FILES_OUT) rmSync(out, { recursive: true, force: true })
  }, 180_000)

  it('names the package and version they were checked against', () => {
    expect(getSetup({}).split('\n')[0]).toBe(`# Set up ${MCP_API.package} ${MCP_API.version} in Next.js (App Router)`)
  })
})
