import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The package develops on React 18 and promises 18 and 19. The site installs React 19 and a
// Testing Library built against it, so a second project borrows those: no download, and the
// same versions the workspace lockfile already pins.
const site = createRequire(new URL('../../../apps/site/package.json', import.meta.url))
const from19 = name => dirname(site.resolve(`${name}/package.json`))
const react19 = {
  react: from19('react'),
  'react-dom': from19('react-dom'),
  '@testing-library/react': from19('@testing-library/react'),
}
// Behavior that differs between React versions: presence and the popups built on it, server
// rendering and the provider.
const onBoth = ['tests/presence.test.tsx', 'tests/ssr.test.ts', 'tests/t0-l1-provider.test.tsx', 'tests/popups.test.tsx', 'tests/popups-motion.test.tsx', 'tests/placement.test.tsx', 'tests/motion-in-flow.test.tsx']

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup.ts'],
    maxWorkers: 2,
    projects: [
      { extends: true, test: { name: 'react-18', include: ['tests/**/*.test.{ts,tsx}'] } },
      { extends: true, resolve: { alias: react19 }, test: { name: 'react-19', include: onBoth } },
    ],
  },
})
