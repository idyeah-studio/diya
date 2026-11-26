// 1.3: a Dialog whose confirm action runs can't be dismissed, in every engine. Chromium let a
// second Escape through a cancel handler's preventDefault() (its close-watcher rule); DIYA
// prevents Escape's keydown at the window, so four in a row hold. Popups inside still close first,
// one layer at a time. The close button belongs to the title row only, in Dialog and Drawer.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { engine, isPhone, openCase } from './helpers'

type Log = { event: string; detail?: unknown }[]
const log = (page: Page) => page.evaluate(() => (window as unknown as { __log: Log }).__log.map(({ event, detail }) => ({ event, detail })))
const dialog = (page: Page) => page.locator('dialog.diya-dialog')
const isOpen = (locator: Locator) => locator.evaluate((node) => (node as HTMLDialogElement).open)
const polite = (page: Page) => page.evaluate(() => document.querySelector('dialog[open] .diya-toast-host > [aria-live=polite]')?.textContent ?? '')

/** Opens the busy case's Dialog from the keyboard (every engine then focuses inside it). */
async function openDialog(page: Page, testInfo: Parameters<typeof openCase>[1], query = '') {
  await openCase(page, testInfo, `case=busy${query}`)
  await page.focus('#open-busy')
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toHaveAttribute('open', '')
  await page.waitForTimeout(350)
}

/** A real click at an element's center, even where it takes no pointer events (as an unavailable button). */
async function clickAt(page: Page, locator: Locator) {
  const box = (await locator.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function startWork(page: Page) {
  await page.getByRole('button', { name: 'Remove workspace', exact: true }).last().click()
  await page.waitForFunction(() => !!(window as unknown as { __settle?: unknown }).__settle)
}

const settle = (page: Page, how: 'resolve' | 'reject') => page.evaluate((how) => {
  const settle = (window as unknown as { __settle: { resolve: () => void; reject: (error: Error) => void } }).__settle
  if (how === 'resolve') settle.resolve()
  else settle.reject(new Error('The workspace is in use. Try again in a minute.'))
}, how)

test.describe('a Dialog whose confirm action runs', () => {
  test('holds through four Escapes, the close button, Cancel and a click outside', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    await startWork(page)
    const close = page.getByRole('button', { name: 'Close dialog' })
    const cancel = page.getByRole('button', { name: 'Cancel' })
    // Focus on a button inside, then on <body>: four Escapes each.
    await close.focus()
    for (let press = 0; press < 4; press++) await page.keyboard.press('Escape')
    expect(await isOpen(dialog(page)), 'Escape with focus on a button').toBe(true)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    for (let press = 0; press < 4; press++) await page.keyboard.press('Escape')
    expect(await isOpen(dialog(page)), 'Escape with focus on body').toBe(true)
    await clickAt(page, close)
    await clickAt(page, cancel)
    await cancel.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await page.mouse.click(10, 10)
    expect(await isOpen(dialog(page))).toBe(true)
    expect((await log(page)).filter(({ event }) => event === 'dismiss')).toEqual([])
    // Then it settles, and Escape works again.
    await settle(page, 'reject')
    await expect(page.getByRole('alert')).toHaveText('The workspace is in use. Try again in a minute.')
    await page.keyboard.press('Escape')
    await expect(dialog(page)).not.toHaveAttribute('open', '')
  })

  test('the close button and Cancel stay focusable, are found as unavailable, and Tab reaches them', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    const cancel = page.getByRole('button', { name: 'Cancel' })
    await cancel.focus()
    // An app's own save sets loading while focus is on Cancel: focus stays there.
    await page.evaluate(() => (window as unknown as { __setLoading: (value: boolean) => void }).__setLoading(true))
    await expect(page.getByRole('button', { name: 'Cancel', disabled: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close dialog', disabled: true })).toBeVisible()
    expect(await cancel.evaluate((node) => node === document.activeElement)).toBe(true)
    await page.getByRole('button', { name: 'Close dialog' }).focus()
    // WebKit tabs to buttons with Option, as Safari does.
    const tab = engine(testInfo) === 'webkit' ? 'Alt+Tab' : 'Tab'
    await page.keyboard.press(tab)
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Cancel')
    await page.keyboard.press(tab)
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Remove workspace')
    await page.evaluate(() => (window as unknown as { __setLoading: (value: boolean) => void }).__setLoading(false))
    await expect(page.getByRole('button', { name: 'Cancel', disabled: true })).toHaveCount(0)
  })

  test('closes when it succeeds and returns focus to the trigger', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    await startWork(page)
    await settle(page, 'resolve')
    await expect(dialog(page)).not.toHaveAttribute('open', '')
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('open-busy')
  })

  test('a failure shows, focus stays in the dialog, and the buttons are available again', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    const confirm = page.getByRole('button', { name: 'Remove workspace', exact: true }).last()
    await confirm.focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => !!(window as unknown as { __settle?: unknown }).__settle)
    await settle(page, 'reject')
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await confirm.evaluate((node) => node === document.activeElement)).toBe(true)
    await expect(page.getByRole('button', { name: 'Cancel', disabled: true })).toHaveCount(0)
  })

  test('after a pointer click on confirm, focus stays where the engine put it', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    await startWork(page)
    await settle(page, 'reject')
    await expect(page.getByRole('alert')).toBeVisible()
    const where = await page.evaluate(() => {
      const active = document.activeElement
      const modal = document.querySelector('dialog.diya-dialog')!
      return active === modal ? 'dialog' : modal.contains(active) ? active!.textContent : 'outside'
    })
    // WebKit doesn't focus a clicked button: focus stays where it was, inside the dialog.
    if (engine(testInfo) === 'webkit') expect(where).not.toBe('outside')
    else expect(where).toBe('Remove workspace')
  })

  test('says "Working…" politely on the beat, not before', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    await startWork(page)
    await page.waitForTimeout(200)
    expect(await polite(page)).toBe('')
    await expect.poll(() => polite(page), { timeout: 2000 }).toBe('Working…')
    await settle(page, 'resolve')
  })

  test('the close button and Cancel dim on the beat, not at once', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    const opacity = () => page.evaluate(() => ['.diya-dialog-close', '.diya-dialog-actions .diya-button[data-variant=quiet]'].map((selector) => getComputedStyle(document.querySelector(selector)!).opacity))
    await startWork(page)
    await page.waitForTimeout(150)
    expect(await opacity()).toEqual(['1', '1'])
    await page.waitForTimeout(800)
    expect(await opacity()).toEqual(['0.4', '0.4'])
    await settle(page, 'reject')
    await expect.poll(opacity).toEqual(['1', '1'])
  })

  test('a close request Chromium won\'t let it stop shows it again', async ({ page }, testInfo) => {
    test.skip(engine(testInfo) !== 'chromium', 'requestClose() without a user activation is Chromium\'s')
    await openDialog(page, testInfo)
    await startWork(page)
    await page.evaluate(() => {
      const node = document.querySelector('dialog.diya-dialog') as HTMLDialogElement & { requestClose?: () => void }
      node.requestClose?.()
    })
    await page.waitForTimeout(100)
    await page.evaluate(() => (document.querySelector('dialog.diya-dialog') as HTMLDialogElement & { requestClose?: () => void }).requestClose?.())
    await page.waitForTimeout(200)
    expect(await isOpen(dialog(page))).toBe(true)
    expect((await log(page)).filter(({ event }) => event === 'dismiss')).toEqual([])
  })

  test('reads the description, then the note in its body', async ({ page }, testInfo) => {
    await openDialog(page, testInfo)
    const ids = (await dialog(page).getAttribute('aria-describedby'))!.split(' ')
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe('busy-note')
    await expect(page.locator(`[id="${ids[0]}"]`)).toHaveClass('diya-dialog-description')
  })
})

