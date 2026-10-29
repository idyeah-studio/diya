import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { nextPath, screens, thumbnailSrc, vitePath, type ScreenEntry } from '../components/screens/screens-data'
import { cssBlock, cssClasses, importSources, jsxClasses, nativeTitles, smallFontSizes } from './screens-rules'

/*
 * Every rule in screens/README.md that a script can check, for every file in
 * screens/ (and the lighter rules for screens/posters/). The README is the
 * contract; when a rule here and the README disagree, fix this file.
 */

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(app, 'screens')
const posterDir = join(dir, 'posters')
const read = (file: string) => readFileSync(file, 'utf8')
const tsx = (folder: string) => readdirSync(folder).filter((name) => name.endsWith('.tsx')).sort()

const live = screens.filter((screen) => screen.status !== 'poster')
const posters = screens.filter((screen) => screen.status === 'poster')
const ALLOWED = new Set(['react', '@idyeah/diya', '@idyeah/diya/charts', 'lucide-react'])

const ownsClass = (id: string, name: string) => name === id || name.startsWith(`${id}-`)

function commonRules(id: string, source: string, label: string) {
  for (const from of importSources(source)) expect(ALLOWED.has(from), `${label}: imports "${from}"`).toBe(true)
  expect(source, `${label}: no require() or import()`).not.toMatch(/\brequire\(|\bimport\(/)
  // The header's third line names the reader's DiyaProvider; the code never renders one.
  expect(source.replace(/^\/\/ Next\.js: save as .*$/m, ''), `${label}: the preview frame and the reader's app supply DiyaProvider`).not.toMatch(/DiyaProvider/)
  expect(nativeTitles(source), `${label}: no native title attributes; use DIYA's Tooltip`).toEqual([])
  const css = cssBlock(source)
  expect(css, `${label}: styles live in one \`const css = \`…\`\` at the bottom of the file`).not.toBeNull()
  expect(source.match(/\nconst css = `/g), `${label}: exactly one css block`).toHaveLength(1)
  expect(source, `${label}: renders <style>{css}</style>`).toContain('<style>{css}</style>')
  expect(smallFontSizes(css!), `${label}: no text under 13px`).toEqual([])
  const foreign = cssClasses(css!).filter((name) => !ownsClass(id, name))
  expect(foreign, `${label}: every class starts with "${id}" (and .diya-* internals are never restyled)`).toEqual([])
  const foreignJsx = jsxClasses(source).filter((name) => !ownsClass(id, name))
  expect(foreignJsx, `${label}: every className starts with "${id}"`).toEqual([])
}

describe('the Screens registry and its files', () => {
  it('has 36 entries, unique ids in kebab case, and a file for each', () => {
    expect(screens).toHaveLength(36)
    expect(live).toHaveLength(33)
    expect(posters.map((screen) => screen.id).sort()).toEqual(['board', 'create-edit', 'landing'])
    expect(new Set(screens.map((screen) => screen.id)).size).toBe(36)
    expect(new Set(screens.map((screen) => screen.component)).size).toBe(36)
    for (const screen of screens) {
      expect(screen.id, screen.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(screen.component, screen.id).toMatch(/^[A-Z][A-Za-z0-9]*$/)
      expect(screen.route, screen.id).toMatch(/^([a-z0-9-]+|\[[a-z]+\])(\/([a-z0-9-]+|\[[a-z]+\]))*$|^$/)
      expect(screen.description.length, screen.id).toBeGreaterThan(30)
      expect(screen.description, screen.id).not.toMatch(/\n/)
      if (screen.status === 'poster') expect(screen.waitingOn.length, screen.id).toBeGreaterThan(4)
      else expect(screen.tryThis.length, screen.id).toBeGreaterThan(30)
    }
    expect(tsx(dir)).toEqual(live.map((screen) => `${screen.id}.tsx`).sort())
    expect(tsx(posterDir)).toEqual(posters.map((screen) => `${screen.id}.tsx`).sort())
  })

  it('every ready screen and poster has a Light and a Dark thumbnail', () => {
    for (const screen of screens.filter((entry) => entry.status !== 'building'))
      for (const theme of ['light', 'dark'] as const) {
        const file = join(app, 'public', thumbnailSrc(screen.id, theme))
        expect(existsSync(file), `${screen.id}: ${thumbnailSrc(screen.id, theme)} (run pnpm --filter diya-site screens:thumbs)`).toBe(true)
        expect(readFileSync(file).subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), `${screen.id}-${theme} is a JPEG`).toBe(true)
      }
  })
})

describe.each(live.map((screen) => [screen.id, screen] as const))('screens/%s.tsx', (id, screen: ScreenEntry) => {
  const source = read(join(dir, `${id}.tsx`))
  const lines = source.split('\n')
  const charts = importSources(source).includes('@idyeah/diya/charts')

  it('opens with the three header lines, the install line matching its imports', () => {
    expect(lines[0]).toBe("'use client'")
    expect(lines[1]).toBe(`// ${screen.name}: a DIYA screen. Install: npm i @idyeah/diya lucide-react${charts ? ' echarts@6' : ''}`)
    expect(lines[2]).toBe(`// Next.js: save as ${nextPath(screen)}. Vite: save as ${vitePath(screen)} and render it inside your DiyaProvider.`)
    if (screen.status === 'ready') expect(charts, 'the registry’s charts flag matches the file').toBe(screen.charts)
  })

  it('has exactly one export: the default function', () => {
    expect(source.match(/^export\b.*$/gm)).toEqual([`export default function ${screen.component}Screen() {`])
  })

  it('imports only react, @idyeah/diya, @idyeah/diya/charts and lucide-react, with no CSS or relative imports', () => {
    commonRules(id, source, `${id}.tsx`)
  })

  it('wraps the screen in LucideProvider at DIYA’s icon size and stroke', () => {
    expect(source).toContain('<LucideProvider size={18} strokeWidth={1.6}>')
  })

  it('is a full page: min-height 100dvh, one h1, under about 600 lines', () => {
    expect(cssBlock(source)).toMatch(/min-height:\s*100dvh/)
    expect(source, 'an <h1>, or a DIYA heading at level 1').toMatch(/<h1\b|headingLevel=\{1\}/)
    expect(lines.length, 'aim for under about 600 lines').toBeLessThanOrEqual(700)
  })

  it('uses tokens, not colors, and no colored left-edge bars', () => {
    const css = cssBlock(source)!
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/g), 'hard-coded colors in css').toBeNull()
    expect(css.match(/border-(?:left|inline-start)(?:-width)?\s*:\s*(?:[2-9]|\d{2,})px/g), 'colored left-edge bars').toBeNull()
    const fills = source.match(/\b(?:fill|stroke|stopColor)="#[0-9a-fA-F]{3,8}"/g) ?? []
    if (id === 'sign-in' || id === 'sign-up') {
      if (fills.length) {
        expect(source, 'brand marks carry their trademark note').toMatch(/trademarks? of (?:their|its) owners/i)
        expect(source).toMatch(/https:\/\/[^\s]*google[^\s]*/i)
        expect(source).toMatch(/https:\/\/github\.com\/logos/i)
      }
    } else expect(fills, 'brand artwork belongs only to sign-in and sign-up').toEqual([])
  })

  it('writes plain US English with invented people: no lorem ipsum, emails at example.com', () => {
    expect(source).not.toMatch(/lorem|ipsum/i)
    for (const [email] of source.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) expect(email, 'emails use example.com').toMatch(/@example\.com$/)
    expect(source).not.toMatch(/\b(?:colour|behaviour|favourite|organis(?:e|ed|ation)|recognis(?:e|ed)|centre|catalogue|analyse|cancelled|travelled|licence|grey)\b/i)
  })
})

