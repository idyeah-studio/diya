#!/usr/bin/env node
// Writes the frozen 1.1.1 fixtures from the current dist. Run it once, on the 1.1.1 build only:
//   field-markup-1.1.1.json   the fields' client and server markup (field-markup*.test.tsx)
//   provider-ssr-1.1.1.json   DiyaProvider's server markup (ssr.test.ts)
// Every later build is compared with them, on React 18 and 19.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = fileURLToPath(new URL('../../', import.meta.url))
const scratch = mkdtempSync(join(tmpdir(), 'diya-fixtures-'))
execFileSync('pnpm', ['exec', 'vitest', 'run', '--config', 'tests/vitest.config.mjs', 'tests/field-markup.test.tsx', 'tests/field-markup-ssr.test.tsx', 'tests/ssr.test.ts'], {
  cwd: pkg,
  stdio: 'inherit',
  env: { ...process.env, DIYA_WRITE_FIXTURES: scratch },
})
const fields = {}
const provider = {}
for (const file of readdirSync(scratch).sort()) {
  const [, version, side] = /^(.+)-(client|server|provider)\.json$/.exec(file)
  const value = JSON.parse(readFileSync(join(scratch, file), 'utf8'))
  if (side === 'provider') provider[version] = value
  else (fields[version] ??= {})[side] = value
}
rmSync(scratch, { recursive: true })
if (Object.keys(fields).length !== 2 || Object.keys(provider).length !== 2) throw new Error('expected React 18 and 19')
writeFileSync(join(pkg, 'tests/fixtures/field-markup-1.1.1.json'), `${JSON.stringify(fields, null, 2)}\n`)
writeFileSync(join(pkg, 'tests/fixtures/provider-ssr-1.1.1.json'), `${JSON.stringify(provider, null, 2)}\n`)
console.log(`wrote the fixtures: ${Object.entries(fields).map(([version, sides]) => `${version} ${Object.keys(sides.client).length} client and ${Object.keys(sides.server).length} server field states, ${Object.keys(provider[version]).length} providers`).join('; ')}`)
