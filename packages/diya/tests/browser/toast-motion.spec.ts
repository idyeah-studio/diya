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
    // The first frame it shows, it's 12px below its resting place, as in 1.1.1: never more, and
    // at least 11px, so the rise is really there (R11). WebKit's headless frames come about 50ms
    // apart, so its first sample is already on the way (1.1.1 measures the same, 9–11px).
    expect(seen[0].live[0].top - rest).toBeLessThanOrEqual(13)
    expect(seen[0].live[0].top - rest).toBeGreaterThanOrEqual(engine(testInfo) === 'webkit' ? 5 : 11)
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
    // A real F8 key (R11).
    await startFrames(page, 200)
    await page.keyboard.press('F8')
    const f8 = await endFrames(page)
    await expect(page.getByRole('button', { name: 'Dismiss: Draft saved' })).toBeFocused()
    expect(f8.every((frame) => frame.live.every((toast) => toast.waapi === 0 && Math.abs(toast.top - restF8) < 0.5))).toBe(true)
  })
})

test.describe('timers after the last toast goes', () => {
  test('closing the last toast with the pointer leaves later toasts timing out', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
    await settle(page)
    const close = page.getByRole('button', { name: 'Dismiss: Link copied' })
    const box = (await close.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 })
    await page.mouse.down()
    await page.mouse.up()
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
    await page.mouse.move(5, 5, { steps: 3 })
    await page.evaluate(() => (window as any).diya.toast({ title: 'Settings saved', duration: 1500 }))
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length), { timeout: 4000 }).toBe(1)
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length), { timeout: 4000 }).toBe(0)
  })

  test('a focused toast button that disappears leaves later toasts timing out', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => (window as any).diya.toast({ title: '3 emails archived', action: { label: 'Undo', onClick() {} } }))
    await settle(page)
    await page.keyboard.press('F8')
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
    await page.evaluate(() => (window as any).diya.toast({ title: 'Settings saved', duration: 1500 }))
    await page.waitForTimeout(300)
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length), { timeout: 4000 }).toBe(0)
  })

  test('a <Toast> its app unmounts from its own action leaves later toasts timing out', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => { const comps = (window as any).comps; const key = comps.add({ title: 'Comment deleted', action: { label: 'Undo', onClick: () => setTimeout(() => comps.remove(key)) } }) })
    await settle(page)
    await page.keyboard.press('F8')
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
    await page.evaluate(() => (window as any).diya.toast({ title: 'Settings saved', duration: 1500 }))
    await page.waitForTimeout(300)
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length), { timeout: 4000 }).toBe(0)
  })
})

test.describe('an exit copy starts where its toast was', () => {
  test('a full stack plus one: the leaving toast\'s copy starts at its resting top', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    const full = isPhone(testInfo) ? ['Draft saved', 'Link copied'] : ['Draft saved', 'Link copied', 'Export started']
    for (const title of full) {
      await page.evaluate((title) => (window as any).diya.toast({ title, duration: 0 }), title)
      await settle(page)
    }
    const rest = await restTop(page, 'Draft saved')
    const track = await frames(page, "window.diya.toast({ title: 'Invite sent', duration: 0 })", 120)
    const first = track.find((frame) => frame.copies.some((copy) => copy.title === 'Draft saved'))!
    expect(Math.abs(first.copies.find((copy) => copy.title === 'Draft saved')!.top - rest)).toBeLessThanOrEqual(1)
  })
})

test.describe('an exit copy starts where its toast was, with a <Toast> newcomer (R11)', () => {
  test('a full stack plus a <Toast>: the leaving toast\'s copy starts at its resting top', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    const full = isPhone(testInfo) ? ['Draft saved', 'Link copied'] : ['Draft saved', 'Link copied', 'Export started']
    for (const title of full) {
      await page.evaluate((title) => (window as any).diya.toast({ title, duration: 0 }), title)
      await settle(page)
    }
    const rest = await restTop(page, 'Draft saved')
    // A <Toast> takes two commits (its empty place, then its content).
    const track = await frames(page, "window.comps.add({ title: 'Comment posted' })", 150)
    const first = track.find((frame) => frame.copies.some((copy) => copy.title === 'Draft saved'))!
    expect(Math.abs(first.copies.find((copy) => copy.title === 'Draft saved')!.top - rest)).toBeLessThanOrEqual(1)
  })
})

