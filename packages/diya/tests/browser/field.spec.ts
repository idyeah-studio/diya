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

// G1 (FE-01): a hosted field fills the frame, whatever the provider puts in it. Stripe's mount div
// holds an iframe sized `width: 1px !important; min-width: 100% !important`; others hand over a
// bare iframe; split fields put one in each Field.
test.describe('a hosted field fills its frame (G1)', () => {
  const inner = (page: Page, selector: string) => page.evaluate((selector) => {
    const node = document.querySelector(selector)!
    const frame = node.closest('.diya-field-frame')!
    const style = getComputedStyle(frame)
    const content = frame.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth)
    return { content: Math.round(content), width: Math.round(node.getBoundingClientRect().width) }
  }, selector)
  for (const [name, selector] of [['a mount div (Stripe)', '#stripe-mount'], ["the mount div's iframe (Stripe)", 'iframe[title="Stripe-like card"]'], ['a bare iframe', 'iframe[title="Bare card"]'], ['split fields: the number', 'iframe[title="Split number"]'], ['split fields: the expiry', 'iframe[title="Split expiry"]'], ['a mount div with a plain iframe (the field case)', '.mount']] as const) {
    test(name, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=${selector === '.mount' ? 'field' : 'providers'}&theme=light`)
      await page.locator(selector).waitFor({ state: 'attached' })
      const { content, width } = await inner(page, selector)
      expect(content).toBeGreaterThan(200)
      expect(Math.abs(width - content)).toBeLessThanOrEqual(1)
    })
  }
})

// G2 (FE-08): a framed native select keeps a menu indicator, and a framed textarea shows its lines.
test('a framed select shows an indicator; a framed textarea shows 3 lines (G2)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=providers&theme=light')
  const select = await page.locator('#framed-select').evaluate((node) => {
    const frame = node.parentElement!
    const after = getComputedStyle(frame, '::after')
    const native = getComputedStyle(node).appearance !== 'none'
    return { native, chevron: after.content !== 'none' && after.content !== 'normal' && parseFloat(after.width) >= 12 && after.maskImage.includes('svg') }
  })
  expect(select.native || select.chevron).toBe(true)
  const notes = await page.locator('#framed-notes').evaluate((node) => {
    const area = node as HTMLTextAreaElement
    return { clipped: area.scrollHeight - area.clientHeight, lines: Math.round(area.clientHeight / parseFloat(getComputedStyle(area).lineHeight)) }
  })
  expect(notes.clipped).toBeLessThanOrEqual(1)
  expect(notes.lines).toBeGreaterThanOrEqual(3)
})

// G5 (UX-S56-03, FE-05, VIS-S56-01): the frame's ring follows focus into, between and out of
// hosted iframes, in all three engines; the field focus arrives in says its error.
test.describe('the ring follows focus across hosted iframes (G5)', () => {
  const frameOf = (page: Page, title: string) => page.locator('.diya-field-frame').filter({ has: page.locator(`iframe[title="${title}"]`) })
  const ready = async (page: Page) => {
    for (const title of ['Split number', 'Split expiry']) await page.frameLocator(`iframe[title="${title}"]`).locator('#card').waitFor()
  }
  test('moves from one split field to the next', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=providers&theme=light')
    await ready(page)
    await page.frameLocator('iframe[title="Split number"]').locator('#card').click()
    await expect(frameOf(page, 'Split number')).toHaveAttribute('data-focused', '')
    await page.frameLocator('iframe[title="Split expiry"]').locator('#card').click()
    await expect(frameOf(page, 'Split expiry')).toHaveAttribute('data-focused', '')
    await expect(frameOf(page, 'Split number')).not.toHaveAttribute('data-focused', '')
  })

  test('clears when you click blank page', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=providers&theme=light')
    await ready(page)
    await page.frameLocator('iframe[title="Split number"]').locator('#card').click()
    await expect(frameOf(page, 'Split number')).toHaveAttribute('data-focused', '')
    await page.locator('#blank').click()
    await expect(frameOf(page, 'Split number')).not.toHaveAttribute('data-focused', '')
  })

  test("the split field focus arrives in says its error", async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=providers&theme=light&error=1')
    await ready(page)
    await page.frameLocator('iframe[title="Split number"]').locator('#card').click()
    await page.frameLocator('iframe[title="Split expiry"]').locator('#card').click()
    await expect(page.locator('.diya-toast-host > [aria-live=polite]')).toHaveText('Expiry: Enter the expiry date.')
  })
})

// G9 (UX-S56-02): a field's error inside the app's own showModal() dialog is said inside that
// dialog, where a screen reader can reach it (everything outside a modal is inert).
test("a field error in the app's own modal dialog is said inside it (G9)", async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light')
  await page.evaluate(() => (window as any).openNative())
  await page.locator('#coupon').fill('AB1')
  await page.keyboard.press('Tab')
  await expect(page.locator('#coupon')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('dialog#native .diya-toast-host > [aria-live=polite]')).toHaveText('Coupon code: Enter all 6 characters of the code.')
})

// H1 (FE G-01, VIS-G-03): the framed select's chevron sits over the select, as Select's does, so a
// click on it opens the select; a list-box select (multiple, or size > 1) has none.
test.describe('the framed select’s chevron (H1)', () => {
  test('a click on the chevron reaches the select', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=providers&theme=light')
    const frame = (await page.locator('#framed-select').locator('..').boundingBox())!
    const point = { x: frame.x + frame.width - 20, y: frame.y + frame.height / 2 }
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, point)).toBe('framed-select')
    await page.mouse.click(point.x, point.y)
    await page.keyboard.press('Escape')
    // A click on a select focuses it in Chromium and Firefox; Safari's clicks don't focus, but
    // the click lands on the select all the same (above).
    if (testInfo.project.name.startsWith('webkit')) return
    await expect(page.locator('#framed-select')).toBeFocused()
  })

  test('a list-box select has no chevron', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=providers&theme=light')
    const after = await page.locator('#framed-list').evaluate((node) => getComputedStyle(node.parentElement!, '::after').content)
    expect(['none', 'normal']).toContain(after)
  })
})
