#!/usr/bin/env node
// Scans a folder, or the npm tarball of a package, for private paths, internal
// project names and secrets. Exits 1 when anything is found.
//   node scripts/leak-scan.mjs <dir>
//   node scripts/leak-scan.mjs --pack packages/diya
//   node scripts/leak-scan.mjs --tarball idyeah-diya-1.0.0.tgz
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Internal names are stored encoded so this file does not match itself.
// The project name has no exception: the public docs live at diya13.ai, and
// the old host must never reach the repo or either npm package.
const decode = (value) => Buffer.from(value, 'base64').toString('utf8')
const project = decode('a2V5YQ==')

// A personal postal address must never be committed: the waitlist reads it from
// the DIYA_POSTAL_ADDRESS environment variable (apps/site/db/ENV.md).
const leakRules = [
  ['home folder path', new RegExp(decode('L1VzZXJzLw=='))],
  ['personal street address', new RegExp(decode('TWlsbGVyIEF2ZQ=='), 'i')],
  ['personal city', new RegExp(decode('Q3VwZXJ0aW5v'), 'i')],
  ['internal product domain', new RegExp(decode('Y3JpdDg='), 'i')],
  ['internal package scope', new RegExp(decode('QGtleWEv'), 'i')],
  ['internal app path', new RegExp(decode('YXBwcy93ZWI='))],
  ['internal product name', new RegExp(decode('XGJjcml0XGI='), 'i')],
  ['internal project name', new RegExp(project, 'i')],
]

const secretRules = [
  ['private key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['Stripe key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|\bwhsec_[A-Za-z0-9]{16,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['model provider key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/],
  ['blob storage token', /\bvercel_blob_rw_[A-Za-z0-9_]{16,}/],
  ['JSON web token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['URL with password', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/'"]+:[^\s:@/'"]{6,}@[^\s'"]+/i],
  [
    'hard-coded credential',
    /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{16,}["']/i,
  ],
]

const skipDirs = new Set(['node_modules', '.git', '.next', '.turbo', 'coverage'])

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

/** Returns findings for one file's name and content. */
export function scanText(name, text) {
  const findings = []
  for (const [label, pattern] of leakRules) {
    const match = pattern.exec(text)
    if (match) findings.push({ file: name, rule: label, line: lineOf(text, match.index) })
    if (pattern.test(name)) findings.push({ file: name, rule: `${label} in path`, line: null })
  }
  for (const [label, pattern] of secretRules) {
    const match = pattern.exec(text)
    if (match) findings.push({ file: name, rule: label, line: lineOf(text, match.index) })
  }
  return findings
}

function walk(root, relative = '') {
  const files = []
  const entries = readdirSync(path.join(root, relative), { withFileTypes: true })
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) files.push(...walk(root, child))
    } else if (entry.isFile()) files.push(child)
  }
  return files
}

function gitleaks(dir) {
  const bin = process.env.GITLEAKS_BIN || 'gitleaks'
  const probe = spawnSync(bin, ['version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) return { used: false }
  const run = spawnSync(bin, ['dir', dir, '--no-banner', '--redact', '--exit-code', '3'], {
    encoding: 'utf8',
  })
  if (run.status === 0) return { used: true, findings: [] }
  if (run.status === 3) return { used: true, findings: [{ file: dir, rule: 'gitleaks', line: null, detail: run.stdout }] }
  throw new Error(`gitleaks failed: ${run.stderr || run.stdout}`)
}

/** Scans every file under dir (skipping dependency and build caches). */
export function scanTree(dir) {
  const files = walk(dir)
  const findings = []
  for (const file of files) findings.push(...scanText(file, readFileSync(path.join(dir, file), 'latin1')))
  const external = gitleaks(dir)
  if (external.used) findings.push(...external.findings)
  return { files: files.length, findings, gitleaks: external.used }
}

/** Unpacks an npm tarball to a temp folder and scans it. */
export function scanTarball(file) {
  const work = mkdtempSync(path.join(tmpdir(), 'diya-leak-scan-'))
  try {
    execFileSync('tar', ['-xzf', file, '-C', work])
    return { ...scanTree(work), tarball: path.basename(file) }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

/** Packs the package with npm and scans the tarball. */
export function scanPack(packageDir) {
  const work = mkdtempSync(path.join(tmpdir(), 'diya-leak-pack-'))
  try {
    const output = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const [{ filename }] = JSON.parse(output)
    return scanTarball(path.join(work, path.basename(filename)))
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function report(label, result) {
  for (const finding of result.findings)
    console.error(`  ${finding.file}${finding.line ? `:${finding.line}` : ''}  ${finding.rule}`)
  const engine = result.gitleaks ? 'patterns + gitleaks' : 'patterns'
  if (result.findings.length) console.error(`Leak scan failed: ${label}, ${result.findings.length} finding(s).`)
  else console.log(`Leak scan clean: ${label}, ${result.files} files (${engine}).`)
  return result.findings.length ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args[0] === '--pack' && args[1]) {
    const result = scanPack(path.resolve(args[1]))
    process.exitCode = report(`tarball ${result.tarball}`, result)
  } else if (args[0] === '--tarball' && args[1]) {
    const result = scanTarball(path.resolve(args[1]))
    process.exitCode = report(`tarball ${result.tarball}`, result)
  } else if (args.length === 1 && !args[0].startsWith('--')) {
    process.exitCode = report(args[0], scanTree(path.resolve(args[0])))
  } else {
    console.error('Usage: leak-scan.mjs <dir> | --pack <package-dir> | --tarball <file.tgz>')
    process.exitCode = 2
  }
}
