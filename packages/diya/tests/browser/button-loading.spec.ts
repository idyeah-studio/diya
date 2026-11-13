// Button loading (1.2, motion.md §2) in a real browser: the width never changes, the label slides
// over on the 400ms beat and the spinner fades in 8px before it, a quick load shows only the dim,
// an app's own padding, icon-only, and a Dialog footer on a phone.
import { expect, test, type Page } from '@playwright/test'
import { openCase } from './helpers'

type Frame = { t: number; boxes: { id: string; width: number; x: number; next: number | null; label: number | null; labelEnd: number | null; spinner: number | null; spinnerEnd: number | null; spinnerOpacity: number | null; opacity: number; icon: number | null }[] }

const grid = ['small', 'medium', 'large'].flatMap((size) => ['solid', 'outline', 'quiet'].map((variant) => `bl-${size}-${variant}`))

/** Turns loading on (or off) and measures every listed Button on every frame for `ms`. */
function frames(page: Page, ids: string[], ms: number, { busy = true, endAfter }: { busy?: boolean; endAfter?: number } = {}) {
  return page.evaluate(({ ids, ms, busy, endAfter }) => new Promise<Frame[]>((done) => {
    const measure = (t: number): Frame => ({
      t,
      boxes: ids.map((id) => {
        const button = document.getElementById(id)!
        const box = button.getBoundingClientRect()
        const next = document.getElementById(`${id}-next`)
        const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
        const range = document.createRange()
        if (text) range.selectNodeContents(text)
        const label = text ? range.getBoundingClientRect() : null
        const spinner = button.querySelector<HTMLElement>(':scope > .diya-spinner')
        const ring = spinner?.getBoundingClientRect()
        const icon = button.querySelector<SVGElement>(':scope > svg')
        return {
          id, width: box.width, x: box.x, next: next ? next.getBoundingClientRect().x : null,
          label: label ? label.left : null, labelEnd: label ? label.right : null,
          spinner: ring ? ring.left : null, spinnerEnd: ring ? ring.right : null,
          spinnerOpacity: spinner ? Number(getComputedStyle(spinner).opacity) : null,
          opacity: Number(getComputedStyle(button).opacity),
          icon: icon ? Number(getComputedStyle(icon).opacity) : null,
        }
      }),
    })
    const out = [measure(-1)]
    const setBusy = (window as unknown as { __setBusy(value: boolean): void }).__setBusy
    setBusy(busy)
    const start = performance.now()
    if (endAfter !== undefined) setTimeout(() => setBusy(false), endAfter)
    const tick = () => {
      const t = performance.now() - start
      out.push(measure(t))
      if (t < ms) requestAnimationFrame(tick)
      else done(out)
    }
    out.push(measure(0))
    requestAnimationFrame(tick)
  }), { ids, ms, busy, endAfter })
}
const of = (list: Frame[], id: string) => list.map(({ t, boxes }) => ({ t, ...boxes.find((box) => box.id === id)! }))

for (const dir of ['ltr', 'rtl'] as const) {
  test(`width changes by 0px on every frame for 700ms; the neighbor moves 0px (${dir})`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=loading&theme=light&dir=${dir}`)
    const list = await frames(page, grid, 700)
    expect(list.length).toBeGreaterThan(5)
    // 0px to the engine's layout unit: Chromium sometimes rounds the two paddings apart by 1/64px
    // mid-slide, which no screen shows.
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
    for (const id of grid) {
      const rows = of(list, id)
      expect(spread(rows.map((row) => row.width)), `${id} widths ${[...new Set(rows.map((row) => row.width))]}`).toBeLessThanOrEqual(1 / 64)
      expect(spread(rows.map((row) => row.next!)), `${id} neighbor ${[...new Set(rows.map((row) => row.next))]}`).toBeLessThanOrEqual(1 / 64)
    }
  })

  test(`label shifts 12/12/14px after 400ms; spinner-to-label gap 8px; the spinner holds still (${dir})`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=loading&theme=light&dir=${dir}`)
    const list = await frames(page, grid, 750)
    const sign = dir === 'ltr' ? 1 : -1
    for (const id of grid) {
      const rows = of(list, id)
      const [rest, end] = [rows[0], rows.at(-1)!]
      const room = id.includes('large') ? 14 : 12
      expect(end.label! - rest.label!, `${id} label shift`).toBeCloseTo(sign * room, 1)
      // Nothing moves before the beat.
      for (const row of rows.filter(({ t }) => t < 380)) expect(row.label, `${id} at ${row.t.toFixed(0)}ms`).toBeCloseTo(rest.label!, 2)
      const gap = dir === 'ltr' ? end.label! - end.spinnerEnd! : end.spinner! - end.labelEnd!
      expect(gap, `${id} gap`).toBeCloseTo(8, 1)
      // Seen only where it ends up, and it fades in once the label is halfway across, so the two
      // never overlap.
      const seen = rows.filter((row) => (row.spinnerOpacity ?? 0) > 0.01)
      expect(seen.length, id).toBeGreaterThan(0)
      for (const row of seen) {
        expect(row.spinner, `${id} spinner at ${row.t.toFixed(0)}ms`).toBeCloseTo(end.spinner!, 1)
        expect(dir === 'ltr' ? row.label! - row.spinnerEnd! : row.spinner! - row.labelEnd!, `${id} clear at ${row.t.toFixed(0)}ms`).toBeGreaterThan(0)
      }
      expect(end.spinnerOpacity).toBe(1)
      expect(end.opacity).toBeCloseTo(0.8, 5)
    }
  })
}

