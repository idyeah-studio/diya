import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The catalog's chrome keeps its launch look while DIYA's defaults move on:
// catalog.css pins the earlier grounds on the catalog provider only, so the
// playground previews (nested .diya-root.customize-scope) show the new ones.
const css = readFileSync(path.join(__dirname, '../components/catalog/catalog.css'), 'utf8')
const block = (selector: string) => css.match(new RegExp(`${selector.replace(/[.[\]'()=:]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? ''

describe('catalog chrome', () => {
  it('pins the earlier Dark and Light grounds on the catalog provider', () => {
    const dark = block('.diya-root.catalog-provider')
    for (const decl of ['--diya-color-surface: #242424', '--diya-color-raised: #303033', '--diya-color-line: #ffffff30', '--diya-internal-surface-shadow: none']) expect(dark).toContain(decl)
    const light = block(".diya-root.catalog-provider[data-theme='light']")
    for (const decl of ['--diya-color-surface: #eeeeee', '--diya-color-raised: #fff', '--diya-color-line: #52606366']) expect(light).toContain(decl)
  })

  it('keeps the chrome on the glass it launched with', () => {
    expect(css).toMatch(/\.diya-root\.catalog-provider\[data-glass='true'\] \{[^}]*--diya-internal-pattern-fill: color-mix\(in srgb, var\(--diya-color-raised\) 78%, transparent\)/)
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\) \{\s*\.diya-root\.catalog-provider\[data-glass='true'\]/)
  })

  it('never reaches into the previews', () => {
    // :not(.customize-scope *) keeps a chrome rule out of the previews, so it doesn't count.
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:not\([^)]*\)/g, '')
    expect(rules).not.toMatch(/\.catalog-provider[^{,]*\.customize-scope/)
    expect(rules).not.toMatch(/\.customize-scope[^{}]*\{[^}]*--diya-color-/)
  })
})
