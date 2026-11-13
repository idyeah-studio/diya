// Button loading (1.2, F12 and F13) in a real browser. On the Spinner's 400ms beat the spinner
// takes the place of the first thing in the button, in one frame: the leading icon (the label
// stays), or else the label, which keeps its box. Nothing moves, the width holds, the spinner stays
// inside the button at any padding, and when loading ends the label (or icon) fades back. A loading
// Button looks busy, not disabled. (F12 replaces step 8's slide, whose tests these replace.)
import { expect, test, type Page } from '@playwright/test'
import { openCase } from './helpers'

type Box = { left: number; right: number; top: number; bottom: number }
type Row = {
  id: string; button: Box; next: number | null
  label: Box | null; labelOpacity: number | null
  icon: Box | null; iconOpacity: number | null
  spinner: Box | null; spinnerOpacity: number | null
  opacity: number; cursor: string; color: string
}
type Frame = { t: number; rows: Row[] }

const grid = ['small', 'medium', 'large'].flatMap((size) => ['solid', 'outline', 'quiet'].map((variant) => `bl-${size}-${variant}`))
const padded = ['bl-pad-10', 'bl-pad-12', 'bl-pad', 'bl-pad-16', 'bl-pad-wide']

/** Turns loading on (or ends it after `endAfter` ms) and measures the listed Buttons on every frame for `ms`. */
function frames(page: Page, ids: string[], ms: number, { endAfter, busy = true }: { endAfter?: number; busy?: boolean } = {}) {
  return page.evaluate(({ ids, ms, endAfter, busy }) => new Promise<Frame[]>((done) => {
    const box = (node: Element | Range | null | undefined) => {
      if (!node) return null
      const r = node.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    }
    const measure = (t: number): Frame => ({
      t,
      rows: ids.map((id) => {
        const button = document.getElementById(id)!
        const wrapper = button.querySelector<HTMLElement>(':scope > .diya-button-label')
        const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
        const range = text ? document.createRange() : null
        if (range && text) range.selectNodeContents(text)
        const icon = button.querySelector<SVGElement>(':scope > svg, :scope > .diya-button-lead > svg')
        const spinner = button.querySelector<HTMLElement>('.diya-spinner')
        const style = getComputedStyle(button)
        return {
          id, button: box(button)!, next: document.getElementById(`${id}-next`)?.getBoundingClientRect().left ?? null,
          label: box(wrapper ?? range), labelOpacity: wrapper ? Number(getComputedStyle(wrapper).opacity) : text ? 1 : null,
          icon: box(icon), iconOpacity: icon ? Number(getComputedStyle(icon).opacity) : null,
          spinner: box(spinner), spinnerOpacity: spinner ? Number(getComputedStyle(spinner).opacity) : null,
          opacity: Number(style.opacity), cursor: style.cursor, color: style.color,
        }
      }),
    })
    const setBusy = (window as unknown as { __setBusy(value: boolean): void }).__setBusy
    const out = [measure(-1)]
    setBusy(busy)
    const start = performance.now()
    if (endAfter !== undefined) setTimeout(() => setBusy(false), endAfter)
    out.push(measure(0))
    const tick = () => {
      const t = performance.now() - start
      out.push(measure(t))
      if (t < ms) requestAnimationFrame(tick)
      else done(out)
    }
    requestAnimationFrame(tick)
  }), { ids, ms, endAfter, busy })
}
const of = (list: Frame[], id: string) => list.map(({ t, rows }) => ({ t, ...rows.find((row) => row.id === id)! }))
const center = (b: Box) => [(b.left + b.right) / 2, (b.top + b.bottom) / 2]
const spread = (values: number[]) => Math.max(...values) - Math.min(...values)

