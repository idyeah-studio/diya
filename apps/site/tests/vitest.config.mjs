import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const app = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig({
  root: app,
  plugins: [react()],
  resolve: {
    alias: {
      react: `${app}node_modules/react`,
      'react-dom': `${app}node_modules/react-dom`,
      '@idyeah/diya/charts': `${app}node_modules/@idyeah/diya/dist/data-viz/index.js`,
      '@idyeah/diya/styles.css': `${app}node_modules/@idyeah/diya/dist/styles.css`,
      '@idyeah/diya/api.json': `${app}node_modules/@idyeah/diya/dist/api.json`,
      '@idyeah/diya': `${app}node_modules/@idyeah/diya/dist/index.js`,
      // The ESM entry lets the app's React 19 aliases cover the shared test helpers too.
      '@testing-library/react': `${app}node_modules/@testing-library/react/dist/@testing-library/react.esm.js`,
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    maxWorkers: 1,
    server: { deps: { inline: [/@diya\/ui/, /@testing-library\/react/] } },
  },
})
