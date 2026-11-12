// Checks every Screen that shows feedback with toast() in real browsers: the
// built preview frame (/screens-frame/?screen=<id>) is driven to the screen's
// toast in Chromium, WebKit and Firefox, and each run must show
//   - the toast once, in the page's "Notifications (F8)" region;
//   - the toast as the top element at its own point, when it arrives and once
//     the flow has settled (a toast hidden under a modal's dim fails);
//   - the toast inside the Dialog or Drawer that was open when it arrived;
//   - no console errors and no page errors.
//
//   pnpm --filter diya-site build:frame
//   PLAYWRIGHT=<path to the playwright package> node scripts/screens-toasts.mjs
//
// Options:
//   --playwright <path>        where the playwright package is (or PLAYWRIGHT=…)
//   --only agenda,billing      just these screens
//   --browsers chromium,webkit just these engines (default: all three)
//   --width 390 --height 844   another viewport (default 1440×900)
//   --port <n>                 the local server's port (default 3107)
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const app = fileURLToPath(new URL('../', import.meta.url))
const publicDir = join(app, 'public')
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const REGION = { name: 'Notifications (F8)' }
const ready = (page, name, scope = page) => scope.getByRole('button', { name, exact: typeof name === 'string' }).and(scope.locator(':not([disabled]):not([aria-disabled="true"]):not([aria-busy="true"])')).filter({ visible: true }).first()
const modal = (page) => page.locator('dialog[open]').last()

/** How to reach each screen's toast, and the title it shows. `modal`: it arrives while a Dialog or Drawer is open. */
export const FLOWS = {
  activity: { title: 'Audit log exported', run: async (page) => {
    await page.getByRole('tab', { name: 'Audit log' }).click()
    await ready(page, /Export CSV/).click()
  } },
  agenda: { title: 'Booking canceled', modal: true, run: async (page) => {
    await page.locator('.agenda-row[data-status="confirmed"]').first().click()
    await ready(page, 'Cancel booking', modal(page)).click()
    await ready(page, 'Cancel booking', modal(page)).click()
  } },
  ai: { title: 'Chat renamed', modal: true, run: async (page) => {
    // On a phone the chats are in a sheet.
    const sheet = page.getByRole('button', { name: 'Show chats' })
    if (await sheet.isVisible()) await sheet.click()
    await page.getByText('A toast for Ana’s wedding').filter({ visible: true }).first().click()
    await page.getByRole('button', { name: 'Chat options' }).click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await modal(page).getByRole('textbox', { name: 'Name' }).fill('Wedding toast for Ana')
    await ready(page, 'Save', modal(page)).click()
  } },
  'api-keys': { title: 'Key revoked', modal: true, run: async (page) => {
    await page.getByRole('button', { name: /^Revoke / }).first().click()
    await ready(page, 'Revoke key', modal(page)).click()
  } },
  billing: { title: 'Your plan is canceled', modal: true, run: async (page) => {
    await ready(page, 'Cancel plan').click()
    await ready(page, 'Cancel plan', modal(page)).click()
  } },
  book: { title: 'Downloaded', run: async (page) => {
    await page.locator('.book-slot').last().click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Ana Lima')
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@example.com')
    // WebKit at phone width scrolls the form as the email field blurs, under the press (1.1.1 too).
    await page.getByRole('textbox', { name: 'Email' }).blur()
    await ready(page, 'Book it').click()
    await ready(page, /Add to calendar/).click()
  } },
  changelog: { title: 'Idea sent', modal: true, run: async (page) => {
    await page.getByRole('tab', { name: 'Roadmap' }).click()
    await ready(page, 'Suggest an idea').click()
    await modal(page).getByRole('textbox', { name: 'Your idea' }).fill('Dark mode for the mobile app')
    await ready(page, 'Send idea', modal(page)).click()
  } },
  dashboard: { title: 'Export on its way', run: async (page) => {
    await ready(page, /^Export$/).click()
  } },
  'file-manager': { title: 'Created Receipts', run: async (page) => {
    await ready(page, /New folder/).click()
    await modal(page).getByRole('textbox', { name: 'Name' }).fill('Receipts')
    await ready(page, 'Create folder', modal(page)).click()
  } },
  'getting-started': { title: 'First doc, written', run: async (page) => {
    await ready(page, /^Write your first doc/).click()
    await ready(page, 'Open the brief', modal(page)).click()
  } },
  inbox: { title: 'Marked as unread', run: async (page) => {
    // On a phone the list comes first; open a conversation.
    if (!(await page.getByRole('button', { name: 'Mark unread' }).first().isVisible()))
      await page.getByRole('list', { name: /conversations$/ }).locator('button, a').first().click()
    await ready(page, 'Mark unread').click()
  } },
  invoice: { title: 'INV-2047 is paid', modal: true, run: async (page) => {
    await ready(page, /Mark as paid/).click()
    await ready(page, 'Mark as paid', modal(page)).click()
  } },
  pricing: { title: 'Message sent', modal: true, run: async (page) => {
    await page.getByRole('button', { name: 'Talk to sales' }).first().click()
    await modal(page).getByRole('textbox', { name: 'Name' }).fill('Ana Lima')
    await modal(page).getByRole('textbox', { name: 'Work email' }).fill('ana@example.com')
    await modal(page).getByRole('combobox', { name: 'Company size' }).selectOption('50-100')
    await ready(page, 'Send', modal(page)).click()
  } },
  product: { title: 'Added to your bag', action: 'View bag', run: async (page) => {
    await ready(page, 'Add to bag').click()
  } },
  profile: { title: 'Profile saved', run: async (page) => {
    await ready(page, /Edit profile/).click()
    await modal(page).getByRole('textbox', { name: 'Name' }).fill('Maya Chen Jr.')
    await ready(page, 'Save changes', modal(page)).click()
  } },
  'record-detail': { title: 'Export on its way', run: async (page) => {
    await page.getByRole('button', { name: /^More actions for / }).click()
    await page.getByRole('menuitem', { name: 'Export history' }).click()
  } },
  'resource-table': { title: /^Order #\d+ created$/, modal: true, run: async (page) => {
    await ready(page, /New order/).click()
    const dialog = modal(page)
    await dialog.getByRole('textbox', { name: 'Customer name' }).fill('Ana Lima')
    await dialog.getByRole('textbox', { name: 'Email' }).fill('ana@example.com')
    await ready(page, /^Create order/, dialog).click()
  } },
  settings: { title: 'Profile saved', run: async (page) => {
    await page.getByRole('textbox', { name: 'Full name' }).fill('Maya Chen Jr.')
    await ready(page, 'Save changes').click()
  } },
  'task-list': { title: /” is done$/, action: 'Undo', run: async (page) => {
    await page.locator('.task-list-check:has(input:not(:checked)) label').first().click()
  } },
  team: { title: 'Invite sent again', run: async (page) => {
    await page.getByRole('button', { name: /^Resend invite to / }).first().click()
  } },
  waitlist: { title: 'Link copied', run: async (page) => {
    await page.getByRole('textbox', { name: 'Email address' }).fill('ana@example.com')
    await ready(page, 'Join the waitlist').click()
    await ready(page, /Copy link/).click()
  } },
}

