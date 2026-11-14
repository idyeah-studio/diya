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

/**
 * Removes the listed Buttons' words outright, for a reference shot: the label and leading part by
 * visibility, and a plain-text label's own text nodes (O5: never wrapped) by holding each run of them
 * in a hidden span for the shot; the spinner goes too, or stays. Returns the undo, which puts the same
 * text nodes back (React renders nothing between).
 */
async function removeWords(page: Page, ids: string[], { spinner }: { spinner: 'hidden' | 'visible' }) {
  const tag = await page.addStyleTag({ content: ids.map((id) => `#${id} .diya-button-label, #${id} .diya-button-leading { visibility: hidden !important; } #${id} .diya-button-spinner { visibility: ${spinner} !important; }`).join(' ') })
  await page.evaluate((ids) => {
    for (const id of ids) {
      let run: HTMLSpanElement | null = null
      for (const node of [...document.getElementById(id)!.childNodes]) {
        // A space alone makes no box in the flex row (P6: the one after a leading part), so it stays.
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent!.trim()) { run = null; continue }
        if (!run) { run = document.createElement('span'); run.dataset.wordsRemoved = ''; run.style.visibility = 'hidden'; node.before(run) }
        run.append(node)
      }
    }
  }, ids)
  return async () => {
    await page.evaluate(() => { for (const run of document.querySelectorAll('[data-words-removed]')) run.replaceWith(...run.childNodes) })
    await tag.evaluate((node) => node.remove())
  }
}

/**
 * Pixels well inside a Button's frame (the middle band, clear of the pill's rounded ends) that differ
 * from its background, the most common color there: its words, icon or spinner (O2; shared, P2).
 */
async function inkInside(page: Page, id: string) {
  const png = (await page.locator(`#${id}`).screenshot({ animations: 'disabled' })).toString('base64')
  return page.evaluate(async (png) => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const scale = window.devicePixelRatio
    const x = Math.round(image.height / 2)
    const y = Math.round(image.height * 0.2)
    const data = context.getImageData(Math.min(x, Math.round(image.width * 0.25)), y, Math.max(1, image.width - 2 * Math.min(x, Math.round(image.width * 0.25))), image.height - 2 * y).data
    const counts = new Map<number, number>()
    for (let i = 0; i < data.length; i += 4) { const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]; counts.set(key, (counts.get(key) ?? 0) + 1) }
    const background = [...counts].sort((a, b) => b[1] - a[1])[0][0]
    let inked = 0
    for (let i = 0; i < data.length; i += 4) {
      const diff = Math.abs(data[i] - (background >> 16)) + Math.abs(data[i + 1] - ((background >> 8) & 255)) + Math.abs(data[i + 2] - (background & 255))
      if (diff > 192) inked++
    }
    return inked / (scale * scale)
  }, png)
}

