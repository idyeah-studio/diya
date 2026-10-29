import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const appRoot = fileURLToPath(new URL('../', import.meta.url))

/** A constant from lib/site.ts, the one place the site's address is written. */
export function siteConstant(source, name) {
  const value = new RegExp(`export const ${name} = '([^']+)'`).exec(source)?.[1]
  if (!value) throw new Error(`${name} missing from lib/site.ts`)
  return value
}
export const SITE = siteConstant(readFileSync(new URL('../lib/site.ts', import.meta.url), 'utf8'), 'SITE')
const componentPath = '/explore?area=components&component=button'
/* Screens open with the catalog; their static preview frame is public either way (noindex, disallowed). */
const screensPath = '/explore?area=screens'
const screenPath = '/explore?area=screens&screen=sign-in'
const framePath = '/screens-frame?screen=sign-in&theme=dark&glass=0'
/* The ZIP download routes are retired: they must not exist in either mode. */
const retiredRouteCases = [
  ['/api/preview-packages/button', 'GET', 404],
  ['/api/preview-download/button', 'GET', 404],
  ['/api/preview-download/library', 'GET', 404],
  ['/api/preview-customize/button', 'POST', 404],
]

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(([, name, value]) => [name.toLowerCase(), value]))
}

function hasMainTarget(html) {
  return [...html.matchAll(/<main\b[^>]*>/gi)].filter(([tag]) => attributes(tag).id === 'content').length === 1
}

/* Pages and AI files that open with the catalog: 404 before launch, served in preview and after. */
const launchedRoutes = [['/ask'], ['/changelog'], ['/llms.txt'], ['/llms-full.txt'], ['/api.json']]
/* The MCP server opens with them too. 'MCP' is a POST carrying an MCP initialize
   request; a stateless server answers GET with 405 once it is open. */
const MCP_INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'diya-production-gates', version: '1' } },
})
const mcpCases = (preview) => preview ? [['/mcp', 'MCP', 200], ['/mcp', 'GET', 405]] : [['/mcp', 'MCP', 404], ['/mcp', 'GET', 404]]

/** An open /mcp must introduce itself as DIYA's server, uncached. */
export function mcpContract(response) {
  let body
  try { body = JSON.parse(response.body) } catch { body = undefined }
  if (body?.result?.serverInfo?.name !== 'diya') throw new Error('MCP server did not answer initialize as diya')
  if (!/(^|,)\s*no-store\s*(,|$)/i.test(response.cacheControl ?? '')) throw new Error('MCP responses must not be cached')
  return { server: body.result.serverInfo.name, version: body.result.serverInfo.version, protocolVersion: body.result.protocolVersion }
}

/* Each catalog page names itself; /explore opens on Page Header. */
function canonicalFor(path) {
  if (path === '/') return [SITE, `${SITE}/`]
  return [`${SITE}${path === '/explore' ? '/explore?pattern=page-header' : path}`]
}

function documentContract(html, preview, path) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag))
  const robots = metas.filter(meta => meta.name === 'robots').map(meta => (meta.content ?? '').toLowerCase().split(/\s*,\s*/))
  const expected = preview ? ['noindex', 'nofollow'] : ['index', 'follow']
  const opposing = preview ? ['index', 'follow'] : ['noindex', 'nofollow', 'none']
  if (!robots.length || !robots.every(rules => expected.every(rule => rules.includes(rule)) && opposing.every(rule => !rules.includes(rule))))
    throw new Error(`Indexing contract failed for ${path}: expected ${expected.join(', ')}`)
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag))
  if (!links.some(link => link.rel === 'canonical' && canonicalFor(path).includes(link.href.replaceAll('&amp;', '&'))))
    throw new Error(`Canonical URL missing or changed for ${path}`)
  if (!hasMainTarget(html))
    throw new Error(`Main content/recovery target missing for ${path}`)
  return { metas, links, indexing: expected.join(', ') }
}

/** The countdown re-checks itself against /api/launch, so the route must
    answer uncached with whole seconds that agree with the rendered page. */
