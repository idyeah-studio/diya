// Spinner (1.2) in a real browser: the 400ms beat and its fade, the turn surviving a busy main
// thread (MOT-1.2-01/02), and the ring centered on the cap height of the text beside it.
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir, platform, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { isPhone, isReact18, openCase } from './helpers'
import { playwrightCache } from './playwright-cache'

// Screenshots wait for the main thread, so only a recording sees a page that is busy. The ffmpeg
// that Playwright installs with its browsers (it makes the recordings) cuts it into PNG frames,
// found where `playwright install` puts it; the browser itself reads the PNGs. No Playwright
// internals (K8).
function ffmpeg() {
  const found = playwrightCache(process.env, platform(), homedir())
  const cache = found === '0'
    ? join(dirname(createRequire(createRequire(realpathSync(createRequire(import.meta.url).resolve('@playwright/test'))).resolve('playwright')).resolve('playwright-core/package.json')), '.local-browsers')
    : found
  const folders = existsSync(cache) ? readdirSync(cache).filter((name) => /^ffmpeg-\d+$/.test(name)).sort((a, b) => Number(b.slice(7)) - Number(a.slice(7))) : []
  for (const folder of folders) {
    const binary = readdirSync(join(cache, folder)).find((name) => /^ffmpeg-(mac|linux|win64\.exe)/.test(name))
    if (binary) return join(cache, folder, binary)
  }
  throw new Error(`No ffmpeg under ${cache}: run "pnpm exec playwright install ffmpeg" (Playwright records video with it).`)
}

/** Per frame of the recording: the flag's mean red and green, how much the ring changed since the frame before (mean channel difference), and the ring's mean brightness. */
async function readFrames(browser: Browser, flags: string[], rings: string[]) {
  const page = await browser.newPage()
  try {
    return await page.evaluate(async ([flags, rings]) => {
      const pixels = async (base64: string) => {
        const image = new Image()
        image.src = `data:image/png;base64,${base64}`
        await image.decode()
        const canvas = new OffscreenCanvas(image.width, image.height)
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height).data
      }
      const flag = await Promise.all(flags.map(async (frame) => {
        const data = await pixels(frame)
        let r = 0, g = 0
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1] }
        return [r / (data.length / 4), g / (data.length / 4)]
      }))
      const ring = await Promise.all(rings.map(pixels))
      const change = ring.map((data, index) => {
        if (!index) return 0
        const before = ring[index - 1]
        let difference = 0
        for (let i = 0; i < data.length; i += 4) difference += Math.abs(data[i] - before[i]) + Math.abs(data[i + 1] - before[i + 1]) + Math.abs(data[i + 2] - before[i + 2])
        return difference / (data.length / 4)
      })
      const brightness = ring.map((data) => {
        let sum = 0
        for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3
        return sum / (data.length / 4)
      })
      return { flag, change, brightness }
    }, [flags, rings] as const)
  } finally {
    await page.close()
  }
}

/** How long (ms) an ease-in-out (cubic-bezier(.42, 0, .58, 1)) animation of `duration` ms stays within `fraction` of the whole change from one end, counting both sides of the turn. */
function turningTime(fraction: number, duration: number) {
  const bezier = (u: number, a: number, b: number) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3
  let lo = 0, hi = 1
  for (let step = 0; step < 40; step++) {
    const mid = (lo + hi) / 2
    if (1 - bezier(mid, 0, 1) > fraction) lo = mid
    else hi = mid
  }
  return 2 * (1 - bezier(lo, 0.42, 0.58)) * duration
}

/** Samples #sp-new's opacity and words on every frame for `ms` after the Toggle click mounts it. */
function sampleMount(page: Page, ms: number) {
  return page.evaluate((ms) => new Promise<{ t: number; opacity: string; words: string }[]>((done) => {
    const samples: { t: number; opacity: string; words: string }[] = []
    const start = performance.now()
    document.getElementById('sp-mount')!.click()
    const tick = () => {
      const node = document.getElementById('sp-new')
      const t = performance.now() - start
      if (node) samples.push({ t, opacity: getComputedStyle(node).opacity, words: node.textContent ?? '' })
      if (t < ms) requestAnimationFrame(tick)
      else done(samples)
    }
    tick()
  }), ms)
}