/** The largest difference in any channel between two same-sized screenshots, and how many pixels differ. */
async function pixelDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([a, b]) => {
    const read = async (png: string) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height)
    }
    const [x, y] = [await read(a), await read(b)]
    if (x.width !== y.width || x.height !== y.height) return { max: 255, count: -1 }
    let max = 0
    let count = 0
    for (let i = 0; i < x.data.length; i += 4) {
      const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]))
      if (d) { count++; max = Math.max(max, d) }
    }
    return { max, count }
  }, [a.toString('base64'), b.toString('base64')])
}

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
        const iconLead = icon && button.querySelector('.diya-button-leading')?.contains(icon)
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
    // When loading really ended: under load a timer fires late, so the checks after it read this.
    if (endAfter !== undefined) setTimeout(() => { (window as unknown as { __endedAt: number }).__endedAt = performance.now() - start; setBusy(false) }, endAfter)
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
  const ended = await page.evaluate(() => (window as unknown as { __endedAt: number }).__endedAt)
  for (const id of ids) {
    const rows = of(long, id).filter((row) => row.t > ended + 40)
    for (const row of rows) expect(row.spinner, `${id} spinner at ${row.t.toFixed(0)}ms`).toBeNull()
    const back = rows.map((row) => (id === 'bl-medium-solid' ? row.labelOpacity : row.iconOpacity)!)
    // It fades: at least one frame part of the way, and fully back by the end.
    expect(back.some((value) => value > 0 && value < 1), `${id}: ${back.map((v) => v.toFixed(2))}`).toBe(true)
    expect(back.at(-1)).toBe(1)
  }
  await page.reload()
  await page.waitForSelector('html[data-ready]')
  const quick = await frames(page, ids, 700, { endAfter: 200 })
  // A load that really ended before the beat; under heavy load the 200ms timer can fire after it,
  // and then this run can't judge a quick load.
  const quickEnded = await page.evaluate(() => (window as unknown as { __endedAt: number }).__endedAt)
  if (quickEnded >= 380) { testInfo.annotations.push({ type: 'quick load not judged', description: `the 200ms timer fired at ${quickEnded.toFixed(0)}ms` }); return }
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
    // O5 (named edit): a plain-text label has no wrapper; the Button's fill is its words'.
    await expect(link).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)')
    await expect(link.locator(':scope > .diya-button-label')).toHaveCount(0)
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
  // O5 (named edit): the words are the Button's own text nodes (the spinner beside them is not a line).
  const lines = () => confirm.evaluate((button) => {
    const tops = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).flatMap((node) => { const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()].map((rect) => Math.round(rect.top)) })
    return { lines: new Set(tops).size, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }
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
// O3 (FE-N-01): nor ever shows the spinner over visible words (plain, href and asChild labels), on a
// page where nothing reads styles between the two commits (lean) and on one where something does.
for (const at of [600, 200]) for (const lean of [true, false]) {
  test(`loading off and on within one frame at ${at}ms never blanks the Button, nor draws the spinner over its words${lean ? ' (lean page)' : ''} (M5, O3)`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=loading&theme=light${lean ? '&lean=1' : ''}`)
    const blank = await page.evaluate((at) => new Promise<string[]>((done) => {
      const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
      const ids = ['bl-medium-solid', 'bl-lucide', 'bl-icon', 'bl-multi', 'bl-link', 'bl-child', 'bl-n1-text']
      const labels = ['bl-medium-solid', 'bl-multi', 'bl-link', 'bl-child', 'bl-n1-text']
      const overlap = (button: HTMLElement) => {
        const spinner = button.querySelector<HTMLElement>('.diya-button-spinner')
        const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
        const words = alpha(getComputedStyle(button.querySelector('.diya-button-label') ?? button).getPropertyValue('-webkit-text-fill-color'))
        return button.getAttribute('aria-busy') === 'true' && ring > 0.01 && words > 0.02
      }
      const visible = (button: HTMLElement) => {
        const spinner = button.querySelector<HTMLElement>(':scope > .diya-spinner, :scope > .diya-button-leading > .diya-spinner')
        const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
        const first = button.querySelector('.diya-button-leading svg, :scope > svg') as SVGElement | null
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
        for (const id of labels) if (overlap(document.getElementById(id)!)) out.push(`${id} at ${t.toFixed(0)}ms: spinner over the words`)
        if (t < at + 700) requestAnimationFrame(tick); else done(out)
      }
      tick()
    }), at)
    expect(blank).toEqual([])
  })
}

// O3 with motion's other flips (MOT-N-01), after the beat on a lean page: two flips in one task
// (never blank, never both), and off then on in the next task (never both; a frame may paint
// between, which starts the fade back).
for (const how of ['two flips in one task', 'off, then on in the next task'] as const) {
  test(`loading ${how} after the beat never draws the spinner over the words (O3)`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=loading&theme=light&lean=1')
    const bad = await page.evaluate((how) => new Promise<string[]>((done) => {
      const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
      const ids = ['bl-medium-solid', 'bl-n1-text', 'bl-link', 'bl-child']
      const out: string[] = []
      const win = window as unknown as { __setBusy(value: boolean): void; __flip(): void }
      win.__setBusy(true)
      const start = performance.now()
      setTimeout(() => {
        if (how === 'two flips in one task') { win.__flip(); win.__flip() } else { win.__setBusy(false); setTimeout(() => win.__setBusy(true), 0) }
      }, 600)
      const tick = () => {
        const t = performance.now() - start
        for (const id of ids) {
          const button = document.getElementById(id)!
          const spinner = button.querySelector<HTMLElement>('.diya-button-spinner')
          const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
          const words = alpha(getComputedStyle(button).getPropertyValue('-webkit-text-fill-color')) * alpha(getComputedStyle(button).color)
          if (button.getAttribute('aria-busy') === 'true' && ring > 0.01 && words > 0.02) out.push(`${id} at ${t.toFixed(0)}ms: spinner over the words`)
          if (how === 'two flips in one task' && t > 400 && ring < 1 && words < 1) out.push(`${id} at ${t.toFixed(0)}ms: blank`)
        }
        if (t < 1300) requestAnimationFrame(tick); else done(out)
      }
      tick()
    }), how)
    expect(bad).toEqual([])
  })
}

// O4 (FE-N-02, QA-N-01): an app's own animation on a loading Button (a class, a utility in a later
// layer, an inline style) can't replace the hide or the fade back: after the beat the words are
// gone, data-returning clears once they're back, and the app's animation then runs again. After a
// leading icon the words stay.
test('an app\'s own animation on a loading Button neither keeps its words under the spinner nor keeps it returning (O4)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light&anim=1')
  const ids = ['bl-anim-class', 'bl-anim-layer', 'bl-anim-inline']
  const read = () => page.evaluate((ids) => Object.fromEntries([...ids, 'bl-anim-lead'].map((id) => {
    const button = document.getElementById(id)!
    const fill = getComputedStyle(button).getPropertyValue('-webkit-text-fill-color')
    const parts = fill.match(/[\d.]+/g)!.map(Number)
    return [id, { words: parts.length > 3 ? parts[3] : 1, returning: button.hasAttribute('data-returning'), names: button.getAnimations().map((a) => (a as CSSAnimation).animationName).join(' ') }]
  })), ids)
  const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
  await win(true)
  await page.waitForTimeout(700)
  await expect.poll(async () => Object.entries(await read()).filter(([id, v]) => ids.includes(id) && v.words > 0).map(([id]) => id), { timeout: 2000 }).toEqual([])
  const busy = await read()
  expect(busy['bl-anim-lead'].words, 'after a leading icon the words stay').toBe(1)
  await win(false)
  await expect.poll(async () => Object.entries(await read()).filter(([, v]) => v.returning).map(([id]) => id), { timeout: 2000 }).toEqual([])
  const after = await read()
  for (const id of [...ids, 'bl-anim-lead']) {
    expect(after[id].words, `${id} after`).toBe(1)
    if (id !== 'bl-anim-layer') expect(after[id].names, `${id}'s own animation runs again`).toBe('app-pulse')
  }
})

