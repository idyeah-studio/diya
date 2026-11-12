// 1.1's motion behaviors, made permanent (they were ad-hoc probes during the 1.1 review).
import { expect, test, type Page } from '@playwright/test'
import { engine, isPhone, openCase } from './helpers'

test.beforeEach(({}, testInfo) => { test.skip(isPhone(testInfo), 'desktop behaviors') })

const shownTips = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role=tooltip]')]
  .filter((node) => !node.dataset.exiting && node.style.visibility !== 'hidden' && Number(getComputedStyle(node).opacity) > 0)
  .map((node) => node.textContent))

test.describe('Tooltip', () => {
  // Firefox can start a page with the pointer where the last test left it, over a trigger.
  test.beforeEach(async ({ page }) => { await page.mouse.move(1, 1) })
  test('a mouse rests 300ms before it shows', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=tips')
    await page.mouse.move(1, 1)
    await page.waitForTimeout(500)
    const bold = page.getByRole('button', { name: 'Bold', exact: true })
    // Timed in the page, from the pointer's arrival to the first frame the bubble shows, so a
    // busy machine can only make it later, never earlier.
    await bold.evaluate((node) => { (window as unknown as { __waited: Promise<number> }).__waited = new Promise<number>((done) => {
      node.addEventListener('mouseover', () => {
        const start = performance.now()
        const check = () => {
          const shown = [...document.querySelectorAll<HTMLElement>('[role=tooltip]')].some((tip) => !tip.dataset.exiting && Number(getComputedStyle(tip).opacity) > 0)
          if (shown) done(performance.now() - start)
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      }, { once: true })
    }) })
    await bold.hover()
    const elapsed = await page.evaluate(() => (window as unknown as { __waited: Promise<number> }).__waited)
    expect(elapsed).toBeGreaterThanOrEqual(280)
    expect(elapsed).toBeLessThan(2000)
    expect(await shownTips(page)).toEqual(['Bold text'])
  })

  test('moving to a neighbor swaps the bubbles with no overlap', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=tips')
    await page.getByRole('button', { name: 'Bold', exact: true }).hover()
    await page.waitForTimeout(500)
    const box = (await page.getByRole('button', { name: 'Italic', exact: true }).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 })
    const samples: string[][] = []
    for (let i = 0; i < 8; i++) { samples.push((await shownTips(page)) as string[]); await page.waitForTimeout(30) }
    expect(samples.filter((sample) => sample.length > 1)).toEqual([])
    expect(samples.at(-1)).toEqual(['Italic text'])
  })

  test('a duration scale of 0 skips the rest', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=tips&scale=0')
    await page.getByRole('button', { name: 'Bold', exact: true }).hover()
    await page.waitForTimeout(60)
    expect(await shownTips(page)).toEqual(['Bold text'])
  })
})

test.describe('Dialog and Drawer', () => {
  for (const which of ['dialog', 'drawer'] as const) {
    for (const delay of [10, 40, 100, 400]) {
      test(`${which} reopened ${delay}ms into its exit takes focus inside`, async ({ page }, testInfo) => {
        await openCase(page, testInfo, 'case=overlays')
        const opener = page.getByRole('button', { name: which === 'dialog' ? 'Open dialog' : 'Open drawer' })
        await opener.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(400)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(delay)
        await opener.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(150)
        expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true)
      })
    }
  }

  test('a Drawer keeps its column layout while it slides out', async ({ page }, testInfo) => {
    await openCase(page, testInfo, 'case=overlays')
    await page.getByRole('button', { name: 'Open drawer' }).click()
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape')
    const midExit = await page.evaluate(async () => {
      await new Promise((done) => requestAnimationFrame(done))
      const drawer = document.querySelector<HTMLDialogElement>('.diya-drawer-modal')!
      if (getComputedStyle(drawer).display === 'none') return { gone: true, stacked: true }
      const header = drawer.querySelector('header')!.getBoundingClientRect()
      const body = drawer.querySelector('.diya-drawer-body')!.getBoundingClientRect()
      return { gone: false, stacked: body.top >= header.bottom - 1 }
    })
    expect(midExit.stacked).toBe(true)
  })
})

test('a theme change starts no transitions', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=theme')
  for (let flip = 0; flip < 3; flip++) {
    await page.click('#flip')
    const started = await page.evaluate(async () => {
      let most = 0
      for (let frame = 0; frame < 6; frame++) {
        await new Promise((done) => requestAnimationFrame(done))
        most = Math.max(most, document.getAnimations().filter((animation) => animation.constructor.name === 'CSSTransition').length)
      }
      return most
    })
    expect(started).toBe(0)
    await page.waitForTimeout(300)
  }
})

