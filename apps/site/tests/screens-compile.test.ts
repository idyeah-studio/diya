import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Every screen file (and poster), copied on its own into a scratch app and
 * checked by the real `tsc --noEmit` against the SDK's published types and
 * lucide-react, with the same strict flags as Get code's complete files
 * (tests/get-code-files.test.tsx): unused locals and parameters fail, type
 * imports must say so. Each file is a module of its own; nothing is shared.
 *
 * DIYA_SDK_DIST checks against another SDK build, such as
 * packages/diya/dist after a local `pnpm build`; DIYA_SCREENS_OUT keeps the
 * files in that folder.
 */
function checkScreens() {
  const out = process.env.DIYA_SCREENS_OUT ?? join(app, 'node_modules', '.cache', 'diya-screen-files')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'src'), { recursive: true })
  const screens = join(app, 'screens')
  const files = readdirSync(screens).filter((name) => name.endsWith('.tsx'))
  const posters = readdirSync(join(screens, 'posters')).filter((name) => name.endsWith('.tsx'))
  for (const name of files) writeFileSync(join(out, 'src', name), readFileSync(join(screens, name), 'utf8'))
  for (const name of posters) writeFileSync(join(out, 'src', `poster-${name}`), readFileSync(join(screens, 'posters', name), 'utf8'))
  /* The check is real: this one file must fail, and only for its unknown prop. */
  const first = readFileSync(join(screens, files[0]), 'utf8')
  writeFileSync(join(out, 'src', 'zz-broken.tsx'), first.replace('<LucideProvider size={18}', '<LucideProvider sizes={18}'))
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
        'lucide-react': [join(app, 'node_modules/lucide-react/dist/lucide-react.d.ts')],
        react: [join(app, 'node_modules/@types/react')],
        'react/*': [join(app, 'node_modules/@types/react/*')],
      },
    },
    include: ['src/*.tsx'],
  }
  writeFileSync(join(out, 'tsconfig.json'), JSON.stringify(config, null, 2))
  try {
    execFileSync(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '-p', out], { cwd: out, encoding: 'utf8' })
    return { out, count: files.length + posters.length, errors: [] as string[] }
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? String(error)
    const errors = output.split('\n').filter((line) => /error TS/.test(line))
    return { out, count: files.length + posters.length, errors: errors.length ? errors : [output] }
  }
}

describe('Screens compile as pasted', () => {
  it('every screen and poster compiles on its own with strict tsc against the SDK and lucide-react', () => {
    const { out, count, errors } = checkScreens()
    expect(count).toBe(36)
    expect(errors.filter((error) => !error.startsWith('src/zz-broken.tsx')), `files in ${out}`).toEqual([])
    expect(errors.filter((error) => error.startsWith('src/zz-broken.tsx('))).toHaveLength(1)
    if (!process.env.DIYA_SCREENS_OUT) rmSync(out, { recursive: true, force: true })
  }, 120_000)
})
