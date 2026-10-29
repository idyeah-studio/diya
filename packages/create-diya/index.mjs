#!/usr/bin/env node
// create-diya: start a React app with DIYA, running in about a minute.
//   npm create diya@latest
//   npm create diya@latest my-app -- --framework vite --brand "#2F6FEB"
// Node built-ins only, so `npm create diya` downloads one small tarball and
// nothing else runs on your machine before you've said yes.
import { spawn } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const here = path.dirname(fileURLToPath(import.meta.url))
const self = JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8'))

// ─── Words ──────────────────────────────────────────────────────────────────
export const TEMPLATES = [
  { value: 'minimal', label: 'Minimal', hint: 'one page, a few pieces, room to start' },
  { value: 'dashboard', label: 'Dashboard', hint: 'An invoicing app: invoices, customers and settings, on Next.js' },
]
export const FRAMEWORKS = [
  { value: 'next', label: 'Next.js', hint: 'App Router, server rendering, routes in folders', port: 3000 },
  { value: 'vite', label: 'Vite', hint: 'a single-page app, fast and plain', port: 5173 },
]
// Which frameworks each template comes in. The Dashboard is a Next.js app.
const AVAILABLE = { minimal: ['next', 'vite'], dashboard: ['next'] }
export const PMS = ['npm', 'pnpm', 'yarn', 'bun']
const MCP_URL = 'https://diya13.ai/mcp'

const HELP = `
  create-diya ${self.version}: start a React app with DIYA.

  Usage
    npm create diya@latest [folder] -- [options]
    pnpm create diya [folder] [options]
    yarn create diya [folder] [options]
    bun create diya [folder] [options]

  Options
    --template <minimal|dashboard>  Where to start. Dashboard is a Next.js app.
                                    Default: minimal
    --framework <next|vite>         Next.js (App Router) or Vite. Default: next
    --brand <hex>                   Your brand color, like #2F6FEB. Default: DIYA's near-black
    --pm <npm|pnpm|yarn|bun>        Install with this. Default: the one you ran this with
    --no-install                    Copy the files and skip the install
    --no-agents                     Leave out AGENTS.md, CLAUDE.md and .mcp.json
    -y, --yes                       Ask nothing; use the defaults for anything not given

  With no terminal attached (CI, or a coding agent), create-diya asks nothing
  and uses the defaults, the same as --yes.

  Docs  https://diya13.ai
`

// ─── Terminal ───────────────────────────────────────────────────────────────
const out = process.stdout
const color = Boolean(out.isTTY && !process.env.NO_COLOR && out.hasColors?.())
const truecolor = color && out.getColorDepth?.() >= 24
const sgr = (open, close) => (s) => (color ? `\x1b[${open}m${s}\x1b[${close}m` : String(s))
const bold = sgr(1, 22)
const dim = sgr(2, 22)
const lamp = sgr('38;5;179', 39) // a warm brass: the only color create-diya uses
const red = sgr(31, 39)
const write = (s = '') => out.write(`${s}\n`)
const bar = dim('│')
const swatch = (hex) => {
  if (!truecolor || !hex) return ''
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return ` \x1b[38;2;${r};${g};${b}m■■\x1b[39m`
}

function done(message, answer) {
  write(`${dim('◇')}  ${message}`)
  write(`${bar}  ${dim(answer)}`)
  write(bar)
}

function fail(message, hint) {
  write(`${red('▲')}  ${message}`)
  if (hint) write(`   ${hint}`)
  process.exit(1)
}

function stop() {
  if (process.stdin.isTTY) process.stdin.setRawMode?.(false)
  out.write('\x1b[?25h')
  write(`${dim('└')}  Stopped. Nothing was written.`)
  process.exit(130)
}

function text({ message, initial = '', validate, keepOnRetry = true }) {
  return new Promise((resolve) => {
    const ask = (prefill, warning) => {
      write(`${lamp('◆')}  ${message}`)
      if (warning) write(`${bar}  ${red(warning)}`)
      const rl = readline.createInterface({ input: process.stdin, output: out, terminal: true })
      rl.on('SIGINT', () => {
        rl.close()
        out.write('\n')
        stop()
      })
      rl.question(`${bar}  `, (raw) => {
        rl.close()
        const value = raw.trim()
        const problem = validate?.(value)
        out.write(`\x1b[${warning ? 3 : 2}A\x1b[J`)
        if (problem) return ask(keepOnRetry ? value : '', problem)
        resolve(value)
      })
      if (prefill) rl.write(prefill)
    }
    ask(initial)
  })
}

