// Type-checks every Get code "complete file" against the SDK's types.
//
//   node scripts/check-snippets.mjs                 # against the installed @idyeah/diya
//   node scripts/check-snippets.mjs --sdk <dist>    # against another build, e.g. ../../packages/diya/dist
//   node scripts/check-snippets.mjs --out <dir>     # keep the generated .tsx files and tsconfig there
//
// It runs tests/get-code-files.test.tsx, which writes each file to disk and
// runs the real `tsc --noEmit` under the strictest of a fresh Vite and
// Next.js App Router config. Exit code 0 means every file compiles.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? resolve(args[index + 1]) : undefined
}
const env = { ...process.env }
const sdk = option('--sdk')
const out = option('--out')
if (sdk) env.DIYA_SDK_DIST = sdk
if (out) env.DIYA_SNIPPETS_OUT = out

/* Resolve vitest the way Node would from the app. */
const vitest = resolve(dirname(createRequire(resolve(app, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs')
const result = spawnSync(
  process.execPath,
  [vitest, 'run', '--config', 'tests/vitest.config.mjs', 'tests/get-code-files.test.tsx'],
  { cwd: app, env, stdio: 'inherit' }
)
process.exit(result.status ?? 1)
