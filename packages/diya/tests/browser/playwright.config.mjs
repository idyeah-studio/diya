// The package's browser checks: Chromium, WebKit and Firefox, at 1440×900 and 390×844, on
// React 19, plus the desktop size on React 18. Run with `pnpm test:browser` from the root.
import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.DIYA_HARNESS_PORT ?? 4710)
const engines = { chromium: devices['Desktop Chrome'], webkit: devices['Desktop Safari'], firefox: devices['Desktop Firefox'] }
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
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: { baseURL: `http://localhost:${port}`, trace: 'off' },
  webServer: { command: 'node serve.mjs', cwd: import.meta.dirname, port, reuseExistingServer: false },
  projects,
})
