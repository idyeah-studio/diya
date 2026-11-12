// The toast() stack in real engines: in the top layer, it holds still when a Dialog or Drawer
// opens over it, stays clickable inside the modal, keeps the text color, slides when a toast
// leaves from the middle, falls back to 1.1's fixed layer without the Popover API, and passes axe.
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { engine, isPhone, openCase } from './helpers'

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const titles = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.diya-toast-list > .diya-toast .diya-alert-title')].map((node) => node.textContent))

async function twoToasts(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect.poll(() => titles(page)).toEqual(['Draft saved', 'Link copied'])
  await page.waitForTimeout(400)
}

for (const theme of ['light', 'glass-dark'] as const) {
  const query = theme === 'light' ? 'theme=light' : 'theme=dark&glass=1'
  test.describe(`toast() stack (${theme})`, () => {
    for (const modal of ['dialog', 'drawer'] as const) {
      test(`a ${modal} opening over two toasts: 0px off the corner on every frame, no replay, clickable`, async ({ page }, testInfo) => {
        await openCase(page, testInfo, `case=stack&${query}`)
        await twoToasts(page)
        const inset = isPhone(testInfo) ? 20 : 28
        await page.focus(`#open-${modal}`)
        const frames = await page.evaluate((modal) => new Promise<{ off: number; opacity: number; replay: boolean; top: boolean }[]>((done) => {
          const region = document.querySelector<HTMLElement>('.diya-toast-region')!
          const out: { off: number; opacity: number; replay: boolean; top: boolean }[] = []
          const start = performance.now()
          document.getElementById(`open-${modal}`)!.click()
          const tick = () => {
            const box = region.getBoundingClientRect()
            const toast = region.querySelector<HTMLElement>('.diya-toast')!
            const item = toast.getBoundingClientRect()
            const hit = document.elementFromPoint(item.right - 24, item.top + item.height / 2)
            out.push({
              off: Math.round(Math.abs(innerWidth - box.right) * 10) / 10,
              opacity: Number(getComputedStyle(toast).opacity),
              replay: toast.getAnimations().some((animation) => (animation as CSSTransition).transitionProperty === 'opacity'),
              top: !!hit && toast.contains(hit),
            })
            if (performance.now() - start < 320) requestAnimationFrame(tick)
            else done(out)
          }
          requestAnimationFrame(tick)
        }), modal)
        expect(new Set(frames.map((frame) => frame.off))).toEqual(new Set([inset]))
        expect(Math.min(...frames.map((frame) => frame.opacity))).toBe(1)
        expect(frames.some((frame) => frame.replay)).toBe(false)
        expect(frames.every((frame) => frame.top)).toBe(true)
        expect(await page.evaluate(() => !!document.querySelector('dialog[open] .diya-toast-host'))).toBe(true)
        // A real pointer click on a toast while the modal is open.
        await page.getByRole('button', { name: 'Dismiss: Link copied' }).click()
        await expect.poll(() => titles(page)).toEqual(['Draft saved'])
        await expect(page.locator('dialog[open]')).toHaveCount(1)
      })
    }

    test('Esc on a toast inside a Dialog closes only the toast', async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=stack&${query}`)
      await page.focus('#open-dialog')
      await page.keyboard.press('Enter')
      await page.locator('dialog[open]').waitFor()
      await page.getByRole('button', { name: 'Toast inside' }).first().click()
      await expect.poll(() => titles(page)).toEqual(['Saved in the dialog'])
      await page.keyboard.press('F8')
      await expect(page.getByRole('button', { name: 'Dismiss: Saved in the dialog' })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect.poll(() => titles(page)).toEqual([])
      await expect(page.locator('dialog[open]')).toHaveCount(1)
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true)
    })

    test("opening a Dialog with toasts showing keeps the Dialog's initial focus", async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=stack&${query}`)
      await twoToasts(page)
      await page.focus('#open-dialog')
      await page.keyboard.press('Enter')
      await page.locator('dialog[open]').waitFor()
      await page.waitForTimeout(300)
      const focus = await page.evaluate(() => ({ inDialog: !!document.activeElement?.closest('dialog[open]'), inToast: !!document.activeElement?.closest('.diya-toast') }))
      expect(focus).toEqual({ inDialog: true, inToast: false })
    })

    test('the stack inherits the text color, not CanvasText', async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=stack&${query}`)
      await twoToasts(page)
      const colors = await page.evaluate(() => ({
        text: getComputedStyle(document.querySelector('.diya-root')!).color,
        title: getComputedStyle(document.querySelector('.diya-toast .diya-alert-title')!).color,
        region: getComputedStyle(document.querySelector('.diya-toast-region')!).color,
        background: getComputedStyle(document.querySelector('.diya-toast-region')!).backgroundColor,
      }))
      expect(colors.title).toBe(colors.text)
      expect(colors.region).toBe(colors.text)
      expect(colors.background).toBe('rgba(0, 0, 0, 0)')
    })

    test('a toast leaving from the middle: the copy sits under the live toasts and the others slide', async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=stack&${query}`)
      // Three on a desktop, leaving from the middle; two on a phone, the newer leaving.
      const phone = isPhone(testInfo)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByRole('button', { name: 'Copy link' }).click()
      if (!phone) await page.getByRole('button', { name: 'Export' }).click()
      await expect.poll(() => titles(page)).toEqual(phone ? ['Draft saved', 'Link copied'] : ['Draft saved', 'Link copied', 'Export started'])
      await page.waitForTimeout(400)
      const track = await page.evaluate(() => new Promise<{ tops: number[]; copyUnder: boolean[]; frames: number[] }>((done) => {
        const first = document.querySelector<HTMLElement>('.diya-toast-list > .diya-toast')!
        const middle = document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')[1]
        const tops: number[] = []
        const copyUnder: boolean[] = []
        const frames: number[] = []
        const start = performance.now()
        let last = start
        middle.querySelector<HTMLButtonElement>('.diya-alert-dismiss')!.click()
        const tick = (now: number) => {
          frames.push(now - last)
          last = now
          tops.push(first.getBoundingClientRect().top)
          const copy = document.querySelector<HTMLElement>('.diya-toast-copies > *')
          if (copy) {
            const box = copy.getBoundingClientRect()
            const hit = document.elementFromPoint(box.left + 30, box.top + 6)
            copyUnder.push(!copy.contains(hit))
          }
          if (now - start < 450) requestAnimationFrame(tick)
          else done({ tops, copyUnder, frames: frames.slice(1) })
        }
        requestAnimationFrame(tick)
      }))
      const steps = track.tops.slice(1).map((top, index) => Math.abs(top - track.tops[index]))
      const moved = Math.abs(track.tops.at(-1)! - track.tops[0])
      // It moves by a whole toast plus 12px, in steps, not in one jump.
      expect(moved).toBeGreaterThan(60)
      expect(Math.max(...steps)).toBeLessThan(moved * 0.6)
      expect(track.copyUnder.length).toBeGreaterThan(0)
      expect(track.copyUnder.every(Boolean)).toBe(true)
    })

    test('an axe check with the stack open', async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=stack&${query}`)
      await twoToasts(page)
      await page.getByRole('button', { name: 'Archive' }).click()
      await expect.poll(() => titles(page)).toHaveLength(isPhone(testInfo) ? 2 : 3)
      // After the enter: mid-fade text would read as low contrast.
      await page.waitForFunction(() => document.getAnimations().length === 0)
      await page.addScriptTag({ path: axePath })
      const violations = await page.evaluate(async () => {
        // WCAG A and AA, page-wide with the stack open (the harness page itself has no main
        // landmark or h1, which are best-practice rules about the app, not the stack).
        const result = await (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
        return result.violations.map((violation) => `${violation.id}: ${(violation.nodes as { target: string[] }[]).map((node) => node.target.join(' ')).join(', ')}`)
      })
      expect(violations).toEqual([])
    })
  })
}

test('the shift holds every frame at 4x CPU (Chromium)', async ({ page }, testInfo) => {
  test.skip(engine(testInfo) !== 'chromium' || isPhone(testInfo), 'CPU throttling is a Chromium tool')
  await openCase(page, testInfo, 'case=stack&theme=dark&glass=1')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  for (const name of ['Save', 'Copy link', 'Export']) await page.getByRole('button', { name, exact: true }).click()
  await expect.poll(() => titles(page)).toHaveLength(3)
  await page.waitForTimeout(600)
  const frames = await page.evaluate(() => new Promise<number[]>((done) => {
    const out: number[] = []
    let last = performance.now()
    const start = last
    document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')[1].querySelector<HTMLButtonElement>('.diya-alert-dismiss')!.click()
    const tick = (now: number) => { out.push(now - last); last = now; if (now - start < 450) requestAnimationFrame(tick); else done(out.slice(1)) }
    requestAnimationFrame(tick)
  }))
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  testInfo.annotations.push({ type: 'frames', description: `${frames.length} frames, longest ${Math.round(Math.max(...frames))}ms, over 20ms: ${frames.filter((frame) => frame > 20).length}` })
  // On a quiet machine this is 0 frames over 20ms; a busy CI runner gets some slack.
  expect(frames.filter((frame) => frame > (process.env.CI ? 50 : 20)).length).toBeLessThanOrEqual(process.env.CI ? 2 : 0)
})

test.describe('without the Popover API', () => {
  test('the stack keeps 1.1\'s fixed position and works inside a Dialog', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=stack&theme=light&nopopover=1')
    await twoToasts(page)
    const inset = isPhone(testInfo) ? '20px' : '28px'
    const style = await page.evaluate(() => { const region = document.querySelector<HTMLElement>('.diya-toast-region')!; const style = getComputedStyle(region); return { popover: region.hasAttribute('popover'), position: style.position, zIndex: style.zIndex, right: style.right, bottom: style.bottom } })
    expect(style).toEqual({ popover: false, position: 'fixed', zIndex: '1200', right: inset, bottom: inset })
    await page.focus('#open-dialog')
    await page.keyboard.press('Enter')
    await page.locator('dialog[open]').waitFor()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Dismiss: Link copied' }).click()
    await expect.poll(() => titles(page)).toEqual(['Draft saved'])
  })
})

test.describe('<Toast> in the stack', () => {
  test('two <Toast>s stack 12px apart instead of overlapping, and share the stack with toast()', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=toasts&theme=light')
    await expect.poll(() => titles(page)).toEqual(['Draft saved', 'Link copied'])
    await page.waitForTimeout(400)
    const boxes = await page.evaluate(() => [...document.querySelectorAll('.diya-toast-list > .diya-toast')].map((slot) => { const box = slot.getBoundingClientRect(); return { top: Math.round(box.top), bottom: Math.round(box.bottom) } }))
    expect(boxes[1].top - boxes[0].bottom).toBe(12)
    await page.getByRole('button', { name: 'Export' }).click()
    // Two <Toast>s fill a phone's two places, so there the toast() waits; <Toast>s always show.
    await page.waitForTimeout(300)
    expect(await titles(page)).toEqual(isPhone(testInfo) ? ['Draft saved', 'Link copied'] : ['Draft saved', 'Link copied', 'Export started'])
  })

  test('a <Toast> in a nested Dark provider shares the one stack, in that provider\'s theme', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=toasts&theme=light&nested=1')
    // One corner, one column (T4); each toast in its own provider's theme (B1).
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast .diya-alert').length)).toBe(3)
    expect(await page.evaluate(() => document.querySelectorAll('.diya-toast-list').length)).toBe(1)
    const theme = await page.evaluate(() => [...document.querySelectorAll('.diya-toast-list > .diya-toast')].map((slot) => `${slot.querySelector('.diya-alert-title')?.textContent}:${slot.querySelector('.diya-alert')!.closest('.diya-root')?.getAttribute('data-theme')}`))
    expect(theme.sort()).toEqual(['Draft saved:light', 'Link copied:light', 'Synced:dark'])
  })
})