// O9 (MOT-N-02): a Spinner of the reader's own in a loading Button keeps its own beat. It waits 400ms
// when it mounts, after a leading icon too; it stays until the Button's beat and goes with the
// words (after a leading icon it stays, as the words do); and it doesn't blink out after the fade back.
test('a Spinner of your own in a loading Button keeps its own beat (O9)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light&rs=1')
  const bad = await page.evaluate(() => new Promise<string[]>((done) => {
    const ids = ['bl-rs-first', 'bl-rs-last', 'bl-rs-lead', 'bl-rs-icon']
    const win = window as unknown as { __setBusy(value: boolean): void; __showRs(): void }
    const out: string[] = []
    const ring = (id: string) => Number(getComputedStyle(document.getElementById(id)!.querySelector('.diya-spinner:not(.diya-button-spinner)')!).opacity)
    const watch = (ms: number, check: (t: number) => void) => new Promise<void>((next) => {
      const start = performance.now()
      const tick = () => { const t = performance.now() - start; check(t); if (t < ms) requestAnimationFrame(tick); else next() }
      tick()
    })
    void (async () => {
      win.__showRs()
      await watch(1000, (t) => { if (t < 300) for (const id of ids) if (ring(id) > 0.05) out.push(`${id} at ${t.toFixed(0)}ms after mount: shown before its beat`) })
      win.__setBusy(true)
      await watch(900, (t) => {
        for (const id of ids) {
          const v = ring(id)
          if (t < 300 && v < 0.99) out.push(`${id} at ${t.toFixed(0)}ms busy: gone before the Button's beat`)
          if (t > 550 && id !== 'bl-rs-lead' && v > 0.01) out.push(`${id} at ${t.toFixed(0)}ms busy: still there after the beat`)
          if (id === 'bl-rs-lead' && v < 0.99) out.push(`${id} at ${t.toFixed(0)}ms busy: gone after a leading icon`)
        }
      })
      win.__setBusy(false)
      const back: Record<string, number> = {}
      await watch(1200, (t) => {
        for (const id of ids) {
          if (!document.getElementById(id)!.hasAttribute('data-returning')) back[id] ??= t
          if ((back[id] !== undefined || id === 'bl-rs-lead') && ring(id) < 0.99) out.push(`${id} at ${t.toFixed(0)}ms after loading: blinked out (${ring(id).toFixed(2)})`)
        }
      })
      done(out.filter((line, i, all) => all.findIndex((other) => other.split(' at ')[0] === line.split(' at ')[0] && other.split(': ')[1] === line.split(': ')[1]) === i))
    })()
  }))
  expect(bad).toEqual([])
})

// O10 (MOT-N-03): with the pointer on a Solid Button as its loading ends, the hover tint (a mix of
// currentColor) follows the words' fade back in every frame, instead of trailing it by its own
// transition.
test('the hover tint comes back in step with the words (O10)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith('-phone'), 'hover needs a pointer')
  await openCase(page, testInfo, 'case=loading&theme=light')
  await page.hover('#bl-medium-solid')
  await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
  await page.waitForTimeout(700)
  const off = await page.evaluate(() => new Promise<string[]>((done) => {
    const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
    const button = document.getElementById('bl-medium-solid')!
    const out: string[] = []
    ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(false)
    const start = performance.now()
    const tick = () => {
      const t = performance.now() - start
      const tint = alpha(getComputedStyle(button, '::after').backgroundColor)
      const words = alpha(getComputedStyle(button).color)
      if (Math.abs(tint - 0.1 * words) > 0.015) out.push(`at ${t.toFixed(0)}ms: tint ${tint.toFixed(3)}, words ${words.toFixed(2)}`)
      if (t < 300) requestAnimationFrame(tick); else done(out)
    }
    requestAnimationFrame(tick)
  }))
  expect(off).toEqual([])
})

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
    const wrappers = () => [...document.querySelectorAll<HTMLElement>('.diya-button-label, .diya-button-leading-content')]
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
    // O5 (named edit): a plain-text label is never wrapped, so its words are the Button's own.
    const style = await button.evaluate((node) => { const s = getComputedStyle(node); return [s.getPropertyValue('-webkit-text-fill-color'), s.textShadow] })
    expect(style[0], id).toBe('rgba(0, 0, 0, 0)')
    expect(style[1], id).toMatch(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px)$/)
    // Pixels: the busy Button looks the same as with its words removed outright.
    const busy = await button.screenshot({ animations: 'disabled' })
    const undo = await removeWords(page, [id], { spinner: 'visible' })
    expect(await button.screenshot({ animations: 'disabled' }), id).toEqual(busy)
    await undo()
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