test.describe('toasts from several providers', () => {
  test('two providers\' toasts never overlap: one corner, one column, 12px apart', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&nested=1')
    await page.evaluate(() => { (window as any).comps.add({ title: 'Draft saved', description: 'Saved a moment ago.' }) })
    await settle(page)
    await page.evaluate(() => { (window as any).nested.add({ title: 'Synced', description: 'From the dark region.' }) })
    await settle(page)
    if (!isPhone(testInfo)) {
      await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
      await settle(page)
    }
    const boxes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.diya-alert')].filter((alert) => !alert.closest('[aria-hidden="true"]')).map((alert) => {
      const box = alert.closest('.diya-toast')!.getBoundingClientRect()
      return { title: alert.querySelector('.diya-alert-title')!.textContent, theme: alert.closest('.diya-root')!.getAttribute('data-theme'), top: box.top, bottom: box.bottom, left: box.left, right: box.right }
    }).sort((a, b) => a.top - b.top))
    expect(boxes.map((box) => box.title)).toEqual(isPhone(testInfo) ? ['Draft saved', 'Synced'] : ['Draft saved', 'Synced', 'Link copied'])
    expect(boxes.find((box) => box.title === 'Synced')!.theme).toBe('dark')
    for (let i = 1; i < boxes.length; i++) {
      expect(Math.round(boxes[i].top - boxes[i - 1].bottom)).toBe(12)
      expect(boxes[i].left).toBe(boxes[0].left)
    }
  })

  test('a nested Dark provider\'s toast under an outer Glass provider reads at 4.5:1 or more', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&glass=1&nested=1')
    await page.evaluate(() => { (window as any).nested.add({ title: 'Synced', description: 'From the dark region.' }) })
    await settle(page)
    const ratio = await page.evaluate(() => {
      const alert = [...document.querySelectorAll<HTMLElement>('.diya-toast-list .diya-alert')].find((node) => node.querySelector('.diya-alert-title')?.textContent === 'Synced')!
      const rgb = (value: string) => {
        const srgb = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/.exec(value)
        if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])]
        const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(value)!
        return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])]
      }
      const lum = ([r, g, b]: number[]) => [r, g, b].map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
      const fill = rgb(getComputedStyle(alert).backgroundColor)
      // Over a white page, the worst case for light text on a see-through pane.
      const shown = fill.slice(0, 3).map((c) => c * fill[3] + 255 * (1 - fill[3]))
      const text = rgb(getComputedStyle(alert.querySelector('.diya-alert-title')!).color)
      const [a, b] = [lum(text), lum(shown)].sort((x, y) => y - x)
      return (a + 0.05) / (b + 0.05)
    })
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

