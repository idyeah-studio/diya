// Spinner (1.2) in a real browser: the 400ms beat and its fade, the turn surviving a busy main
// thread (MOT-1.2-01/02), and the ring centered on the cap height of the text beside it.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { isPhone, isReact18, openCase } from './helpers'

// Playwright's own ffmpeg (installed with its browsers) and PNG reader decode the recorded video:
// screenshots wait for the main thread, so only a recording sees a page that is busy.
const fromPlaywright = createRequire(createRequire(realpathSync(createRequire(import.meta.url).resolve('@playwright/test'))).resolve('playwright'))
const ffmpeg = () => (fromPlaywright('playwright-core/lib/server/registry/index') as { registry: { findExecutable(name: string): { executablePathOrDie(language: string): string } } }).registry.findExecutable('ffmpeg').executablePathOrDie('javascript')
const { PNG } = fromPlaywright('playwright-core/lib/utilsBundle') as { PNG: { sync: { read(buffer: Buffer): { data: Buffer } } } }

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
      const frames = (crop: number[], name: string) => {
        const out = join(dir, name)
        mkdirSync(out)
        execFileSync(ffmpeg(), ['-loglevel', 'error', '-i', file, '-vsync', 'passthrough', '-vf', `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}`, join(out, '%05d.png')])
        return readdirSync(out).sort().map((frame) => PNG.sync.read(readFileSync(join(out, frame))).data)
      }
      // The flag is red for the whole block.
      const red = frames([flag[0] + 6, flag[1] + 6, 12, 12], 'flag').map((data, index) => {
        let r = 0, g = 0
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1] }
        return r / (data.length / 4) > 150 && g / (data.length / 4) < 100 ? index : -1
      }).filter((index) => index >= 0)
      const rings = frames(ring, 'ring')
      expect(red.length, 'frames while blocked').toBeGreaterThan(30)
      let changed = 0, total = 0
      for (let index = red[0] + 2; index <= red.at(-1)! - 1; index++) {
        const [a, b] = [rings[index - 1], rings[index]]
        let difference = 0
        for (let i = 0; i < a.length; i += 4) difference += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
        total++
        if (difference / (a.length / 4) > 1) changed++
      }
      // A turn changes every frame; a breathe slows at its ends, so most frames.
      expect(changed / total, `${changed}/${total} frames changed while blocked`).toBeGreaterThan(motion === 'system' ? 0.9 : 0.6)
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