/**
 * Runs in the page before the flow: remembers, the moment a toast with
 * `title` first shows, whether a modal was open, whether the toast was inside
 * it, and what was on top at the toast's center.
 */
function watchArrival([source, flags]) {
  const title = new RegExp(source, flags)
  window.__arrival = null
  const look = () => {
    if (window.__arrival) return
    const heading = [...document.querySelectorAll('.diya-toast-list .diya-alert-title')].find((node) => title.test(node.textContent ?? ''))
    if (!heading) return
    const card = heading.closest('.diya-toast')
    const open = [...document.querySelectorAll('dialog[open]')].at(-1) ?? null
    window.__arrival = { modalOpen: !!open, insideModal: !!open && open.contains(card) }
    observer.disconnect()
    // Its place on top is read once it has arrived (it moves into place first).
    setTimeout(() => {
      const box = card.getBoundingClientRect()
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      Object.assign(window.__arrival, { onTop: !!top && card.contains(top), stillInside: !!open && open.isConnected && open.open ? open.contains(card) : null })
    }, 450)
  }
  const observer = new MutationObserver(look)
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

/** public/ over HTTP, with the same /screens-frame rewrite as next.config.mjs. */
function serve(port) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const pathname = url.pathname === '/screens-frame' || url.pathname === '/screens-frame/' ? '/screens-frame/index.html' : url.pathname
    const file = normalize(join(publicDir, decodeURIComponent(pathname)))
    if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) return void response.writeHead(404).end('Not found')
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => done(server))
  })
}

