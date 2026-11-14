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
        // The label's words: the wrapper has no box (display: contents), so its place is read from
        // a range over its words, and how visible they are from their color's alpha (M2).
        const wrapper = button.querySelector<HTMLElement>(':scope > .diya-button-label')
        const words = wrapper ?? button
        const text = [...words.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())
        const range = text ? document.createRange() : null
        if (range && text) range.selectNodeContents(text)
        const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
        const icon = [...button.querySelectorAll<SVGElement>('svg')].find((svg) => !svg.closest('.diya-spinner')) ?? null
        const iconLead = icon && button.querySelector('.diya-button-lead')?.contains(icon)
        const shown = (node: Element) => { let value = 1; for (let at: Element | null = node; at && at !== button.parentElement; at = at.parentElement) value *= Number(getComputedStyle(at).opacity); return value }
        const spinnerNode = button.querySelector<HTMLElement>('.diya-spinner')
        const spinner = spinnerNode && getComputedStyle(spinnerNode).display !== 'none' ? spinnerNode : null
        const style = getComputedStyle(button)
        return {
          id, button: box(button)!, next: document.getElementById(`${id}-next`)?.getBoundingClientRect().left ?? null,
          label: box(range), labelOpacity: text ? alpha(getComputedStyle(words).getPropertyValue('-webkit-text-fill-color')) : null,
          icon: box(icon), iconOpacity: icon ? Math.min(shown(icon), iconLead || button.dataset.iconOnly ? alpha(getComputedStyle(icon).color) : 1) : null,
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
    const ids = [...grid, ...padded, 'bl-lead', 'bl-lead-pad', 'bl-short', 'bl-icon', 'bl-multi', 'bl-kbd']
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
    // M2, N1: the label's wrapper has no box, so its words hide by their fill, from the Button.
    await expect(link.locator(':scope > .diya-button-label')).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)')
  }
})

test('Dialog footer at 320px: the label\'s line count is unchanged while loading', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await openCase(page, testInfo, 'case=loading&theme=light')
  await page.locator('#bl-dialog-open').click()
  const confirm = page.getByRole('button', { name: 'Delete every archived conversation' })
  await expect(confirm).toBeVisible()
  // The dialog's own animations: the case now holds a reader's Spinner, which turns forever (N6).
  await page.waitForFunction(() => document.querySelector('dialog[open]')!.getAnimations({ subtree: true }).length === 0)
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

// L2 (FE R2-01): an engine without @starting-style (Safari before 17.5, Firefox before 129) must
// not blank a Button on its first load either. Modelled by deleting every @starting-style rule.
test('no blank frame on a first load without @starting-style', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const removed = await page.evaluate(() => {
    let count = 0
    const strip = (rules: CSSRuleList, owner: CSSStyleSheet | CSSGroupingRule) => {
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i]
        if (rule.constructor.name === 'CSSStartingStyleRule') { owner.deleteRule(i); count++ }
        else if ('cssRules' in rule) strip((rule as CSSGroupingRule).cssRules, rule as CSSGroupingRule)
      }
    }
    for (const sheet of document.styleSheets) strip(sheet.cssRules, sheet)
    return count
  })
  testInfo.annotations.push({ type: 'removed', description: `${removed} @starting-style rules` })
  const ids = ['bl-medium-solid', 'bl-lead', 'bl-icon', 'bl-pad-12']
  const list = await frames(page, ids, 700)
  for (const id of ids) {
    for (const row of of(list, id).filter((row) => row.t >= 0)) {
      const shown = Math.max(row.labelOpacity === null || id === 'bl-lead' || id === 'bl-icon' ? 0 : row.labelOpacity, row.iconOpacity ?? 0, row.spinnerOpacity ?? 0)
      expect(shown, `${id} at ${row.t.toFixed(0)}ms`).toBe(1)
    }
  }
})