// O1 (VIS-N-01): Chromium paints forced colors whatever the fill says, so computed style can't see
// the words; pixels can. In forced colors, Light and Dark, a busy Button after the beat looks the
// same as with its label removed outright; its frame (border, background) is the frame at rest; a
// disabled one keeps GrayText; and after the fade back it is the Button at rest again.
for (const theme of ['light', 'dark']) {
  test(`forced colors (${theme}): after the beat only the spinner shows, in the frame it had at rest (O1)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    await page.emulateMedia({ forcedColors: 'active' })
    await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1`)
    const words = ['bl-medium-solid', 'bl-medium-outline', 'bl-medium-quiet', 'bl-link', 'bl-child', 'bl-n1-text', 'bl-fc-disabled']
    const elements = ['bl-strong', 'bl-multi', 'bl-n1-strong', 'bl-fc-red', 'bl-kbd']
    const shot = (id: string) => page.locator(`#${id}`).screenshot({ animations: 'disabled' })
    const all = [...words, ...elements]
    const rest: Record<string, Buffer> = {}
    for (const id of all) rest[id] = await shot(id)
    let undo = await removeWords(page, all, { spinner: 'hidden' })
    const restFrame: Record<string, Buffer> = {}
    for (const id of all) restFrame[id] = await shot(id)
    await undo()
    const disabledRest = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('bl-fc-disabled-plain')!); return [s.color, s.borderTopColor] })
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('bl-medium-solid')!).getPropertyValue('-webkit-text-fill-color')), { timeout: 3000 }).toBe('rgba(0, 0, 0, 0)')
    const busy: Record<string, Buffer> = {}
    for (const id of all) busy[id] = await shot(id)
    expect(await page.evaluate(() => { const s = getComputedStyle(document.getElementById('bl-fc-disabled')!); return [s.color, s.borderTopColor] }), 'a disabled loading Button keeps GrayText').toEqual(disabledRest)
    undo = await removeWords(page, all, { spinner: 'visible' })
    for (const id of all) expect(await shot(id), `${id}: busy, against its words removed`).toEqual(busy[id])
    await undo()
    undo = await removeWords(page, all, { spinner: 'hidden' })
    for (const id of all) expect(await shot(id), `${id}: busy frame, against rest`).toEqual(restFrame[id])
    await undo()
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(false))
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('[data-returning]').length), { timeout: 3000 }).toBe(0)
    for (const id of all) expect(await shot(id), `${id}: after, against rest`).toEqual(rest[id])
  })
}

// O2 (VIS-N-02, also in 1.1.1): in forced colors a Destructive Button's words and icon show, at rest,
// on hover, disabled, while loading (before the beat; after it the spinner) and after: by pixels,
// each draws ink inside its frame, and a disabled one draws it in GrayText.
for (const theme of ['light', 'dark']) {
  test(`forced colors (${theme}): a Destructive Button's words and icon show (O2)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    await page.emulateMedia({ forcedColors: 'active' })
    await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1&dz=1`)
    const ink = (id: string) => inkInside(page, id)
    const shown = async (ids: string[], state: string) => { for (const id of ids) expect(await ink(id), `${id} ${state}`).toBeGreaterThan(20) }
    const all = ['bl-dz', 'bl-dz-icon', 'bl-dz-disabled', 'bl-dz-lead']
    await shown(all, 'at rest')
    const plain = await page.evaluate(() => getComputedStyle(document.getElementById('bl-fc-disabled-plain')!).color)
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('bl-dz-disabled')!).color), 'disabled reads GrayText').toBe(plain)
    for (const id of ['bl-dz', 'bl-dz-icon', 'bl-dz-lead']) { await page.hover(`#${id}`); await shown([id], 'on hover') }
    await page.mouse.move(0, 0)
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
    await shown(['bl-dz', 'bl-dz-icon', 'bl-dz-lead'], 'loading, before the beat')
    await page.waitForTimeout(700)
    await shown(['bl-dz', 'bl-dz-icon', 'bl-dz-lead'], 'loading, after the beat')
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(false))
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('[data-returning]').length), { timeout: 3000 }).toBe(0)
    await shown(all, 'after loading')
  })
}

