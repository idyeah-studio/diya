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