export function launchContract(response, landingHtml) {
  if (!response || !/(^|,)\s*no-store\s*(,|$)/i.test(response.cacheControl ?? ''))
    throw new Error('Launch route must not be cached')
  let seconds
  try { seconds = JSON.parse(response.body).seconds } catch { seconds = undefined }
  if (!Number.isInteger(seconds) || seconds < 0) throw new Error('Launch route must return whole seconds')
  if (!landingHtml) return { seconds, cacheControl: response.cacheControl }
  const label = /role="timer"[^>]*aria-label="(\d+) days?, (\d+) hours?, (\d+) minutes?, (\d+) seconds? remaining"/.exec(landingHtml)
  if (!label) throw new Error('Countdown timer missing from the landing page')
  const rendered = Number(label[1]) * 86400 + Number(label[2]) * 3600 + Number(label[3]) * 60 + Number(label[4])
  if (Math.abs(rendered - seconds) > 10)
    throw new Error(`Launch route (${seconds}s) disagrees with the rendered countdown (${rendered}s)`)
  return { seconds, renderedSeconds: rendered, cacheControl: response.cacheControl }
}

/* Every pass pins the server's clock (DIYA_NOW), so the gates hold whatever
   day they run: the countdown and preview passes before LAUNCH_AT, the
   launched pass after it. */
export const PRELAUNCH_NOW = '2026-11-01T12:00:00Z'
export const LAUNCHED_NOW = '2026-11-07T08:00:30Z'

/** The environment one pass's production server runs with. */
export function serverEnv(flag, env = process.env) {
  const launched = flag === 'launched'
  return { ...env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', DIYA_CATALOG_PREVIEW: launched ? '0' : flag, DIYA_NOW: launched ? LAUNCHED_NOW : PRELAUNCH_NOW }
}

/* The launched page (served with DIYA_NOW past LAUNCH_AT) must name the
   launch card in both og:image and twitter:image, and the card must load. */
export const LAUNCHED_CARD = '/social-preview-v4.jpg'

/** og:image and twitter:image of a launched page; both must be the launch card. */
export function launchedCardContract(metas) {
  const og = metas.filter(meta => meta.property === 'og:image').map(meta => meta.content)
  const twitter = metas.filter(meta => meta.name === 'twitter:image').map(meta => meta.content)
  const expected = `${SITE}${LAUNCHED_CARD}`
  if (og.length !== 1 || og[0] !== expected) throw new Error(`Launched og:image must be ${expected}, found ${og.join(', ') || 'none'}`)
  if (twitter.length !== 1 || twitter[0] !== expected) throw new Error(`Launched twitter:image must be ${expected}, found ${twitter.join(', ') || 'none'}`)
  return { ogImage: og[0], twitterImage: twitter[0] }
}

async function launchedCard(origin, document, signal) {
  const contract = launchedCardContract(document.metas)
  const response = await fetch(origin + LAUNCHED_CARD, { redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]) })
  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')?.split(';')[0]
  if (response.status !== 200 || contentType !== 'image/jpeg' || !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    throw new Error(`Unavailable launch card: ${LAUNCHED_CARD} (${response.status} ${contentType})`)
  return { ...contract, path: LAUNCHED_CARD, status: response.status, contentType, bytes: bytes.length }
}

async function brandAssets(origin, document, signal) {
  const image = document.metas.find(meta => meta.property === 'og:image')?.content
  const icon = document.links.find(link => link.rel === 'icon')?.href
  const results = []
  for (const [kind, value, contentType] of [['social-image', image, 'image/jpeg'], ['icon', icon, 'image/svg+xml']]) {
    if (!value) throw new Error(`Missing ${kind} metadata`)
    const url = new URL(value, SITE)
    if (url.origin !== SITE || url.search || url.hash)
      throw new Error(`Unexpected ${kind} URL: ${url}`)
    const response = await fetch(origin + url.pathname, { redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]) })
    const bytes = Buffer.from(await response.arrayBuffer())
    if (response.status !== 200 || response.headers.get('content-type')?.split(';')[0] !== contentType || !bytes.length)
      throw new Error(`Unavailable ${kind}: ${url.pathname}`)
    if (kind === 'social-image' ? !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) : !/<svg\b/.test(bytes.toString('utf8')))
      throw new Error(`Invalid ${kind} contents: ${url.pathname}`)
    results.push({ kind, path: url.pathname, status: response.status, bytes: bytes.length })
  }
  return results
}

