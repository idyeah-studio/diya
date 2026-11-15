// The package's browser checks: Chromium, WebKit and Firefox, at 1440×900 and 390×844, on
// React 19, plus the desktop size on React 18. Run with `pnpm test:browser` from the root.
import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.DIYA_HARNESS_PORT ?? 4710)
// Chromium draws text without subpixel (LCD) antialiasing, as it already does on macOS. On Linux it
// switches between subpixel and gray antialiasing as layers change, which pixel comparisons of the
// same words would read as a change of color.
const chromium = { ...devices['Desktop Chrome'], launchOptions: { args: ['--disable-lcd-text'] } }
const engines = { chromium, webkit: devices['Desktop Safari'], firefox: devices['Desktop Firefox'] }
const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const projects = []
for (const [engine, device] of Object.entries(engines)) {
  for (const [size, viewport] of Object.entries(sizes)) projects.push({ name: `${engine}-${size}`, use: { ...device, viewport, deviceScaleFactor: 1 }, metadata: { engine, size, react: 'r19' } })
  projects.push({ name: `${engine}-react18`, use: { ...device, viewport: sizes.desktop, deviceScaleFactor: 1 }, metadata: { engine, size: 'desktop', react: 'r18' } })
}

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../node_modules/.cache/diya-browser-results',
  globalSetup: './global-setup.mjs',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  // CI's two shared cores sometimes deliver WebKit's frames late enough to trip a timing check that
  // passes locally under ten CPU burners. One retry on CI; a test that needed it is reported as flaky.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: { baseURL: `http://localhost:${port}`, trace: 'off' },
  webServer: { command: 'node serve.mjs', cwd: import.meta.dirname, port, reuseExistingServer: false },
  projects,
})
