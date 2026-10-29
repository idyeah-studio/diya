import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brandOf, detectPm, packageName, recoverNpmFlags } from '../index.mjs'

const cli = fileURLToPath(new URL('../index.mjs', import.meta.url))
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const TIMEOUT = { timeout: 20_000 }

function sandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'create-diya-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

// Runs the CLI with no terminal, the way CI and coding agents do.
function run(cwd, args, env = {}) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('npm_config_') && k !== 'CI'))
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...clean, NO_COLOR: '1', ...env } })
  return { code: result.status, out: result.stdout + result.stderr }
}
const read = (...p) => readFileSync(path.join(...p), 'utf8')

test('scaffolds Next.js Minimal with no questions when there is no terminal', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const { code, out } = run(cwd, ['studio-books', '--no-install'])
  assert.equal(code, 0, out)
  const app = path.join(cwd, 'studio-books')
  for (const file of ['.gitignore', 'AGENTS.md', 'CLAUDE.md', '.mcp.json', 'README.md', 'app/providers.tsx', 'app/page.tsx', 'app/globals.css'])
    assert.ok(existsSync(path.join(app, file)), file)
  for (const file of ['_gitignore', '_agents.md']) assert.equal(existsSync(path.join(app, file)), false, file)
  const pkg = JSON.parse(read(app, 'package.json'))
  assert.equal(pkg.name, 'studio-books')
  assert.equal(pkg.dependencies['@idyeah/diya'], `^${version}`)
  assert.equal(read(app, 'CLAUDE.md'), '@AGENTS.md\n')
  assert.deepEqual(JSON.parse(read(app, '.mcp.json')), { mcpServers: { diya: { type: 'http', url: 'https://diya13.ai/mcp' } } })
  assert.match(read(app, 'AGENTS.md'), /`npm run dev`: start on http:\/\/localhost:3000/)
  assert.match(read(app, 'app/page.tsx'), /title="studio-books"/)
  assert.doesNotMatch(read(app, 'README.md'), /\{\{/)
  assert.match(read(app, 'app/providers.tsx'), /const brandColor: string \| undefined = undefined/)
  assert.match(out, /Template\n│  Minimal/)
  assert.match(out, /Framework\n│  Next\.js/)
  assert.match(out, /studio-books is ready\.\n\n   cd studio-books\n   npm install\n   npm run dev/)
})

test('Vite Minimal, a brand color, and the package manager from the user agent', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const { code, out } = run(cwd, ['shop', '--framework', 'vite', '--brand', '2f6feb', '--no-install'], {
    npm_config_user_agent: 'pnpm/10.32.1 npm/? node/v22.12.0 darwin arm64',
  })
  assert.equal(code, 0, out)
  const app = path.join(cwd, 'shop')
  assert.match(read(app, 'src/providers.tsx'), /const brandColor = '#2F6FEB'/)
  assert.match(read(app, 'index.html'), /<title>shop<\/title>/)
  assert.match(read(app, 'AGENTS.md'), /`pnpm dev`: start on http:\/\/localhost:5173/)
  assert.match(read(app, 'AGENTS.md'), /`pnpm run build`/)
  assert.match(out, /pnpm install\n   pnpm dev/)
  assert.match(out, /Brand color\n│  #2F6FEB/)
})

test('Dashboard is a Next.js app, and asks no framework question', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const { code, out } = run(cwd, ['books', '--template', 'dashboard', '--brand', '#B4532A', '--no-install'])
  assert.equal(code, 0, out)
  const app = path.join(cwd, 'books')
  assert.match(read(app, 'app/providers.tsx'), /brandColor: '#B4532A'/)
  assert.ok(existsSync(path.join(app, 'components/Shell.tsx')))
  assert.doesNotMatch(read(app, 'components/Shell.tsx'), /View this screen|source-bar/)
  assert.match(out, /Framework\n│  Next\.js/)
  const vite = run(cwd, ['books-vite', '--template', 'dashboard', '--framework', 'vite'])
  assert.equal(vite.code, 1)
  assert.match(vite.out, /Dashboard template is a Next\.js app/)
  assert.equal(existsSync(path.join(cwd, 'books-vite')), false)
})

test('--no-agents leaves out the agent files', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const { code, out } = run(cwd, ['lean', '--no-agents', '--no-install', '--framework', 'vite'])
  assert.equal(code, 0, out)
  for (const file of ['AGENTS.md', 'CLAUDE.md', '.mcp.json', '_agents.md']) assert.equal(existsSync(path.join(cwd, 'lean', file)), false, file)
  assert.doesNotMatch(out, /AGENTS\.md/)
})

