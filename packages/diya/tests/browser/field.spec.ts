// Field (1.2) in a real browser: the frame matches TextInput, a hosted iframe stays see-through in
// Dark, the label reaches into an iframe, focus in a cross-origin iframe shows on the frame, and
// nothing scrolls sideways at 320px.
import { expect, test, type Page } from '@playwright/test'
import { engine, openCase } from './helpers'

const box = (page: Page, selector: string) => page.locator(selector).evaluate((node) => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width } })

test('TextInput and Field framed + input are pixel-equal: label 10, control 40, help 10, total height', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=field&theme=light')
  const [textInput, field] = [page.locator('#pair > div').nth(0), page.locator('#pair > div').nth(1)]
  const measure = (wrapper: typeof textInput) => wrapper.evaluate((node) => {
    const label = node.querySelector('label')!.getBoundingClientRect()
    const control = node.querySelector('.diya-text-field-control')!.getBoundingClientRect()
    const help = node.querySelector('.diya-text-field-description')!.getBoundingClientRect()
    const all = node.getBoundingClientRect()
    return { labelGap: Math.round(control.top - label.bottom), control: Math.round(control.height), helpGap: Math.round(help.top - control.bottom), total: Math.round(all.height * 100) / 100, width: Math.round(all.width * 100) / 100 }
  })
  const a = await measure(textInput)
  const b = await measure(field)
  expect(a).toEqual({ labelGap: 10, control: 40, helpGap: 10, total: a.total, width: a.width })
  expect(b).toEqual(a)
  // The same words, the same pixels.
  const [shotA, shotB] = [await textInput.screenshot(), await field.screenshot()]
  expect(shotB.equals(shotA)).toBe(true)
})

test('an iframe in a Dark frame has no opaque backing', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=field&theme=dark')
  const frame = page.locator('iframe[title="Expiry input"]')
  await expect(frame).toBeVisible()
  expect(await frame.evaluate((node) => getComputedStyle(node).colorScheme)).toBe('light')
  // A point inside the iframe, clear of its input's text, reads the frame's dark fill, not white.
  const area = (await frame.boundingBox())!
  const shot = await page.screenshot({ clip: { x: area.x + area.width - 20, y: area.y + area.height / 2, width: 4, height: 4 } })
  const [r, g, b] = await page.evaluate(async (data) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = new OffscreenCanvas(image.width, image.height)
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return [...context.getImageData(1, 1, 1, 1).data]
  }, shot.toString('base64'))
  expect(Math.max(r, g, b)).toBeLessThan(90)
})

test("a label click puts focus in the iframe's input", async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=field&theme=light')
  await page.frameLocator('iframe[title="Card number input"]').locator('#card').waitFor()
  await page.getByText('Card number', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('title'))).toBe('Card number input')
  await expect(page.frameLocator('iframe[title="Card number input"]').locator('#card')).toBeFocused()
})

test('data-focused follows a click into a cross-origin iframe, and leaving it', async ({ page }, testInfo) => {
  test.skip(engine(testInfo) === 'firefox', 'Firefox sends the page no blur when focus enters a frame; checked headed at the release gate')
  await openCase(page, testInfo, 'case=field&theme=light')
  const card = page.frameLocator('iframe[title="Card number input"]').locator('#card')
  await card.waitFor()
  const frame = page.locator('.diya-field-frame').filter({ has: page.locator('iframe[title="Card number input"]') })
  await card.click()
  await expect(frame).toHaveAttribute('data-focused', '')
  await page.locator('#fi').click()
  await expect(frame).not.toHaveAttribute('data-focused', '')
})

test('data-focused follows Tab into a cross-origin iframe', async ({ page }, testInfo) => {
  test.skip(engine(testInfo) === 'firefox', 'Firefox sends the page no blur when focus enters a frame; checked headed at the release gate')
  await openCase(page, testInfo, 'case=field&theme=light')
  await page.frameLocator('iframe[title="Card number input"]').locator('#card').waitFor()
  await page.locator('#fi').focus()
  await page.keyboard.press(engine(testInfo) === 'webkit' ? 'Alt+Tab' : 'Tab')
  const frame = page.locator('.diya-field-frame').filter({ has: page.locator('iframe[title="Card number input"]') })
  await expect(frame).toHaveAttribute('data-focused', '')
})

test('320px: no sideways scroll', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await openCase(page, testInfo, 'case=field&theme=light&narrow=1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
