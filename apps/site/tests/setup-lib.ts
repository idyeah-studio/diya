// Loaded before every lib/ test: jest-dom matchers, and a clean DOM between
// component tests so earlier renders don't leak into the next query.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})