function select({ message, options }) {
  return new Promise((resolve) => {
    let i = 0
    const input = process.stdin
    readline.emitKeypressEvents(input)
    input.setRawMode(true)
    input.resume()
    out.write('\x1b[?25l')
    const lines = () =>
      options.map((o, k) =>
        k === i ? `${bar}  ${lamp('●')} ${o.label}${dim(`  ${o.hint}`)}` : `${bar}  ${dim('○')} ${dim(o.label)}`,
      )
    write(`${lamp('◆')}  ${message}`)
    for (const line of lines()) write(line)
    const onKey = (_, key = {}) => {
      if (key.ctrl && key.name === 'c') stop()
      if (key.name === 'up' || key.name === 'k') i = (i - 1 + options.length) % options.length
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') i = (i + 1) % options.length
      else if (key.name === 'return' || key.name === 'enter') {
        input.off('keypress', onKey)
        input.setRawMode(false)
        input.pause()
        out.write(`\x1b[${options.length + 1}A\x1b[J\x1b[?25h`)
        done(message, options[i].label)
        return resolve(options[i].value)
      } else return
      out.write(`\x1b[${options.length}A`)
      for (const line of lines()) write(`\x1b[2K${line}`)
    }
    input.on('keypress', onKey)
  })
}

function spinner(message) {
  const start = Date.now()
  if (!out.isTTY) {
    write(`${dim('◇')}  ${message}`)
    return { end: (note) => write(`${bar}  ${dim(note)}`), ms: () => Date.now() - start }
  }
  const frames = ['◒', '◐', '◓', '◑']
  let f = 0
  out.write('\x1b[?25l')
  const timer = setInterval(() => out.write(`\r\x1b[2K${lamp(frames[f++ % 4])}  ${message}`), 90)
  return {
    end(note) {
      clearInterval(timer)
      out.write(`\r\x1b[2K${dim('◇')}  ${message} ${dim(note)}\n\x1b[?25h`)
    },
    ms: () => Date.now() - start,
  }
}

// ─── Rules ──────────────────────────────────────────────────────────────────
export const packageName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]+/, '')
    .replace(/[^a-z0-9-~._]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-app'

/** '#RRGGBB' for a hex color, null for "none", undefined for anything else. */
export function brandOf(value) {
  if (!value || /^(none|default|neutral)$/i.test(value.trim())) return null
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!m) return undefined
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return `#${hex.toUpperCase()}`
}

function busy(dir) {
  if (!existsSync(dir)) return false
  return readdirSync(dir).some((name) => !['.git', '.DS_Store'].includes(name))
}

export function detectPm(agent = process.env.npm_config_user_agent ?? '') {
  const name = agent.split('/')[0]
  return PMS.includes(name) ? name : 'npm'
}

const runDev = (pm) => (pm === 'npm' ? 'npm run dev' : `${pm} dev`)
const runBuild = (pm) => (pm === 'npm' ? 'npm run build' : `${pm} run build`)
const createCommand = (pm) => (pm === 'npm' ? 'npm create diya@latest' : `${pm} create diya`)

// `npm create diya my-app --framework vite` (no `--`) is the most common slip:
// npm keeps --framework for itself, passes it on as npm_config_framework=true,
// and leaves "vite" behind as a stray word. The values never overlap, so each
// stray word goes back to the flag whose values it matches.
export function recoverNpmFlags(opt, positionals, env = process.env) {
  const stray = positionals.slice(1)
  const shapes = {
    framework: (v) => FRAMEWORKS.some((o) => o.value === v.toLowerCase()),
    template: (v) => TEMPLATES.some((o) => o.value === v.toLowerCase()),
    pm: (v) => PMS.includes(v),
    brand: (v) => Boolean(brandOf(v)),
  }
  for (const [key, fits] of Object.entries(shapes)) {
    const raw = env[`npm_config_${key}`]
    if (opt[key] !== undefined || raw === undefined) continue
    if (raw !== 'true' && raw !== '') opt[key] = raw
    else {
      const i = stray.findIndex(fits)
      if (i >= 0) opt[key] = stray.splice(i, 1)[0]
    }
  }
  if (env.npm_config_install === '' || env.npm_config_install === 'false') opt.install = false
  if (env.npm_config_agents === '' || env.npm_config_agents === 'false') opt.agents = false
  if (env.npm_config_yes === 'true') opt.yes = true
  return { opt, positionals: [positionals[0], ...stray].filter((p) => p !== undefined) }
}

// Lines in a template's provider file that create-diya rewrites for --brand.
// Every template must carry exactly one (scripts/check-templates.mjs checks).
export const BRAND_MARKERS = [
  { find: 'const brandColor: string | undefined = undefined', put: (hex) => `const brandColor = '${hex}'` },
  { find: "brandColor: ''", put: (hex) => `brandColor: '${hex}'` },
]