test.describe("a <Toast> in an app's own showModal() dialog", () => {
  for (const first of [false, true]) {
    test(`is inside the dialog, topmost, clickable and reachable by F8${first ? ', with a toast already showing' : ''}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, 'case=probe&theme=light')
      if (first) {
        await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
        await settle(page)
      }
      await page.evaluate(() => (window as any).openNative())
      await page.locator('#native-save').click()
      const undo = page.getByRole('button', { name: 'Undo native' })
      await undo.waitFor()
      await settle(page)
      expect(await undo.evaluate((node) => !!node.closest('dialog#native'))).toBe(true)
      expect(await page.evaluate(() => !!document.querySelector('dialog#native .diya-toast-host > [aria-live]'))).toBe(true)
      const box = (await undo.boundingBox())!
      expect(await undo.evaluate((node, [x, y]) => { const top = document.elementFromPoint(x, y); return !!top && node.contains(top) }, [box.x + box.width / 2, box.y + box.height / 2])).toBe(true)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect.poll(() => page.evaluate(() => (window as any).__log.some((entry: { event: string }) => entry.event === 'undo-native'))).toBe(true)
      // F8 reaches the toast inside the dialog.
      await page.evaluate(() => { (window as any).__log.length = 0 })
      await page.locator('#native-save').click()
      await page.getByRole('button', { name: 'Undo native' }).waitFor()
      await page.focus('#native-save')
      await page.keyboard.press('F8')
      await expect(page.getByRole('button', { name: 'Undo native' })).toBeFocused()
    })
  }
})

test.describe('nothing see-through passes over something visible', () => {
  const check = (track: Awaited<ReturnType<typeof frames>>, arriving?: string) => {
    for (const frame of track) {
      for (const copy of frame.copies.filter((item) => item.opacity > 0.05)) {
        for (const toast of frame.live) expect(overlap(toast, copy), `${toast.title} over the copy of ${copy.title} at ${Math.round(frame.t)}ms`).toBe(0)
      }
      if (!arriving) continue
      const enter = frame.live.find((item) => item.title === arriving)
      if (!enter || enter.opacity <= 0.02) continue
      for (const toast of frame.live.filter((item) => item !== enter)) expect(overlap(toast, enter), `${arriving} under ${toast.title} at ${Math.round(frame.t)}ms`).toBe(0)
    }
  }
  for (const theme of ['light', 'dark']) {
    test(`arrival, leaving from the middle and a full stack plus one, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      const add = (title: string, description?: string) => page.evaluate(([title, description]) => (window as any).diya.toast({ id: title, title, description, duration: 0 }), [title, description])
      await add('Draft saved')
      await settle(page)
      // Arrival into a stack that shows a toast.
      check(await frames(page, "window.diya.toast({ id: 'Export started', title: 'Export started', description: 'We\\'ll email you when it\\'s ready.', duration: 0 })", 450), 'Export started')
      await settle(page)
      if (!isPhone(testInfo)) {
        await add('Link copied')
        await settle(page)
        // Leaving from the middle.
        check(await frames(page, "window.diya.toast.dismiss('Export started')", 450))
        await settle(page)
        await add('Invite sent')
        await settle(page)
      }
      // A full stack plus one: the oldest leaves to make room while the newcomer arrives.
      check(await frames(page, "window.diya.toast({ id: 'Synced', title: 'Synced', duration: 0 })", 500), 'Synced')
    })
  }
})

test('a same-id update that grows: the updated toast gets no shift of its own', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light')
  await page.evaluate(() => (window as any).diya.toast({ id: 'upload', title: 'Uploading', duration: 0 }))
  await settle(page)
  await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
  await settle(page)
  const track = await frames(page, "window.diya.toast({ id: 'upload', title: 'Uploaded', description: 'All 12 files are in Billing, ready to share.', duration: 0 })", 300)
  expect(track.every((frame) => (frame.live.find((item) => item.title === 'Uploaded')?.waapi ?? 0) === 0)).toBe(true)
})

test.describe('the keyboard in the stack (T12)', () => {
  const focused = (page: Page) => page.evaluate(() => { const node = document.activeElement as HTMLElement; return node === document.body ? 'BODY' : node instanceof HTMLInputElement ? `input:${node.value}` : node.getAttribute('aria-label') ?? node.textContent })
  test('after F8, Tab walks the toasts newest to oldest, then back to where F8 was pressed', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'three toasts need the desktop limit')
    // WebKit's Tab skips buttons unless the reader turns that on; Option+Tab reaches them, as in
    // Safari, and the page sees a Tab key (R11).
    const tab = engine(testInfo) === 'webkit' ? 'Alt+Tab' : 'Tab'
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => { const { toast } = (window as any).diya; toast({ title: 'Draft saved', duration: 0 }); toast({ title: '3 emails archived', action: { label: 'Undo', onClick() {} } }) })
    await page.evaluate(() => { (window as any).comps.add({ title: 'Comment posted' }) })
    await settle(page)
    await page.getByRole('textbox', { name: 'Project name' }).focus()
    await page.keyboard.press('F8')
    const order = [await focused(page)]
    for (let i = 0; i < 4; i++) { await page.keyboard.press(tab); order.push(await focused(page)) }
    expect(order).toEqual(['Dismiss: Comment posted', 'Undo', 'Dismiss: 3 emails archived', 'Dismiss: Draft saved', 'input:Atlas'])
    await page.keyboard.press('F8')
    await page.keyboard.press(`Shift+${tab}`)
    expect(await focused(page)).toBe('input:Atlas')
  })

  test('Escape on a <Toast> goes back to where F8 was pressed, not where the toast was raised', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.focus('#open-dialog')
    await page.evaluate(() => { (window as any).comps.add({ title: 'Row deleted', action: { label: 'Undo', onClick() {} } }) })
    await settle(page)
    await page.getByRole('textbox', { name: 'Project name' }).focus()
    await page.keyboard.press('F8')
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox', { name: 'Project name' })).toBeFocused()
  })

  test('closing a focused toast moves focus to the toast beside it', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => { const { toast } = (window as any).diya; for (const title of ['Draft saved', 'Link copied', 'Export started']) toast({ title, duration: 0 }) })
    await settle(page)
    await page.getByRole('textbox', { name: 'Project name' }).focus()
    await page.keyboard.press('F8')
    await expect(page.getByRole('button', { name: 'Dismiss: Export started' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Dismiss: Link copied' })).toBeFocused()
  })
})

