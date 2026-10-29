import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const app = fileURLToPath(new URL('../', import.meta.url))

// The site's pure-logic suites under lib/ (launch, catalog routes, Customize,
// MCP, waitlist). They run in Node; a test that needs a DOM opts in with a
// `// @vitest-environment happy-dom` pragma.
export default defineConfig({
  root: app,
  plugins: [react()],
  test: {
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['tests/setup-lib.ts'],
    env: { NODE_ENV: 'test' },
  },
})