test('never writes into a folder that has files, and says what to do instead', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  mkdirSync(path.join(cwd, 'taken'))
  writeFileSync(path.join(cwd, 'taken', 'notes.txt'), 'keep me')
  const { code, out } = run(cwd, ['taken', '--no-install'], { npm_config_user_agent: 'bun/1.3.0' })
  assert.equal(code, 1)
  assert.match(out, /taken already has files in it, and create-diya never writes over files\./)
  assert.match(out, /Pick a new name: bun create diya taken-2/)
  assert.equal(read(cwd, 'taken', 'notes.txt'), 'keep me')
  // An empty folder, or one with only .git, is fine.
  mkdirSync(path.join(cwd, 'empty', '.git'), { recursive: true })
  assert.equal(run(cwd, ['empty', '--no-install']).code, 0)
})

test('explains bad values plainly and exits 1', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const cases = [
    [['a', '--framework', 'remix'], /--framework takes next or vite, not "remix"\./],
    [['a', '--template', 'blog'], /--template takes minimal or dashboard, not "blog"\./],
    [['a', '--brand', 'blue'], /--brand wants a hex color like #2F6FEB, not "blue"\./],
    [['a', '--pm', 'deno'], /--pm takes npm, pnpm, yarn or bun, not "deno"\./],
    [['a', '--tempalte', 'dashboard'], /Unknown option '--tempalte'\.\n   Run it with --help/],
    [['a', 'b'], /One folder name, please/],
  ]
  for (const [args, message] of cases) {
    const { code, out } = run(cwd, args)
    assert.equal(code, 1, args.join(' '))
    assert.match(out, message)
  }
  assert.equal(existsSync(path.join(cwd, 'a')), false)
})

test('--help and --version', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const help = run(cwd, ['--help'])
  assert.equal(help.code, 0)
  assert.match(help.out, /npm create diya@latest \[folder\] -- \[options\]/)
  assert.match(help.out, /--no-agents/)
  assert.equal(run(cwd, ['--version']).out.trim(), version)
})

test('recovers flags npm kept for itself when the -- is missing', TIMEOUT, (t) => {
  const env = { npm_config_framework: 'true', npm_config_template: 'true', npm_config_brand: 'true', npm_config_install: '' }
  const { opt, positionals } = recoverNpmFlags({ install: true, agents: true }, ['my-app', 'vite', 'minimal', '#2F6FEB'], env)
  assert.deepEqual(positionals, ['my-app'])
  assert.equal(opt.framework, 'vite')
  assert.equal(opt.template, 'minimal')
  assert.equal(opt.brand, '#2F6FEB')
  assert.equal(opt.install, false)
  // Flags given properly win, and npm's own --yes counts.
  const kept = recoverNpmFlags({ framework: 'next' }, ['x', 'vite'], { npm_config_framework: 'true', npm_config_yes: 'true' })
  assert.equal(kept.opt.framework, 'next')
  assert.equal(kept.opt.yes, true)
  assert.deepEqual(kept.positionals, ['x', 'vite'])
  // End to end, through the environment npm sets.
  const cwd = sandbox(t)
  const { code, out } = run(cwd, ['slip', 'vite', '#2F6FEB'], { npm_config_framework: 'true', npm_config_brand: 'true', npm_config_install: '' })
  assert.equal(code, 0, out)
  assert.match(read(cwd, 'slip', 'src/providers.tsx'), /'#2F6FEB'/)
})

test('names, colors and package managers', () => {
  assert.equal(packageName('My Studio App'), 'my-studio-app')
  assert.equal(packageName('.hidden'), 'hidden')
  assert.equal(packageName('***'), 'my-app')
  assert.equal(brandOf('#abc'), '#AABBCC')
  assert.equal(brandOf('2F6FEB'), '#2F6FEB')
  assert.equal(brandOf('none'), null)
  assert.equal(brandOf(''), null)
  assert.equal(brandOf('#12345'), undefined)
  assert.equal(detectPm('yarn/1.22.22 npm/? node/v22'), 'yarn')
  assert.equal(detectPm('bun/1.3.0'), 'bun')
  assert.equal(detectPm(''), 'npm')
  assert.equal(detectPm('deno/2.0'), 'npm')
})

test('runs through an npm bin link', TIMEOUT, (t) => {
  const cwd = sandbox(t)
  const link = path.join(cwd, 'create-diya')
  symlinkSync(cli, link)
  const result = spawnSync(process.execPath, [link, '--version'], { encoding: 'utf8' })
  assert.equal(result.stdout.trim(), version)
})
