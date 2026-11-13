import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Every "N components" and "N patterns" the site and the README claim equals
 * api.json's own count, so the next component can't leave a number behind
 * (the "claims that weren't true" miss). Utilities and layouts aren't counted.
 */
const app = process.cwd()
const api = JSON.parse(readFileSync(join(app, 'node_modules/@idyeah/diya/dist/api.json'), 'utf8')) as { items: Record<string, { kind: string }> }
const counted = (kind: string) => Object.values(api.items).filter((item) => item.kind === kind).length

const FILES = [
  '../../packages/diya/README.md',
  '../../README.md',
  'app/layout.tsx',
  'components/landing/LaunchedLanding.tsx',
  'components/landing/PartsSheet.tsx',
]

describe('counts', () => {
  it("every 'N components' claim equals api.json's component items, and every 'N patterns' its patterns", () => {
    expect(counted('component')).toBe(33)
    expect(counted('pattern')).toBe(13)
    let claims = 0
    for (const file of FILES) {
      const text = readFileSync(join(app, file), 'utf8')
      for (const [claim, n, what] of text.matchAll(/\b(\d+) (components|patterns)\b/g)) {
        claims += 1
        expect(Number(n), `${file}: "${claim}"`).toBe(counted(what === 'components' ? 'component' : 'pattern'))
      }
    }
    expect(claims).toBeGreaterThanOrEqual(8)
  })
})