// Round 2. Plain Tab follows the page's order through the stack and on out of it; only an F8
// walk takes Tab over, and it ends when focus leaves the stack (R1). WebKit's Tab skips buttons
// unless the reader turns that on, so it walks with Option+Tab, as Safari's readers do.
test.describe('Tab without F8 (R1)', () => {
  const where = (page: Page) => page.evaluate(() => { const node = document.activeElement as HTMLElement | null; return !node || node === document.body ? 'BODY' : node instanceof HTMLInputElement ? `input:${node.value}` : node.getAttribute('aria-label') ?? node.textContent ?? node.id })
  const tab = (page: Page, testInfo: Parameters<Parameters<typeof test>[1]>[1], shift = false) => page.keyboard.press(`${shift ? 'Shift+' : ''}${engine(testInfo) === 'webkit' ? 'Alt+' : ''}Tab`)
  // Two toasts, and a control after the provider: the next stop in the page's order once the
  // stack is passed (past it, focus would leave for the browser).
  const raise = (page: Page) => page.evaluate(() => {
    const after = document.createElement('button')
    after.id = 'after'
    after.textContent = 'After the app'
    document.body.append(after)
    const { toast } = (window as any).diya
    toast({ title: 'Older', duration: 0 })
    toast({ title: 'Newer', action: { label: 'Undo', onClick() {} } })
  })

  test('Tab from the page\'s last control, with two toasts, reaches both and then goes on past the stack', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await raise(page)
    await settle(page)
    await page.focus('#open-dialog')
    const order: string[] = []
    for (let i = 0; i < 4; i++) { await tab(page, testInfo); order.push(await where(page)) }
    expect(order).toEqual(['Dismiss: Older', 'Undo', 'Dismiss: Newer', 'After the app'])
  })

  test('after an F8 walk, Tab from the page\'s end doesn\'t go back to where F8 was pressed', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await raise(page)
    await settle(page)
    await page.getByRole('textbox', { name: 'Project name' }).focus()
    await page.keyboard.press('F8')
    expect(await where(page)).toBe('Undo')
    // The walk: newest to oldest, then back to the field, where it ends.
    for (let i = 0; i < 3; i++) await tab(page, testInfo)
    expect(await where(page)).toBe('input:Atlas')
    await page.focus('#open-dialog')
    const order: string[] = []
    for (let i = 0; i < 4; i++) { await tab(page, testInfo); order.push(await where(page)) }
    expect(order).toEqual(['Dismiss: Older', 'Undo', 'Dismiss: Newer', 'After the app'])
  })
})

// A <Toast> keeps its own provider's motion in the page's one stack, as it did in 1.1.1: its
// enter, its exit copy and its duration scale. The column's shifts are the page's (R2).
test.describe("a nested provider's motion reaches its <Toast> (R2)", () => {
  const add = "window.nested.add({ title: 'Synced', description: 'From the dark region.' })"
  test('motion="off": opaque and in place on its first frame, and no exit copy', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&nested=1&nestedmotion=off')
    const track = await frames(page, add, 300)
    const seen = track.filter((frame) => frame.live.some((box) => box.title === 'Synced'))
    const rest = seen.at(-1)!.live.find((box) => box.title === 'Synced')!.top
    const first = seen[0].live.find((box) => box.title === 'Synced')!
    expect(first.opacity).toBeGreaterThan(0.99)
    expect(Math.abs(first.top - rest)).toBeLessThan(0.5)
    const leave = await frames(page, "document.querySelector('[aria-label=\"Dismiss: Synced\"]').click()", 200)
    expect(leave.every((frame) => frame.copies.length === 0)).toBe(true)
  })

  test('motion="reduced": fades in place, with no rise', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&nested=1&nestedmotion=reduced')
    const track = await frames(page, add, 400)
    const seen = track.filter((frame) => frame.live.some((box) => box.title === 'Synced')).map((frame) => frame.live.find((box) => box.title === 'Synced')!)
    const rest = seen.at(-1)!.top
    expect(Math.max(...seen.map((box) => Math.abs(box.top - rest)))).toBeLessThan(0.5)
    expect(seen[0].opacity).toBeLessThan(0.9)
  })

  test('a duration scale of 4 on the nested provider: its enter takes about four times as long', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&nested=1&nestedscale=4')
    const track = await frames(page, add, 1200)
    const opaque = track.find((frame) => (frame.live.find((box) => box.title === 'Synced')?.opacity ?? 0) > 0.99)
    // At the page's own speed it's opaque by about 240ms; at 4× about 960ms.
    expect(opaque?.t ?? Infinity).toBeGreaterThan(700)
  })
})

