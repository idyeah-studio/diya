import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { render } from '@testing-library/react'
import { DiyaProvider } from '../dist/index.js'

// Tests run from the package root (happy-dom replaces import.meta.url).
const dist = (file: string) => path.join(process.cwd(), 'dist', file)
const css = await readFile(dist('styles.css'), 'utf8')

it('ships DIYA Sans beside the stylesheet, with its licence', async () => {
  for (const [file, style] of [['DIYASans.woff2', 'normal'], ['DIYASans-Italic.woff2', 'italic']]) {
    const face = css.match(new RegExp(`@font-face\\s*\\{[^}]*url\\('\\./fonts/${file.replace('.', '\\.')}'\\)[^}]*\\}`))?.[0]
    expect(face, file).toBeDefined()
    expect(face).toContain("font-family: 'DIYA Sans'")
    expect(face).toContain(`font-style: ${style}`)
    expect(face).toContain('font-weight: 200 900')
    expect(face).toContain('font-display: swap')
    const bytes = await readFile(dist(`fonts/${file}`))
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
  }
  const licence = await readFile(dist('fonts/OFL.txt'), 'utf8')
  expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1')
  expect(licence).toContain('Reserved Font Name "Mona"')
  expect(licence).toContain('IDYeah Studio')
})

it('uses DIYA Sans by default, with a metric-matched fallback while it loads', () => {
  expect(css).toContain("font-family: var(--diya-font, 'DIYA Sans', 'DIYA Sans Fallback', Arial, Helvetica, sans-serif)")
  const fallback = css.match(/@font-face\s*\{[^}]*'DIYA Sans Fallback'[^}]*\}/)?.[0]
  expect(fallback).toContain("src: local('Arial')")
  for (const metric of ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override']) expect(fallback).toContain(metric)
  const { container } = render(<DiyaProvider>Text</DiyaProvider>)
  const root = container.querySelector<HTMLElement>('.diya-root')!
  expect(root.style.getPropertyValue('--diya-font')).toBe('"DIYA Sans", "DIYA Sans Fallback", Arial, sans-serif')
})

it('defines the type scale once and sets no reader text below caption', () => {
  const scale = Object.fromEntries([...css.matchAll(/--diya-text-([a-z]+):\s*(\d+)px/g)].map((m) => [m[1], Number(m[2])]))
  expect(scale).toEqual({ caption: 14, body: 15, large: 17, title: 20, heading: 26, display: 34, hero: 44 })
  const literal = [...css.matchAll(/(?:font-size|--diya-internal-field-font-size|--diya-internal-choice-font)\s*:\s*([\d.]+)px/g)].map((m) => Number(m[1]))
  expect(literal.filter((size) => size < 13)).toEqual([])
  expect(literal).toEqual([])
  // Every size comes from the scale; a relative size keeps the caption floor.
  const sizes = [...css.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((m) => m[1].trim())
  // On touch screens a field's text has a 16px floor, so iOS Safari doesn't zoom the page when it's tapped.
  const floor = 'max\\(var\\(--diya-internal-field-min, 0px\\), var\\(--diya-text-(caption|body)\\)\\)'
  expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.diya-root \{ --diya-internal-field-min: 16px; \}/)
  const scaleToken = new RegExp(`^(var\\(--diya-text-(caption|body|large|title|heading|display|hero)\\)|${floor})$`)
  // Fields, choices and Prose size through their own variables, which take scale values only.
  const sized = [...css.matchAll(/(--diya-internal-field-font-size|--diya-internal-choice-font|--diya-internal-prose-font-[a-z0-9]+)\s*:\s*([^;}]+)/g)].map((m) => m[2].trim())
  expect(sized.length).toBeGreaterThan(0)
  expect(sized.filter((size) => !scaleToken.test(size))).toEqual([])
  const allowed = /^(var\(--diya-text-(caption|body|large|title|heading|display|hero)\)|var\(--diya-internal-(field-font-size|choice-font|prose-font-[a-z0-9]+)\)|inherit|max\(var\(--diya-text-caption\), [\d.]+em\))$/
  expect(sizes.filter((size) => !allowed.test(size) && !new RegExp(`^${floor}$`).test(size))).toEqual([])
})

it('names every custom property as public or --diya-internal-*', () => {
  const publicTokens = /^--diya-(color-[a-z-]+|shadow-raised|text-(caption|body|large|title|heading|display|hero)|leading-(tight|body)|corner-scale|radius-(control|surface)|space-[1-8]|elevation|brand|font|duration-(fast|medium|slow|scale)|ease-(enter|exit|move))$/
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
  const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))
  const names = [...new Set([...defined, ...used])]
  expect(names.filter((name) => !name.startsWith('--diya-internal-') && !publicTokens.test(name))).toEqual([])
  // Every public colour family a theme author might set has a default in both themes.
  for (const status of ['success', 'warning', 'error', 'info'])
    for (const suffix of ['', '-surface', '-fill', '-on-fill']) expect(defined.has(`--diya-color-${status}${suffix}`), `${status}${suffix}`).toBe(true)
})
