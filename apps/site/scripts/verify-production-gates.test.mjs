import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { LAUNCHED_CARD, SITE, launchContract, launchedCardContract, mcpContract, retiredRoutesBuilt, screenRequestsClosedContract, serverEnv, siteConstant, verifyProductionGates } from './verify-production-gates.mjs'

// A real child HTTP process exercises the runner's failure/cleanup behavior
// without requiring a production build or duplicating Next's route logic.
async function fixture(t, mode) {
  const root = await mkdtemp(join(tmpdir(), 'diya-production-gates-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.next'))
  await mkdir(join(root, 'node_modules/next/dist/bin'), { recursive: true })
  await writeFile(join(root, '.next/BUILD_ID'), 'fixture')
  await writeFile(join(root, '.next/app-path-routes-manifest.json'), mode === 'retired-route'
    ? '{"/page":"/","/api/preview-download/[id]/route":"/api/preview-download/[id]"}'
    : '{"/page":"/","/api/launch/route":"/api/launch"}')
  await writeFile(join(root, 'package.json'), '{}')
  await writeFile(join(root, 'node_modules/next/package.json'), '{"name":"next"}')
  await writeFile(join(root, 'node_modules/next/dist/bin/next.js'), `
const { createServer } = require('node:http')
const { appendFileSync } = require('node:fs')
const log = ${JSON.stringify(join(root, 'lifecycle'))}
appendFileSync(log, 'start:' + process.pid + '\\n')
process.on('exit', () => appendFileSync(log, 'exit:' + process.pid + '\\n'))
process.on('SIGTERM', () => process.exit(0))
if (${JSON.stringify(mode)} === 'exit') process.exit(2)
const port = Number(process.argv[process.argv.indexOf('--port') + 1])
createServer((req, res) => {
  if (${JSON.stringify(mode)} === 'hang') return
  // The screen request API closes itself before launch: a status with no token, and 503 for a request.
  if (req.url === '/api/screen-requests') {
    res.setHeader('cache-control', 'no-store')
    res.statusCode = req.method === 'POST' ? 503 : 200
    return res.end(req.method === 'POST' ? '{"error":"closed"}' : '{"open":false}')
  }
  // The Screens preview frame is a static file: public in every mode.
  res.statusCode = ['/', '/robots.txt', '/api/launch'].includes(req.url) || req.url.startsWith('/screens-frame?') ? 200 : (${JSON.stringify(mode)} === 'exposed' ? 200 : 404)
  const mode = ${JSON.stringify(mode)}
  if (mode === 'conflicting-indexing' || mode === 'wrong-target') {
    const robots = mode === 'conflicting-indexing' ? 'index, follow, noindex' : 'index, follow'
    const target = mode === 'wrong-target' ? 'data-id' : 'id'
    return res.end('<meta name="robots" content="' + robots + '"><link rel="canonical" href="https://diya13.ai/"><main ' + target + '="content">Fixture</main>')
  }
  res.end('fixture')
}).listen(port, '127.0.0.1')
`)
  return root
}

async function assertChildrenExited(root) {
  const lines = (await readFile(join(root, 'lifecycle'), 'utf8')).trim().split('\n')
  const started = lines.filter(line => line.startsWith('start:')).map(line => line.slice(6))
  assert.ok(started.length > 0)
  for (const pid of started) {
    assert.ok(lines.includes(`exit:${pid}`), `owned child ${pid} must exit`)
    assert.throws(() => process.kill(Number(pid), 0), { code: 'ESRCH' })
  }
}

test('a production gate mismatch fails and reaps its owned server', async t => {
  const root = await fixture(t, 'exposed')
  await assert.rejects(verifyProductionGates({ root }), /Production gate failed.*explore/)
  await assertChildrenExited(root)
})

test('a build that still contains a retired ZIP route fails before serving', async t => {
  const root = await fixture(t, 'retired-route')
  await assert.rejects(verifyProductionGates({ root }), /Retired routes are still in the build: \/api\/preview-download\/\[id\]/)
  assert.deepEqual(retiredRoutesBuilt({ '/api/launch/route': '/api/launch', '/page': '/' }), [])
  assert.deepEqual(retiredRoutesBuilt({ '/api/preview-customize/[id]/route': '/api/preview-customize/[id]' }), ['/api/preview-customize/[id]'])
})

test('startup exit fails promptly and reaps the child', async t => {
  const root = await fixture(t, 'exit')
  await assert.rejects(verifyProductionGates({ root }), /Production server exited/)
  await assertChildrenExited(root)
})

test('successful HTTP statuses cannot hide missing indexing metadata', async t => {
  const root = await fixture(t, 'metadata')
  await assert.rejects(verifyProductionGates({ root }), /Indexing contract failed/)
  await assertChildrenExited(root)
})

test('opposing robot directives cannot pass the public indexing contract', async t => {
  const root = await fixture(t, 'conflicting-indexing')
  await assert.rejects(verifyProductionGates({ root }), /Indexing contract failed/)
  await assertChildrenExited(root)
})

test('a data-id attribute cannot stand in for the actual main skip target', async t => {
  const root = await fixture(t, 'wrong-target')
  await assert.rejects(verifyProductionGates({ root }), /Main content\/recovery target missing/)
  await assertChildrenExited(root)
})

test('interruption while waiting for readiness stops the owned server', async t => {
  const root = await fixture(t, 'hang')
  const controller = new AbortController()
  const result = verifyProductionGates({ root, signal: controller.signal })
  const rejected = assert.rejects(result, /abort|interrupted/i)
  // Wait for the fixture child to exist before interrupting startup.
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await readFile(join(root, 'lifecycle')); break } catch { await delay(20) }
  }
  controller.abort(new Error('interrupted by test'))
  await rejected
  await assertChildrenExited(root)
})

