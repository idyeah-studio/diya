#!/usr/bin/env node
// Compares each package's npm tarball with its committed tarball.snapshot and
// size budget. Build @idyeah/diya first; create-diya has no build step.
//   node scripts/tarball.mjs --check [package-dir ...]   fail on any difference
//   node scripts/tarball.mjs --write [package-dir ...]   rewrite the file lists, keep the budgets
// With no package folders, it does every package in PACKAGES.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

// The packages we publish, in lockstep, and the files each one packs that must
// match the repository root. The package README is the npm page and the GitHub
// front page, so the root README is a byte-for-byte copy of it.
export const PACKAGES = {
  'packages/diya': { mirrored: ['LICENSE', 'NOTICE', 'CHANGELOG.md', 'README.md'] },
  'packages/create-diya': { mirrored: ['LICENSE'] },
}

export function readPack(dir) {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const [pack] = JSON.parse(output)
  return {
    name: pack.name,
    version: pack.version,
    size: pack.size,
    unpackedSize: pack.unpackedSize,
    files: pack.files.map((file) => file.path).sort(),
  }
}

export function parseSnapshot(text) {
  const budget = {}
  const files = []
  for (const line of text.split('\n')) {
    const rule = /^# budget (packed|unpacked) <= (\d+) bytes$/.exec(line)
    if (rule) budget[rule[1]] = Number(rule[2])
    else if (line && !line.startsWith('#')) files.push(line)
  }
  return { budget, files }
}

export function formatSnapshot(files, budget, name = '@idyeah/diya') {
  return [
    `# Files in the ${name} npm tarball. Regenerate with: pnpm snapshot:tarball`,
    `# budget packed <= ${budget.packed} bytes`,
    `# budget unpacked <= ${budget.unpacked} bytes`,
    ...files,
    '',
  ].join('\n')
}

/** Returns a list of problems; empty means the tarball matches. */
export function compare(pack, snapshot) {
  const problems = []
  const expected = new Set(snapshot.files)
  const actual = new Set(pack.files)
  for (const file of pack.files) if (!expected.has(file)) problems.push(`unexpected file: ${file}`)
  for (const file of snapshot.files) if (!actual.has(file)) problems.push(`missing file: ${file}`)
  if (!snapshot.budget.packed || !snapshot.budget.unpacked) problems.push('snapshot has no size budget')
  if (pack.size > snapshot.budget.packed)
    problems.push(`packed size ${pack.size} is over the ${snapshot.budget.packed} byte budget`)
  if (pack.unpackedSize > snapshot.budget.unpacked)
    problems.push(`unpacked size ${pack.unpackedSize} is over the ${snapshot.budget.unpacked} byte budget`)
  return problems
}

function mirrorProblems(dir, mirrored) {
  const problems = []
  for (const file of mirrored) {
    const top = path.join(root, file)
    const inner = path.join(root, dir, file)
    if (!existsSync(top) && !existsSync(inner)) continue
    if (!existsSync(top) || !existsSync(inner) || !readFileSync(top).equals(readFileSync(inner)))
      problems.push(`${file} differs between the repository root and ${dir}`)
  }
  return problems
}

function run(mode, dir) {
  const config = PACKAGES[dir] ?? { mirrored: [] }
  const snapshotFile = path.join(root, dir, 'tarball.snapshot')
  const pack = readPack(path.join(root, dir))
  const summary = `${pack.name}@${pack.version}: ${pack.files.length} files, ${pack.size} bytes packed, ${pack.unpackedSize} unpacked`
  if (mode === '--write') {
    const previous = existsSync(snapshotFile) ? parseSnapshot(readFileSync(snapshotFile, 'utf8')) : null
    // A new snapshot starts with 25% headroom; later writes keep the committed budget.
    const budget = previous?.budget.packed && previous?.budget.unpacked
      ? previous.budget
      : { packed: Math.ceil(pack.size * 1.25), unpacked: Math.ceil(pack.unpackedSize * 1.25) }
    writeFileSync(snapshotFile, formatSnapshot(pack.files, budget, pack.name))
    console.log(`Wrote ${dir}/tarball.snapshot. ${summary}`)
    const over = compare(pack, { files: pack.files, budget })
    if (over.length) console.error(over.join('\n'))
    return 0
  }
  if (!existsSync(snapshotFile)) throw new Error(`${dir}/tarball.snapshot is missing; run pnpm snapshot:tarball`)
  const problems = [...compare(pack, parseSnapshot(readFileSync(snapshotFile, 'utf8'))), ...mirrorProblems(dir, config.mirrored)]
  if (problems.length) {
    console.error(`Tarball check failed. ${summary}`)
    for (const problem of problems) console.error(`  ${problem}`)
    console.error('If the change is intended, run pnpm snapshot:tarball and commit the result.')
    return 1
  }
  console.log(`Tarball matches the snapshot. ${summary}`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, ...dirs] = process.argv.slice(2)
  if (mode !== '--check' && mode !== '--write') {
    console.error('Usage: tarball.mjs --check | --write [package-dir ...]')
    process.exitCode = 2
  } else {
    let failed = 0
    for (const dir of dirs.length ? dirs : Object.keys(PACKAGES)) failed |= run(mode, dir.replace(/\/$/, ''))
    process.exitCode = failed
  }
}
