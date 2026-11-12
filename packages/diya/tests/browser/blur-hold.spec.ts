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