// P2 (FE-O-02, VIS-O-01): in forced colors an app's own colors on a busy Button (white text, a
// Tailwind bg-* text-white in a later layer, an inline box-shadow or gradient) don't come through:
// it shows ButtonText on ButtonFace (GrayText when disabled), as DIYA's own looks do, so its spinner
// shows in a light and a dark high-contrast theme; and its focus ring keeps its system color.
for (const theme of ['light', 'dark']) {
  test(`forced colors (${theme}): an app's own colors on a busy Button don't hide its spinner (P2)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    await page.emulateMedia({ forcedColors: 'active', colorScheme: theme as 'light' | 'dark' })
    await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1&fcapp=1`)
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('bl-medium-solid')!).getPropertyValue('-webkit-text-fill-color')), { timeout: 3000 }).toBe('rgba(0, 0, 0, 0)')
    const look = (id: string) => page.evaluate((id) => { const s = getComputedStyle(document.getElementById(id)!); return { color: s.color, background: s.backgroundColor, image: s.backgroundImage, border: s.borderTopColor, shadow: s.boxShadow } }, id)
    const own = await look('bl-medium-solid')
    const disabled = await look('bl-fc-disabled')
    for (const id of ['bl-app-white', 'bl-app-violet', 'bl-app-shadow', 'bl-app-gradient', 'bl-app-link']) expect(await look(id), id).toEqual(own)
    expect(await look('bl-app-disabled'), 'disabled: GrayText').toEqual(disabled)
    // Pixels: each spinner shows against its background.
    for (const id of ['bl-app-white', 'bl-app-violet', 'bl-app-disabled', 'bl-app-shadow', 'bl-app-gradient', 'bl-app-link']) expect(await inkInside(page, id), `${id}'s spinner`).toBeGreaterThan(20)
    // The focus ring keeps its system color.
    const ring = (id: string) => page.evaluate((id) => { const b = document.getElementById(id)!; (b as HTMLElement).focus({ focusVisible: true } as FocusOptions); const s = getComputedStyle(b); return [s.outlineStyle, s.outlineColor, s.outlineWidth] }, id)
    await page.keyboard.press('Shift')
    expect(await ring('bl-app-violet')).toEqual(await ring('bl-medium-solid'))
  })
}

// P4 (VIS-O-01): in forced colors a Button's words come back at once when loading ends: 20ms into
// the fade back a link Button, an asChild link, an app-styled Button and a plain one each look as
// they do once it's over (links no longer flash LinkText), and data-returning still clears. Against
// the frame after, to a few levels: Chromium's antialiasing on the pill's edge can differ by a level
// or two between frames (QA-M-04); a LinkText flash differs by about 160.
for (const theme of ['light', 'dark']) {
  test(`forced colors (${theme}): the words come back at once, with no LinkText flash (P4)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    await page.emulateMedia({ forcedColors: 'active', colorScheme: theme as 'light' | 'dark' })
    await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1&fcapp=1`)
    const ids = ['bl-link', 'bl-child', 'bl-app-link', 'bl-app-violet', 'bl-medium-solid']
    const shot = (id: string) => page.locator(`#${id}`).screenshot()
    const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
    await win(true)
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('bl-medium-solid')!).getPropertyValue('-webkit-text-fill-color')), { timeout: 3000 }).toBe('rgba(0, 0, 0, 0)')
    // Loading ends, and every fade back is slowed 50 times from 20ms in (held still, Chromium could
    // keep a stale paint, which a running fade doesn't).
    await page.evaluate((ids) => {
      ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(false)
      for (const id of ids) for (const animation of document.getElementById(id)!.getAnimations({ subtree: true })) { animation.currentTime = 20; animation.playbackRate = 0.02 }
    }, ids)
    const mid: Record<string, Buffer> = {}
    for (const id of ids) {
      expect(await page.locator(`#${id}`).getAttribute('data-returning'), `${id} is fading back`).toBe('true')
      mid[id] = await shot(id)
    }
    await page.evaluate((ids) => { for (const id of ids) for (const animation of document.getElementById(id)!.getAnimations({ subtree: true })) animation.playbackRate = 1 }, ids)
    await expect.poll(() => page.evaluate((ids) => ids.filter((id) => document.getElementById(id)!.hasAttribute('data-returning')), ids), { timeout: 3000 }).toEqual([])
    for (const id of ids) expect((await pixelDiff(page, mid[id], await shot(id))).max, `${id} 20ms into the fade back, against after`).toBeLessThanOrEqual(8)
  })
}

