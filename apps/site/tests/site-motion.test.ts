// The site's :root copies of DIYA's motion tokens must match the package's, and inside a
// provider the site uses the package's tokens, not its copies.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import api from '@idyeah/diya/api.json'

const app = join(__dirname, '..')
const motion = readFileSync(join(app, 'components/site/motion.css'), 'utf8')
const site = (name: string) => motion.match(new RegExp(`--site-${name}:\\s*([^;]+);`))?.[1].trim()
const tokens = (api as { tokens: Record<string, { defaults: { light: string } }> }).tokens
/** A duration token's default at scale 1, such as calc(120ms * var(--diya-duration-scale, 1)) -> 120ms. */
const atScaleOne = (value: string) => value.match(/^calc\((\d+ms) \* var\(--diya-duration-scale, 1\)\)$/)?.[1]

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name.startsWith('.')) return []
    return statSync(path).isDirectory() ? cssFiles(path) : name.endsWith('.css') ? [path] : []
  })
}

describe('site motion', () => {
  it('copies the package\'s durations and curves exactly', () => {
    for (const step of ['fast', 'medium', 'slow']) {
      expect(site(`duration-${step}`), step).toBe(atScaleOne(tokens[`--diya-duration-${step}`].defaults.light))
    }
    for (const curve of ['enter', 'exit', 'move']) {
      expect(site(`ease-${curve}`), curve).toBe(tokens[`--diya-ease-${curve}`].defaults.light)
    }
    expect(site('duration-page')).toBe('300ms')
  })

  it('uses its copies only where no provider reaches: the view transitions', () => {
    const users = cssFiles(join(app, 'components'))
      .filter((file) => /var\(--site-(duration|ease)-/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(app, file))
    expect(users.every((file) => /view-transition/.test(readFileSync(join(app, file), 'utf8'))), users.join(', ')).toBe(true)
  })
})