test('opacity 0 until 400ms, then fades over 160ms; the label goes in on the same beat', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=spinner&theme=light')
  const samples = await sampleMount(page, 900)
  expect(samples.length).toBeGreaterThan(5)
  for (const sample of samples.filter(({ t }) => t < 380)) expect(sample, `${sample.t}ms`).toMatchObject({ opacity: '0', words: '' })
  expect(samples.at(-1)).toMatchObject({ opacity: '1', words: 'Loading older invoices' })
  // The fade: the arrive animation, 400ms late, 160ms long, on enter.
  const timing = await page.locator('#sp-new').evaluate((node) => node.getAnimations().map((animation) => {
    const effect = animation.effect as KeyframeEffect
    return { name: (animation as CSSAnimation).animationName, delay: effect.getTiming().delay, duration: effect.getTiming().duration }
  }))
  expect(timing).toEqual([{ name: 'diya-spinner-arrive', delay: 400, duration: 160 }])
})

test('motion off keeps the 400ms and drops only the fade', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=spinner&theme=light&motion=off')
  const samples = await sampleMount(page, 600)
  for (const sample of samples.filter(({ t }) => t < 380)) expect(sample.opacity, `${sample.t}ms`).toBe('0')
  expect(samples.at(-1)!.opacity).toBe('1')
  const timing = await page.locator('#sp-new').evaluate((node) => node.getAnimations().map((animation) => (animation.effect as KeyframeEffect).getTiming()))
  expect(timing.map(({ delay, duration }) => [delay, duration])).toEqual([[400, 0]])
})