// Round 2. Every frame, in Glass: no exit copy that still shows has a live toast over it, and a
// newcomer that shows never sits under another toast.
function seeThrough(track: Awaited<ReturnType<typeof frames>>, arriving?: string) {
  for (const frame of track) {
    for (const copy of frame.copies.filter((item) => item.opacity > 0.05)) {
      // A newcomer still waiting to show (opacity 0) isn't over anything.
      for (const toast of frame.live.filter((item) => item.opacity > 0.02)) expect(overlap(toast, copy), `${toast.title} over the copy of ${copy.title} at ${Math.round(frame.t)}ms`).toBe(0)
    }
    const enter = arriving ? frame.live.find((item) => item.title === arriving) : undefined
    if (!enter || enter.opacity <= 0.02) continue
    for (const toast of frame.live.filter((item) => item !== enter)) expect(overlap(toast, enter), `${arriving} under ${toast.title} at ${Math.round(frame.t)}ms`).toBe(0)
  }
}
/** No toast moves against its net direction: one that ends lower never rises on the way, one that ends higher never drops, and one that ends where it started never moves. */
function oneWay(track: Awaited<ReturnType<typeof frames>>, title: string) {
  const tops = track.map((frame) => frame.live.find((box) => box.title === title)?.top).filter((top): top is number => top !== undefined)
  const net = tops.at(-1)! - tops[0]
  if (Math.abs(net) < 0.5) {
    expect(Math.max(...tops.map((top) => Math.abs(top - tops[0]))), `${title} stays put`).toBeLessThan(1)
    return
  }
  for (let i = 1; i < tops.length; i++) {
    const step = tops[i] - tops[i - 1]
    expect(net > 0 ? step : -step, `${title} goes against its way at frame ${i}`).toBeGreaterThan(-0.5)
  }
}
/** Starts sampling every frame in the page, for actions taken with the real pointer. */
const startFrames = (page: Page, ms: number) => page.evaluate((ms) => {
  const read = () => ({
    live: [...document.querySelectorAll<HTMLElement>('.diya-toast-list > .diya-toast')].filter((slot) => slot.querySelector('.diya-alert')).map((slot) => {
      const box = slot.getBoundingClientRect()
      return { title: slot.querySelector('.diya-alert-title')?.textContent ?? '', top: box.top, bottom: box.bottom, left: box.left, right: box.right, opacity: Number(getComputedStyle(slot).opacity), waapi: slot.getAnimations().filter((animation) => !('transitionProperty' in animation)).length }
    }),
    copies: [...document.querySelectorAll<HTMLElement>('.diya-toast-copies > *')].map((copy) => {
      const box = copy.getBoundingClientRect()
      return { title: copy.querySelector('.diya-alert-title')?.textContent ?? '', top: box.top, bottom: box.bottom, left: box.left, right: box.right, opacity: Number(getComputedStyle(copy).opacity), waapi: 0 }
    }),
  })
  const out: unknown[] = []
  const t0 = performance.now()
  ;(window as any).__frames = new Promise((done) => {
    const tick = () => {
      out.push({ t: performance.now() - t0, ...read() })
      if (performance.now() - t0 < ms) requestAnimationFrame(tick)
      else done(out)
    }
    requestAnimationFrame(tick)
  })
}, ms)
const endFrames = (page: Page) => page.evaluate(() => (window as any).__frames) as ReturnType<typeof frames>

