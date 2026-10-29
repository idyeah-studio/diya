// Type-checks every Get code "complete file", and every Screens file, against
// the SDK's types.
//
//   node scripts/check-snippets.mjs                 # against the installed @idyeah/diya
//   node scripts/check-snippets.mjs --sdk <dist>    # against another build, e.g. ../../packages/diya/dist
//   node scripts/check-snippets.mjs --out <dir>     # keep the generated files there, in complete-files/ and screens/
//
// It runs tests/get-code-files.test.tsx and tests/screens-compile.test.ts,
// which write each file to disk and run the real `tsc --noEmit` under the
// strictest of a fresh Vite and Next.js App Router config (screens also
// against lucide-react). Exit code 0 means every file compiles.
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
if (out) {
  env.DIYA_SNIPPETS_OUT = resolve(out, 'complete-files')
  env.DIYA_SCREENS_OUT = resolve(out, 'screens')
}

/* Resolve vitest the way Node would from the app. */
const vitest = resolve(dirname(createRequire(resolve(app, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs')
const result = spawnSync(
  process.execPath,
  [vitest, 'run', '--config', 'tests/vitest.config.mjs', 'tests/get-code-files.test.tsx', 'tests/screens-compile.test.ts'],
  { cwd: app, env, stdio: 'inherit' }
)
process.exit(result.status ?? 1)