for (const motion of ['system', 'reduced'] as const) {
  test(`keeps ${motion === 'system' ? 'turning' : 'breathing'} while the main thread is blocked for 2s (${motion})`, async ({ browser }, testInfo) => {
    // One recording per engine: the desktop React 19 projects.
    test.skip(isPhone(testInfo) || isReact18(testInfo), 'one recording per engine')
    const dir = mkdtempSync(join(tmpdir(), 'diya-spin-'))
    try {
      const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 800, height: 600 }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 800, height: 600 } } })
      const page = await context.newPage()
      await openCase(page, testInfo, `case=spinner&theme=light&motion=${motion}`)
      await page.waitForTimeout(700)
      const box = (selector: string) => page.locator(selector).evaluate((node) => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round) })
      const flag = await box('#sp-flag')
      const ring = await box('#sp-block')
      await page.evaluate(() => (window as unknown as { __block(ms: number): void }).__block(2000))
      await page.waitForTimeout(2800)
      const video = page.video()!
      await context.close()
      const file = await video.path()
      const rate = /([\d.]+)(k?) tbr/.exec(spawnSync(ffmpeg(), ['-i', file], { encoding: 'utf8' }).stderr)
      const tick = rate ? 1000 / (Number(rate[1]) * (rate[2] ? 1000 : 1)) : 1
      const frames = (crop: number[], name: string) => {
        const out = join(dir, name)
        mkdirSync(out)
        execFileSync(ffmpeg(), ['-loglevel', 'error', '-i', file, '-vsync', 'passthrough', '-frame_pts', '1', '-vf', `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}`, join(out, '%05d.png')])
        // Named by presentation time, so the frames carry their own clock: in ms from a variable-rate
        // recording (Linux, "1k tbr"), in frames of its constant rate otherwise (macOS, "23.92 tbr").
        const names = readdirSync(out).sort((a, b) => parseInt(a) - parseInt(b))
        return { ms: names.map((name) => parseInt(name) * tick), images: names.map((name) => readFileSync(join(out, name)).toString('base64')) }
      }
      const flagFrames = frames([flag[0] + 6, flag[1] + 6, 12, 12], 'flag')
      const ringFrames = frames(ring, 'ring')
      const read = await readFrames(browser, flagFrames.images, ringFrames.images)
      const ms = ringFrames.ms
      // The flag is red for the whole block.
      const red = read.flag.map(([r, g], index) => (r > 150 && g < 100 ? index : -1)).filter((index) => index >= 0)
      expect(red.length, 'frames while blocked').toBeGreaterThan(30)
      const first = red[0] + 2, last = red.at(-1)! - 1
      let changed = 0, total = 0
      for (let index = first; index <= last; index++) {
        total++
        if (read.change[index] > 1) changed++
      }
      let failure = ''
      let detail = ''
      if (motion === 'system') {
        // A turn changes every frame.
        detail = `${changed}/${total} frames changed while blocked`
        if (changed / total <= 0.9) failure = detail
      } else {
        // A breathe is a slow opacity ramp: less than a level per frame, and the Linux recorder
        // emits frames at ~100/s and repeats them, so counting changed frames measures the
        // recorder. Measure the ring's brightness over time instead (it averages out the encoder's
        // noise). `swing` is the breathe's whole range in the recording; a 2s block holds a whole
        // half-breath, so at least half of that range must be crossed during it (>= 0.4, with slack).
        // The swing is read from the settled page around the block (the recording opens on blank frames).
        const level = read.brightness
        const around = level.filter((_, index) => ms[index] >= ms[red[0]] - 300 && ms[index] <= ms[red.at(-1)!] + 700)
        const swing = Math.max(...around) - Math.min(...around)
        const inBlock = level.slice(first, last + 1)
        const crossed = Math.max(...inBlock) - Math.min(...inBlock)
        // The longest time the brightness stays within one level. The keyframe eases in and out
        // over 2s (opacity .25 to .7, cubic-bezier(.42, 0, .58, 1)), so near each end it turns
        // slowly: the time spent within `one level / swing` of an end is the natural stall.
        let stall = 0, lo = first
        for (let hi = first; hi <= last; hi++) {
          while (Math.max(...level.slice(lo, hi + 1)) - Math.min(...level.slice(lo, hi + 1)) >= 1) lo++
          stall = Math.max(stall, ms[hi] - ms[lo])
        }
        const natural = turningTime(1 / swing, 2000)
        const allowed = natural * 1.25 + 100
        detail = `ring brightness crossed ${crossed.toFixed(1)} of a ${swing.toFixed(1)} level swing while blocked; longest hold ${Math.round(stall)}ms, natural turn ${natural.toFixed(0)}ms (allowed ${allowed.toFixed(0)}ms)`
        if (swing < 6 || crossed < 0.4 * swing || stall > allowed) failure = detail
      }
      if (failure) {
        // On a failure, the recording and the per-frame numbers are kept in the results folder (CI uploads it).
        mkdirSync(testInfo.outputDir, { recursive: true })
        copyFileSync(file, testInfo.outputPath('recording.webm'))
        writeFileSync(testInfo.outputPath('frames.json'), JSON.stringify({ red, ms, change: read.change, brightness: read.brightness, flag: read.flag }, null, 1))
      }
      expect(failure, detail).toBe('')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
}

test('centered on cap height within 0.5px at 14/15/17/20px text', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=spinner&theme=light')
  await page.evaluate(() => document.fonts.ready)
  const offsets = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('p[data-px]')].map((line) => {
    const ring = line.querySelector('.diya-spinner')!.getBoundingClientRect()
    const baseline = line.querySelector('.sp-base')!.getBoundingClientRect().bottom
    const context = document.createElement('canvas').getContext('2d')!
    context.font = getComputedStyle(line).font
    const cap = context.measureText('H').actualBoundingBoxAscent
    return { px: line.dataset.px, off: ring.top + ring.height / 2 - (baseline - cap / 2) }
  }))
  expect(offsets.map(({ px }) => px)).toEqual(['14', '15', '17', '20'])
  for (const { px, off } of offsets) expect(Math.abs(off), `${px}px text: ${off.toFixed(2)}px off`).toBeLessThanOrEqual(0.5)
})

// K4 (VIS-S78-03): beside words, a quarter em of air on each side; none with showLabel (its words
// sit 8px after the ring) and none in a Button.
test('a quarter em of air beside words, none with showLabel or in a Button', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=spinner&theme=light')
  const margins = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('p[data-px] .diya-spinner, #sp-words')].map((node) => {
    const style = getComputedStyle(node)
    return `${style.marginLeft} ${style.marginRight}`
  }))
  expect(margins).toEqual(['3.5px 3.5px', '3.75px 3.75px', '4.25px 4.25px', '5px 5px', '0px 0px'])
})
