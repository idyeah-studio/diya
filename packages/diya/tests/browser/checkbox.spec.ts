// Checkbox (1.2) in a real browser: Choice's box value for value, no grow-in on page load for a
// mixed box, the label's link, Enter submitting, forced colors, and axe.
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { openCase } from './helpers'

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const props = ['width', 'height', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'background-color', 'margin-top', 'appearance']
const mark = ['width', 'height', 'border-right-width', 'transform', 'opacity']
const read = (page: Page, selector: string) => page.locator(selector).evaluate((node, [props, mark]) => {
  const box = getComputedStyle(node)
  const before = getComputedStyle(node, '::before')
  return [...props.map((name) => `${name}:${box.getPropertyValue(name)}`), ...mark.map((name) => `::before ${name}:${before.getPropertyValue(name)}`)]
}, [props, mark] as const)

for (const theme of ['light', 'dark']) {
  test(`13 computed properties equal Choice's box, unchecked and checked, in ${theme}`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=checkbox&theme=${theme}`)
    await page.waitForFunction(() => document.getAnimations().length === 0)
    const choice = (label: string) => `xpath=//span[text()="${label}"]/ancestor::label[1]//input`
    const off = await read(page, choice('Unchecked option'))
    const on = await read(page, choice('Checked option'))
    expect(off).toHaveLength(13)
    expect(await read(page, '#cb-off')).toEqual(off)
    expect(await read(page, '#cb-on')).toEqual(on)
  })
}

test('0 running animations after a server-rendered page hydrates with a mixed Checkbox and a mixed Select all (MOT-1.2-05)', async ({ page }, testInfo) => {
  // The server's HTML paints first, then hydration sets the mixed property: the dash must already
  // be showing, so nothing grows in.
  await openCase(page, testInfo, 'case=checkbox&theme=light&ssr=1')
  await page.waitForSelector('html[data-hydrated]', { state: 'attached' })
  const running = await page.evaluate(() => document.getAnimations().map((animation) => (animation.effect as KeyframeEffect | null)?.target?.toString() ?? '?'))
  expect(running).toEqual([])
  for (const selector of ['#cb-mixed', 'input[aria-label="Select all"]']) {
    expect(await page.locator(selector).evaluate((node) => (node as HTMLInputElement).indeterminate), selector).toBe(true)
    expect(await page.locator(selector).evaluate((node) => getComputedStyle(node, '::before').opacity), selector).toBe('1')
  }
})

test('a link in the label opens without toggling the box', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=checkbox&theme=light')
  await page.getByRole('link', { name: 'Terms' }).click()
  await expect(page).toHaveURL(/#terms$/)
  await expect(page.locator('#cb-terms')).not.toBeChecked()
  await page.getByText('I agree to the').click()
  await expect(page.locator('#cb-terms')).toBeChecked()
})

test('Space toggles and Enter submits the form, as natively (Switch toggles on Enter)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=checkbox&theme=light')
  await page.locator('#cb-off').focus()
  await page.keyboard.press(' ')
  await expect(page.locator('#cb-off')).toBeChecked()
  await page.keyboard.press('Enter')
  await expect(page.locator('#cb-off')).toBeChecked()
  await expect(page.locator('#cb-sent')).toHaveText('1')
})

test('forced colors: the native box', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await openCase(page, testInfo, 'case=checkbox&theme=light')
  expect(await page.locator('#cb-on').evaluate((node) => getComputedStyle(node).appearance)).not.toBe('none')
  expect(await page.locator('#cb-mixed').evaluate((node) => getComputedStyle(node, '::before').display)).toBe('none')
})

test('an axe check', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=checkbox&theme=light')
  await page.waitForFunction(() => document.getAnimations().length === 0)
  await page.addScriptTag({ path: axePath })
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run('#cb-form', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
    return result.violations.map((violation) => `${violation.id} (${violation.nodes.length})`)
  })
  expect(violations).toEqual([])
})