// L7 (MOT-S78-R2-01): a label of more than one part ("Next" and an arrow, a kbd) keeps its width:
// as wide as the same Button with no loading prop, before, during and after loading, and its
// neighbor stays put.
test('a label of more than one part keeps its width before, during and after loading', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const width = (id: string) => page.locator(`#${id}`).evaluate((node) => node.getBoundingClientRect().width)
  // To a hundredth of a pixel: WebKit's rects differ in the fifth decimal through the nested flex box.
  for (const id of ['bl-multi', 'bl-kbd']) expect(await width(id), id).toBeCloseTo(await width(`${id}-plain`), 2)
  const list = await frames(page, ['bl-multi', 'bl-kbd'], 1000, { endAfter: 600 })
  for (const id of ['bl-multi', 'bl-kbd']) {
    const rows = of(list, id)
    expect(spread(rows.map((row) => row.button.right - row.button.left)), `${id} width`).toBe(0)
    expect(spread(rows.map((row) => row.next!)), `${id} neighbor`).toBe(0)
    expect(rows[0].button.right - rows[0].button.left).toBeCloseTo(await width(`${id}-plain`), 2)
  }
})

// Visual round 2: in a large Button the 20px spinner sits on the 18px leading icon's center.
test('a large Button\'s spinner is centered on its leading icon', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const end = of(await frames(page, ['bl-lead-large'], 600), 'bl-lead-large').at(-1)!
  const [ix, iy] = center(end.icon!)
  const [sx, sy] = center(end.spinner!)
  expect(Math.abs(sx - ix)).toBeLessThanOrEqual(0.25)
  expect(Math.abs(sy - iy)).toBeLessThanOrEqual(0.25)
})

// M1: any icon before the label is the leading icon (lucide, a logo component, an svg in a
// fragment); rich text before it is part of the label.
test('a library icon, a logo and an icon in a fragment are leading icons; rich text is part of the label (M1)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const icons = ['bl-lucide', 'bl-lucide-large', 'bl-frag', 'bl-logo']
  const list = await frames(page, [...icons, 'bl-strong'], 700)
  for (const id of icons) {
    const rows = of(list, id).filter((row) => row.t >= 0)
    for (const row of rows) {
      expect(row.labelOpacity, `${id} label at ${row.t.toFixed(0)}ms`).toBe(1)
      expect([[1, 0], [0, 1]], `${id} at ${row.t.toFixed(0)}ms`).toContainEqual([row.iconOpacity, row.spinnerOpacity])
    }
    const end = rows.at(-1)!
    const [ix, iy] = center(end.icon!)
    const [sx, sy] = center(end.spinner!)
    expect(Math.abs(sx - ix), `${id} x`).toBeLessThanOrEqual(0.5)
    expect(Math.abs(sy - iy), `${id} y`).toBeLessThanOrEqual(0.5)
  }
  // <strong>Save</strong> draft: both parts go, and the spinner sits in the middle of the Button.
  const strong = await page.locator('#bl-strong').evaluate((button) => ({
    strong: Number(getComputedStyle(button.querySelector('strong')!).opacity),
    words: getComputedStyle(button.querySelector('.diya-button-label')!).getPropertyValue('-webkit-text-fill-color'),
    spinner: (() => { const s = button.querySelector('.diya-spinner')!.getBoundingClientRect(); const b = button.getBoundingClientRect(); return [s.left + s.width / 2 - (b.left + b.width / 2), s.top + s.height / 2 - (b.top + b.height / 2)] })(),
  }))
  expect(strong.strong).toBe(0)
  expect(strong.words).toBe('rgba(0, 0, 0, 0)')
  for (const off of strong.spinner) expect(Math.abs(off)).toBeLessThanOrEqual(0.5)
})

// M2 (QA-L-01): a Button given loading lays out as 1.1.1 at rest, a trailing icon spread with
// space-between or an auto margin included, and nothing moves while it loads.
test('a trailing icon spread to the edge stays there, at rest and while loading (M2)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const arrowLeft = (id: string) => page.locator(`#${id}`).evaluate((button) => [...button.querySelectorAll('svg')].find((svg) => !svg.closest('.diya-spinner'))!.getBoundingClientRect().left - button.getBoundingClientRect().left)
  for (const id of ['bl-spread', 'bl-auto']) expect(await arrowLeft(id), id).toBe(await arrowLeft(`${id}-plain`))
  const atRest = { spread: await arrowLeft('bl-spread'), auto: await arrowLeft('bl-auto') }
  const list = await page.evaluate(() => new Promise<number[][]>((done) => {
    const out: number[][] = []
    const read = () => ['bl-spread', 'bl-auto'].map((id) => { const button = document.getElementById(id)!; return [...button.querySelectorAll('svg')].find((svg) => !svg.closest('.diya-spinner'))!.getBoundingClientRect().left - button.getBoundingClientRect().left })
    ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(true)
    const start = performance.now()
    setTimeout(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(false), 600)
    const tick = () => { out.push(read()); if (performance.now() - start < 900) requestAnimationFrame(tick); else done(out) }
    tick()
  }))
  for (const [spread, auto] of list) expect([spread, auto]).toEqual([atRest.spread, atRest.auto])
})

