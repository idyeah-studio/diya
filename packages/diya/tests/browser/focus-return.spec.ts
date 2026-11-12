// Focus returns to what the person clicked, in every engine (F2). Safari's clicks don't focus a
// button, so a Dialog or Drawer opened from one by mouse used to return focus to <body> on close
// (Q-03, since 1.0.1), and a toast's × clicked while typing elsewhere dropped focus to <body>
// (UX-R3-01). Each spec runs in Chromium, WebKit and Firefox; WebKit is the one that failed.
import { expect, test, type Page } from '@playwright/test'
import { openCase } from './helpers'

const focused = (page: Page) => page.evaluate(() => {
  const node = document.activeElement as HTMLElement | null
  return !node || node === document.body ? 'BODY' : node instanceof HTMLInputElement ? `input:${node.value}` : node.getAttribute('aria-label') ?? node.textContent?.trim() ?? node.tagName
})

test.describe('a Dialog or Drawer opened by mouse returns focus to its opener (Q-03)', () => {
  test('a Drawer opened from a button by mouse, closed with Escape', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=overlays&theme=light')
    await page.getByRole('button', { name: 'Open drawer' }).click()
    await expect(page.locator('dialog[open]')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect.poll(() => focused(page)).toBe('Open drawer')
  })

  test('a Drawer opened from a button by mouse, closed with its close button by mouse', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=overlays&theme=light')
    await page.getByRole('button', { name: 'Open drawer' }).click()
    await page.locator('dialog[open]').getByRole('button', { name: /close/i }).first().click()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect.poll(() => focused(page)).toBe('Open drawer')
  })

  test('a Dialog without a trigger, opened from a button by mouse, closed with Escape', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#open-dialog').click()
    await expect(page.locator('dialog[open]')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect.poll(() => focused(page)).toBe('Open dialog')
  })
})

test.describe("a toast's close button clicked while typing elsewhere returns focus there (UX-R3-01)", () => {
  test('a <Toast>', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    const field = page.getByRole('textbox', { name: 'Project name' })
    await field.click()
    await page.evaluate(() => { (window as any).comps.add({ title: 'Reply saved' }) })
    await field.click()
    await page.getByRole('button', { name: 'Dismiss: Reply saved' }).click()
    await expect.poll(() => focused(page)).toBe('input:Atlas')
    await page.keyboard.type('!')
    await expect(field).toHaveValue('Atlas!')
  })

  test('a toast()', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    const field = page.getByRole('textbox', { name: 'Project name' })
    await page.evaluate(() => (window as any).diya.toast({ title: 'Reply saved', duration: 0 }))
    await field.click()
    await page.getByRole('button', { name: 'Dismiss: Reply saved' }).click()
    await expect.poll(() => focused(page)).toBe('input:Atlas')
  })
})