for (const dir of ['ltr', 'rtl'] as const) {
  test(`width and neighbor hold, and nothing moves, on every frame for 700ms (${dir})`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=loading&theme=light&dir=${dir}`)
    const ids = [...grid, ...padded, 'bl-lead', 'bl-lead-pad', 'bl-short', 'bl-icon']
    const list = await frames(page, ids, 700)
    expect(list.length).toBeGreaterThan(5)
    for (const id of ids) {
      const rows = of(list, id)
      expect(spread(rows.map((row) => row.button.right - row.button.left)), `${id} width`).toBe(0)
      expect(spread(rows.map((row) => row.button.left)), `${id} place`).toBe(0)
      if (rows[0].next !== null) expect(spread(rows.map((row) => row.next!)), `${id} neighbor`).toBe(0)
      // The label and the icon keep their boxes; the spinner, once there, doesn't move either.
      for (const part of ['label', 'icon'] as const) {
        const boxes = rows.map((row) => row[part]).filter(Boolean) as Box[]
        if (boxes.length) expect(spread(boxes.map((b) => b.left)), `${id} ${part}`).toBeLessThanOrEqual(0.01)
      }
      const spinners = rows.map((row) => row.spinner).filter(Boolean) as Box[]
      expect(spread(spinners.map((b) => b.left)), `${id} spinner`).toBe(0)
    }
  })
}

test('on the beat the label goes and a centered spinner is there in the same frame; before it, nothing changes', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = [...grid, 'bl-short', ...padded]
  const list = await frames(page, ids, 700)
  for (const id of ids) {
    const rows = of(list, id).filter((row) => row.t >= 0)
    for (const row of rows.filter(({ t }) => t < 380)) expect([row.labelOpacity, row.spinnerOpacity], `${id} at ${row.t.toFixed(0)}ms`).toEqual([1, 0])
    // No crossfade: every frame shows exactly one of the two, fully.
    for (const row of rows) expect([[1, 0], [0, 1]], `${id} at ${row.t.toFixed(0)}ms: ${row.labelOpacity}, ${row.spinnerOpacity}`).toContainEqual([row.labelOpacity, row.spinnerOpacity])
    const end = rows.at(-1)!
    expect([end.labelOpacity, end.spinnerOpacity]).toEqual([0, 1])
    // Centered on the label's box (which is the button's middle), and inside the button.
    const [lx, ly] = center(end.label!)
    const [sx, sy] = center(end.spinner!)
    expect(Math.abs(sx - lx), `${id} x`).toBeLessThanOrEqual(0.5)
    expect(Math.abs(sy - ly), `${id} y`).toBeLessThanOrEqual(1)
  }
})

test('at any padding the spinner stays inside the button: Tailwind px-3 and px-4, and 10 to 32px', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const list = await frames(page, [...padded, 'bl-lead-pad'], 600)
  for (const id of [...padded, 'bl-lead-pad']) {
    const end = of(list, id).at(-1)!
    expect(end.spinnerOpacity, id).toBe(1)
    expect(end.spinner!.left - end.button.left, `${id} start`).toBeGreaterThanOrEqual(8)
    expect(end.button.right - end.spinner!.right, `${id} end`).toBeGreaterThanOrEqual(8)
    expect(end.spinner!.top).toBeGreaterThanOrEqual(end.button.top)
    expect(end.spinner!.bottom).toBeLessThanOrEqual(end.button.bottom)
  }
})

test('with a leading icon, the spinner takes the icon\'s place and the label stays', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const list = await frames(page, ['bl-lead', 'bl-lead-pad'], 700)
  for (const id of ['bl-lead', 'bl-lead-pad']) {
    const rows = of(list, id).filter((row) => row.t >= 0)
    for (const row of rows) {
      expect(row.labelOpacity, `${id} label at ${row.t.toFixed(0)}ms`).toBe(1)
      expect([[1, 0], [0, 1]], `${id} at ${row.t.toFixed(0)}ms`).toContainEqual([row.iconOpacity, row.spinnerOpacity])
    }
    const end = rows.at(-1)!
    expect([end.iconOpacity, end.spinnerOpacity]).toEqual([0, 1])
    const [ix, iy] = center(end.icon!)
    const [sx, sy] = center(end.spinner!)
    expect(Math.abs(sx - ix), `${id} x`).toBeLessThanOrEqual(1)
    expect(Math.abs(sy - iy), `${id} y`).toBeLessThanOrEqual(1)
  }
})

test('icon-only swaps in one frame, never blank (S78-M1)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const rows = of(await frames(page, ['bl-icon'], 700), 'bl-icon').filter((row) => row.t >= 0)
  for (const row of rows) expect([[1, 0], [0, 1]], `at ${row.t.toFixed(0)}ms`).toContainEqual([row.iconOpacity, row.spinnerOpacity])
  const end = rows.at(-1)!
  expect([end.iconOpacity, end.spinnerOpacity]).toEqual([0, 1])
  const [bx, by] = center(end.button)
  const [sx, sy] = center(end.spinner!)
  expect(Math.abs(sx - bx)).toBeLessThanOrEqual(0.5)
  expect(Math.abs(sy - by)).toBeLessThanOrEqual(0.5)
})

test('when loading ends the spinner goes at once and the label fades back; a load under 400ms changes nothing', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = ['bl-medium-solid', 'bl-lead', 'bl-icon']
  const long = await frames(page, ids, 1000, { endAfter: 600 })
  for (const id of ids) {
    const rows = of(long, id).filter((row) => row.t > 640)
    for (const row of rows) expect(row.spinner, `${id} spinner at ${row.t.toFixed(0)}ms`).toBeNull()
    const back = rows.map((row) => (id === 'bl-medium-solid' ? row.labelOpacity : row.iconOpacity)!)
    // It fades: at least one frame part of the way, and fully back by the end.
    expect(back.some((value) => value > 0 && value < 1), `${id}: ${back.map((v) => v.toFixed(2))}`).toBe(true)
    expect(back.at(-1)).toBe(1)
  }
  await page.reload()
  await page.waitForSelector('html[data-ready]')
  const quick = await frames(page, ids, 700, { endAfter: 200 })
  for (const id of ids) {
    for (const row of of(quick, id)) {
      expect(row.labelOpacity ?? 1, `${id} label at ${row.t.toFixed(0)}ms`).toBe(1)
      expect(row.iconOpacity ?? 1, `${id} icon at ${row.t.toFixed(0)}ms`).toBe(1)
      if (row.spinnerOpacity !== null) expect(row.spinnerOpacity, `${id} spinner at ${row.t.toFixed(0)}ms`).toBe(0)
    }
  }
})

test('a loading Button looks busy, not disabled: full color and the progress cursor (F13)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = [...grid, 'bl-link', 'bl-child']
  const list = await frames(page, ids, 200)
  for (const id of ids) {
    const rows = of(list, id)
    for (const row of rows) expect(row.opacity, `${id} at ${row.t.toFixed(0)}ms`).toBe(1)
    expect(rows[0].cursor, id).toBe('pointer')
    expect(rows.at(-1)!.cursor, id).toBe('progress')
    expect(rows.at(-1)!.color, id).toBe(rows[0].color)
  }
  // Still inert: a click does nothing, and focus stays. (Playwright waits for an aria-disabled
  // element to be enabled, so the click is forced.)
  const button = page.locator('#bl-medium-solid')
  await button.focus()
  await button.click({ force: true })
  await button.press('Enter')
  await button.press(' ')
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute('aria-busy', 'true')
  await expect(button).toHaveAttribute('aria-disabled', 'true')
})

test('href and asChild Buttons show the spinner too', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light&busy=1')
  for (const id of ['bl-link', 'bl-child']) {
    const link = page.locator(`#${id}`)
    await expect(link).toHaveAttribute('aria-busy', 'true')
    await expect(link.locator(':scope > .diya-spinner svg')).toHaveCount(1)
    await expect(link.locator(':scope > .diya-spinner')).toHaveCSS('opacity', '1')
    await expect(link.locator(':scope > .diya-button-label')).toHaveCSS('opacity', '0')
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
    const range = document.createRange()
    range.selectNodeContents(button.querySelector('.diya-button-label') ?? button)
    return { lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }
  })
  const before = await lines()
  expect(before.lines).toBeGreaterThan(1)
  await confirm.click()
  await expect(confirm).toHaveAttribute('aria-busy', 'true')
  await page.waitForTimeout(700)
  expect(await lines()).toEqual(before)
})

// UX DOCS-01: the label hides with opacity, so it stays the accessible name. The docs promise
// "accessible name unchanged": text, leading-icon and icon-only, before and after the beat.
test('the accessible name is unchanged while loading: text, leading icon and icon-only', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const names = { 'bl-medium-solid': 'Save changes', 'bl-lead': 'Add member', 'bl-icon': 'Add', 'bl-pad-12': 'Pay $42' }
  for (const [id, name] of Object.entries(names)) await expect(page.locator(`#${id}`)).toHaveAccessibleName(name)
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  await page.waitForTimeout(600)
  for (const [id, name] of Object.entries(names)) {
    await expect(page.locator(`#${id}`), id).toHaveAccessibleName(name)
    await expect(page.locator(`#${id}`), id).toHaveAttribute('aria-busy', 'true')
  }
})
