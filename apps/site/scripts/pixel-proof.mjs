#!/usr/bin/env node
// Pixel proof: shoots catalog pages from a running site, then compares two sets of shots
// pixel for pixel. A release proves "no visual change" by capturing a baseline from the last
// release's build once, then comparing every candidate build against it.
//
//   node apps/site/scripts/pixel-proof.mjs capture --url http://localhost:3401 --out <dir> [options]
//   node apps/site/scripts/pixel-proof.mjs compare <baseline-dir> <candidate-dir> [--diffs <dir>]
//
// Capture options (each a comma list):
//   --engines      chromium,webkit,firefox            (default chromium)
//   --viewports    1440,390                           (default 1440,390; heights 900 and 844)
//   --appearances  light,dark,glass-light,glass-dark  (default all four)
//   --scales       1,0.5,1.5                          corner scale, through Customize (default 1)
//   --pages        components,patterns,screens        (default components,patterns)
//   --only         ids to keep, such as button,dialog
//   --states       rest,focus,popup                   (default all three)
//   --screens      screen ids for the screens pages   (default a sample of six)
//   --media        contrast,transparency              Chromium only: adds rows under
//                  prefers-contrast: more and prefers-reduced-transparency: reduce
//   --workers      pages shot at once per engine      (default 4)
//
// Each page is shot at rest (full page); with the first control in the preview focused from
// the keyboard (focus rings); and with the first popup or modal in the preview open (popup and
// modal corners). The clock is fixed, Reduce Motion is on, fonts and images have loaded and
// carets are hidden. Compare decodes both PNGs in Chromium and counts every pixel whose RGBA
// differs at all (threshold 0, anti-aliasing included).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium, firefox, webkit } from '@playwright/test'

const ENGINES = { chromium, webkit, firefox }
const HEIGHTS = { 1440: 900, 390: 844 }
const SCREENS = ['sign-in', 'settings', 'api-keys', 'inbox', 'checkout', 'dashboard']
const FIXED_TIME = new Date('2026-11-01T12:00:00Z')

function options(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i]
    else out._.push(argv[i])
  }
  return out
}
const list = (value, fallback) => (value ? value.split(',').map(part => part.trim()).filter(Boolean) : fallback)

