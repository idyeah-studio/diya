// Renders the Screens gallery's thumbnails from the built preview frame:
// every ready screen and every poster, in Light and in Dark, saved as compact
// JPEGs to public/screens/thumbs/<id>-light.jpg and <id>-dark.jpg. Posters
// are captured plain; the gallery adds "Coming soon".
//
// Each screen renders at a 1120×700 viewport (16:10, so content reads 29%
// larger than at 1440×900) and is saved at 896×560 (THUMBNAIL below), sharp
// on a 2x display at card size. A capture waits until the screen is truly
// ready: its data loaded (no aria-busy, no skeletons), its charts drawn,
// images and fonts in, and the page quiet. A screen that never gets there
// is still captured, but the run names it and exits with an error.
//
//   pnpm --filter diya-site build:frame
//   PLAYWRIGHT=<path to the playwright package> node scripts/screens-thumbnails.mjs
//
// Options:
//   --playwright <path>   where the playwright package is (or PLAYWRIGHT=…);
//                         it isn't a dependency of this repo
//   --only sign-in,team   just these ids
//   --all                 screens still being built too (to check the pipeline)
//   --out <dir>           write somewhere else (default public/screens/thumbs)
//   --port <n>            the local server's port (default 3106)
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const app = fileURLToPath(new URL('../', import.meta.url))
const publicDir = join(app, 'public')

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

/** id and status of every registry entry, read from components/screens/screens-data.ts. */
export function registryEntries(source) {
  const list = source.slice(source.indexOf('export const screens'))
  return [...list.matchAll(/\{\s*id: '([a-z0-9-]+)',[\s\S]*?status: '(ready|building|poster)',/g)].map(([, id, status]) => ({ id, status }))
}

/** The viewport each screen renders at, and the saved image's size. */
export const VIEWPORT = { width: 1120, height: 700 }
export const THUMBNAIL = { width: 896, height: 560 }

/**
 * Runs in the page: why the screen isn't ready to photograph yet, or '' when
 * it is. Loading shows as aria-busy or a visible skeleton; a DataViz chart is
 * drawn once its SVG has a size and marks; images and fonts must be in.
 */
export function notReadyReason() {
  if (document.documentElement.dataset.screenReady !== 'true') return 'the screen hasn’t rendered'
  const shown = (element) => {
    const box = element.getBoundingClientRect()
    return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden'
  }
  if ([...document.querySelectorAll('[aria-busy="true"]')].some(shown)) return 'something is still loading (aria-busy)'
  if ([...document.querySelectorAll('[class*="skeleton" i]')].some(shown)) return 'a loading skeleton is showing'
  for (const host of document.querySelectorAll('.diya-data-viz')) {
    if (!shown(host)) continue
    const svg = host.querySelector('svg')
    if (!svg || svg.getBoundingClientRect().width === 0 || !svg.querySelector('path, rect, circle, text')) return 'a chart isn’t drawn'
  }
  if ([...document.images].some((image) => image.loading !== 'lazy' && !image.complete)) return 'an image is still loading'
  if (document.fonts.status !== 'loaded') return 'fonts are still loading'
  return ''
}

/** Runs in the page: resolves once the DOM has gone `quiet` ms without a change (at most `limit` ms). */
export function domQuiet([quiet, limit]) {
  return new Promise((done) => {
    let timer
    const finish = () => {
      observer.disconnect()
      clearTimeout(timer)
      clearTimeout(cap)
      done()
    }
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(finish, quiet)
    })
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
    timer = setTimeout(finish, quiet)
    const cap = setTimeout(finish, limit)
  })
}

/**
 * Waits until the screen is ready and stays ready through a quiet spell (a
 * screen can finish one load and start another). Returns '' or the last reason.
 */
async function waitUntilReady(page, { timeout = 20_000 } = {}) {
  const deadline = Date.now() + timeout
  let reason = 'the screen hasn’t rendered'
  while (Date.now() < deadline) {
    reason = await page.evaluate(notReadyReason)
    if (!reason) {
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      await page.evaluate(domQuiet, [600, 4_000])
      reason = await page.evaluate(notReadyReason)
      if (!reason) return ''
    }
    await page.waitForTimeout(150)
  }
  return reason
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

/** public/ over HTTP, with the same /screens-frame rewrite as next.config.mjs. */
function serve(port) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const pathname = url.pathname === '/screens-frame' || url.pathname === '/screens-frame/' ? '/screens-frame/index.html' : url.pathname
    const file = normalize(join(publicDir, decodeURIComponent(pathname)))
    if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('Not found')
      return
    }
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => done(server))
  })
}

/** Playwright's chromium, from --playwright, PLAYWRIGHT or wherever Node finds it. */
async function loadChromium() {
  const path = option('--playwright') ?? process.env.PLAYWRIGHT
  let playwright
  try {
    playwright = path
      ? await import(pathToFileURL(createRequire(join(resolve(path), 'package.json')).resolve('playwright')).href)
      : await import('playwright')
  } catch {
    throw new Error('Playwright not found. Pass --playwright <path to the playwright package>, or set PLAYWRIGHT.')
  }
  // A CommonJS package: its exports may arrive as the default.
  const chromium = playwright.chromium ?? playwright.default?.chromium
  if (!chromium) throw new Error('That Playwright has no chromium.')
  return chromium
}

async function main() {
  if (!existsSync(join(publicDir, 'screens-frame/index.html')))
    throw new Error('The preview frame isn’t built. Run pnpm --filter diya-site build:frame first.')
  const entries = registryEntries(readFileSync(join(app, 'components/screens/screens-data.ts'), 'utf8'))
  const only = option('--only')?.split(',').filter(Boolean)
  const targets = entries.filter((entry) =>
    only ? only.includes(entry.id) : args.includes('--all') || entry.status === 'ready' || entry.status === 'poster'
  )
  if (only) for (const id of only) if (!entries.some((entry) => entry.id === id)) throw new Error(`No screen called ${id}`)
  const out = resolve(option('--out') ?? join(publicDir, 'screens/thumbs'))
  mkdirSync(out, { recursive: true })
  const port = Number(option('--port') ?? 3106)

  const chromium = await loadChromium()
  const server = await serve(port)
  const browser = await chromium.launch().catch((error) => {
    server.close()
    throw error
  })
  const failed = []
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: THUMBNAIL.width / VIEWPORT.width,
        colorScheme: theme,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      for (const { id, status } of targets) {
        const query = new URLSearchParams({ screen: id, theme, glass: '0' })
        if (status === 'poster') query.set('poster', '1')
        await page.goto(`http://127.0.0.1:${port}/screens-frame?${query}`, { waitUntil: 'networkidle' })
        const reason = await waitUntilReady(page)
        // A last beat for anything the checks can't see (a transition's end frame).
        await page.waitForTimeout(400)
        const file = join(out, `${id}-${theme}.jpg`)
        await page.screenshot({ path: file, type: 'jpeg', quality: 80 })
        console.log(`${id}-${theme}.jpg  ${(statSync(file).size / 1024).toFixed(0)} KB${reason ? `  NOT READY: ${reason}` : ''}`)
        if (reason) failed.push(`${id}-${theme}: ${reason}`)
      }
      await context.close()
    }
  } finally {
    await browser.close()
    server.close()
  }
  console.log(`${targets.length * 2} thumbnails in ${out}`)
  if (failed.length) throw new Error(`Captured before they were ready, so check these by eye:\n  ${failed.join('\n  ')}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
