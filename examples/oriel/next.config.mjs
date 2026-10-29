import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// In the public repo the workspace root sits two levels up; on its own, the example is the root.
const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../..')
const root = existsSync(join(repo, 'pnpm-workspace.yaml')) ? repo : here

/** @type {import('next').NextConfig} */
export default {
  outputFileTracingRoot: root,
  turbopack: { root },
}