for (const motion of ['', 'reduced']) {
  test(`Accordion clips only while it moves (${motion || 'full'} motion)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 800, height: 700 })
    await openCase(page, testInfo, `case=accordion&motion=${motion}`)
    const read = () => page.evaluate(() => ({
      overflow: getComputedStyle(document.querySelector('.diya-accordion-body')!).overflow,
      width: document.documentElement.scrollWidth,
      transitions: document.querySelector('.diya-accordion-content')!.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty).join(','),
    }))
    expect((await read()).overflow).toBe('hidden')
    await page.getByRole('button', { name: 'Wide content' }).click()
    await page.waitForTimeout(60)
    const opening = await read()
    await page.waitForTimeout(500)
    const opened = await read()
    await page.getByRole('button', { name: 'Wide content' }).click()
    await page.waitForTimeout(20)
    const closing = await read()
    expect(opened.overflow).toBe('visible')
    expect(opened.width).toBeGreaterThan(800)
    expect(closing.overflow).toBe('hidden')
    if (!motion) {
      expect(opening.overflow).toBe('hidden')
      expect(opening.transitions).toContain('grid-template-rows')
    }
  })
}

test('pill Tabs: getByText finds each label once and the selected label shows in the pill', async ({ page }, testInfo) => {
  await openCase(page, testInfo, 'case=tabs')
  await expect(page.getByText('Week', { exact: true })).toHaveCount(1)
  await page.getByText('Month', { exact: true }).click()
  await page.waitForTimeout(400)
  await expect(page.getByRole('tab', { selected: true })).toHaveText('Month')
})

test.describe('Button', () => {
  for (const theme of ['light', 'dark']) {
    test(`a press eases back on release (${theme})`, async ({ page }, testInfo) => {
      await openCase(page, testInfo, `case=buttons&theme=${theme}`)
      const button = page.getByRole('button', { name: 'Sign in', exact: true })
      await button.hover()
      await page.mouse.down()
      await page.waitForTimeout(100)
      const pressed = await button.evaluate((node) => ({ scale: getComputedStyle(node).scale, list: getComputedStyle(node).transitionProperty }))
      // The release starts a scale transition back to 1, rather than snapping.
      await button.evaluate((node) => { (window as unknown as { __eased: Promise<string[]> }).__eased = new Promise<string[]>((done) => {
        node.addEventListener('mouseup', () => requestAnimationFrame(() => done(node.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty))), { once: true })
      }) })
      await page.mouse.up()
      const running = await page.evaluate(() => (window as unknown as { __eased: Promise<string[]> }).__eased)
      expect(pressed.scale).toBe('0.98')
      expect(pressed.list).toContain('scale')
      expect(running).toContain('scale')
    })
  }

  test.describe('under Reduce Motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } })
    test('a pressed Solid darkens toward its label instead of scaling', async ({ page }, testInfo) => {
      await openCase(page, testInfo, 'case=buttons&theme=light')
      const button = page.getByRole('button', { name: 'Sign in', exact: true })
      await button.hover()
      await page.mouse.down()
      await page.waitForTimeout(200)
      const state = await button.evaluate((node) => ({ background: getComputedStyle(node).backgroundColor, tint: getComputedStyle(node, '::after').backgroundColor, scale: getComputedStyle(node).scale }))
      await page.mouse.up()
      expect(['none', '1']).toContain(state.scale)
      expect(state.tint).not.toBe('rgba(0, 0, 0, 0)')
      expect(state.tint).not.toBe(state.background)
    })
  })
})

test.describe('Progress', () => {
  const cases: [string, 'reduce' | 'no-preference', string][] = [
    ['reduced', 'no-preference', 'diya-progress-breathe/none'],
    ['off', 'no-preference', 'diya-progress-travel/diya-progress-spin'],
    ['', 'no-preference', 'diya-progress-travel/diya-progress-spin'],
    ['', 'reduce', 'diya-progress-breathe/none'],
  ]
  for (const [motion, reducedMotion, want] of cases) {
    test.describe(`device ${reducedMotion}`, () => {
      test.use({ contextOptions: { reducedMotion } })
      test(`motion=${motion || 'system'}`, async ({ page }, testInfo) => {
        await openCase(page, testInfo, `case=progress&motion=${motion}`)
        const got = await page.evaluate(() => `${getComputedStyle(document.querySelector('.diya-progress-track > span')!).animationName}/${getComputedStyle(document.querySelector('.diya-progress svg')!).animationName}`)
        expect(got).toBe(want)
      })
    })
  }
})

test('engine sanity: the harness renders on the project React', async ({ page }, testInfo) => {
  const { errors } = await openCase(page, testInfo, 'case=buttons')
  const react = await page.evaluate(() => document.documentElement.dataset.react)
  expect(react?.startsWith((testInfo.project.metadata as { react: string }).react === 'r18' ? '18.' : '19.')).toBe(true)
  expect(errors).toEqual([])
  expect(engine(testInfo)).toBeTruthy()
})