// P5 (MOT-O-01): in forced colors a busy Button paints its system colors from the first frame, with
// no transition from its own (a Destructive red, an app's bg-* with transition-colors): 30ms after
// loading starts each looks as it did at rest (to a few levels: Chromium's pill edge, QA-M-04).
for (const theme of ['light', 'dark']) {
  test(`forced colors (${theme}): no color flash as loading starts (P5)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    await page.emulateMedia({ forcedColors: 'active', colorScheme: theme as 'light' | 'dark' })
    await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1&dz=1&fcapp=1`)
    const ids = ['bl-dz', 'bl-medium-solid', 'bl-app-transition', 'bl-app-violet']
    const shot = (id: string) => page.locator(`#${id}`).screenshot()
    const rest: Record<string, Buffer> = {}
    for (const id of ids) rest[id] = await shot(id)
    // Loading starts, and anything moving on the Buttons is slowed 50 times from 30ms in.
    const moving = await page.evaluate((ids) => {
      ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(true)
      const out: string[] = []
      for (const id of ids) for (const animation of document.getElementById(id)!.getAnimations()) {
        if (animation instanceof CSSTransition) out.push(`${id} ${animation.transitionProperty}`)
        animation.currentTime = 30
        animation.playbackRate = 0.02
      }
      return out
    }, ids)
    for (const id of ids) expect((await pixelDiff(page, await shot(id), rest[id])).max, `${id} 30ms into loading, against rest`).toBeLessThanOrEqual(8)
    expect(moving, 'no color transition on a busy Button').toEqual([])
  })

  // And as it ends, after a short load (before the beat) and a long one: 20ms after, each looks as
  // it does once everything has settled.
  for (const wait of [200, 700]) {
    test(`forced colors (${theme}): no color flash as a ${wait}ms load ends (P5)`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
      await page.emulateMedia({ forcedColors: 'active', colorScheme: theme as 'light' | 'dark' })
      await openCase(page, testInfo, `case=loading&theme=${theme}&lean=1&dz=1&fcapp=1`)
      const ids = ['bl-dz', 'bl-medium-solid', 'bl-app-transition', 'bl-app-violet', 'bl-app-link']
      const shot = (id: string) => page.locator(`#${id}`).screenshot()
      await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
      await page.waitForTimeout(wait)
      const moving = await page.evaluate((ids) => {
        ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(false)
        const out: string[] = []
        for (const id of ids) for (const animation of document.getElementById(id)!.getAnimations({ subtree: true })) {
          if (animation instanceof CSSTransition && !['opacity', 'scale', 'translate', 'rotate', 'transform'].includes(animation.transitionProperty)) out.push(`${id} ${animation.transitionProperty}`)
          animation.currentTime = 20
          animation.playbackRate = 0.02
        }
        return out
      }, ids)
      const mid: Record<string, Buffer> = {}
      for (const id of ids) mid[id] = await shot(id)
      await page.evaluate((ids) => { for (const id of ids) for (const animation of document.getElementById(id)!.getAnimations({ subtree: true })) animation.playbackRate = 1 }, ids)
      await expect.poll(() => page.evaluate((ids) => ids.filter((id) => document.getElementById(id)!.hasAttribute('data-returning')), ids), { timeout: 3000 }).toEqual([])
      await page.waitForTimeout(300)
      for (const id of ids) expect((await pixelDiff(page, mid[id], await shot(id))).max, `${id} 20ms after loading, against after`).toBeLessThanOrEqual(8)
      expect(moving, 'no color transition as loading ends').toEqual([])
    })
  }
}

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

// O6 (FE-N-07): a Spinner of the reader's own beside a Button's words sits where a 16px icon would:
// the same Button width and the same distance from its edge, in the flow and while the Button loads.
test('a reader\'s own Spinner in a Button sits where an icon would (O6)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=loading&theme=light&rs=1')
  const place = (selectors: [string, string][]) => page.evaluate((selectors) => selectors.map(([button, part]) => {
    const b = document.querySelector(button)!.getBoundingClientRect()
    const p = document.querySelector(`${button} ${part}`)!.getBoundingClientRect()
    return [Math.round(b.width * 100) / 100, Math.round((b.right - p.right) * 100) / 100]
  }), selectors)
  const [spinner, icon] = await place([['#bl-own-spinner', '.diya-spinner'], ['#bl-own-icon', 'svg']])
  expect(spinner).toEqual(icon)
  await page.evaluate(() => (window as unknown as { __showRs(): void }).__showRs())
  const margins = await page.evaluate(() => ['#bl-rs-first', '#bl-rs-last', '#bl-rs-lead', '#bl-rs-icon'].map((id) => getComputedStyle(document.querySelector(`${id} .diya-spinner:not(.diya-button-spinner)`)!).marginInline))
  expect(margins).toEqual(['0px', '0px', '0px', '0px'])
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

// O5 (FE-N-04): a plain-text label is never wrapped, so React never moves or replaces its text
// nodes: on a translated page (Google Translate swaps each text node for <font>) every plain label
// survives loading on and off, given from the start, late, or starting undefined, plain, several
// parts, href and asChild, on React 18 and 19.
const translate = (page: Page, ids: string[]) => page.evaluate((ids) => {
  for (const id of ids) {
    const button = document.getElementById(id)!
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT)
    const texts: Text[] = []
    while (walker.nextNode()) if (!(walker.currentNode.parentElement!.closest('.diya-spinner')) && walker.currentNode.textContent!.trim()) texts.push(walker.currentNode as Text)
    for (const node of texts) { const outer = document.createElement('font'); const inner = document.createElement('font'); inner.textContent = node.textContent; outer.append(inner); node.replaceWith(outer) }
  }
}, ids)
test('translated plain labels survive loading on and off, however loading comes (O5)', async ({ page }, testInfo) => {
  const { errors } = await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = ['bl-n1-text', 'bl-tr-late', 'bl-tr-undef', 'bl-medium-solid', 'bl-late', 'bl-link', 'bl-child', 'bl-n1-emoji']
  await translate(page, ids)
  const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
  for (let round = 0; round < 2; round++) {
    await win(true)
    await page.waitForTimeout(500)
    await win(false)
    await page.waitForTimeout(300)
  }
  expect(errors).toEqual([])
  for (const id of ids) await expect(page.locator(`#${id}`), id).toHaveCount(1)
})

