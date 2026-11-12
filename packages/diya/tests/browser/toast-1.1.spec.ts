// <Toast> as 1.1 apps use it: a host keeps one notice in state and unmounts it in onDismiss.
// These hold through 1.2, where every <Toast> joins its provider's stack.
import { expect, test, type Page } from '@playwright/test'
import { isPhone, openCase } from './helpers'

test.beforeEach(({}, testInfo) => { test.skip(isPhone(testInfo), 'one size is enough for timing') })

/** Toasts a reader can see and reach: not the exit copies, which are aria-hidden pictures. */
const liveToasts = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.diya-alert')]
  .filter((node) => !node.closest('[aria-hidden="true"]'))
  .map((node) => node.querySelector('.diya-alert-title')?.textContent ?? ''))
const log = (page: Page) => page.evaluate(() => (window as unknown as { __log: { event: string; detail?: string; at: number }[] }).__log)

test('the close button calls onDismiss at once; the exit plays on an inert, hidden copy', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=toast&duration=0')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => liveToasts(page)).toEqual(['Draft saved'])
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Dismiss/ }).click()
  const right = await page.evaluate(() => {
    const copies = [...document.querySelectorAll<HTMLElement>('[aria-hidden="true"]')].filter((node) => node.querySelector('.diya-alert') || node.classList.contains('diya-alert'))
    return copies.map((copy) => ({ inert: copy.inert, running: copy.getAnimations().length, roles: copy.querySelectorAll('[role]').length }))
  })
  expect(await liveToasts(page)).toEqual([])
  expect((await log(page)).filter((entry) => entry.event === 'dismiss').map((entry) => entry.detail)).toEqual(['Draft saved'])
  expect(right).toEqual([{ inert: true, running: 1, roles: 0 }])
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => [...document.querySelectorAll('[aria-hidden="true"]')].filter((node) => node.querySelector('.diya-alert')).length)).toBe(0)
})

test('times out after its duration, paused while the pointer is on it', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=toast&duration=1000')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => liveToasts(page)).toEqual(['Draft saved'])
  await page.waitForTimeout(500)
  await page.locator('.diya-alert').first().hover()
  await page.waitForTimeout(1200)
  expect(await liveToasts(page)).toEqual(['Draft saved'])
  await page.mouse.move(5, 5)
  await page.waitForTimeout(300)
  expect(await liveToasts(page)).toEqual(['Draft saved'])
  await expect.poll(() => liveToasts(page), { timeout: 2000 }).toEqual([])
  const entries = await log(page)
  const raised = entries.find((entry) => entry.event === 'raise')!.at
  const dismissed = entries.find((entry) => entry.event === 'dismiss')!.at
  // 1000ms of showing, plus the ~1200ms the pointer held it.
  expect(dismissed - raised).toBeGreaterThan(2000)
  expect(dismissed - raised).toBeLessThan(3200)
})

test('a toast with an action never times out', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=toast&duration=400')
  await page.getByRole('button', { name: 'Archive' }).click()
  await page.waitForTimeout(1500)
  expect(await liveToasts(page)).toEqual(['3 emails archived'])
  await page.getByRole('button', { name: 'Undo' }).click()
  expect((await log(page)).some((entry) => entry.event === 'undo')).toBe(true)
})

test('a keyed host replaces its notice: one toast, the newest', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=toast&duration=0')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => liveToasts(page)).toEqual(['Draft saved'])
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect.poll(() => liveToasts(page)).toEqual(['Link copied'])
  await page.waitForTimeout(400)
  expect(await liveToasts(page)).toEqual(['Link copied'])
})

for (const keyed of ['1', '0']) {
  test(`raised again while the last one leaves, the new notice stays (${keyed === '1' ? 'keyed' : 'keyless'} host)`, async ({ page }, testInfo) => {
    await openCase(page, testInfo, `case=toast&duration=0&keyed=${keyed}`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => liveToasts(page)).toEqual(['Draft saved'])
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^Dismiss/ }).click()
    await page.waitForTimeout(40)
    await page.getByRole('button', { name: 'Copy link' }).click()
    await page.waitForTimeout(500)
    expect(await liveToasts(page)).toEqual(['Link copied'])
  })
}

test('Escape on a focused toast dismisses it and returns focus', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=toast&duration=0')
  const save = page.getByRole('button', { name: 'Save' })
  await save.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => liveToasts(page)).toEqual(['Draft saved'])
  await page.getByRole('button', { name: /^Dismiss/ }).focus()
  await page.keyboard.press('Escape')
  expect(await liveToasts(page)).toEqual([])
  await expect(save).toBeFocused()
})
