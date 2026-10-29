// Renders the Screens gallery's thumbnails from the built preview frame:
// every ready screen and every poster, at 1440×900, in Light and in Dark,
// saved as compact JPEGs to public/screens/thumbs/<id>-light.jpg and
// <id>-dark.jpg. Posters are captured plain; the gallery adds "Coming soon".
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
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 0.6,
        colorScheme: theme,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      for (const { id, status } of targets) {
        const query = new URLSearchParams({ screen: id, theme, glass: '0' })
        if (status === 'poster') query.set('poster', '1')
        await page.goto(`http://127.0.0.1:${port}/screens-frame?${query}`, { waitUntil: 'networkidle' })
        await page.waitForSelector('html[data-screen-ready="true"]', { timeout: 15_000 })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(250)
        const file = join(out, `${id}-${theme}.jpg`)
        await page.screenshot({ path: file, type: 'jpeg', quality: 78 })
        console.log(`${id}-${theme}.jpg  ${(statSync(file).size / 1024).toFixed(0)} KB`)
      }
      await context.close()
    }
  } finally {
    await browser.close()
    server.close()
  }
  console.log(`${targets.length * 2} thumbnails in ${out}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