test.describe('two changes close together (R3)', () => {
  for (const theme of ['light', 'dark']) {
    test(`Undo that raises a toast: the older toast moves one way, and nothing see-through passes over the copy, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      await page.evaluate(() => {
        const { toast } = (window as any).diya
        toast({ title: 'Draft saved', duration: 0 })
        toast({ title: '3 emails archived', description: 'From Inbox.', action: { label: 'Undo', onClick: () => toast({ title: 'Emails restored', duration: 0 }) } })
      })
      await settle(page)
      const box = (await page.getByRole('button', { name: 'Undo' }).boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 })
      await startFrames(page, 650)
      await page.mouse.down()
      await page.mouse.up()
      const track = await endFrames(page)
      seeThrough(track, 'Emails restored')
      oneWay(track, 'Draft saved')
    })

    test(`toast.dismiss() and toast() in one tick: the older toast stays put, and the newcomer waits for the copy, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      await page.evaluate(() => { const { toast } = (window as any).diya; toast({ title: 'Draft saved', duration: 0 }); toast({ id: 'b', title: 'Link copied', duration: 0 }) })
      await settle(page)
      const track = await frames(page, "window.diya.toast.dismiss('b'); window.diya.toast({ title: 'Invoice sent', duration: 0 })", 600)
      seeThrough(track, 'Invoice sent')
      oneWay(track, 'Draft saved')
    })

    test(`a <Toast> closed, then a toast() 40ms later: one way, and no double image, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      await page.evaluate(() => (window as any).diya.toast({ title: 'Draft saved', duration: 0 }))
      await settle(page)
      await page.evaluate(() => { (window as any).comps.add({ title: 'Export started', description: "We'll email you when it's ready." }) })
      await settle(page)
      const track = await frames(page, "document.querySelector('[aria-label=\"Dismiss: Export started\"]').click(); setTimeout(() => window.diya.toast({ title: 'Invoice sent', duration: 0 }), 40)", 700)
      seeThrough(track, 'Invoice sent')
      oneWay(track, 'Draft saved')
    })
  }
})

// Round 2. The toast pushed out to make room isn't always the top one: action toasts never time
// out and are never pushed out, so the oldest without one often sits under them, or is the
// newest. Its copy fades where it is, and the newcomer waits for it (R4).
test.describe('a toast pushed out from under an action toast (R4)', () => {
  const undo = "{ label: 'Undo', onClick() {} }"
  for (const theme of ['light', 'dark']) {
    test(`the newest toast pushed out: no double image, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      // Phone (2): Undo, then a plain toast. Desktop (3): two with Undo, then a plain one.
      const actions = isPhone(testInfo) ? 1 : 2
      await page.evaluate(([actions, undo]) => {
        const { toast } = (window as any).diya
        for (let i = 0; i < Number(actions); i++) toast({ title: `${i + 3} emails archived`, action: new Function(`return ${undo}`)() })
        toast({ title: 'Link copied', description: 'Paste it anywhere.', duration: 0 })
      }, [actions, undo] as const)
      await settle(page)
      const track = await frames(page, "window.diya.toast({ title: 'Export started', description: 'We\\'ll email you when it\\'s ready.', duration: 0 })", 650)
      seeThrough(track, 'Export started')
      for (let i = 0; i < actions; i++) oneWay(track, `${i + 3} emails archived`)
    })

    test(`a toast pushed out from between action toasts: its copy doesn't ride up under them, in Glass ${theme}`, async ({ page }, testInfo) => {
      test.skip(isPhone(testInfo), 'two toasts fit on a phone; the newest-pushed-out case covers it')
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      await page.evaluate((undo) => {
        const { toast } = (window as any).diya
        toast({ title: '3 emails archived', action: new Function(`return ${undo}`)() })
        toast({ title: 'Link copied', duration: 0 })
        toast({ title: 'Report filed', action: new Function(`return ${undo}`)() })
      }, undo)
      await settle(page)
      const track = await frames(page, "window.diya.toast({ title: 'Invoice sent', duration: 0 })", 650)
      seeThrough(track, 'Invoice sent')
      oneWay(track, '3 emails archived')
      oneWay(track, 'Report filed')
    })
  }
})

