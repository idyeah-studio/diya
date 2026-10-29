// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dist = resolve(process.cwd(), 'dist')
const directive = /^(['"])use client\1;?\s*$/m
const hooks = /\b(use[A-Z]\w*|createContext)\(/
const browser = /\b(window|document|navigator|localStorage|sessionStorage)\.\w|\b(matchMedia|ResizeObserver|IntersectionObserver|MutationObserver|requestAnimationFrame|cancelAnimationFrame)\b/

function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return modules(path)
    return entry.name.endsWith('.js') ? [path] : []
  })
}

const files = modules(dist).map(path => ({ name: relative(dist, path), text: readFileSync(path, 'utf8') }))
const firstLine = (text: string) => text.split('\n', 1)[0]
const hasDirective = (text: string) => directive.test(firstLine(text))

describe('client boundary', () => {
  it('keeps the public entries and default messages free of a directive', () => {
    for (const name of ['index.js', 'data-viz/index.js', 'messages-defaults.js', 'messages.js']) {
      const file = files.find(item => item.name === name)
      expect(file, name).toBeDefined()
      expect(file!.text.includes('use client'), name).toBe(false)
    }
  })

  it('marks every module that uses hooks or browser APIs', () => {
    const flagged = files.filter(file => hooks.test(file.text) || browser.test(file.text))
    expect(flagged.length).toBeGreaterThan(20)
    for (const file of flagged) expect(hasDirective(file.text), file.name).toBe(true)
  })

  it('keeps message modules plain', () => {
    const messages = files.filter(file => /(^|\/|-)messages\.js$/.test(file.name))
    expect(messages.length).toBeGreaterThan(20)
    for (const file of messages) expect(hasDirective(file.text), file.name).toBe(false)
  })

  it('exports defaultMessages from the root as a plain object', async () => {
    const core = await import(/* @vite-ignore */ join(dist, 'index.js'))
    expect(Object.getPrototypeOf(core.defaultMessages)).toBe(Object.prototype)
    expect(core.defaultMessages.dialog).toBeDefined()
  })
})