// O7 (FE-N-08): labels holding elements, given loading from the start (L1 wraps them from the
// first render), survive loading on and off on a translated page too: text and an element, an
// element first, an icon first, an element last, a kbd, and asChild. (Given late, an element label
// still crashes there: documented.)
test('translated labels holding elements, given loading from the start, survive loading on and off (O7)', async ({ page }, testInfo) => {
  const { errors } = await openCase(page, testInfo, 'case=loading&theme=light')
  const ids = ['bl-n1-strong', 'bl-strong', 'bl-lucide', 'bl-multi', 'bl-kbd', 'bl-n1-next', 'bl-fc-red', 'bl-logo']
  await translate(page, ids)
  const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
  for (let round = 0; round < 2; round++) {
    await win(true)
    await page.waitForTimeout(500)
    await win(false)
    await page.waitForTimeout(300)
  }
  expect(errors).toEqual([])
  for (const id of ids) await expect(page.locator(`#${id}`), id).toHaveCount(1)
})

// P1 (FE-O-01): asChild with a child that has no children of its own renders as in 1.1.1, whether
// or not loading is given, and loading doesn't crash it: a submit input keeps its words (it can't
// hold the spinner), an img stays, and a link component that labels itself from a prop keeps its
// label at rest.
test('asChild with a void element or a self-labeled component renders and loads without a crash (P1)', async ({ page }, testInfo) => {
  const { errors } = await openCase(page, testInfo, 'case=loading&theme=light&void=1')
  const read = () => page.evaluate(() => ['bl-void-input', 'bl-void-img', 'bl-void-nav'].map((id) => {
    const button = document.getElementById(id)!
    const twin = document.getElementById(`${id}-plain`)!
    return { id, tag: button.tagName, same: button.outerHTML.replace(/ id="[^"]*"/, '') === twin.outerHTML.replace(/ id="[^"]*"/, ''), text: button.textContent || (button as HTMLInputElement).value || '', fill: getComputedStyle(button).getPropertyValue('-webkit-text-fill-color') }
  }))
  const rest = await read()
  expect(rest.map(({ id, tag, same, text }) => [id, tag, same, text])).toEqual([['bl-void-input', 'INPUT', true, 'Send'], ['bl-void-img', 'IMG', true, ''], ['bl-void-nav', 'A', true, 'Go home']])
  const win = (value: boolean) => page.evaluate((value) => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(value), value)
  await win(true)
  await page.waitForTimeout(700)
  const busy = await read()
  expect(busy[0].fill, 'a loading submit input keeps its words').not.toBe('rgba(0, 0, 0, 0)')
  expect(busy.map(({ tag }) => tag)).toEqual(['INPUT', 'IMG', 'A'])
  await win(false)
  await page.waitForTimeout(400)
  expect((await read()).map(({ id, same, text }) => [id, same, text])).toEqual([['bl-void-input', true, 'Send'], ['bl-void-img', true, ''], ['bl-void-nav', true, 'Go home']])
  expect(errors).toEqual([])
})

// P3 (FE-O-03): with Reduce Motion and a common reset that forces every animation's delay and
// duration, the Button's own choreography holds: the spinner never shows over visible words or
// label parts, plain, href, asChild, rich text, several parts and a reader's Spinner (O9), and the
// beat still lands.
test('a reduced-motion reset never puts the spinner over the words (P3)', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openCase(page, testInfo, 'case=loading&theme=light&rs=1')
  await page.addStyleTag({ content: '@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-delay: -1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 0s !important; scroll-behavior: auto !important; } }' })
  await page.evaluate(() => (window as unknown as { __showRs(): void }).__showRs())
  await page.waitForTimeout(600)
  const result = await page.evaluate(() => new Promise<{ bad: string[]; landed: Record<string, number> }>((done) => {
    const ids = ['bl-medium-solid', 'bl-link', 'bl-child', 'bl-strong', 'bl-multi', 'bl-n1-text', 'bl-rs-last', 'bl-rs-first']
    const alpha = (color: string) => { const parts = color.match(/[\d.]+/g)!.map(Number); return parts.length > 3 ? parts[3] : 1 }
    const bad: string[] = []
    const landed: Record<string, number> = {}
    ;(window as unknown as { __setBusy(value: boolean): void }).__setBusy(true)
    const start = performance.now()
    const tick = () => {
      const t = performance.now() - start
      for (const id of ids) {
        const button = document.getElementById(id)!
        const spinner = button.querySelector<HTMLElement>('.diya-button-spinner')
        const ring = spinner && getComputedStyle(spinner).display !== 'none' ? Number(getComputedStyle(spinner).opacity) : 0
        const style = getComputedStyle(button)
        const words = alpha(style.getPropertyValue('-webkit-text-fill-color')) * alpha(style.color)
        const parts = Math.max(0, ...[...button.querySelectorAll<HTMLElement>(':scope > .diya-button-label > *, :scope > .diya-button-leading > .diya-button-leading-content > *')].map((part) => Number(getComputedStyle(part).opacity)))
        if (ring > 0.01) landed[id] ??= t
        if (button.getAttribute('aria-busy') === 'true' && ring > 0.01 && (words > 0.02 || parts > 0.02)) bad.push(`${id} at ${t.toFixed(0)}ms`)
      }
      if (t < 900) requestAnimationFrame(tick); else done({ bad: bad.filter((line, i) => bad.findIndex((other) => other.split(' at ')[0] === line.split(' at ')[0]) === i), landed })
    }
    tick()
  }))
  expect(result.bad, 'the spinner over the words (first frame of each)').toEqual([])
  for (const [id, t] of Object.entries(result.landed)) expect(t, `${id}'s beat`).toBeGreaterThan(300)
  expect(Object.keys(result.landed)).toHaveLength(8)
})