// Round 2. The places focus returns to are forgotten when the stack empties, and one that can't
// take focus now (behind a modal) is skipped: a <Toast>'s action in a DIYA Dialog returns focus
// inside the Dialog, and Escape then closes the Dialog (QA's reproduction; R5).
test('after an earlier toast, a <Toast> action in a Dialog returns focus there, and Escape closes the Dialog (R5)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light')
  // A toast shows while the page's field has focus, then is closed with its close button.
  await page.evaluate(() => { (window as any).comps.add({ title: 'First' }) })
  await settle(page)
  await page.getByRole('textbox', { name: 'Project name' }).click()
  await page.getByRole('button', { name: 'Dismiss: First' }).click()
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
  // In the Dialog: the field, then a <Toast> with Undo, clicked.
  await page.locator('#open-dialog').click()
  const field = page.getByRole('textbox', { name: 'Task name' })
  await field.click()
  await page.evaluate(() => { (window as any).comps.add({ title: 'Saved', action: { label: 'Undo', onClick() {} } }) })
  await settle(page)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(field).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
})

test('Escape closes a toast() whose id starts with "c", and returns focus (R7)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light')
  await page.evaluate(() => (window as any).diya.toast({ id: 'copied', title: 'Link copied', duration: 0 }))
  await settle(page)
  await page.getByRole('textbox', { name: 'Project name' }).focus()
  await page.keyboard.press('F8')
  await expect(page.getByRole('button', { name: 'Dismiss: Link copied' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.diya-toast-list > .diya-toast').length)).toBe(0)
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeFocused()
})

// Round 2. A <Toast> arrives in two commits (its empty place, then its content), so the toast
// pushed out to make room has already started sliding when its copy is made. The copy carries
// that slide on, with the stack (MOT-R2-04; new in 1.2: 1.1.1 has no limit and no stack; R10).
test.describe('a <Toast> arriving into a full stack (R10)', () => {
  for (const theme of ['light', 'dark']) {
    test(`the riding copy keeps up with the stack, in Glass ${theme}`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
      const full = isPhone(testInfo) ? ['Draft saved', 'Link copied'] : ['Draft saved', 'Link copied', 'Export started']
      for (const title of full) {
        await page.evaluate((title) => (window as any).diya.toast({ title, description: 'One line under it.', duration: 0 }), title)
        await settle(page)
      }
      const track = await frames(page, "window.comps.add({ title: 'Comment posted', description: 'Everyone on the thread can see it.' })", 500)
      seeThrough(track, 'Comment posted')
      for (const title of full.slice(1)) oneWay(track, title)
    })
  }
})

// Round 2 (R11): the two-provider column frame by frame while the nested toast arrives, and
// what reduced, off and the duration scale do to an arrival.
test('a nested provider\'s <Toast> arriving under two outer toasts: no two toasts overlap on any frame (R11)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light&glass=1&bg=1&nested=1')
  await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
  await settle(page)
  if (!isPhone(testInfo)) {
    await page.evaluate(() => { (window as any).comps.add({ title: 'Draft saved', description: 'Saved a moment ago.' }) })
    await settle(page)
  }
  const track = await frames(page, "window.nested.add({ title: 'Synced', description: 'From the dark region.' })", 600)
  seeThrough(track, 'Synced')
  for (const frame of track) {
    const shown = frame.live.filter((box) => box.opacity > 0.02)
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) expect(overlap(shown[i], shown[j]), `${shown[i].title} and ${shown[j].title} at ${Math.round(frame.t)}ms`).toBe(0)
  }
  // Settled: one column, 12px apart, the nested toast in its own Dark look.
  const final = track.at(-1)!.live.sort((a, b) => a.top - b.top)
  for (let i = 1; i < final.length; i++) expect(Math.round(final[i].top - final[i - 1].bottom)).toBe(12)
})