describe.each(posters.map((screen) => [screen.id, screen] as const))('screens/posters/%s.tsx', (id) => {
  const source = read(join(posterDir, `${id}.tsx`))
  it('is one default export that the frame can render, under the same import, title, size and class rules', () => {
    expect(source.match(/^export\b.*$/gm)).toHaveLength(1)
    expect(source).toMatch(/^export default function \w+\(\) \{$/m)
    commonRules(id, source, `posters/${id}.tsx`)
  })
})

describe('the contract checks catch what they say', () => {
  it('flags small text, foreign classes, native titles and stray imports', () => {
    expect(smallFontSizes('.a { font-size: 12px } .b { font: 500 0.75rem/1 x } .c { font-size: clamp(13px, 2vw, 18px) }')).toEqual(['12px', '0.75rem'])
    expect(cssClasses('.sign-in-card:hover .diya-button { background: url(a.png); transition: opacity .2s }')).toEqual(['sign-in-card', 'diya-button'])
    expect(jsxClasses('<div className="sign-in-a sign-in-b" /><p className={`sign-in-c ${x ? "y" : ""}`} />')).toEqual(['sign-in-a', 'sign-in-b', 'sign-in-c'])
    expect(nativeTitles('<Card title="Fine" /><span title="Not fine" />')).toEqual(['<span title='])
    expect(importSources("import { A } from 'react'\nimport type { B } from 'next/link'\nimport './x.css'")).toEqual(['react', 'next/link', './x.css'])
  })
})