async function loadPlaywright() {
  const path = option('--playwright') ?? process.env.PLAYWRIGHT
  try {
    const playwright = path ? await import(pathToFileURL(createRequire(join(resolve(path), 'package.json')).resolve('playwright')).href) : await import('playwright')
    return playwright.chromium ? playwright : playwright.default
  } catch {
    throw new Error('Playwright not found. Pass --playwright <path to the playwright package>, or set PLAYWRIGHT.')
  }
}

async function check(page, port, id, flow) {
  const problems = []
  const errors = []
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`http://127.0.0.1:${port}/screens-frame?screen=${id}&theme=light&glass=0`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.documentElement.dataset.screenReady === 'true')
  const title = flow.title instanceof RegExp ? flow.title : new RegExp(`^${flow.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  await page.evaluate(watchArrival, [title.source, title.flags])
  await flow.run(page)
  const region = page.getByRole('region', REGION)
  await region.getByText(title).first().waitFor({ timeout: 10_000 })
  await page.waitForFunction(() => window.__arrival && 'onTop' in window.__arrival, null, { timeout: 5_000 })
  const arrival = await page.evaluate(() => window.__arrival)
  if (!arrival.onTop) problems.push('the toast isn’t on top at its point when it arrives')
  if (flow.modal && !arrival.modalOpen) problems.push('expected it to arrive while a modal is open')
  if (arrival.modalOpen && !arrival.insideModal) problems.push('arrived outside the open modal')
  if (arrival.stillInside === false) problems.push('left the modal while it was still open')
  // Settled: whatever modal there was has closed or stayed; the toast is still on top.
  await page.waitForTimeout(700)
  const settled = await page.evaluate((source) => {
    const heading = [...document.querySelectorAll('.diya-toast-list .diya-alert-title')].find((node) => new RegExp(source).test(node.textContent ?? ''))
    if (!heading) return 'gone'
    const card = heading.closest('.diya-toast')
    const box = card.getBoundingClientRect()
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    const open = [...document.querySelectorAll('dialog[open]')].at(-1)
    return !top || !card.contains(top) ? 'not on top once settled' : open && !open.contains(card) ? 'outside the modal that is still open' : ''
  }, title.source)
  if (settled && settled !== 'gone') problems.push(settled)
  const count = await region.getByText(title).count()
  if (count !== 1) problems.push(`shows ${count} toasts titled ${title}`)
  if (!(await region.getByRole('button', { name: /^Dismiss: / }).count())) problems.push('no named close button')
  if (flow.action && !(await region.getByRole('button', { name: flow.action }).count())) problems.push(`no ${flow.action} action`)
  if (errors.length) problems.push(...errors.map((text) => `console: ${text}`))
  return { problems, modal: arrival.modalOpen }
}

async function main() {
  if (!existsSync(join(publicDir, 'screens-frame/index.html'))) throw new Error('The preview frame isn’t built. Run pnpm --filter diya-site build:frame first.')
  const only = option('--only')?.split(',').filter(Boolean)
  const ids = only ?? Object.keys(FLOWS)
  for (const id of ids) if (!FLOWS[id]) throw new Error(`No toast flow for ${id}`)
  const engines = option('--browsers')?.split(',') ?? ['chromium', 'webkit', 'firefox']
  const viewport = { width: Number(option('--width') ?? 1440), height: Number(option('--height') ?? 900) }
  const port = Number(option('--port') ?? 3107)
  const playwright = await loadPlaywright()
  const server = await serve(port)
  let failures = 0
  try {
    for (const engine of engines) {
      const browser = await playwright[engine].launch()
      try {
        for (const id of ids) {
          const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce', permissions: engine === 'chromium' ? ['clipboard-read', 'clipboard-write'] : [] })
          // The waitlist copies its link; Firefox and WebKit ask for no permission there.
          await context.addInitScript(() => {
            if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.resolve()
          })
          const page = await context.newPage()
          let line
          try {
            const { problems, modal } = await check(page, port, id, FLOWS[id])
            line = `${problems.length ? 'FAIL' : 'ok  '} ${engine.padEnd(8)} ${viewport.width} ${id.padEnd(16)}${modal ? ' (in a modal)' : ''}${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`
            if (problems.length) failures++
          } catch (error) {
            failures++
            line = `FAIL ${engine.padEnd(8)} ${viewport.width} ${id.padEnd(16)}\n       ${String(error).split('\n')[0]}`
          }
          console.log(line)
          await context.close()
        }
      } finally {
        await browser.close()
      }
    }
  } finally {
    server.close()
  }
  console.log(failures ? `\n${failures} failed.` : `\nAll ${ids.length * engines.length} passed.`)
  process.exit(failures ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
