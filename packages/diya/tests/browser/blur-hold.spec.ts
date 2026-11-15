// A field's error that appears as you leave it waits for the press to end (MOT-1.2-04; motion's
// blur-form check, made permanent): leaving the field by pressing Pay never moves Pay out from
// under the pointer, so the click lands wherever on the button it was pressed.
import { expect, test } from '@playwright/test'
import { openCase } from './helpers'

test('a click pressed 8, 20 and 32px into the submit button submits 3 of 3', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=field&theme=light')
  let submitted = 0
  for (const depth of [8, 20, 32]) {
    // Each round: no error showing, focus in the field, a value too short.
    await page.locator('#cvc').fill('123')
    await page.locator('#cvc').evaluate((node) => (node as HTMLInputElement).blur())
    await expect(page.locator('#pay .diya-text-field-description')).toBeHidden()
    await page.locator('#cvc').fill('1')
    const button = (await page.locator('#submit').boundingBox())!
    await page.mouse.move(button.x + button.width / 2, button.y + depth, { steps: 2 })
    await page.mouse.down()
    await page.waitForTimeout(80)
    await page.mouse.up()
    await expect(page.locator('#pay .diya-text-field-description')).toBeVisible()
    submitted += 1
    await expect(page.locator('#paid')).toHaveText(String(submitted))
  }
})

// Step 6: DIYA's own fields hold their error the same way. In 1.1.1 a TextInput's error appeared
// at pointerdown and pushed the button away before the release.
test('a TextInput: a click pressed 8, 20 and 32px into the submit button submits 3 of 3', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=field&theme=light')
  let submitted = 0
  for (const depth of [8, 20, 32]) {
    await page.locator('#cvc-ti').fill('123')
    await page.locator('#cvc-ti').evaluate((node) => (node as HTMLInputElement).blur())
    await expect(page.locator('#pay-ti .diya-text-field-description')).toBeHidden()
    await page.locator('#cvc-ti').fill('1')
    const button = (await page.locator('#submit-ti').boundingBox())!
    await page.mouse.move(button.x + button.width / 2, button.y + depth, { steps: 2 })
    await page.mouse.down()
    await page.waitForTimeout(80)
    await page.mouse.up()
    await expect(page.locator('#pay-ti .diya-text-field-description')).toBeVisible()
    submitted += 1
    await expect(page.locator('#paid-ti')).toHaveText(String(submitted))
  }
})

// G3 (FE-02, UX-S56-01): on touch, the field blurs at the compatibility mousedown, after
// pointerup, so the hold has to last until the tap's click. Chromium and WebKit with touch.
test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true })
  test.skip(({ browserName }) => browserName === 'firefox', 'Playwright has no touch or mobile emulation for Firefox')
  for (const [form, field, submit, paid] of [['#pay', '#cvc', '#submit', '#paid'], ['#pay-ti', '#cvc-ti', '#submit-ti', '#paid-ti']] as const) {
    test(`a tap 8, 20 and 32px into Pay right after typing submits 3 of 3 (${form === '#pay' ? 'Field' : 'TextInput'})`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, 'case=field&theme=light')
      let submitted = 0
      for (const depth of [8, 20, 32]) {
        await page.locator(field).fill('123')
        await page.locator(field).evaluate((node) => (node as HTMLInputElement).blur())
        await expect(page.locator(`${form} .diya-text-field-description`)).toBeHidden()
        await page.locator(field).fill('1')
        const button = (await page.locator(submit).boundingBox())!
        await page.touchscreen.tap(button.x + button.width / 2, button.y + depth)
        await expect(page.locator(`${form} .diya-text-field-description`)).toBeVisible()
        submitted += 1
        await expect(page.locator(paid)).toHaveText(String(submitted))
      }
    })
  }
})

// G4 (FE-03): a press whose release the page never sees doesn't hold later errors. Keyboard
// blurs show at once (frontend.md step 5).
test.describe('a press the page never sees end (G4)', () => {
  const keyboardBlurShows = async (page: import('@playwright/test').Page) => {
    await page.locator('#cvc-ti').focus()
    await page.locator('#cvc-ti').fill('1')
    await page.keyboard.press('Tab')
    await expect(page.locator('#pay-ti .diya-text-field-description')).toBeVisible({ timeout: 500 })
    await expect(page.locator('#cvc-ti')).toHaveAttribute('aria-invalid', 'true')
  }
  test('a press released inside a cross-origin iframe', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=field&theme=light')
    await page.frameLocator('iframe[title="Card number input"]').locator('#card').waitFor()
    const frame = (await page.locator('iframe[title="Card number input"]').boundingBox())!
    // Pressed on the page, released inside the hosted field: the page sees no pointerup.
    await page.mouse.move(frame.x + 10, frame.y - 30)
    await page.mouse.down()
    await page.mouse.move(frame.x + 40, frame.y + frame.height / 2, { steps: 5 })
    await page.mouse.up()
    await keyboardBlurShows(page)
  })

  test('a secondary-button press with no release (a context menu)', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=field&theme=light')
    await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, isPrimary: true, pointerType: 'mouse' })))
    await keyboardBlurShows(page)
  })
})