test.describe('popups inside a locked Dialog still close first', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await openDialog(page, testInfo, '&popups=1&size=large')
    await startWork(page)
  })
  const closesFirst = async (page: Page, open: () => Promise<Locator>) => {
    const popup = await open()
    await expect(popup).toBeVisible()
    await page.waitForTimeout(250)
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    expect(await isOpen(dialog(page))).toBe(true)
    // And the next Escape is refused too.
    await page.keyboard.press('Escape')
    expect(await isOpen(dialog(page))).toBe(true)
  }
  // Opened from the keyboard, so every engine focuses the opener (WebKit doesn't focus a clicked button).
  const press = async (page: Page, opener: Locator) => { await opener.focus(); await page.keyboard.press('Enter') }
  test('Menu', async ({ page }) => closesFirst(page, async () => {
    await press(page, page.getByRole('button', { name: 'Workspace actions' }))
    return page.getByRole('menu')
  }))
  test('Popover', async ({ page }) => closesFirst(page, async () => {
    await press(page, page.getByRole('button', { name: 'Workspace filters' }))
    return page.getByRole('button', { name: 'Inside the popover' })
  }))
  test('Tooltip', async ({ page }) => closesFirst(page, async () => {
    await page.getByRole('button', { name: 'About removing' }).focus()
    return page.getByRole('tooltip')
  }))
  test('Combobox', async ({ page }) => closesFirst(page, async () => {
    await page.getByRole('combobox', { name: 'Owner' }).click()
    return page.getByRole('listbox')
  }))
  test('Date Picker', async ({ page }) => closesFirst(page, async () => {
    await press(page, page.locator('dialog[open]').getByRole('button', { name: /Remove on/ }))
    return page.locator('[role=grid]:visible')
  }))
  test('Select (native): Escape on it leaves the dialog open', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Region' }).focus()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    expect(await isOpen(dialog(page))).toBe(true)
  })
})

