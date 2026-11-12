// The toast stack's motion, from the states that hid the first bugs: an empty stack, a lone
// <Toast>, a real pointer reaching a toast, a toast leaving while another arrives, two providers,
// and Glass. Each spec samples every animation frame in the page (motion's review, Nov 12).
import { expect, test, type Page } from '@playwright/test'
import { engine, isPhone, openCase } from './helpers'

type Box = { title: string; top: number; bottom: number; left: number; right: number; opacity: number; waapi: number }

/** Every frame for `ms` after `start()` runs in the page: each live toast's box, opacity and WAAPI count, and every exit copy. */
async function frames(page: Page, start: string, ms = 450) {
  return page.evaluate(async ([start, ms]) => {
    const read = () => {
      const live = [...document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')].filter((slot) => slot.querySelector('.diya-alert')).map((slot) => {
        const box = slot.getBoundingClientRect()
        return {
          title: slot.querySelector('.diya-alert-title')?.textContent ?? '',
          top: box.top, bottom: box.bottom, left: box.left, right: box.right,
          opacity: Number(getComputedStyle(slot).opacity),
          waapi: slot.getAnimations().filter((animation) => !('transitionProperty' in animation)).length,
        }
      })
      const copies = [...document.querySelectorAll<HTMLElement>('.diya-toast-copies > *')].map((copy) => {
        const box = copy.getBoundingClientRect()
        return { title: copy.querySelector('.diya-alert-title')?.textContent ?? '', top: box.top, bottom: box.bottom, left: box.left, right: box.right, opacity: Number(getComputedStyle(copy).opacity), waapi: 0 }
      })
      return { live, copies }
    }
    const out: { t: number; live: Box[]; copies: Box[] }[] = []
    const t0 = performance.now()
    // eslint-disable-next-line no-new-func
    new Function(start as string)()
    await new Promise<void>((done) => {
      const tick = () => {
        out.push({ t: performance.now() - t0, ...read() })
        if (performance.now() - t0 < (ms as number)) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
    return out
  }, [start, ms] as const)
}
const restTop = async (page: Page, title: string) => page.evaluate((title) => [...document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')].find((slot) => slot.querySelector('.diya-alert-title')?.textContent === title)!.getBoundingClientRect().top, title)
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
const settle = (page: Page) => page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 5000 })

test.describe('toast motion from an empty stack', () => {
  test('a lone <Toast> rises exactly 12px, with no shift of its own', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    const track = await frames(page, "window.comps.add({ title: 'Draft saved', description: 'Saved a moment ago.' })", 400)
    const seen = track.filter((frame) => frame.live.length)
    const rest = seen.at(-1)!.live[0].top
    // The first frame it shows, it's at most 12px below its resting place (1.1.1: 12px).
    expect(seen[0].live[0].top - rest).toBeLessThanOrEqual(13)
    expect(Math.max(...seen.map((frame) => frame.live[0].top - rest))).toBeLessThanOrEqual(13)
    expect(seen.some((frame) => frame.live[0].waapi > 0)).toBe(false)
  })

  test('the first toast never goes below its resting place when a second arrives', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
    await settle(page)
    const rest = await restTop(page, 'Link copied')
    const track = await frames(page, "window.diya.toast({ title: 'Export started', description: 'We\\'ll email you when it\\'s ready.', duration: 0 })", 450)
    const tops = track.map((frame) => frame.live.find((box) => box.title === 'Link copied')?.top).filter((top): top is number => top !== undefined)
    expect(Math.max(...tops)).toBeLessThanOrEqual(rest + 0.5)
  })

  test('the pointer and F8 reaching a lone toast start no animation, and a human-paced click lands', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
    await settle(page)
    const close = page.getByRole('button', { name: 'Dismiss: Link copied' })
    const box = (await close.boundingBox())!
    const rest = await restTop(page, 'Link copied')
    // A real pointer, at a person's pace.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    const track = await frames(page, '', 200)
    expect(track.every((frame) => frame.live.every((toast) => toast.waapi === 0 && Math.abs(toast.top - rest) < 0.5))).toBe(true)
    await page.waitForTimeout(120)
    await page.mouse.down()
    await page.waitForTimeout(80)
    await page.mouse.up()
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
    // F8 on a fresh lone toast.
    await page.mouse.move(5, 5)
    await page.evaluate(() => (window as any).diya.toast({ title: 'Draft saved', duration: 0 }))
    await settle(page)
    const restF8 = await restTop(page, 'Draft saved')
    await page.focus('input')
    const f8 = await frames(page, "document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }))", 200)
    expect(f8.every((frame) => frame.live.every((toast) => toast.waapi === 0 && Math.abs(toast.top - restF8) < 0.5))).toBe(true)
  })
})