async function availablePort() {
  const server = createServer()
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  const { port } = server.address()
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()))
  return port
}

/** The build's route table must not contain any retired route. */
export function retiredRoutesBuilt(manifest) {
  const retired = new Set(retiredRouteCases.map(([path]) => path.split('/').slice(0, 3).join('/')))
  return Object.values(manifest).filter(route => retired.has(route.split('/').slice(0, 3).join('/')))
}

/** Start only our own loopback server; never reuse or stop a running preview. */
export async function verifyProductionGates({ root = appRoot, signal } = {}) {
  await access(join(root, '.next/BUILD_ID')).catch(() => {
    throw new Error('Production build missing. Run pnpm --filter diya-site build first.')
  })
  let manifest
  try {
    manifest = JSON.parse(await readFile(join(root, '.next/app-path-routes-manifest.json'), 'utf8'))
  } catch {
    throw new Error('Route manifest missing from the production build')
  }
  const built = retiredRoutesBuilt(manifest)
  if (built.length) throw new Error(`Retired routes are still in the build: ${built.join(', ')}`)
  const require = createRequire(join(root, 'package.json'))
  const next = require.resolve('next/dist/bin/next')
  const checks = []
  const documents = [], crawlerRules = [], assets = [], launch = [], mcp = [], launched = []
  for (const [flag, cases] of [
    ['0', [['/', 'GET', 200], ['/explore', 'GET', 404], [componentPath, 'GET', 404], [screensPath, 'GET', 404], [screenPath, 'GET', 404], [framePath, 'GET', 200], ...launchedRoutes.map(([path]) => [path, 'GET', 404]), ...mcpCases(false), ['/missing-launch-review-route', 'GET', 404], ['/robots.txt', 'GET', 200], ['/api/launch', 'GET', 200], ...retiredRouteCases]],
    ['1', [['/', 'GET', 200], ['/explore', 'GET', 200], [componentPath, 'GET', 200], [screensPath, 'GET', 200], [screenPath, 'GET', 200], [framePath, 'GET', 200], ...launchedRoutes.map(([path]) => [path, 'GET', 200]), ...mcpCases(true), ['/missing-launch-review-route', 'GET', 404], ['/robots.txt', 'GET', 200], ['/api/launch', 'GET', 200], ...retiredRouteCases]],
    // After the launch moment (no preview flag): only the landing and its card.
    ['launched', [['/', 'GET', 200]]],
  ]) {
    signal?.throwIfAborted()
    const port = await availablePort()
    const origin = `http://127.0.0.1:${port}`
    const child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: root,
      env: serverEnv(flag),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let logs = ''
    let spawnError
    const remember = data => { logs = (logs + data).slice(-12_000) }
    child.stdout.on('data', remember)
    child.stderr.on('data', remember)
    const exited = new Promise(done => {
      child.once('error', error => { spawnError = error; done() })
      child.once('exit', done)
    })
    const stop = () => child.kill('SIGTERM')
    signal?.addEventListener('abort', stop, { once: true })
    try {
      const deadline = Date.now() + 30_000
      let ready = false
      while (Date.now() < deadline) {
        signal?.throwIfAborted()
        if (spawnError) throw spawnError
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Production server exited: ${logs}`)
        try {
          const response = await fetch(origin, { signal: AbortSignal.timeout(1000), redirect: 'manual' })
          await response.body?.cancel()
          if (response.status === 200) { ready = true; break }
        } catch {}
        await delay(100, undefined, { signal })
      }
      if (!ready) throw new Error(`Production server startup timed out: ${logs}`)
      const pages = new Map()
      for (const [path, method, expected] of cases) {
        signal?.throwIfAborted()
        const response = await fetch(origin + path, {
          method: method === 'MCP' ? 'POST' : method, redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]),
          ...(method === 'POST' ? { headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' } : {}),
          ...(method === 'MCP' ? { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: MCP_INITIALIZE } : {}),
        })
        if (path === '/api/launch') pages.set(path, { cacheControl: response.headers.get('cache-control'), body: await response.text() })
        else if (method === 'MCP') pages.set('MCP', { cacheControl: response.headers.get('cache-control'), body: await response.text() })
        else if (method === 'GET' && !path.startsWith('/api/')) pages.set(path, await response.text())
        else await response.body?.cancel()
        const check = { previewFlag: flag, path, method, expected, status: response.status }
        checks.push(check)
        if (response.status !== expected) throw new Error(`Production gate failed: ${JSON.stringify(check)}`)
      }
      if (flag === 'launched') {
        const document = documentContract(pages.get('/'), false, '/')
        documents.push({ previewFlag: flag, path: '/', indexing: document.indexing, canonical: canonicalFor('/').at(-1) })
        launched.push({ previewFlag: flag, now: LAUNCHED_NOW, ...await launchedCard(origin, document, signal) })
        continue
      }
      for (const path of flag === '1' ? ['/', '/explore', componentPath, screensPath] : ['/']) {
        const document = documentContract(pages.get(path), flag === '1', path)
        documents.push({ previewFlag: flag, path, indexing: document.indexing, canonical: canonicalFor(path).at(-1) })
        if (flag === '0' && path === '/') assets.push(...await brandAssets(origin, document, signal))
      }
      for (const path of flag === '1' ? ['/missing-launch-review-route'] : ['/explore', componentPath, screensPath, '/missing-launch-review-route']) {
        const html = pages.get(path)
        const recovery = [...html.matchAll(/<a\b[^>]*>/gi)].map(([tag]) => attributes(tag))
        const noindex = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag)).some(meta => meta.name === 'robots' && (meta.content ?? '').split(/\s*,\s*/).includes('noindex'))
        if (!hasMainTarget(html) || !noindex || !recovery.some(link => link.href === '/' && link['aria-label'] === 'Return to DIYA home'))
          throw new Error(`404 recovery missing for ${path}`)
        documents.push({ previewFlag: flag, path, recovery: '/' })
      }
      if (!/<meta name="robots" content="noindex/.test(pages.get(framePath)))
        throw new Error('The Screens preview frame must say noindex')
      const robots = pages.get('/robots.txt')
      if (!/^User-Agent:\s*\*\s*$/im.test(robots) || !/^Allow:\s*\/\s*$/im.test(robots) || /^Disallow:\s*\/(?:explore)?\s*$/im.test(robots))
        throw new Error('Crawler rules prevent reading noindex or block the public landing page')
      if (!/^Disallow:\s*\/screens-frame\s*$/im.test(robots)) throw new Error('Crawler rules must keep the Screens preview frame out')
      crawlerRules.push({ previewFlag: flag, allow: '/', previewNoindexReadable: true })
      launch.push({ previewFlag: flag, ...launchContract(pages.get('/api/launch'), flag === '0' ? pages.get('/') : null) })
      if (flag === '1') mcp.push({ previewFlag: flag, ...mcpContract(pages.get('MCP')) })
    } finally {
      signal?.removeEventListener('abort', stop)
      stop()
      const forceStop = setTimeout(() => child.kill('SIGKILL'), 5000)
      try { await exited } finally { clearTimeout(forceStop) }
    }
  }
  return { status: 'passed', checks, documents, crawlerRules, assets, launch, mcp, launched }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController()
  const abort = () => controller.abort(new Error('Production verification interrupted'))
  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)
  try {
    if (process.argv.length > 2) throw new Error('Usage: node verify-production-gates.mjs (requires an existing production build)')
    console.log(JSON.stringify(await verifyProductionGates({ signal: controller.signal }), null, 2))
  } catch (error) {
    console.log(JSON.stringify({ status: 'failed', error: error.message }, null, 2))
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)
  }
}
