// The Drawer's corner (1.2 step 9): its open edge is the modal corner, 22px x the corner scale like
// Dialog's, on either side; at 440px and below it fills the screen and goes square, so no scrim
// shows in wedges at the screen's edge; under Glass the rim follows the corner.
import { expect, test, type Page } from '@playwright/test'
import { isPhone, openCase } from './helpers'

const corners = (page: Page) => page.locator('dialog.diya-drawer-modal').evaluate((node) => {
  const style = getComputedStyle(node)
  return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
})
const settled = (page: Page) => page.waitForFunction(() => document.querySelector('dialog.diya-drawer-modal[open]') && document.getAnimations().length === 0)

for (const side of ['right', 'left'] as const) {
  test(`computed radius 22 x scale at 441px, 0 at 440px (${side})`, async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'sets its own widths')
    for (const scale of [0.5, 1, 1.5]) {
      await page.setViewportSize({ width: 441, height: 700 })
      await openCase(page, testInfo, `case=drawer&theme=light&side=${side}&cs=${scale}`)
      await settled(page)
      const r = `${22 * scale}px`
      expect(await corners(page), `scale ${scale}`).toEqual(side === 'right' ? [r, '0px', '0px', r] : ['0px', r, r, '0px'])
      await page.setViewportSize({ width: 440, height: 700 })
      await expect.poll(() => corners(page), { message: `scale ${scale} at 440` }).toEqual(['0px', '0px', '0px', '0px'])
    }
  })
}

test('no scrim wedges at 390: each corner of the screen is the Drawer, as its edge is', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openCase(page, testInfo, 'case=drawer&theme=dark')
  await settled(page)
  const shot = await page.screenshot({ animations: 'disabled' })
  // A rounded corner would show the scrim there; square, each corner pixel matches its own edge
  // halfway down (the Drawer's edge, not the dimmed page).
  const pixels = await page.evaluate(async (data) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = new OffscreenCanvas(image.width, image.height)
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data.slice(0, 3)].join(',')
    const [w, h] = [image.width - 1, image.height - 1]
    return { corners: [at(0, 0), at(0, h), at(w, 0), at(w, h)], edges: [at(0, h >> 1), at(0, h >> 1), at(w, h >> 1), at(w, h >> 1)] }
  }, shot.toString('base64'))
  expect(pixels.corners).toEqual(pixels.edges)
})

test('Glass rim follows the corner', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'square on phones')
  await openCase(page, testInfo, 'case=drawer&theme=dark&glass=1')
  await settled(page)
  const rim = await page.locator('dialog.diya-drawer-modal').evaluate((node) => {
    const style = getComputedStyle(node)
    return { radius: [style.borderTopLeftRadius, style.borderBottomLeftRadius], top: style.borderTopColor, side: style.borderLeftColor, sheen: style.backgroundImage !== 'none' }
  })
  // The rim is the panel's own border, so it bends with the 22px corner; the top edge is the bright one.
  expect(rim.radius).toEqual(['22px', '22px'])
  expect(rim.top).not.toBe(rim.side)
  expect(rim.sheen).toBe(true)
})