test('a load under 400ms shows only the dim', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = ['bl-medium-solid', 'bl-large-outline']
  const list = await frames(page, ids, 600, { endAfter: 200 })
  for (const id of ids) {
    const rows = of(list, id)
    for (const row of rows) {
      expect(row.label, `${id} at ${row.t.toFixed(0)}ms`).toBeCloseTo(rows[0].label!, 2)
      expect(row.width).toBe(rows[0].width)
      if (row.spinnerOpacity !== null) expect(row.spinnerOpacity, `${id} spinner at ${row.t.toFixed(0)}ms`).toBe(0)
    }
    // The dim answered the press, and lifted.
    expect(Math.min(...rows.map((row) => row.opacity)), id).toBeLessThan(1)
    expect(rows.at(-1)!.opacity).toBe(1)
    expect(rows.at(-1)!.spinner).toBeNull()
  }
})

test('a Button with class-set padding: width constant, spinner clear of the label', async ({ page }, testInfo) => {
  // .app-pad (14px) and .app-pad-wide (32px) are unlayered, so they beat DIYA's padding at rest
  // and while busy. The width holds (to the engine's layout unit, 1/64px) and the spinner ends
  // 8px before the label.
  await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = ['bl-pad', 'bl-pad-wide']
  const list = await frames(page, ids, 750)
  for (const id of ids) {
    const rows = of(list, id)
    const widths = rows.map((row) => row.width)
    expect(Math.max(...widths) - Math.min(...widths), `${id} widths ${[...new Set(widths)]}`).toBeLessThanOrEqual(1 / 32)
    const end = rows.at(-1)!
    expect(end.label! - end.spinnerEnd!, `${id} gap`).toBeCloseTo(8, 1)
    for (const row of rows.filter((row) => (row.spinnerOpacity ?? 0) > 0.01)) expect(row.label! - row.spinnerEnd!, `${id} at ${row.t.toFixed(0)}ms`).toBeGreaterThan(0)
  }
})

test('icon-only keeps its icon until the beat, then the spinner takes its place', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const rows = of(await frames(page, ['bl-icon'], 700), 'bl-icon')
  for (const row of rows.filter(({ t }) => t < 380)) expect(row.icon, `icon at ${row.t.toFixed(0)}ms`).toBe(1)
  const end = rows.at(-1)!
  expect([end.icon, end.spinnerOpacity]).toEqual([0, 1])
  expect(new Set(rows.map((row) => row.width)).size).toBe(1)
  // Centered in the same square.
  expect(end.spinner! - end.x).toBeCloseTo((end.width - 16) / 2, 1)
})

test('href and asChild Buttons show the spinner too', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light&busy=1')
  for (const id of ['bl-link', 'bl-child']) {
    const link = page.locator(`#${id}`)
    await expect(link).toHaveAttribute('aria-busy', 'true')
    await expect(link.locator(':scope > .diya-spinner svg')).toHaveCount(1)
    await expect(link.locator(':scope > .diya-spinner')).toHaveCSS('opacity', '1')
  }
})

test('Dialog footer at 320px: the label\'s line count is unchanged while loading', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await openCase(page, testInfo, 'case=loading&theme=light')
  await page.locator('#bl-dialog-open').click()
  const confirm = page.getByRole('button', { name: 'Delete every archived conversation' })
  await expect(confirm).toBeVisible()
  await page.waitForFunction(() => document.getAnimations().length === 0)
  const lines = () => confirm.evaluate((button) => {
    const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)!
    const range = document.createRange()
    range.selectNodeContents(text)
    return { lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }
  })
  const before = await lines()
  expect(before.lines).toBeGreaterThan(1)
  await confirm.click()
  await expect(confirm).toHaveAttribute('aria-busy', 'true')
  await page.waitForTimeout(700)
  expect(await lines()).toEqual(before)
})