// Step 9's refinements, made in Choice and Checkbox together: the small box centers on its 20px
// line, and the large box draws a 5x10 tick and a 10x2 bar. Medium doesn't change.
test('the small box centers on its line; the large mark is a 5x10 tick and a 10x2 bar', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=marks&theme=light')
  await page.waitForFunction(() => document.getAnimations().length === 0)
  const measure = () => page.evaluate(() => {
    const center = (node: Element) => { const box = node.getBoundingClientRect(); return box.top + box.height / 2 }
    const mark = (node: Element) => { const before = getComputedStyle(node, '::before'); return `${before.width}x${before.height}` }
    const row = (size: string) => document.querySelector(`[data-size-row="${size}"]`)!
    const choiceBox = (size: string, label: string) => [...row(size).querySelectorAll('.diya-choice-option')].find((option) => option.textContent === label)!.querySelector('input')!
    const offsets = ['small', 'medium', 'large'].flatMap((size) => [
      [choiceBox(size, 'Alpha'), choiceBox(size, 'Alpha').closest('label')!.querySelector('.diya-choice-label')!],
      [document.getElementById(`cb-${size}`)!, document.getElementById(`cb-${size}`)!.closest('.diya-checkbox-field')!.querySelector('.diya-checkbox-label')!],
    ].map(([box, label]) => {
      const line = parseFloat(getComputedStyle(label).lineHeight)
      return `${size} ${Math.round((center(box) - (label.getBoundingClientRect().top + line / 2)) * 100) / 100}`
    }))
    return {
      offsets,
      ticks: ['small', 'large'].flatMap((size) => [mark(choiceBox(size, 'Alpha')), mark(document.getElementById(`cb-${size}`)!)]),
      bars: ['small', 'large'].flatMap((size) => [mark(row(size).querySelector('input[aria-label="Select all"]')!), mark(document.getElementById(`cb-${size}-mixed`)!)]),
      medium: [mark(choiceBox('medium', 'Alpha')), mark(document.getElementById('cb-medium')!), mark(row('medium').querySelector('input[aria-label="Select all"]')!), mark(document.getElementById('cb-medium-mixed')!)],
    }
  })
  const found = await measure()
  // Every box's center on its first line's center.
  // Small was 1px high; medium is 1.1.1's (its box is 18px on a 20px line, 1px down, centered);
  // large sits 1px down, as before.
  expect(found.offsets).toEqual(['small 0', 'small 0', 'medium 0', 'medium 0', 'large 0', 'large 0'])
  expect(found.ticks).toEqual(['4pxx8px', '4pxx8px', '5pxx10px', '5pxx10px'])
  expect(found.bars).toEqual(['8pxx2px', '8pxx2px', '10pxx2px', '10pxx2px'])
  expect(found.medium).toEqual(['4pxx8px', '4pxx8px', '8pxx2px', '8pxx2px'])
})

// K2 (FE S78-02): a mixed box that's clicked is checked, and shows its check, not the dash; the
// next render puts the app's mixed state back (property and look together).
test('a mixed box the app leaves mixed shows its check after a click; the next render makes it mixed again', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=checkbox&theme=light')
  const box = page.locator('#cb-mixed')
  const state = () => box.evaluate((node) => {
    const input = node as HTMLInputElement
    const mark = getComputedStyle(input, '::before')
    return { checked: input.checked, indeterminate: input.indeterminate, mark: `${mark.width}x${mark.height}` }
  })
  await page.waitForFunction(() => document.getAnimations().length === 0)
  expect(await state()).toEqual({ checked: false, indeterminate: true, mark: '8pxx2px' })
  await box.click()
  await expect.poll(state).toEqual({ checked: true, indeterminate: false, mark: '4pxx8px' })
  // Any render (here, the form's submit count) puts the prop back.
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.locator('#cb-sent')).toHaveText('1')
  await expect.poll(state).toEqual({ checked: false, indeterminate: true, mark: '8pxx2px' })
})