const unit = (value, name) => `${value} ${name}${value === 1 ? '' : 's'}`
const timer = seconds =>
  `<div role="timer" aria-live="off" aria-label="${unit(Math.floor(seconds / 86400), 'day')}, ${unit(Math.floor((seconds % 86400) / 3600), 'hour')}, ${unit(Math.floor((seconds % 3600) / 60), 'minute')}, ${unit(seconds % 60, 'second')} remaining">`

test('the launch route must be uncached whole seconds that agree with the page', () => {
  const fresh = body => ({ cacheControl: 'private, no-store', body })
  assert.deepEqual(launchContract(fresh('{"seconds":3661}'), timer(3660)), { seconds: 3661, renderedSeconds: 3660, cacheControl: 'private, no-store' })
  assert.equal(launchContract(fresh('{"seconds":1761279}'), timer(1761275)).renderedSeconds, 1761275)
  assert.deepEqual(launchContract(fresh('{"seconds":0}'), null), { seconds: 0, cacheControl: 'private, no-store' })
  assert.throws(() => launchContract({ cacheControl: 'public, max-age=60', body: '{"seconds":1}' }, null), /must not be cached/)
  assert.throws(() => launchContract({ cacheControl: null, body: '{"seconds":1}' }, null), /must not be cached/)
  assert.throws(() => launchContract(fresh('{"seconds":1.5}'), null), /whole seconds/)
  assert.throws(() => launchContract(fresh('{"seconds":-1}'), null), /whole seconds/)
  assert.throws(() => launchContract(fresh('not json'), null), /whole seconds/)
  assert.throws(() => launchContract(fresh('{"seconds":100}'), timer(5000)), /disagrees/)
  assert.throws(() => launchContract(fresh('{"seconds":100}'), '<main id="content"></main>'), /timer missing/)
})

test('every pass pins the server clock on its side of the launch, whatever day it runs', async () => {
  const source = await readFile(new URL('../lib/launch.ts', import.meta.url), 'utf8')
  const launchAt = Date.parse(/LAUNCH_AT = Date\.parse\('([^']+)'\)/.exec(source)[1])
  const inherited = { DIYA_NOW: '2027-01-01T00:00:00Z', PATH: '/usr/bin' }
  for (const flag of ['0', '1']) {
    assert.ok(Date.parse(serverEnv(flag, inherited).DIYA_NOW) < launchAt, `pass ${flag} must run before the launch`)
    assert.equal(serverEnv(flag, inherited).DIYA_CATALOG_PREVIEW, flag)
  }
  assert.ok(Date.parse(serverEnv('launched', inherited).DIYA_NOW) >= launchAt)
  assert.equal(serverEnv('launched', inherited).DIYA_CATALOG_PREVIEW, '0')
  assert.equal(serverEnv('0', inherited).PATH, '/usr/bin')
})

test('an open /mcp must answer initialize as DIYA, uncached', () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'diya', version: '1.0.0' } } })
  assert.deepEqual(mcpContract({ body, cacheControl: 'no-store' }), { server: 'diya', version: '1.0.0', protocolVersion: '2025-06-18' })
  assert.throws(() => mcpContract({ body, cacheControl: 'public, max-age=300' }), /must not be cached/)
  assert.throws(() => mcpContract({ body: '<html>404</html>', cacheControl: 'no-store' }), /did not answer initialize/)
  assert.throws(() => mcpContract({ body: body.replace('"diya"', '"other"'), cacheControl: 'no-store' }), /did not answer initialize/)
})

test('a closed /api/screen-requests says only { open: false }, uncached', () => {
  const closed = body => ({ cacheControl: 'no-store', body })
  assert.deepEqual(screenRequestsClosedContract(closed('{"open":false}')), { open: false, cacheControl: 'no-store' })
  assert.throws(() => screenRequestsClosedContract(closed('{"open":true,"formToken":"1.a"}')), /closed before launch/)
  assert.throws(() => screenRequestsClosedContract(closed('{"open":false,"formToken":"1.a"}')), /closed before launch/)
  assert.throws(() => screenRequestsClosedContract(closed('<html>404</html>')), /closed before launch/)
  assert.throws(() => screenRequestsClosedContract({ cacheControl: 'public, max-age=60', body: '{"open":false}' }), /must not be cached/)
  assert.throws(() => screenRequestsClosedContract(undefined), /must not be cached/)
})

test('the site address comes from lib/site.ts', () => {
  assert.equal(SITE, 'https://diya13.ai')
  assert.equal(siteConstant("export const SITE = 'https://example.com'\n", 'SITE'), 'https://example.com')
  assert.throws(() => siteConstant('export const OTHER = 1\n', 'SITE'), /SITE missing/)
})

test('the launched page names the launch card in og:image and twitter:image', () => {
  const card = `${SITE}${LAUNCHED_CARD}`
  const og = (content) => ({ property: 'og:image', content })
  const tw = (content) => ({ name: 'twitter:image', content })
  assert.equal(LAUNCHED_CARD, '/social-preview-v7.jpg')
  assert.deepEqual(launchedCardContract([og(card), tw(card)]), { ogImage: card, twitterImage: card })
  assert.throws(() => launchedCardContract([og(`${SITE}/social-preview-v3.jpg`), tw(card)]), /og:image/)
  assert.throws(() => launchedCardContract([og(card), tw(`${SITE}/brand/social-preview-v1.jpg`)]), /twitter:image/)
  assert.throws(() => launchedCardContract([og(card)]), /twitter:image/)
  assert.throws(() => launchedCardContract([og(card), og(card), tw(card)]), /og:image/)
})