// Q1 (VIS-P-01): an asChild child that ignores its children (a component rendering its own label)
// never shows the spinner, so it keeps its words while it loads, as in 1.1.1, in normal and forced
// colors; an asChild submit input too. A Button that holds its spinner still hides its words.
for (const forced of [false, true]) {
  test(`an asChild child with no spinner keeps its words while loading${forced ? ', in forced colors' : ''} (Q1)`, async ({ page }, testInfo) => {
    if (forced) test.skip(testInfo.project.name.split('-')[0] !== 'chromium', 'forced colors are emulated in Chromium')
    if (forced) await page.emulateMedia({ forcedColors: 'active' })
    const { errors } = await openCase(page, testInfo, 'case=loading&theme=light&void=1')
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('bl-medium-solid')!).getPropertyValue('-webkit-text-fill-color')), { timeout: 3000 }).toBe('rgba(0, 0, 0, 0)')
    await page.waitForTimeout(200)
    const fill = (id: string) => page.evaluate((id) => getComputedStyle(document.getElementById(id)!).getPropertyValue('-webkit-text-fill-color'), id)
    for (const id of ['bl-void-self', 'bl-void-input']) {
      expect(await page.locator(`#${id}`).getAttribute('aria-busy'), id).toBe('true')
      expect(await fill(id), `${id} keeps its words`).not.toBe('rgba(0, 0, 0, 0)')
      expect(await inkInside(page, id), `${id}'s words show`).toBeGreaterThan(20)
    }
    expect(await page.locator('#bl-void-self').textContent()).toBe('Go home')
    expect(errors).toEqual([])
  })
}

// Q3 (F16): a Button that is both disabled and loading looks disabled: the same dim and cursor as
// its twin that is only disabled, in every frame from loading start through the fade back (the dim
// never animates); after the beat, by pixels, it is itself at rest (only disabled) but for its
// spinner, which shows, dimmed with it. (Pixels against itself: the twin sits at another subpixel
// offset.) Every look (solid, outline, quiet, destructive, a link, asChild), Light, Dark and Glass.
for (const [theme, glass] of [['light', 0], ['dark', 0], ['light', 1], ['dark', 1]] as const) {
  test(`disabled and loading looks disabled (${theme}${glass ? ', glass' : ''}) (Q3)`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=loading&theme=${theme}&glass=${glass}&lean=1&dis=1`)
    const ids = ['bl-dis-solid', 'bl-dis-outline', 'bl-dis-quiet', 'bl-dis-destructive', 'bl-dis-link', 'bl-dis-child']
    const shot = (id: string) => page.locator(`#${id}`).screenshot({ animations: 'disabled' })
    let undo = await removeWords(page, ids, { spinner: 'hidden' })
    const rest: Record<string, Buffer> = {}
    for (const id of ids) rest[id] = await shot(id)
    await undo()
    const frames = await page.evaluate((ids) => new Promise<string[]>((done) => {
      const out: string[] = []
      const win = window as unknown as { __setBusy(value: boolean): void }
      win.__setBusy(true)
      const start = performance.now()
      setTimeout(() => win.__setBusy(false), 600)
      const tick = () => {
        const t = performance.now() - start
        for (const id of ids) {
          const button = document.getElementById(id)!
          const twin = getComputedStyle(document.getElementById(`${id}-plain`)!).opacity
          const own = getComputedStyle(button).opacity
          if (own !== twin) out.push(`${id} at ${t.toFixed(0)}ms: ${own} against ${twin}`)
        }
        if (t < 1000) requestAnimationFrame(tick); else done(out)
      }
      tick()
    }), ids)
    expect(frames, 'the same dim in every frame').toEqual([])
    // Busy after the beat: only the spinner differs.
    await page.evaluate(() => (window as unknown as { __setBusy(value: boolean): void }).__setBusy(true))
    await page.waitForTimeout(700)
    for (const id of ids) expect(await page.locator(`#${id}`).evaluate((node) => getComputedStyle(node).cursor), id).toBe(await page.locator(`#${id}-plain`).evaluate((node) => getComputedStyle(node).cursor))
    undo = await removeWords(page, ids, { spinner: 'hidden' })
    for (const id of ids) expect((await pixelDiff(page, await shot(id), rest[id])).max, `${id} busy, without words or spinner, against itself at rest`).toBeLessThanOrEqual(8)
    await undo()
    // The spinner shows, dimmed with the Button.
    for (const id of ids) expect(await page.locator(`#${id} .diya-button-spinner`).evaluate((node) => [getComputedStyle(node).display !== 'none', Number(getComputedStyle(node).opacity)]), id).toEqual([true, 1])
  })
}

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
