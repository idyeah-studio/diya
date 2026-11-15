import type { Page, TestInfo } from '@playwright/test'

/** Opens a harness case on the project's React build: `case=popups&motion=off`. */
export async function openCase(page: Page, testInfo: TestInfo, query: string, { dev = false } = {}) {
  const { react } = testInfo.project.metadata as { react: string }
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`/${react}${dev ? '-dev' : ''}/index.html?${query}`)
  await page.waitForSelector('html[data-ready]')
  return { errors }
}

export const engine = (testInfo: TestInfo) => (testInfo.project.metadata as { engine: string }).engine
export const isPhone = (testInfo: TestInfo) => (testInfo.project.metadata as { size: string }).size === 'phone'
export const isReact18 = (testInfo: TestInfo) => (testInfo.project.metadata as { react: string }).react === 'r18'

/** Whether the element is the topmost at its own center, so a real click lands on it. */
export async function isTopAtCenter(page: Page, selector: string | import('@playwright/test').Locator) {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector
  const box = await locator.boundingBox()
  if (!box) return false
  return locator.evaluate((element, [x, y]) => {
    const top = element.ownerDocument.elementFromPoint(x, y)
    return !!top && (top === element || element.contains(top))
  }, [box.x + box.width / 2, box.y + box.height / 2])
}

/** The window's click log. */
export const lastClicked = (page: Page) => page.evaluate(() => ((window as unknown as { __clicked?: string[] }).__clicked ?? []).at(-1) ?? '')
