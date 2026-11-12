// The nine theming tokens of 1.2: unset, every value they reach computes exactly as in 1.1.1
// (fixtures/tokens-1.1.1.json, measured once on the 1.1.1 build); a brand file reaches what it
// should; a value set on an outer provider stays out of a nested one.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { engine, isPhone, openCase } from './helpers'

const FIXTURE = join(import.meta.dirname, 'fixtures', 'tokens-1.1.1.json')
const writing = process.env.DIYA_WRITE_TOKENS_FIXTURE === '1'
const appearances = { light: 'theme=light', dark: 'theme=dark', 'glass-light': 'theme=light&glass=1', 'glass-dark': 'theme=dark&glass=1' } as const

/** Every computed value the nine tokens can reach, read as strings. */
async function measure(page: Page, scope = 'body') {
  const read = (selector: string, properties: string[]) => page.evaluate(([scope, selector, properties]) => {
    const node = document.querySelector(scope)!.querySelector<HTMLElement>(selector)
    if (!node) return null
    const style = getComputedStyle(node)
    return Object.fromEntries(properties.map((name) => [name, style.getPropertyValue(name)]))
  }, [scope, selector, properties] as const)
  const out: Record<string, unknown> = {}
  for (const size of ['small', 'medium', 'large']) out[`button-${size}`] = await read(`[data-k=button-${size}]`, ['min-height', 'height'])
  out['button-icon'] = await read('[data-k=button-icon]', ['width', 'height'])
  for (const [key, selector] of [['text', '.diya-text-field-control'], ['textarea', '.diya-textarea textarea'], ['select', '.diya-select-control'], ['combobox', '.diya-combobox-control'], ['date', '.diya-date-trigger']])
    out[key] = await read(selector, ['background-color', 'border-top-color', 'height', 'min-height'])
  out['text-invalid'] = await read('.diya-text-field[data-invalid="true"] .diya-text-field-control', ['border-top-color'])
  out.tab = await read('.diya-tab', ['min-height', 'height'])
  for (const [key, selector] of [['page-title', '.diya-page-header-title, .diya-page-header-copy > h1, .diya-page-header-copy > h2'], ['card-title', '.diya-card-title']]) out[key] = await read(selector, ['color'])
  // Focus rings, from the keyboard.
  await page.keyboard.press('Shift')
  await page.locator(`${scope} [data-k=button-medium]`).evaluate((node: HTMLElement) => node.focus({ focusVisible: true } as FocusOptions))
  out['focus-button'] = await read('[data-k=button-medium]', ['outline-color', 'outline-width', 'outline-offset'])
  await page.locator(`${scope} [data-k=text] input, ${scope} input[data-k=text]`).first().focus()
  out['focus-field'] = await read('.diya-text-field-control', ['outline-color', 'outline-width', 'outline-offset'])
  // The open Menu and Dialog corners.
  await page.locator(scope).getByRole('button', { name: 'Actions' }).click()
  await page.locator('.diya-floating-surface').first().waitFor()
  out.menu = await page.evaluate(() => getComputedStyle(document.querySelector('.diya-floating-surface')!).borderTopLeftRadius)
  await page.keyboard.press('Escape')
  await page.locator(scope).getByRole('button', { name: 'Open dialog' }).click()
  await page.locator('dialog[open]').waitFor()
  out.dialog = await page.evaluate(() => { const dialog = document.querySelector('dialog[open]')!; return { radius: getComputedStyle(dialog).borderTopLeftRadius, title: getComputedStyle(dialog.querySelector('.diya-dialog-title')!).color } })
  await page.keyboard.press('Escape')
  return out
}

test.describe('theming tokens', () => {
  test.beforeEach(({}, testInfo) => { test.skip(isPhone(testInfo), 'one size measures the tokens') })

  for (const [appearance, query] of Object.entries(appearances)) {
    test(`unset tokens resolve to 1.1.1's computed values (${appearance})`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=tokens&motion=off&${query}`)
      const got = await measure(page)
      const key = `${engine(testInfo)}-${(testInfo.project.metadata as { react: string }).react}-${appearance}`
      if (writing) {
        const all = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {}
        all[key] = got
        writeFileSync(FIXTURE, `${JSON.stringify(Object.fromEntries(Object.entries(all).sort()), null, 2)}\n`)
        return
      }
      expect(got).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8'))[key])
    })
  }

  test('a brand file reaches the intended selectors and not the wordmark', async ({ page }, testInfo) => {
    test.skip(writing)
    await openCase(page, testInfo, 'case=tokens&motion=off&theme=light&brand=1')
    const got = await measure(page)
    expect(got['button-medium']).toMatchObject({ 'min-height': '44px' })
    expect(got['button-small']).toMatchObject({ 'min-height': '36px' })
    expect(got['button-large']).toMatchObject({ 'min-height': '52px' })
    expect(got['button-icon']).toEqual({ width: '44px', height: '44px' })
    expect(got.text).toMatchObject({ 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(125, 140, 142)', height: '44px' })
    expect(got['text-invalid']).not.toEqual({ 'border-top-color': 'rgb(125, 140, 142)' })
    expect(got.tab).toMatchObject({ 'min-height': '44px' })
    expect(got['focus-button']).toMatchObject({ 'outline-color': 'rgb(15, 107, 112)' })
    expect(got['focus-field']).toMatchObject({ 'outline-color': 'rgb(15, 107, 112)' })
    expect(got['page-title']).toEqual({ color: 'rgb(11, 74, 78)' })
    expect(got['card-title']).toEqual({ color: 'rgb(11, 74, 78)' })
    expect(got.dialog).toMatchObject({ title: 'rgb(11, 74, 78)' })
    // Body text keeps the text color: the heading token reaches titles only.
    const text = await page.evaluate(() => getComputedStyle(document.querySelector('.diya-text-field > label')!).color)
    expect(text).not.toBe('rgb(11, 74, 78)')
  })

  test('under Glass a set field color stays see-through, at the glass strength', async ({ page }, testInfo) => {
    test.skip(writing)
    await openCase(page, testInfo, 'case=tokens&motion=off&theme=light&glass=1&brand=1')
    const fill = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.diya-text-field-control, .diya-combobox-control, .diya-date-trigger')].map((node) => getComputedStyle(node).backgroundColor))
    // #ffffff at 66% in Glass Light: the brand's white, still glass.
    for (const value of fill) expect(value).toMatch(/^(color\(srgb 1 1 1 \/ 0\.66\)|rgba\(255, 255, 255, 0\.66\))$/)
  })

  test('a nested Dark provider inside a branded outer shows default tokens', async ({ page }, testInfo) => {
    test.skip(writing)
    await openCase(page, testInfo, 'case=tokens&motion=off&outer=1')
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-k=outer-button]')!).minHeight)).toBe('60px')
    const nested = await measure(page, '#nested')
    const dark = JSON.parse(readFileSync(FIXTURE, 'utf8'))[`${engine(testInfo)}-${(testInfo.project.metadata as { react: string }).react}-dark`]
    for (const key of ['button-small', 'button-medium', 'button-large', 'button-icon', 'text', 'textarea', 'select', 'combobox', 'date', 'tab', 'focus-button', 'focus-field', 'card-title'])
      expect(nested[key], key).toEqual(dark[key])
    expect(nested.menu).toBe(dark.menu)
  })
})