/** Component and pattern ids, read from the catalog's own route table. */
function catalogIds() {
  const source = readFileSync(new URL('../lib/catalog-route.ts', import.meta.url), 'utf8')
  const ids = name => [...new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`).exec(source)[1].matchAll(/'([\w-]+)'/g)].map(match => match[1])
  return { components: ids('componentIds'), patterns: ids('patternIds') }
}

function pagesFor(args) {
  const { components, patterns } = catalogIds()
  const only = list(args.only, null)
  const pages = []
  for (const area of list(args.pages, ['components', 'patterns'])) {
    if (area === 'components') for (const id of components) pages.push({ id: `component-${id}`, path: `/explore?area=components&component=${id}`, stage: true })
    if (area === 'patterns') for (const id of patterns) pages.push({ id: `pattern-${id}`, path: `/explore?pattern=${id}`, stage: true })
    if (area === 'screens') for (const id of list(args.screens, SCREENS)) pages.push({ id: `screen-${id}`, path: `/screens-frame?screen=${id}`, frame: true })
  }
  return only ? pages.filter(page => only.some(id => page.id.endsWith(`-${id}`))) : pages
}

const APPEARANCES = {
  light: { theme: 'light', glass: false },
  dark: { theme: 'dark', glass: false },
  'glass-light': { theme: 'light', glass: true },
  'glass-dark': { theme: 'dark', glass: true },
}

/** Waits until every image has loaded (lazy ones made eager), fonts are in and layout is still. */
async function settle(page) {
  await page.evaluate(async () => {
    for (const image of document.querySelectorAll('img')) image.loading = 'eager'
    await document.fonts.ready
    await Promise.all([...document.querySelectorAll('img')].map(image => (image.complete ? image.decode().catch(() => {}) : new Promise(done => { image.onload = image.onerror = done }))))
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
  await page.waitForTimeout(300)
}

const STAGE = ':is(.component-preview-stage, .pattern-stage) .customize-scope:not(.customize-scope--bare)'
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'

async function shootPage(context, base, page, appearance, scale, states, file, media) {
  const tab = await context.newPage()
  if (media) {
    // Chromium only: the two settings Playwright has no option for go through CDP.
    const cdp = await context.newCDPSession(tab)
    await cdp.send('Emulation.setEmulatedMedia', { features: [media === 'contrast' ? { name: 'prefers-contrast', value: 'more' } : { name: 'prefers-reduced-transparency', value: 'reduce' }] })
  }
  const url = page.frame ? `${base}${page.path}&theme=${APPEARANCES[appearance].theme}&glass=${APPEARANCES[appearance].glass ? 1 : 0}` : base + page.path
  const shots = []
  try {
    await tab.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await settle(tab)
    if (states.includes('rest')) {
      await tab.screenshot({ path: file('rest'), fullPage: true, animations: 'disabled', caret: 'hide' })
      shots.push('rest')
    }
    const stage = page.stage ? tab.locator(STAGE).first() : null
    if (stage && (await stage.count()) && states.includes('focus')) {
      const target = stage.locator(FOCUSABLE).first()
      if (await target.count()) {
        // Keyboard modality first, so :focus-visible matches in every engine.
        await tab.keyboard.press('Shift')
        await target.evaluate(element => element.focus({ focusVisible: true }))
        await tab.waitForTimeout(150)
        // The scope is display: contents; the stage around it has the box.
        {
          const viewport = tab.viewportSize()
          await target.evaluate(element => element.scrollIntoView({ block: 'center' }))
          await tab.waitForTimeout(150)
          const moved = await stage.evaluate(element => { const { x, y, width, height } = element.parentElement.getBoundingClientRect(); return { x, y, width, height } })
          const clip = { x: Math.max(0, moved.x - 8), y: Math.max(0, moved.y - 8), width: Math.min(viewport.width - Math.max(0, moved.x - 8), moved.width + 16), height: Math.min(viewport.height - Math.max(0, moved.y - 8), moved.height + 16) }
          await tab.screenshot({ path: file('focus'), clip, animations: 'disabled', caret: 'hide' })
          shots.push('focus')
        }
      }
    }
    if (stage && (await stage.count()) && states.includes('popup')) {
      const scope = ':is(.component-preview-stage, .pattern-stage, .pattern-controls)'
      const named = tab.locator(scope).getByRole('button', { name: /^Open\b/ }).filter({ visible: true })
      const opener = (await named.count()) ? named.first() : tab.locator(':is(.component-preview-stage, .pattern-stage, .pattern-controls) :is([aria-haspopup]:not([disabled]):not([aria-disabled="true"]), [role=combobox]:not([disabled]), button[aria-expanded]:not([disabled]))').filter({ visible: true }).first()
      if (await opener.count()) {
        await tab.keyboard.press('Escape')
        await opener.scrollIntoViewIfNeeded()
        await opener.click()
        await tab.waitForTimeout(500)
        await tab.screenshot({ path: file('popup'), animations: 'disabled', caret: 'hide' })
        shots.push('popup')
      }
    }
  } finally {
    await tab.close()
  }
  return shots
}

async function capture(args) {
  const base = args.url.replace(/\/$/, '')
  const out = resolve(args.out)
  mkdirSync(out, { recursive: true })
  const pages = pagesFor(args)
  const states = list(args.states, ['rest', 'focus', 'popup'])
  const workers = Number(args.workers ?? 4)
  const medias = [null, ...list(args.media, []).filter(name => name === 'contrast' || name === 'transparency')]
  let count = 0
  for (const engineName of list(args.engines, ['chromium'])) {
    const browser = await ENGINES[engineName].launch()
    const jobs = []
    for (const width of list(args.viewports, ['1440', '390']).map(Number))
      for (const appearance of list(args.appearances, Object.keys(APPEARANCES)))
        for (const scale of list(args.scales, ['1']))
          for (const media of engineName === 'chromium' ? medias : [null])
            for (const page of pages) jobs.push({ width, appearance, scale, media, page })
    const run = async () => {
      for (let job = jobs.shift(); job; job = jobs.shift()) {
        const { width, appearance, scale, media, page } = job
        const { theme, glass } = APPEARANCES[appearance]
        const context = await browser.newContext({ viewport: { width, height: HEIGHTS[width] ?? 900 }, reducedMotion: 'reduce', colorScheme: theme, deviceScaleFactor: 1 })
        const host = new URL(base).hostname
        await context.addCookies([
          { name: 'diya-theme', value: theme, domain: host, path: '/' },
          { name: 'diya-glass', value: String(glass), domain: host, path: '/' },
        ])
        if (scale !== '1') {
          const corners = Math.round(Number(scale) * 10)
          await context.addInitScript(value => { try { localStorage.setItem('diya-customize-v2', value) } catch {} }, JSON.stringify({ schemaVersion: 2, brand: { corners }, items: {} }))
        }
        await context.clock.setFixedTime(FIXED_TIME)
        const tag = media ? `-${media}` : ''
        const file = state => join(out, `${engineName}-${width}-${appearance}-s${scale}${tag}-${page.id}-${state}.png`)
        try {
          const shots = await shootPage(context, base, page, appearance, scale, states, file, media)
          count += shots.length
        } catch (error) {
          console.error(`failed: ${engineName} ${width} ${appearance} s${scale}${tag} ${page.id}: ${error.message.split('\n')[0]}`)
        }
        await context.close()
      }
    }
    await Promise.all(Array.from({ length: workers }, run))
    await browser.close()
  }
  console.log(`captured ${count} shots in ${out}`)
}

async function compare(args) {
  // Each side may list several runs of the same build, comma-separated: a shot counts as changed
  // only when no baseline run matches any candidate run, so noise that varies between two runs
  // of one build (a lazy image, a chart's first frame) isn't reported as a change.
  const [lefts, rights] = args._.slice(1).map(dirs => dirs.split(',').map(dir => resolve(dir)))
  const [left, right] = [lefts[0], rights[0]]
  const diffs = args.diffs ? resolve(args.diffs) : null
  if (diffs) mkdirSync(diffs, { recursive: true })
  const names = readdirSync(left).filter(name => name.endsWith('.png')).sort()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const results = []
  const diff = (a, b, wantDiff) => page.evaluate(async ([a, b, wantDiff]) => {
      const load = async source => {
        const image = new Image()
        image.src = `data:image/png;base64,${source}`
        await image.decode()
        const canvas = new OffscreenCanvas(image.width, image.height)
        const context = canvas.getContext('2d', { colorSpace: 'srgb' })
        context.drawImage(image, 0, 0)
        return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data }
      }
      const [one, two] = await Promise.all([load(a), load(b)])
      if (one.width !== two.width || one.height !== two.height) return { changed: Infinity, size: `${one.width}x${one.height} vs ${two.width}x${two.height}` }
      let changed = 0
      let box = null
      const diff = wantDiff ? new OffscreenCanvas(one.width, one.height) : null
      const out = diff ? diff.getContext('2d').createImageData(one.width, one.height) : null
      for (let i = 0; i < one.data.length; i += 4) {
        const same = one.data[i] === two.data[i] && one.data[i + 1] === two.data[i + 1] && one.data[i + 2] === two.data[i + 2] && one.data[i + 3] === two.data[i + 3]
        if (out) { const grey = (one.data[i] + one.data[i + 1] + one.data[i + 2]) / 3; out.data[i] = same ? grey : 255; out.data[i + 1] = same ? grey : 0; out.data[i + 2] = same ? grey : 0; out.data[i + 3] = same ? 60 : 255 }
        if (same) continue
        changed++
        const x = (i / 4) % one.width
        const y = Math.floor(i / 4 / one.width)
        box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) } : { x0: x, y0: y, x1: x, y1: y }
      }
      let png = null
      if (diff && changed) {
        diff.getContext('2d').putImageData(out, 0, 0)
        const blob = await diff.convertToBlob({ type: 'image/png' })
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let text = ''
        for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        png = btoa(text)
      }
      return { changed, box, png }
    }, [a.toString('base64'), b.toString('base64'), wantDiff])
  for (const name of names) {
    const pairs = lefts.flatMap(l => rights.map(r => [join(l, name), join(r, name)])).filter(([, r]) => existsSync(r))
    if (!pairs.length) { results.push({ name, changed: 'missing' }); continue }
    let best = null
    for (const [l, r] of pairs) {
      if (!existsSync(l)) continue
      const a = readFileSync(l)
      const b = readFileSync(r)
      if (a.equals(b)) { best = { changed: 0 }; break }
      const result = await diff(a, b, false)
      if (!best || result.changed < best.changed) best = { ...result, pair: [l, r] }
    }
    if (best.changed && diffs) {
      const full = await diff(readFileSync(best.pair[0]), readFileSync(best.pair[1]), true)
      if (full.png) writeFileSync(join(diffs, name), Buffer.from(full.png, 'base64'))
    }
    results.push({ name, changed: best.changed === Infinity ? `size ${best.size}` : best.changed, box: best.box })
  }
  for (const name of readdirSync(right).filter(name => name.endsWith('.png') && !names.includes(name))) results.push({ name, changed: 'extra' })
  await browser.close()
  const changed = results.filter(result => result.changed !== 0)
  for (const result of changed) console.log(`${result.name}: ${result.changed}${result.box ? ` px, box ${result.box.x0},${result.box.y0}-${result.box.x1},${result.box.y1}` : ''}`)
  console.log(`${results.length} compared, ${results.length - changed.length} identical, ${changed.length} changed`)
  if (args.json) writeFileSync(resolve(args.json), `${JSON.stringify(results, null, 2)}\n`)
  process.exitCode = changed.length ? 1 : 0
}

const args = options(process.argv.slice(2))
if (args._[0] === 'capture' && args.url && args.out) await capture(args)
else if (args._[0] === 'compare' && args._.length === 3) await compare(args)
else {
  console.error('usage: pixel-proof.mjs capture --url <site> --out <dir> [options] | compare <baseline> <candidate> [--diffs <dir>] [--json <file>]')
  process.exitCode = 2
}