// M4 (QA-L-03): L2 guards the Buttons whose wrapper is made the moment loading starts: loading given
// only when true, a plain-text label (M3), and a Button that mounts already loading. With every
// @starting-style rule removed, none of them is ever blank before the beat.
test('no blank frame when the wrapper appears with loading, or the Button mounts loading (M4, L2)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const blank = await page.evaluate(() => new Promise<string[]>((done) => {
    for (const sheet of document.styleSheets) {
      const strip = (rules: CSSRuleList, owner: CSSStyleSheet | CSSGroupingRule) => { for (let i = rules.length - 1; i >= 0; i--) { const rule = rules[i]; if (rule.constructor.name === 'CSSStartingStyleRule') owner.deleteRule(i); else if ('cssRules' in rule) strip((rule as CSSGroupingRule).cssRules, rule as CSSGroupingRule) } }
      strip(sheet.cssRules, sheet)
    }
    const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
    const visible = (button: HTMLElement) => {
      const spinner = button.querySelector<HTMLElement>('.diya-spinner')
      const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
      const words = alpha(getComputedStyle(button.querySelector('.diya-button-label') ?? button).getPropertyValue('-webkit-text-fill-color'))
      return Math.max(ring, words)
    }
    const out: string[] = []
    ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(true)
    const start = performance.now()
    const tick = () => {
      const t = performance.now() - start
      for (const id of ['bl-late', 'bl-late-icon', 'bl-mounted', 'bl-medium-solid']) {
        const button = document.getElementById(id)
        if (!button) out.push(`${id} missing at ${t.toFixed(0)}`)
        else if (visible(button) < 1) out.push(`${id} at ${t.toFixed(0)}ms: ${visible(button)}`)
      }
      if (t < 700) requestAnimationFrame(tick); else done(out)
    }
    tick()
  }))
  expect(blank).toEqual([])
})

// M5 (MOT-L-01): loading off and on again within one frame, after the beat and before it, never
// blanks the Button: the spinner stays mounted while the wrappers are, so the two keep one beat.
for (const at of [600, 200]) {
  test(`loading off and on within one frame at ${at}ms never blanks the Button (M5)`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=loading&theme=light')
    const blank = await page.evaluate((at) => new Promise<string[]>((done) => {
      const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
      const ids = ['bl-medium-solid', 'bl-lucide', 'bl-icon', 'bl-multi']
      const visible = (button: HTMLElement) => {
        const spinner = button.querySelector<HTMLElement>(':scope > .diya-spinner, :scope > .diya-button-lead > .diya-spinner')
        const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
        const first = button.querySelector('.diya-button-lead svg, :scope > svg') as SVGElement | null
        const icon = first ? Number(getComputedStyle(first).opacity) * alpha(getComputedStyle(first).color) : 0
        const words = button.dataset.iconOnly ? 0 : alpha(getComputedStyle(button.querySelector('.diya-button-label') ?? button).getPropertyValue('-webkit-text-fill-color'))
        return Math.max(ring, icon, words)
      }
      const out: string[] = []
      const win = window as unknown as { __setBusy(value: boolean): void; __flip(): void }
      win.__setBusy(true)
      const start = performance.now()
      setTimeout(() => win.__flip(), at)
      const tick = () => {
        const t = performance.now() - start
        for (const id of ids) { const v = visible(document.getElementById(id)!); if (v < 1) out.push(`${id} at ${t.toFixed(0)}ms: ${v.toFixed(2)}`) }
        if (t < at + 700) requestAnimationFrame(tick); else done(out)
      }
      tick()
    }), at)
    expect(blank).toEqual([])
  })
}

