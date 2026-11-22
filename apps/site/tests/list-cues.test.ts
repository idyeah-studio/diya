import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Two cues that a list goes on: the catalog sidebar's fade and the home page's
// screens strip, whose arrows belong to their own captions.
const read = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const catalog = read('components/catalog/catalog.css')
const sidebar = read('components/AtomicSidebar.css')
const landing = read('components/landing/landing.css')

describe('the catalog sidebar says there is more below', () => {
  it('fades the list’s last 64px through a mask, into whatever ground is behind it', () => {
    expect(catalog).toMatch(/mask-image: linear-gradient\(transparent, #000 10px, #000 calc\(100% - var\(--catalog-list-fade\)\), rgb\(0 0 0 \/ var\(--catalog-list-end\)\)\)/)
    // 64px where the list's own scroll can end the fade; 20px (the bottom padding) elsewhere.
    expect(catalog).toMatch(/--catalog-list-fade: 20px;/)
    expect(catalog).toMatch(/@supports \(animation-timeline: scroll\(\)\) \{[^}]*--catalog-list-fade: 64px;/)
    // A mask, not a painted gradient: no fixed color to drift from Light, Dark or Glass.
    expect(catalog).not.toMatch(/\.atomic-navigation[^{]*::after/)
  })

  it('drops the fade at the end of the list, driven by the list’s own scroll, with the fade kept where that is unsupported', () => {
    expect(catalog).toMatch(/@property --catalog-list-end \{[^}]*syntax: '<number>';[^}]*initial-value: 1;/)
    expect(catalog).toMatch(/@keyframes catalog-list-end \{\s*from \{ --catalog-list-end: 0; \}\s*to \{ --catalog-list-end: 1; \}/)
    expect(catalog).toMatch(
      /@supports \(animation-timeline: scroll\(\)\) \{[^}]*--catalog-list-fade: 64px;\s*animation: catalog-list-end auto linear both;\s*animation-timeline: scroll\(self block\);\s*animation-range: calc\(100% - 64px\) 100%;/,
    )
    expect(catalog).toMatch(/@supports not \(animation-timeline: scroll\(\)\) \{[^}]*--catalog-list-end: 0;/)
  })

  it('shows the count muted, at 15px', () => {
    const rule = sidebar.match(/\.catalog-browser-count \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain('color: var(--diya-color-muted)')
    expect(rule).toContain('font-size: 15px')
  })
})

describe('the home page screens strip', () => {
  it('puts each arrow 8px after its own name, at every width', () => {
    const rule = landing.match(/\.ld-screens-name \{([^}]*)\}/)?.[1] ?? ''
    // Inline, 8px after the name's last word and never wrapped away from it.
    expect(rule).toContain('display: block')
    expect(landing).toMatch(/\.ld-screens-name \.ld-index-go \{[^}]*margin-inline-start: 8px/)
    expect(landing).toMatch(/\.ld-screens-last \{ white-space: nowrap; \}/)
    expect(landing).not.toMatch(/\.ld-screens-name[^{]*\{[^}]*space-between/)
  })

  it('keeps the phone swipe strip, 16px between cards', () => {
    const phone = landing.match(/@media \(max-width: 760px\) \{[\s\S]*?\.ld-screens-list \{([^}]*)\}/)?.[1] ?? ''
    expect(phone).toContain('grid-auto-flow: column')
    expect(phone).toContain('overflow-x: auto')
    expect(phone).toContain('scroll-snap-type: x mandatory')
    expect(phone).toMatch(/\bgap: 16px;/)
  })
})