test.describe('a Drawer that can\'t be dismissed', () => {
  test('holds through four Escapes, its close button and a click outside; then closes again', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=busy&drawer=1&held=1')
    const drawer = page.locator('dialog.diya-drawer-modal')
    await expect(drawer).toHaveAttribute('open', '')
    await page.waitForTimeout(350)
    const close = page.getByRole('button', { name: 'Close drawer' })
    await expect(page.getByRole('button', { name: 'Close drawer', disabled: true })).toBeVisible()
    await close.focus()
    for (let press = 0; press < 4; press++) await page.keyboard.press('Escape')
    await clickAt(page, close)
    await page.keyboard.press('Enter')
    // Outside it: the left edge of the page on a desktop; a phone's Drawer fills the screen.
    if (!isPhone(testInfo)) await page.mouse.click(10, 10)
    expect(await isOpen(drawer)).toBe(true)
    expect((await log(page)).filter(({ event, detail }) => event === 'drawer' && detail === false)).toEqual([])
    await page.evaluate(() => (window as unknown as { __setHeld: (value: boolean) => void }).__setHeld(false))
    await close.focus()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toHaveAttribute('open', '')
  })
})

test.describe('the close button belongs to the title row', () => {
  const measure = (page: Page, root: string) => page.evaluate((root) => {
    const modal = document.querySelector(root)!
    const box = (selector: string) => {
      const node = modal.querySelector(selector)
      if (!node) return null
      const { top, bottom, left, right, width, height } = node.getBoundingClientRect()
      return { top, bottom, left, right, width, height }
    }
    const drawer = root.includes('drawer')
    return {
      title: box(drawer ? '.diya-drawer-title' : '.diya-dialog-title')!,
      description: box(drawer ? '.diya-drawer-description' : '.diya-dialog-description'),
      close: box(drawer ? 'header > .diya-button' : '.diya-dialog-close')!,
      body: box(drawer ? '.diya-drawer-body > p' : '.diya-dialog-content')!,
      heading: box(drawer ? 'header' : '.diya-dialog-heading')!,
    }
  }, root)

  for (const size of ['small', 'medium', 'large'] as const) {
    test(`Dialog, ${size}: the description is as wide as the body; the title leaves 46px for the close button`, async ({ page }, testInfo) => {
      await openDialog(page, testInfo, `&size=${size}`)
      const m = await measure(page, 'dialog.diya-dialog')
      expect(m.description!.width).toBeCloseTo(m.body.width, 0)
      expect(m.title.width).toBeCloseTo(m.body.width - 46, 0)
      expect(m.close.top - m.title.top).toBeCloseTo(-2, 0)
      expect(m.close.right - m.body.right).toBeCloseTo(6, 0)
      expect(m.description!.top - m.title.bottom).toBeCloseTo(8, 0)
    })
  }

  test('Dialog, at 320px too', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'phone projects only')
    await page.setViewportSize({ width: 320, height: 700 })
    await openDialog(page, testInfo)
    const m = await measure(page, 'dialog.diya-dialog')
    expect(m.description!.width).toBeCloseTo(m.body.width, 0)
    expect(m.title.width).toBeCloseTo(m.body.width - 46, 0)
  })

  test('Dialog with a title only: the heading is the title\'s 24px', async ({ page }, testInfo) => {
    await openDialog(page, testInfo, '&desc=0')
    const m = await measure(page, 'dialog.diya-dialog')
    expect(m.heading.height).toBeCloseTo(24, 0)
    expect(m.close.top - m.title.top).toBeCloseTo(-2, 0)
  })

  test('Drawer: the description is as wide as the body, 8px under the title; the close button centers on the title', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=busy&drawer=1')
    await page.waitForTimeout(400)
    const m = await measure(page, 'dialog.diya-drawer-modal')
    expect(m.description!.width).toBeCloseTo(m.body.width, 0)
    expect(m.title.width).toBeCloseTo(m.body.width - 56, 0)
    expect(m.description!.top - m.title.bottom).toBeCloseTo(8, 0)
    expect((m.close.top + m.close.bottom) / 2).toBeCloseTo((m.title.top + m.title.bottom) / 2, 0)
    expect(m.close.right).toBeCloseTo(m.body.right, 0)
    // The close button never overlaps the description.
    expect(m.close.bottom).toBeLessThanOrEqual(m.description!.top + 0.5)
  })
})