// Forced colors force the words' color, so the label keeps ButtonText itself while busy, and still
// goes on the beat (Chromium emulates forced colors).
test('in forced colors the label still goes on the beat, and reads ButtonText before it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
  await page.emulateMedia({ forcedColors: 'active' })
  await openCase(page, testInfo, 'case=loading&theme=light')
  const color = () => page.locator('#bl-medium-solid').evaluate((button) => getComputedStyle(button.querySelector('.diya-button-label') ?? button).getPropertyValue('-webkit-text-fill-color'))
  const rest = await color()
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  expect(await color()).toBe(rest)
  await page.waitForTimeout(600)
  expect(await color()).toBe('rgba(0, 0, 0, 0)')
})

// N1 (a): WebKit repeats a display: contents element's words in the accessible name when that
// element's own style changes, so the label's box-less wrappers never get a style or an animation of
// their own; the words go and come back from the Button. (WebKit's own tree, read with Playwright
// 1.56, is in the round's evidence; 1.57 no longer exposes it.)
test('the label\'s box-less wrappers never animate or change their own style, in every phase (N1)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const touched = await page.evaluate(() => new Promise<string[]>((done) => {
    const out = new Set<string>()
    const wrappers = () => [...document.querySelectorAll<HTMLElement>('.diya-button-label, .diya-button-lead-item')]
    const own = (el: HTMLElement) => { const parent = getComputedStyle(el.parentElement!); const mine = getComputedStyle(el); return ['color', '-webkit-text-fill-color', 'text-shadow', 'opacity'].filter((name) => mine.getPropertyValue(name) !== (name === 'opacity' ? '1' : parent.getPropertyValue(name))) }
    const check = (t: number) => { for (const el of wrappers()) { const id = el.closest('.diya-button')!.id; if (el.getAnimations().length) out.add(`${id} animates at ${t.toFixed(0)}`); const changed = own(el); if (changed.length) out.add(`${id} ${changed} at ${t.toFixed(0)}`) } }
    const win = window as unknown as { __setBusy(value: boolean): void }
    win.__setBusy(true)
    const start = performance.now()
    setTimeout(() => win.__setBusy(false), 600)
    const tick = () => { const t = performance.now() - start; check(t); if (t < 900) requestAnimationFrame(tick); else done([...out].slice(0, 20)) }
    tick()
  }))
  expect(touched).toEqual([])
})

// N1 (c): an app's text-shadow and text fill on the Button leave no ghost words around the spinner.
test('an app\'s text-shadow and text fill on the Button leave no ghost words while loading (N1)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  await page.waitForTimeout(600)
  for (const id of ['bl-shadow', 'bl-fill']) {
    const button = page.locator(`#${id}`)
    const style = await button.evaluate((node) => { const s = getComputedStyle(node.querySelector('.diya-button-label')!); return [s.getPropertyValue('-webkit-text-fill-color'), s.textShadow] })
    expect(style[0], id).toBe('rgba(0, 0, 0, 0)')
    expect(style[1], id).toMatch(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px)$/)
    // Pixels: the busy Button looks the same as with its words removed outright.
    const busy = await button.screenshot({ animations: 'disabled' })
    await page.addStyleTag({ content: `#${id} .diya-button-label { visibility: hidden !important; }` })
    expect(await button.screenshot({ animations: 'disabled' }), id).toEqual(busy)
  }
})

// N3 (MOT-M-01): a text-colored leading icon fades back once, by its opacity: its color holds.
test('a lucide leading icon fades back once, by its opacity alone (N3)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const samples = await page.evaluate(() => new Promise<{ t: number; opacity: number; color: string }[]>((done) => {
    const out: { t: number; opacity: number; color: string }[] = []
    const win = window as unknown as { __setBusy(value: boolean): void }
    win.__setBusy(true)
    setTimeout(() => {
      win.__setBusy(false)
      const start = performance.now()
      const tick = () => {
        const icon = document.querySelector('#bl-lucide svg.lucide') as SVGElement
        out.push({ t: performance.now() - start, opacity: Number(getComputedStyle(icon).opacity), color: getComputedStyle(icon).color })
        if (performance.now() - start < 250) requestAnimationFrame(tick); else done(out)
      }
      tick()
    }, 600)
  }))
  const rest = samples.at(-1)!.color
  for (const sample of samples) expect(sample.color, `${sample.t.toFixed(0)}ms`).toBe(rest)
  expect(samples.some((sample) => sample.opacity > 0 && sample.opacity < 1)).toBe(true)
})

