import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cases } from './snippet-cases'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Every "Copy as a complete file" snippet, written to disk and checked by
 * the real `tsc --noEmit` against the SDK's published types. The compiler
 * options are the strictest of a fresh Vite (react-ts) and Next.js App
 * Router app: unused locals and parameters fail, type imports must say so.
 *
 * DIYA_SDK_DIST checks against another SDK build, such as
 * packages/diya/dist after a local `pnpm build`; DIYA_SNIPPETS_OUT
 * keeps the files in that folder.
 */
function checkFiles() {
  const out = process.env.DIYA_SNIPPETS_OUT ?? join(app, 'node_modules', '.cache', 'diya-complete-files')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'src'), { recursive: true })
  const labels = new Map<string, string>()
  cases.forEach(({ label, snippet }, index) => {
    const name = `${String(index).padStart(3, '0')}-${snippet.fileName}`
    labels.set(name, label)
    writeFileSync(join(out, 'src', name), snippet.file)
  })
  /* The check is real: this one file must fail, and only for its unknown prop. */
  writeFileSync(join(out, 'src', 'zz-broken.tsx'), cases[0].snippet.file.replace('onClick=', 'onPress='))
  labels.set('zz-broken.tsx', 'deliberately broken')
  const sdk = process.env.DIYA_SDK_DIST ?? join(app, 'node_modules/@idyeah/diya/dist')
  const config = {
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
      types: [],
      typeRoots: [join(app, 'node_modules/@types')],
      paths: {
        '@idyeah/diya': [join(sdk, 'index.d.ts')],
        '@idyeah/diya/charts': [join(sdk, 'data-viz/index.d.ts')],
        react: [join(app, 'node_modules/@types/react')],
        'react/*': [join(app, 'node_modules/@types/react/*')],
      },
    },
    include: ['src/*.tsx'],
  }
  writeFileSync(join(out, 'tsconfig.json'), JSON.stringify(config, null, 2))
  try {
    execFileSync(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '-p', out], { encoding: 'utf8' })
    return { out, errors: [] as string[] }
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? String(error)
    const errors = output
      .split('\n')
      .filter((line) => /error TS/.test(line))
      .map((line) => {
        const file = line.match(/src\/([^(]+)\(/)?.[1] ?? ''
        return `${labels.get(file) ?? file}: ${line}`
      })
    return { out, errors: errors.length ? errors : [output] }
  }
}

describe('Copy as a complete file', () => {
  it('every complete file compiles with tsc --noEmit against the SDK types', () => {
    const { out, errors } = checkFiles()
    expect(errors.filter((error) => !error.startsWith('deliberately broken')), `files in ${out}`).toEqual([])
    expect(errors.filter((error) => error.startsWith('deliberately broken: ')).length).toBe(1)
    if (!process.env.DIYA_SNIPPETS_OUT) rmSync(out, { recursive: true, force: true })
  }, 120_000)

  it('is a whole module: one default export, client only when it needs to be', () => {
    for (const { label, snippet } of cases) {
      const { file } = snippet
      expect(file.match(/^export default function \w+Example\(\) \{$/gm), label).toHaveLength(1)
      expect(file, label).toContain(`export default function ${snippet.fileName.replace('.tsx', '')}()`)
      const body = file.slice(file.indexOf('export default'))
      const interactive = /useState|\n  function \w+\(|\n  const \w+ = \(/.test(body) || snippet.functionProps.length > 0
      expect(file.startsWith("'use client'\n"), label).toBe(interactive)
      expect(file, label).not.toMatch(/declare |import\(|DiyaProvider|\t/)
      expect(file.split('\n').every((line) => line === line.trimEnd()), label).toBe(true)
      /* Icons DIYA doesn't ship are drawn in the file, never imported. */
      for (const icon of snippet.icons) expect(file, `${label}: ${icon}`).toMatch(new RegExp(`function ${icon}\\(\\)`))
    }
  })
})
