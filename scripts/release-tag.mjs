#!/usr/bin/env node
// Checks that a release tag matches every published package's version (they
// release in lockstep: @idyeah/diya and create-diya share one version and one
// tag) and picks the npm dist-tag: "next" for prereleases, "latest" otherwise.
//   node scripts/release-tag.mjs v1.0.0
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

// Every package a release tag publishes.
export const RELEASED = ['packages/diya', 'packages/create-diya']

export function distTagFor(tag, version) {
  if (!semver.test(version)) throw new Error(`package.json version "${version}" is not valid semver`)
  if (tag !== `v${version}`) throw new Error(`Tag "${tag}" does not match package.json version "${version}" (expected v${version})`)
  return semver.exec(version)[4] ? 'next' : 'latest'
}

/** packages: [{ name, version }]. Throws unless all share the tag's version. */
export function lockstep(tag, packages) {
  if (!packages.length) throw new Error('No packages to release')
  const versions = new Set(packages.map((p) => p.version))
  if (versions.size > 1)
    throw new Error(`Packages release in lockstep, but the versions differ: ${packages.map((p) => `${p.name} ${p.version}`).join(', ')}`)
  return distTagFor(tag, packages[0].version)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2] ?? ''
  const root = fileURLToPath(new URL('../', import.meta.url))
  const packages = RELEASED.filter((dir) => existsSync(path.join(root, dir, 'package.json'))).map((dir) => {
    const { name, version } = JSON.parse(readFileSync(path.join(root, dir, 'package.json'), 'utf8'))
    return { name, version }
  })
  const distTag = lockstep(tag, packages)
  console.log(`Tag ${tag} matches ${packages.map((p) => `${p.name}@${p.version}`).join(' and ')}; publishing with --tag ${distTag}.`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `dist-tag=${distTag}\n`)
}