const AGENT_FILES_NOTE = 'Coding with an agent? AGENTS.md shows it where DIYA’s docs live.'

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 20 || (major === 20 && minor < 19))
    fail(`create-diya needs Node 20.19 or newer, and this is ${process.versions.node}.`, 'Next.js 16 and Vite 8 need it too.')

  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      allowNegative: true,
      options: {
        framework: { type: 'string', short: 'f' },
        template: { type: 'string', short: 't' },
        brand: { type: 'string', short: 'b' },
        pm: { type: 'string' },
        install: { type: 'boolean', default: true },
        agents: { type: 'boolean', default: true },
        yes: { type: 'boolean', short: 'y' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        'diya-spec': { type: 'string' }, // CI only: install DIYA from a packed tarball
      },
    })
  } catch (error) {
    fail(error.message.replace(/\. To specify.*$/s, '.'), 'Run it with --help to see every option.')
  }
  const { opt, positionals } = recoverNpmFlags(parsed.values, parsed.positionals)
  if (opt.help) return write(HELP)
  if (opt.version) return write(self.version)
  if (positionals.length > 1) fail(`One folder name, please. I got: ${positionals.join(' ')}`, 'Run it with --help to see every option.')

  const interactive = Boolean(process.stdin.isTTY && out.isTTY && !opt.yes && !process.env.CI)
  const pick = (list, value, flag) => {
    if (value === undefined) return undefined
    const found = list.find((o) => o.value === value.toLowerCase())
    if (!found) fail(`--${flag} takes ${list.map((o) => o.value).join(' or ')}, not "${value}".`)
    return found.value
  }
  let template = pick(TEMPLATES, opt.template, 'template')
  let framework = pick(FRAMEWORKS, opt.framework, 'framework')
  if (template && framework && !AVAILABLE[template].includes(framework))
    fail(`The Dashboard template is a Next.js app, so it doesn't come in ${framework === 'vite' ? 'Vite' : framework}.`, 'Use --framework next, or --template minimal.')
  let brand = opt.brand === undefined ? undefined : brandOf(opt.brand)
  if (brand === undefined && opt.brand !== undefined) fail(`--brand wants a hex color like #2F6FEB, not "${opt.brand}".`)
  const pm = opt.pm ?? detectPm()
  if (!PMS.includes(pm)) fail(`--pm takes npm, pnpm, yarn or bun, not "${pm}".`)

  write()
  write(`${lamp('◆')}  ${bold('diya')}  ${dim(`A designed React app, running in about a minute.  v${self.version}`)}`)
  write(bar)

  // 1. Name
  let dir = positionals[0]
  if (dir === undefined && interactive) {
    dir = await text({
      message: 'What should we call it?',
      initial: 'my-app',
      validate: (v) => (!v ? 'A name, please. It becomes the folder.' : busy(path.resolve(v)) ? `${v} already has files in it. Try another name.` : null),
    })
    done('What should we call it?', dir)
  } else {
    dir ??= 'my-app'
    done('Name', dir)
  }
  const target = path.resolve(dir)
  const name = packageName(path.basename(target))
  if (busy(target))
    fail(`${dir === '.' ? 'This folder' : dir} already has files in it, and create-diya never writes over files.`, `Pick a new name: ${bold(`${createCommand(pm)} ${name}-2`)}`)

  // 2. Template
  if (template) done('Template', TEMPLATES.find((o) => o.value === template).label)
  else if (interactive) template = await select({ message: 'Start from', options: TEMPLATES })
  else {
    template = 'minimal'
    done('Template', 'Minimal')
  }

  // 3. Framework, asked only when the template comes in more than one
  const offered = FRAMEWORKS.filter((o) => AVAILABLE[template].includes(o.value))
  if (framework) done('Framework', FRAMEWORKS.find((o) => o.value === framework).label)
  else if (offered.length === 1) {
    framework = offered[0].value
    done('Framework', offered[0].label)
  } else if (interactive) framework = await select({ message: 'Next.js or Vite?', options: offered })
  else {
    framework = 'next'
    done('Framework', 'Next.js')
  }

  // 4. Brand color
  if (brand === undefined && interactive) {
    const raw = await text({
      message: `Your brand color? A hex like #2F6FEB, or Enter to keep DIYA's near-black.`,
      validate: (v) => (brandOf(v) === undefined ? `“${v}” isn't a hex color. Try #2F6FEB, or leave it empty.` : null),
      keepOnRetry: false,
    })
    brand = brandOf(raw)
    done('Your brand color?', brand ? `${brand}${swatch(brand)}` : `DIYA's near-black`)
  } else {
    brand ??= null
    done('Brand color', brand ? `${brand}${swatch(brand)}` : `DIYA's near-black`)
  }

  // Copy
  const label = `${FRAMEWORKS.find((o) => o.value === framework).label} ${template}`
  const copying = spinner(`Copying ${label}`)
  scaffold({ target, name, framework, template, brand, pm, agents: opt.agents, diyaSpec: opt['diya-spec'] })
  copying.end(`done in ${copying.ms()}ms`)

  // Install
  let installed = false
  if (opt.install) {
    const installing = spinner(`Installing with ${pm}`)
    const result = await new Promise((resolve) => {
      const child = spawn(pm, ['install'], { cwd: target, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
      let log = ''
      child.stdout.on('data', (d) => (log += d))
      child.stderr.on('data', (d) => (log += d))
      child.on('error', (error) => resolve({ code: 1, log: error.message }))
      child.on('close', (code) => resolve({ code, log }))
    })
    if (result.code === 0) {
      installed = true
      installing.end(`done in ${Math.round(installing.ms() / 1000)}s`)
    } else {
      installing.end(red('stopped'))
      write(bar)
      for (const line of result.log.trim().split('\n').slice(-12)) write(`${bar}  ${dim(line)}`)
      write(bar)
      write(`${bar}  The files are all there. Run ${bold(`${pm} install`)} inside ${dir} when you're ready.`)
    }
  }

  // Done
  const port = FRAMEWORKS.find((o) => o.value === framework).port
  write(bar)
  write(`${dim('└')}  ${bold(`${name} is ready.`)}`)
  write()
  if (target !== process.cwd()) write(`   ${bold(`cd ${path.relative(process.cwd(), target) || '.'}`)}`)
  if (!installed) write(`   ${bold(`${pm} install`)}`)
  write(`   ${bold(runDev(pm))}`)
  write()
  write(`   ${dim(`Then open http://localhost:${port}. It follows your Light or Dark setting.`)}`)
  if (opt.agents) write(`   ${dim(AGENT_FILES_NOTE)}`)
  write()
}

/** Copies a template into target and fills in the name, brand, commands and agent files. */
export function scaffold({ target, name, framework, template, brand = null, pm = 'npm', agents = true, diyaSpec }) {
  const from = path.join(here, 'templates', `${framework}-${template}`)
  if (!existsSync(from)) throw new Error(`There's no ${framework}-${template} template in this create-diya.`)
  cpSync(from, target, { recursive: true, filter: (src) => !/(^|[/\\])(node_modules|\.next|dist)$/.test(src) })
  const at = (file) => path.join(target, file)
  if (existsSync(at('_gitignore'))) renameSync(at('_gitignore'), at('.gitignore'))
  if (agents) {
    renameSync(at('_agents.md'), at('AGENTS.md'))
    writeFileSync(at('CLAUDE.md'), '@AGENTS.md\n')
    // Claude Code reads a project's .mcp.json and offers to connect DIYA's docs server.
    writeFileSync(at('.mcp.json'), `${JSON.stringify({ mcpServers: { diya: { type: 'http', url: MCP_URL } } }, null, 2)}\n`)
  } else rmSync(at('_agents.md'), { force: true })

  const pkg = JSON.parse(readFileSync(at('package.json'), 'utf8'))
  pkg.name = name
  pkg.dependencies['@idyeah/diya'] = diyaSpec ?? `^${self.version}`
  writeFileSync(at('package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

  const fill = (file, edit) => {
    if (!existsSync(at(file))) return
    const before = readFileSync(at(file), 'utf8')
    const after = edit(before)
    if (after !== before) writeFileSync(at(file), after)
  }
  if (brand) {
    const providers = framework === 'next' ? 'app/providers.tsx' : 'src/providers.tsx'
    fill(providers, (s) => {
      const marker = BRAND_MARKERS.find((m) => s.includes(m.find))
      if (!marker) throw new Error(`${providers} has no brand line to fill in.`)
      return s.replace(marker.find, marker.put(brand))
    })
  }
  const words = { '{{name}}': name, '{{dev}}': runDev(pm), '{{build}}': runBuild(pm), '{{pm}}': pm }
  for (const file of ['README.md', 'AGENTS.md', 'app/page.tsx', 'app/layout.tsx', 'src/App.tsx', 'index.html'])
    fill(file, (s) => Object.entries(words).reduce((acc, [k, v]) => acc.replaceAll(k, v), s))
}

// Run when invoked as a command (npm links bins, so compare real paths), not when imported by tests.
const invoked = process.argv[1] && realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
if (invoked)
  main().catch((error) => {
    out.write('\x1b[?25h')
    write(`${red('▲')}  ${error.message}`)
    process.exit(1)
  })
