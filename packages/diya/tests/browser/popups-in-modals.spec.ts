// Every DIYA popup works inside an open Dialog and Drawer: it is the top element at its point,
// takes a real click, and Esc closes one layer at a time. A third-party popup portalled to
// document.body is covered by the modal; given the modal (or useDiyaPortalContainer()) it works.
import { expect, test } from '@playwright/test'
import { isTopAtCenter, lastClicked, openCase } from './helpers'

for (const where of ['dialog', 'drawer'] as const) {
  test.describe(`popups inside a ${where}`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await openCase(page, testInfo, 'case=popups')
      // From the keyboard, so every engine focuses the opener (WebKit doesn't focus a clicked button).
      await page.focus(`#open-${where}`)
      await page.keyboard.press('Enter')
      await page.locator('dialog[open]').waitFor()
      await page.waitForTimeout(350)
    })

    test('Menu', async ({ page }) => {
      await page.getByRole('button', { name: `Menu ${where}` }).click()
      const item = page.getByRole('menuitem', { name: 'Rename' })
      await item.waitFor()
      await page.waitForTimeout(250)
      expect(await isTopAtCenter(page, item)).toBe(true)
      await item.click()
      expect(await lastClicked(page)).toBe(`menu-${where}`)
    })

    test('Popover', async ({ page }) => {
      await page.getByRole('button', { name: `Popover ${where}`, exact: true }).click()
      const inside = page.getByRole('button', { name: `Inside popover ${where}` })
      await inside.waitFor()
      await page.waitForTimeout(250)
      expect(await isTopAtCenter(page, inside)).toBe(true)
      await inside.click()
      expect(await lastClicked(page)).toBe(`popover-${where}`)
    })

    test('Tooltip', async ({ page }, testInfo) => {
      test.skip((testInfo.project.metadata as { size: string }).size === 'phone', 'hover')
      await page.getByRole('button', { name: `Tip trigger ${where}` }).hover()
      const tip = page.getByRole('tooltip')
      await tip.waitFor({ state: 'visible' })
      await page.waitForTimeout(250)
      expect(await isTopAtCenter(page, tip)).toBe(true)
    })

    test('Combobox', async ({ page }) => {
      const field = page.getByRole('combobox', { name: `Combo ${where}` })
      await field.click()
      const option = page.locator('[role=option]', { hasText: 'Bravo' })
      await option.waitFor()
      await page.waitForTimeout(250)
      expect(await isTopAtCenter(page, option)).toBe(true)
      await option.click()
      await expect(field).toHaveValue('Bravo')
    })

    test('Date Picker', async ({ page }) => {
      await page.locator('dialog[open]').getByRole('button', { name: /Choose date|Date/ }).first().click()
      const grid = page.locator('[role=grid]:visible')
      await grid.waitFor()
      await page.waitForTimeout(250)
      const day = grid.locator('button[role=gridcell]').nth(10)
      expect(await isTopAtCenter(page, day)).toBe(true)
      await day.click()
      await expect(grid).toBeHidden()
    })

    test('Select', async ({ page }) => {
      const select = page.getByRole('combobox', { name: `Select ${where}` })
      await select.selectOption('c')
      await expect(select).toHaveValue('c')
    })

    test('Toast', async ({ page }) => {
      await page.getByRole('button', { name: `Toast ${where}` }).click()
      const undo = page.getByRole('button', { name: `Undo ${where}` })
      await undo.waitFor()
      await page.waitForTimeout(300)
      expect(await isTopAtCenter(page, undo)).toBe(true)
      await undo.click()
      expect(await lastClicked(page)).toBe(`toast-${where}`)
    })

    test('a third-party popup in document.body is covered; given the modal, it works', async ({ page }) => {
      await page.click(`#tp-body-${where}-trigger`)
      await page.locator(`#tp-body-${where}-item`).waitFor()
      expect(await isTopAtCenter(page, `#tp-body-${where}-item`)).toBe(false)
      await page.click(`#tp-ref-${where}-trigger`)
      await page.locator(`#tp-ref-${where}-item`).waitFor()
      expect(await isTopAtCenter(page, `#tp-ref-${where}-item`)).toBe(true)
      await page.click(`#tp-ref-${where}-item`)
      expect(await lastClicked(page)).toBe(`tp-ref-${where}`)
    })

    test('Esc closes one layer at a time, then focus returns to the opener', async ({ page }) => {
      await page.getByRole('button', { name: `Menu ${where}` }).focus()
      await page.keyboard.press('Enter')
      await page.getByRole('menuitem', { name: 'Rename' }).waitFor()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeHidden()
      await expect(page.locator('dialog[open]')).toHaveCount(1)
      await expect(page.getByRole('button', { name: `Menu ${where}` })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.locator('dialog[open]')).toHaveCount(0)
      await expect(page.locator(`#open-${where}`)).toBeFocused()
    })
  })
}