// N4: in forced colors the label's own elements keep their forced colors before the beat, and a
// disabled Button that's loading shows GrayText words, as a disabled Button does.
test('forced colors: the label\'s elements stay forced, and a disabled loading Button reads GrayText (N4)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
  await page.emulateMedia({ forcedColors: 'active' })
  await openCase(page, testInfo, 'case=loading&theme=dark')
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  const read = () => page.evaluate(() => ({
    red: getComputedStyle(document.querySelector('#bl-fc-red span:not(.diya-button-label):not(.diya-spinner)')!).color,
    disabled: getComputedStyle(document.getElementById('bl-fc-disabled')!).color,
    plain: getComputedStyle(document.getElementById('bl-fc-disabled-plain')!).color,
  }))
  const before = await read()
  expect(before.red).not.toBe('rgb(225, 29, 72)')
  expect(before.disabled).toBe(before.plain)
})

// N5 (QA-M-01): SiteHeader's utilities size a wrapped leading icon at 20px, as an unwrapped one.
test('SiteHeader utilities size the icon of a Button given loading at 20px (N5)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const sizes = await page.evaluate(() => ['bl-tools', 'bl-tools-plain'].map((id) => { const r = document.querySelector(`#${id} svg.lucide`)!.getBoundingClientRect(); return [r.width, r.height, document.getElementById(id)!.getBoundingClientRect().width] }))
  sizes[0].forEach((value, index) => expect(value).toBeCloseTo(sizes[1][index], 2))
  expect(sizes[0].slice(0, 2)).toEqual([20, 20])
})

// N6 (QA-M-02): a Spinner of the reader's own, in a Button with no loading, shows: in the flow
// beside the words, and as an icon-only Button's only child.
test('a reader\'s own Spinner in a Button shows (N6)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  await page.waitForTimeout(600)
  const seen = await page.evaluate(() => ['bl-own-spinner', 'bl-own-spinner-icon'].map((id) => { const s = document.querySelector(`#${id} .diya-spinner`) as HTMLElement; const style = getComputedStyle(s); return [style.display !== 'none', style.opacity, style.position] }))
  expect(seen).toEqual([[true, '1', 'static'], [true, '1', 'static']])
})

// N9 (FE-M-04): a component of an icon and words, before another part, lays out at rest as without
// loading.
test('an icon-and-words component before a kbd lays out at rest as without loading (N9)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const places = await page.evaluate(() => ['bl-icontext', 'bl-icontext-plain'].map((id) => { const b = document.getElementById(id)!; const k = b.querySelector('kbd')!.getBoundingClientRect(); return [b.getBoundingClientRect().width, k.left - b.getBoundingClientRect().left] }))
  places[0].forEach((value, index) => expect(value).toBeCloseTo(places[1][index], 2))
})

// N2 (FE-M-02): on a translated page (Google Translate swaps text nodes for <font>), the first load
// of a plain label of several parts keeps the app alive, on React 18 and 19.
test('a translated plain label of several parts survives loading on and off (N2)', async ({ page }, testInfo) => {
  const { errors } = await openCase(page, testInfo, 'case=loading&theme=light')
  await page.evaluate(() => {
    const button = document.getElementById('bl-n1-text')!
    for (const node of [...button.childNodes]) if (node.nodeType === Node.TEXT_NODE) { const font = document.createElement('font'); font.textContent = `${node.textContent}`; node.replaceWith(font) }
  })
  const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
  await win(true)
  await page.waitForTimeout(500)
  await win(false)
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
  await expect(page.locator('#bl-n1-text')).toHaveCount(1)
  await expect(page.locator('#bl-medium-solid')).toHaveCount(1)
})

// N8 (QA-R3): a loading link keeps focus, and a middle click opens nothing.
test('a loading link keeps focus, and a middle click or Enter opens nothing (N8, M7)', async ({ page, context }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light')
  const link = page.locator('#bl-link')
  await link.focus()
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  await expect(link).toBeFocused()
  let opened = 0
  context.on('page', () => { opened++ })
  await link.click({ button: 'middle', force: true })
  await link.click({ force: true, modifiers: ['ControlOrMeta'] })
  await link.press('Enter')
  await page.waitForTimeout(500)
  expect(opened).toBe(0)
  expect(page.url()).not.toContain('#saved')
  await expect(link).toBeFocused()
})
