// Combobox follows the control height tokens (VIS-SITE2-01): under Compact it's as tall as a Text
// Input at every size, and at the default heights it keeps 1.1.1's box, chips and all.
import { expect, test, type Page } from '@playwright/test'
import { openCase } from './helpers'

const heights = (page: Page) => page.evaluate(() => Object.fromEntries(['small', 'medium', 'large'].map((size) => {
  const box = (selector: string, part: string) => document.querySelector(selector)!.closest(part)!.getBoundingClientRect().height
  return [size, { combobox: box(`#hc-${size}`, '.diya-combobox-control'), input: box(`#ht-${size}`, '.diya-text-field-control') }]
})))

for (const [name, tokens, expected] of [
  ['Compact', '36,28,44', { small: 28, medium: 36, large: 44 }],
  ['Roomy', '44,36,52', { small: 36, medium: 44, large: 52 }],
  ['the defaults', '', { small: 32, medium: 40, large: 48 }],
] as const) {
  test(`a Combobox is as tall as a Text Input at every size under ${name}`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=heights&theme=light${tokens ? `&h=${tokens}` : ''}`)
    const measured = await heights(page)
    for (const size of ['small', 'medium', 'large'] as const) {
      expect(measured[size].input, `Text Input ${size}`).toBe(expected[size])
      expect(measured[size].combobox, `Combobox ${size}`).toBe(expected[size])
    }
  })
}

test('at the default heights the padding is 1.1.1\'s: 6px, 3px at Small, and a row of wrapped chips keeps it', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=heights&theme=light')
  const padding = await page.evaluate(() => ['#hc-small', '#hc-medium', '#hc-large', '#hc-chips'].map((selector) => {
    const control = document.querySelector(selector)!.closest('.diya-combobox-control')!
    const style = getComputedStyle(control)
    return `${style.paddingTop} ${style.paddingBottom}`
  }))
  expect(padding).toEqual(['3px 3px', '6px 6px', '6px 6px', '6px 6px'])
})
