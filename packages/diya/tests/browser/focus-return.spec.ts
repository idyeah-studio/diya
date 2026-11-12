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

// G7 (FE-04): a Dialog mounted by its opener's own click, with no other overlay on the page,
// returns focus there the first time (the press is remembered from the provider's mount on).
test('a Dialog mounted by its opener’s click, with no other overlay on the page, returns focus there (G7)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=providers&theme=light')
  await page.locator('#later-open').click()
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect.poll(() => focused(page)).toBe('Open later')
})

// G8 (UX-S56-04): × on a toast while typing keeps your typing, in every engine and for both toast
// APIs: focus goes back to where it came from before the place the toast was raised.
test.describe('× on a toast raised by another button, while typing in a field (G8)', () => {
  for (const [kind, raise, title] of [['a <Toast>', '#post-comment', 'Comment posted'], ['a toast()', '#post-toast', 'Comment saved']] as const) {
    test(kind, async ({ page }, testInfo) => {
      await openCase(page, testInfo, 'case=probe&theme=light')
      await page.locator(raise).click()
      const field = page.getByRole('textbox', { name: 'Project name' })
      await field.click()
      await page.keyboard.press('End')
      await page.keyboard.type(' Labs')
      await page.getByRole('button', { name: `Dismiss: ${title}` }).click()
      await page.keyboard.type('!')
      await expect(field).toHaveValue('Atlas Labs!')
    })
  }
})

// H2 (FE G-02, UX-G-01; a regression from G8): where focus came into the stack from belongs to
// that visit only. Once focus has left the stack, × and Undo send it to the last place you were.
test.describe('an earlier visit to the stack is forgotten (H2)', () => {
  test('an earlier F8 visit, then a field, typing, then ×', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#post-toast').click()
    const name = page.getByRole('textbox', { name: 'Project name' })
    await name.focus()
    await page.keyboard.press('F8')
    await expect(page.getByRole('button', { name: 'Dismiss: Comment saved' })).toBeFocused()
    await page.locator('#extra').click()
    await page.keyboard.type('B')
    await page.locator('#probe-blank').click()
    await page.getByRole('button', { name: 'Dismiss: Comment saved' }).click()
    await page.keyboard.type('!')
    await expect(page.locator('#extra')).toHaveValue('B!')
    await expect(name).toHaveValue('Atlas')
  })

  test('Tab into the stack and out, then a field, typing, then Undo', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.evaluate(() => { (window as any).comps.add({ title: 'Comment posted', action: { label: 'Undo', onClick() {} } }) })
    const tab = testInfo.project.name.startsWith('webkit') ? 'Alt+Tab' : 'Tab'
    await page.locator('#open-dialog').focus()
    await page.keyboard.press(tab)
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused()
    await page.keyboard.press(`Shift+${tab}`)
    await expect(page.locator('#open-dialog')).toBeFocused()
    const name = page.getByRole('textbox', { name: 'Project name' })
    await name.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Labs')
    await page.getByRole('button', { name: 'Undo' }).click()
    await page.keyboard.type('!')
    await expect(name).toHaveValue('Atlas Labs!')
  })
})

// H3 (UX-G-02): in Safari a click on × inside a Dialog focuses the dialog itself, not <body>;
// that counts as "focus isn't anywhere useful" too, so the chain returns it to the field.
test('× on a <Toast> in a Dialog while typing in the Dialog keeps your typing (H3)', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=probe&theme=light')
  await page.locator('#open-dialog').click()
  const task = page.getByRole('textbox', { name: 'Task name' })
  await task.click()
  await page.evaluate(() => { (window as any).comps.add({ title: 'Saved' }) })
  await task.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' v2')
  await page.getByRole('button', { name: 'Dismiss: Saved' }).click()
  await page.keyboard.type('!')
  await expect(task).toHaveValue('Write the brief v2!')
})

// UX-H-01 (UX's exact repros): in Safari a press on × or Undo never moves focus into the stack, so
// where focus was is read at the press; and focus never returns to something that isn't a
// control (a <dialog>, a container). Chromium and Firefox already passed.
test.describe('× or Undo while typing, on a toast raised from a button or inside a Dialog (UX-H-01)', () => {
  const typeThenClose = async (page: Page, field: import('@playwright/test').Locator, typed: string, control: string) => {
    await field.click()
    await page.keyboard.press('End')
    await page.keyboard.type(typed)
    await page.getByRole('button', { name: control, exact: true }).click()
    await page.keyboard.type('!')
  }
  test('page: Enter on a button raises it; type in a field; ×', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#post-undo').focus()
    await page.keyboard.press('Enter')
    const name = page.getByRole('textbox', { name: 'Project name' })
    await typeThenClose(page, name, ' Labs', 'Dismiss: Comment hidden')
    await expect(name).toHaveValue('Atlas Labs!')
  })

  test('page: Enter on a button raises it; type in a field; Undo', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#post-undo').focus()
    await page.keyboard.press('Enter')
    const name = page.getByRole('textbox', { name: 'Project name' })
    await typeThenClose(page, name, ' Labs', 'Undo')
    await expect(name).toHaveValue('Atlas Labs!')
  })

  test('Dialog: a click on Save raises it; type in the Dialog’s field; ×', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#open-dialog').click()
    await page.locator('#dialog-save').click()
    const task = page.getByRole('textbox', { name: 'Task name' })
    await typeThenClose(page, task, ' v2', 'Dismiss: Brief saved')
    await expect(task).toHaveValue('Write the brief v2!')
  })

  test('Dialog: Enter on Save raises it; type in the Dialog’s field; ×', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=probe&theme=light')
    await page.locator('#open-dialog').click()
    await page.locator('#dialog-save').focus()
    await page.keyboard.press('Enter')
    const task = page.getByRole('textbox', { name: 'Task name' })
    await typeThenClose(page, task, ' v2', 'Dismiss: Brief saved')
    await expect(task).toHaveValue('Write the brief v2!')
  })
})