test.describe('an arrival under each motion setting (R11)', () => {
  const arrive = async (page: Page) => {
    await page.evaluate(() => (window as any).diya.toast({ title: 'Link copied', duration: 0 }))
    await settle(page)
    const rest = await restTop(page, 'Link copied')
    const track = await frames(page, "window.diya.toast({ title: 'Export started', duration: 0 })", 700)
    return { rest, track, older: track.map((frame) => frame.live.find((box) => box.title === 'Link copied')!), newcomer: track.map((frame) => ({ t: frame.t, box: frame.live.find((box) => box.title === 'Export started') })).filter((item) => item.box) }
  }
  test('motion="off": nothing moves or fades; the older toast is in its new place at once', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&motion=off')
    const { older, newcomer } = await arrive(page)
    expect(new Set(older.map((box) => Math.round(box.top))).size).toBe(1)
    expect(older.every((box) => box.waapi === 0)).toBe(true)
    expect(newcomer.every((item) => item.box!.opacity > 0.99 && item.box!.waapi === 0)).toBe(true)
  })

  test('motion="reduced": no slide and no wait: the older toast jumps, the newcomer fades in place at once', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light&motion=reduced')
    const { older, newcomer } = await arrive(page)
    expect(new Set(older.map((box) => Math.round(box.top))).size).toBe(1)
    expect(older.every((box) => box.waapi === 0)).toBe(true)
    const rest = newcomer.at(-1)!.box!.top
    expect(Math.max(...newcomer.map((item) => Math.abs(item.box!.top - rest)))).toBeLessThan(0.5)
    // Fading from its first frames, with no make-room wait.
    expect(newcomer.find((item) => item.box!.opacity > 0.05)!.t).toBeLessThan(110)
  })

  for (const [scale, from, to] of [[2, 200, 300], [0.5, 40, 100]] as const) {
    test(`a duration scale of ${scale}: the newcomer waits ${120 * scale}ms for the slide, not 120ms`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=probe&theme=light&scale=${scale}`)
      const { newcomer } = await arrive(page)
      const shows = newcomer.find((item) => item.box!.opacity > 0.02)!.t
      expect(shows).toBeGreaterThan(from)
      expect(shows).toBeLessThan(to)
    })
  }
})

// Round 3. A <Toast> closed in the same tick as a toast() (the shape of an action handler: close
// this, say so) leaves at once: it never counts toward the limit, so no toast with room is pushed
// out, and no exit copy slides up through another copy that's still fading (VIS-R3-01; S1).
test.describe('a <Toast> closed in the same tick as a toast() (S1)', () => {
  const copiesApart = (track: Awaited<ReturnType<typeof frames>>) => {
    for (const frame of track) {
      const shown = frame.copies.filter((copy) => copy.opacity > 0.05)
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) expect(overlap(shown[i], shown[j]), `copies of ${shown[i].title} and ${shown[j].title} at ${Math.round(frame.t)}ms`).toBe(0)
    }
  }
  const setup = async (page: Page, testInfo: Parameters<Parameters<typeof test>[1]>[1], theme: string, action: boolean) => {
    await openCase(page, testInfo, `case=probe&theme=${theme}&glass=1&bg=1`)
    // The <Toast>'s action closes it and raises a toast(), as an app's handler would.
    await page.evaluate((action) => {
      const comps = (window as any).comps
      const key = comps.add({ title: 'Settings saved', ...(action ? { action: { label: 'Undo', onClick: () => { comps.remove(key); (window as any).diya.toast({ title: '3 emails archived', duration: 0 }) } } } : {}) })
    }, action)
    await settle(page)
    await page.evaluate(() => (window as any).diya.toast({ title: 'Draft saved', duration: 0 }))
    await settle(page)
  }
  const titles = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.diya-toast-list > .diya-toast .diya-alert-title')].map((node) => node.textContent))
  for (const theme of ['light', 'dark']) {
    test(`closed with its close button: the other toast stays, and no copy passes over another, in Glass ${theme}`, async ({ page }, testInfo) => {
      await setup(page, testInfo, theme, false)
      const track = await frames(page, "document.querySelector('[aria-label=\"Dismiss: Settings saved\"]').click(); window.diya.toast({ title: '3 emails archived', duration: 0 })", 650)
      seeThrough(track, '3 emails archived')
      copiesApart(track)
      await settle(page)
      expect(await titles(page)).toEqual(['Draft saved', '3 emails archived'])
    })

    test(`closed by its own action, which raises a toast(): the other toast stays, in Glass ${theme}`, async ({ page }, testInfo) => {
      await setup(page, testInfo, theme, true)
      const track = await frames(page, "[...document.querySelectorAll('button')].find((button) => button.textContent === 'Undo').click()", 650)
      seeThrough(track, '3 emails archived')
      copiesApart(track)
      await settle(page)
      expect(await titles(page)).toEqual(['Draft saved', '3 emails archived'])
    })
  }
})
