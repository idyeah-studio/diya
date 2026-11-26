// The shipped stylesheet: one cascade layer, theme="system" twins, scoped resets, neutral grays
// and accent defaults that match the provider's own computation.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addSystemTheme, buildStyles } from '../scripts/styles-transform.mjs'
import { BRAND_GROUNDS, contrast, DIYA_DEFAULT_BRAND, resolveBrand } from '../dist/internal/brand.js'

const source = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const dist = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf8')
const bare = source.replace(/\/\*[\s\S]*?\*\//g, '')

function block(selector: string) {
  const start = bare.indexOf(`\n${selector} {`)
  const body = bare.slice(bare.indexOf('{', start) + 1, bare.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--diya-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}
const fallback = (value: string) => value.replace(/^var\(--diya-internal-[\w-]+, (.+)\)$/, '$1')
const dark = block('.diya-root')
const light = { ...dark, ...block(".diya-root[data-theme='light']") }

describe('dist/styles.css', () => {
  it('is the source inside @layer diya', () => {
    expect(dist).toBe(buildStyles(source))
    expect(dist).toMatch(/^\/\*[\s\S]*?\*\/\n@layer diya \{\n/)
    expect(dist.trimEnd().endsWith('}')).toBe(true)
    // One assertion for the whole walk: per-character expects made this the slowest SDK test on CI.
    let depth = 0
    let lowest = 0
    for (const char of dist.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'/g, '')) { if (char === '{') depth++; if (char === '}') depth--; lowest = Math.min(lowest, depth) }
    expect(lowest).toBe(0)
    expect(depth).toBe(0)
  })

  it('gives every Light or Dark rule a system twin in the matching scheme query', () => {
    const themed = [...bare.matchAll(/([^{}]*\[data-theme='(light|dark)'\][^{}]*)\{/g)]
    expect(themed.length).toBeGreaterThan(5)
    const out = addSystemTheme(source)
    expect(out.match(/\[data-theme='system'\]/g)!.length).toBe(themed.reduce((n, [selector]) => n + selector.split(',').filter(part => /\[data-theme='(light|dark)'\]/.test(part)).length, 0))
    expect(out).toContain("@media (prefers-color-scheme: light) {\n  .diya-root[data-theme='system'] {")
    // Strings and comments pass through untouched.
    expect(addSystemTheme("/* [data-theme='light'] { */ .a { content: '}' }")).toBe("/* [data-theme='light'] { */ .a { content: '}' }")
  })
})

describe('resets', () => {
  it('never style bare elements under the provider', () => {
    // Element rules reach DIYA's own elements only, at zero specificity.
    expect(bare).not.toMatch(/\n\.diya-root :where\((button|a|p|h1|svg|small)/)
    expect(bare).toContain(":where(.diya-root [class*='diya-']:not(.diya-root, .diya-portal-root)) :where(p)")
    expect(bare).not.toMatch(/\.diya-root \*\s*[,{]/)
  })
})

describe('tokens', () => {
  // The grays keep DIYA's own cool-fresh tint; only the dark colour (the default accent) is neutral.
  it('keeps the default accent and its text neutral (R = G = B, within 1)', () => {
    const grays = ['accent', 'accent-text']
    for (const theme of [dark, light]) for (const name of grays) {
      const value = theme[`--diya-color-${name}`]
      // Accent tokens read var(--diya-internal-accent-*, #fallback); the fallback is the default.
      const hex = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})([0-9a-f]{2})?\b/i)![1]
      const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex
      const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
      expect(Math.max(r, g, b) - Math.min(r, g, b), `${name}: ${value}`).toBeLessThanOrEqual(1)
    }
  })

  it('reads text at 4.5:1 or better on every surface', () => {
    for (const theme of [dark, light]) for (const text of ['text', 'muted']) for (const ground of ['surface', 'recessed', 'raised']) {
      const [fg, bg] = [theme[`--diya-color-${text}`], theme[`--diya-color-${ground}`]].map(v => v.length === 4 ? `#${[...v.slice(1)].map(c => c + c).join('')}` : v)
      expect(contrast(fg, bg), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('falls back to exactly what the provider computes from DIYA_DEFAULT_BRAND', () => {
    const brand = resolveBrand(undefined)
    for (const [theme, tokens] of [['dark', dark], ['light', light]] as const) {
      expect(fallback(tokens['--diya-color-accent'])).toBe(DIYA_DEFAULT_BRAND[theme])
      expect(fallback(tokens['--diya-color-accent-text'])).toBe(brand[theme].accentText)
      expect(fallback(tokens['--diya-color-accent-soft'])).toBe(brand[theme].accentSoft)
      expect(fallback(tokens['--diya-color-accent-ink'])).toBe(brand[theme].accentInk)
      const raised = tokens['--diya-color-raised'] === '#fff' ? '#ffffff' : tokens['--diya-color-raised']
      expect(BRAND_GROUNDS[theme]).toEqual({ surface: tokens['--diya-color-surface'], raised, text: tokens['--diya-color-text'] })
    }
  })

  it('defines the control radius and the spacing scale', () => {
    expect(dark['--diya-radius-control']).toBe('calc(6px * var(--diya-corner-scale, 1))')
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(step => dark[`--diya-space-${step}`])).toEqual(['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'])
  })

  it('defines the scrim in Light and Dark, not only under Glass, and dims Dialog and Drawer with it', () => {
    // Unset, var(--diya-color-scrim) was empty outside Glass, so overlays and shadows built on it failed.
    expect(dark['--diya-color-scrim']).toBe('#0000009e')
    expect(light['--diya-color-scrim']).toBe('#0000009e')
    for (const owner of ['diya-dialog', 'diya-drawer-modal']) {
      const backdrop = bare.match(new RegExp(`\\.diya-root \\.${owner}::backdrop \\{([^}]*)\\}`))?.[1]
      expect(backdrop?.replace(/\s/g, ''), owner).toContain('background:var(--diya-color-scrim,#0008)')
    }
  })
})

// Motion. The rules that animate components arrive with them; these hold every one of them to
// the house rules, and prove the off switch can't be undone from CSS.
const motionDeclarations = [...bare.matchAll(/(?:^|[;{\s])((?:transition|animation)(?:-[a-z]+)?)\s*:\s*([^;{}]+)/g)]
  .map(([, name, value]) => ({ name, value: value.trim() }))

/** Every top-level rule and every rule inside an @media block, with its custom properties. */
function customPropertyRules(css: string) {
  const out: { selectors: string[]; media: string | null; values: Record<string, string> }[] = []
  const stack: string[] = []
  let buffer = ''
  for (const char of css) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; continue }
    if (char !== '}') { buffer += char; continue }
    const prelude = stack.pop() ?? ''
    const parent = stack.at(-1) ?? null
    if (!prelude.startsWith('@') && (parent === null || parent.startsWith('@media'))) {
      const values = Object.fromEntries([...buffer.matchAll(/(--diya-[\w-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name, value.trim()]))
      out.push({ selectors: prelude.split(',').map(part => part.trim()), media: parent, values })
    }
    buffer = ''
  }
  return out
}
const propertyRules = customPropertyRules(bare)

/** The custom properties on a provider root with this motion setting, after an app's own CSS. */
function rootFor(motion: 'system' | 'reduced' | 'off', { reduce = false, app = {} as Record<string, string> } = {}) {
  const values: Record<string, string> = {}
  for (const rule of propertyRules) {
    const matches = rule.selectors.includes('.diya-root') || rule.selectors.includes(`.diya-root[data-motion='${motion}']`)
    const media = rule.media === null || (reduce && rule.media === '@media (prefers-reduced-motion: reduce)')
    if (matches && media) Object.assign(values, rule.values)
  }
  // Unlayered app CSS beats every rule in @layer diya.
  return { ...values, ...app }
}

/** A time in ms: var() substituted from `values` (or its fallback), then calc() worked out. */
function milliseconds(expression: string, values: Record<string, string>): number {
  let text = expression
  for (let pass = 0; pass < 10 && text.includes('var('); pass++) {
    text = text.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g, (_, name: string, fallback?: string) => {
      const value = values[name] ?? fallback
      if (value === undefined) throw new Error(`${name} is not set`)
      return `(${value})`
    })
  }
  const arithmetic = text.replace(/calc\(/g, '(').replace(/(\d*\.?\d+)ms\b/g, '$1').replace(/(\d*\.?\d+)s\b/g, '($1*1000)')
  if (!/^[\d\s.()*/+-]+$/.test(arithmetic)) throw new Error(`not arithmetic: ${arithmetic}`)
  return Number(Function(`return (${arithmetic})`)())
}
const durations = ['--diya-duration-fast', '--diya-duration-medium', '--diya-duration-slow']
// Motion rules read their times from these, declared once on the provider root.
const step = (token: string) => token.replace('--diya-duration-', '')
const enter = (token: string) => `var(--diya-internal-duration-${step(token)})`
const exit = (token: string) => `var(--diya-internal-exit-${step(token)})`
// Every time a motion rule uses, plus the six the root declares.
const timeReferences = (value: string) => [...value.matchAll(/var\(--diya-internal-(?:duration|exit)-[\w-]+\)/g)].map(match => match[0])
const gatedUses = [...new Set([
  ...durations.flatMap(token => [enter(token), exit(token)]),
  ...motionDeclarations.flatMap(({ value }) => timeReferences(value)),
])]

describe('motion tokens', () => {
  it('declares three durations, a scale and three curves, and no page duration', () => {
    expect(durations.map(token => dark[token])).toEqual([
      'calc(120ms * var(--diya-duration-scale, 1))',
      'calc(160ms * var(--diya-duration-scale, 1))',
      'calc(240ms * var(--diya-duration-scale, 1))',
    ])
    expect(['enter', 'exit', 'move'].map(name => dark[`--diya-ease-${name}`])).toEqual([
      'cubic-bezier(0.2, 0.7, 0.2, 1)', 'cubic-bezier(0.4, 0, 1, 1)', 'cubic-bezier(0.4, 0, 0.2, 1)',
    ])
    // Like --diya-corner-scale, the scale is read with a fallback, so an ancestor can set it.
    expect(dark['--diya-duration-scale']).toBeUndefined()
    expect(source).not.toContain('--diya-duration-page')
  })

  it('times enters and two-thirds exits from the tokens, scaled by --diya-duration-scale', () => {
    const system = rootFor('system')
    expect(durations.map(token => milliseconds(enter(token), system))).toEqual([120, 160, 240])
    expect(durations.map(token => Math.round(milliseconds(exit(token), system)))).toEqual([80, 107, 160])
    const slower = rootFor('system', { app: { '--diya-duration-scale': '1.5' } })
    expect(durations.map(token => milliseconds(enter(token), slower))).toEqual([180, 240, 360])
    const reduced = rootFor('reduced', { app: { '--diya-duration-scale': '0.5' } })
    expect(durations.map(token => milliseconds(enter(token), reduced))).toEqual([60, 80, 120])
    const none = rootFor('system', { app: { '--diya-duration-scale': '0' } })
    for (const use of gatedUses) expect(milliseconds(use, none), use).toBe(0)
  })

  it('resolves every duration to 0 under motion="off", whatever tokens the app sets', () => {
    const app = { '--diya-duration-scale': '2', '--diya-duration-fast': '300ms', '--diya-duration-medium': '0.5s', '--diya-duration-slow': '1s' }
    for (const reduce of [false, true]) {
      const off = rootFor('off', { reduce, app })
      for (const use of gatedUses) expect(milliseconds(use, off), use).toBe(0)
      // The same overrides do reach the durations when motion is on.
      expect(milliseconds(enter('--diya-duration-medium'), rootFor('system', { reduce, app }))).toBe(500)
    }
  })

  it('times every motion rule through the gated durations on the root, one form everywhere', () => {
    // The six gated times: each is a public duration (an exit, two-thirds of it) times the gate.
    for (const token of durations) {
      expect(dark[`--diya-internal-duration-${step(token)}`]).toBe(`calc(var(${token}) * var(--diya-internal-motion))`)
      expect(dark[`--diya-internal-exit-${step(token)}`]).toBe(`calc(var(${token}) * 2 / 3 * var(--diya-internal-motion))`)
    }
    for (const { name, value } of motionDeclarations) {
      // No rule reads a public duration, or the gate, directly.
      expect(value, `${name}: ${value}`).not.toMatch(/--diya-duration-|--diya-internal-motion\)/)
      for (const reference of timeReferences(value)) expect(gatedUses, `${name}: ${reference}`).toContain(reference)
    }
    for (const reference of gatedUses) expect(dark[reference.slice(4, -1)], reference).toBeDefined()
  })

  it('derives exits from their enter: no transition is timed with a fixed value', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name.startsWith('transition'))) {
      const fixed = value.replace(/var\([^()]*\)/g, '').replace(/calc\([^;]*\)/g, '').match(/(?<![\w.-])(\d*\.?\d+)m?s\b/g) ?? []
      expect(fixed.filter(time => parseFloat(time) !== 0), `${name}: ${value}`).toEqual([])
    }
  })

  it('keeps fades but no travel or scale under reduced, under system with Reduce Motion, and off', () => {
    const internals = ['travel', 'distance', 'distance-edge', 'scale', 'scale-dialog', 'scale-press'].map(name => `--diya-internal-motion-${name}`)
    const read = (values: Record<string, string>) => internals.map(name => values[name])
    expect(read(rootFor('system'))).toEqual(['1', '4px', '12px', '0.97', '0.98', '0.98'])
    expect(read(rootFor('reduced', { reduce: false }))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    expect(read(rootFor('system', { reduce: true }))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    expect(read(rootFor('off'))).toEqual(['0', '0px', '0px', '1', '1', '1'])
    // Only motion="off" closes the gate; Reduce Motion keeps fades.
    expect([rootFor('system'), rootFor('system', { reduce: true }), rootFor('reduced'), rootFor('off')].map(values => values['--diya-internal-motion']))
      .toEqual(['1', '1', '1', '0'])
  })
})

describe('motion house rules', () => {
  it('never transitions all', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name === 'transition' || name === 'transition-property')) {
      expect(value.split(',').map(part => part.trim().split(/\s+/)[0]), `${name}: ${value}`).not.toContain('all')
    }
  })

  it('writes allow-discrete only in transition-behavior', () => {
    const uses = [...bare.matchAll(/([\w-]+)\s*:[^;{}]*allow-discrete/g)].map(match => match[1])
    expect(uses.filter(name => name !== 'transition-behavior')).toEqual([])
  })

  // O4, P2, P3, P4, P5, Q1 (named edits): the only !important declarations are the loading Button's own
  // choreography, which neither an app's animation on the Button nor a reduced-motion reset that
  // forces every delay may replace, and its transitions in forced colors. (P5 on Linux: a busy
  // Button's system colors come from its hide's keyframes, on the beat, and no longer need it.)
  // Each is named here; nothing else.
  it('adds no !important, except to the loading Button\'s own choreography and its forced colors', () => {
    const important = [...bare.matchAll(/([^{}]*)\{([^{}]*!\s*important[^{}]*)\}/g)].map((m) => `${m[1].trim()} { ${m[2].trim()} }`.replace(/\s+/g, ' '))
    expect(important).toEqual([
      // P5: no transition into a busy Button's system colors as loading starts
      ".diya-root .diya-button[aria-busy='true'] { transition: none !important; }",
      // P5: nor from them as it ends: in forced colors a Button transitions only what moves
      ".diya-root .diya-button { transition-property: opacity, scale, translate, rotate, transform !important; }",
      // P3: the Button's spinner arrives on the beat
      ".diya-root .diya-button-spinner { animation: diya-spinner-arrive 0s linear var(--diya-internal-beat) both !important; }",
      // O4 (P1: not an empty Button): the Button's hide
      ".diya-root .diya-button[aria-busy='true']:not([data-icon-only='true'], :empty) { animation: diya-button-hide 0s linear var(--diya-internal-beat) forwards !important; }",
      // O4: its turn
      ".diya-root .diya-button[aria-busy='true'][data-busy-turn='b']:not([data-icon-only='true'], :empty) { animation-name: diya-button-hide-again !important; }",
      // Q1: where :has() works, no hide on a Button that doesn't hold its spinner
      ".diya-root .diya-button[aria-busy='true']:not([data-icon-only='true']):not(:has(.diya-button-spinner)) { animation: none !important; }",
      // P3: the label's parts hide on the beat
      ".diya-root .diya-button[aria-busy='true'] > .diya-button-label > *, .diya-root .diya-button[aria-busy='true'] > .diya-button-leading > .diya-button-leading-content > *, .diya-root .diya-button[data-icon-only='true'][aria-busy='true'] > :not(.diya-button-spinner) { animation: diya-spinner-arrive 0s linear var(--diya-internal-beat) reverse both !important; }",
      // O4: the Button's fade back
      ".diya-root .diya-button[data-returning='true']:not([aria-busy='true'], [data-icon-only='true']) { animation: diya-button-return-text var(--diya-internal-duration-fast) var(--diya-ease-enter) !important; }",
      // P4: in forced colors, a fade back that touches no color
      ".diya-root .diya-button[data-returning='true']:not([aria-busy='true'], [data-icon-only='true']) { animation-name: diya-button-return-forced !important; }",
      // P3: the label's parts fade back
      ".diya-root .diya-button[data-returning='true']:not([aria-busy='true']) > .diya-button-label > *, .diya-root .diya-button[data-returning='true']:not([aria-busy='true']) > .diya-button-leading > .diya-button-leading-content > *, .diya-root .diya-button[data-icon-only='true'][data-returning='true']:not([aria-busy='true']) > :not(.diya-button-spinner) { animation: diya-button-return var(--diya-internal-duration-fast) var(--diya-ease-enter) !important; }",
      // O4: after a leading icon, the Button has no hide or fade back
      ".diya-root .diya-button:has(> .diya-button-leading > .diya-button-leading-content > svg:only-child):is([aria-busy='true'], [data-returning='true']) { animation: none !important; }",
      // P3: nor have the label's parts, while busy and fading back
      ".diya-root .diya-button:has(> .diya-button-leading > .diya-button-leading-content > svg:only-child):is([aria-busy='true'], [data-returning='true']) > .diya-button-label > * { animation: none !important; }",
      // P3 (O9): a Spinner of your own in the label, while busy
      ".diya-root .diya-button[aria-busy='true'] > .diya-button-label > .diya-spinner, .diya-root .diya-button[aria-busy='true'] > .diya-button-leading > .diya-button-leading-content > .diya-spinner, .diya-root .diya-button[data-icon-only='true'][aria-busy='true'] > .diya-spinner:not(.diya-button-spinner) { animation: diya-spinner-arrive var(--diya-internal-duration-medium) var(--diya-ease-enter) var(--diya-internal-beat) both, diya-button-hide-part 0s linear var(--diya-internal-beat) both !important; }",
      // P3 (O9): and while fading back
      ".diya-root .diya-button[data-returning='true']:not([aria-busy='true']) > .diya-button-label > .diya-spinner, .diya-root .diya-button[data-returning='true']:not([aria-busy='true']) > .diya-button-leading > .diya-button-leading-content > .diya-spinner, .diya-root .diya-button[data-icon-only='true'][data-returning='true']:not([aria-busy='true']) > .diya-spinner:not(.diya-button-spinner) { animation: diya-spinner-arrive var(--diya-internal-duration-medium) var(--diya-ease-enter) var(--diya-internal-beat) both, diya-button-return var(--diya-internal-duration-fast) var(--diya-ease-enter) !important; }",
      // P3 (O9): after a leading icon, while busy and fading back
      ".diya-root .diya-button:has(> .diya-button-leading > .diya-button-leading-content > svg:only-child):is([aria-busy='true'], [data-returning='true']) > .diya-button-label > .diya-spinner { animation: diya-spinner-arrive var(--diya-internal-duration-medium) var(--diya-ease-enter) var(--diya-internal-beat) both !important; }",
    ])
  })

  it('never transitions filter, backdrop-filter or outline', () => {
    for (const { name, value } of motionDeclarations.filter(({ name }) => name === 'transition' || name === 'transition-property')) {
      const properties = value.split(/,(?![^()]*\))/).map(part => part.trim().split(/\s+/)[0])
      for (const banned of ['filter', 'backdrop-filter', '-webkit-backdrop-filter', 'outline']) expect(properties, `${name}: ${value}`).not.toContain(banned)
    }
  })
})

describe('the dim behind Dialog and Drawer', () => {
  it('has no blur in Light and Dark, keeps a still one under Glass, and never animates it', () => {
    const backdrops = [...bare.matchAll(/([^{}]*::backdrop[^{}]*)\{([^}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }))
    const blurred = backdrops.filter(({ body }) => /backdrop-filter:\s*blur/.test(body)).map(({ selector }) => selector)
    expect(blurred).toEqual([".diya-root[data-glass='true'] :is(.diya-dialog, .diya-drawer-modal)::backdrop"])
    expect(bare).toMatch(/@supports \(backdrop-filter: blur\(14px\)\) \{[^@]*\.diya-root\[data-glass='true'\] :is\(\.diya-dialog, \.diya-drawer-modal\)::backdrop \{\s*backdrop-filter: blur\(5px\);/)
    for (const { selector, body } of backdrops) expect(body, selector).not.toMatch(/transition[^;]*backdrop-filter/)
    // Under Glass only the tint fades: the backdrop stays fully opaque, so the blur is at full
    // strength from the first frame to the last.
    expect(bare).toMatch(/\.diya-root\[data-glass='true'\] :is\(\.diya-dialog, \.diya-drawer-modal\)::backdrop \{\s*transition-property: background-color, display, overlay;\s*\}/)
    expect(bare).toMatch(/\.diya-root\[data-glass='true'\] :is\(\.diya-dialog, \.diya-drawer-modal\):not\(\[open\]\)::backdrop \{\s*opacity: 1;\s*background-color: transparent;\s*\}/)
    expect(bare).toMatch(/@starting-style \{\s*\.diya-root\[data-glass='true'\] :is\(\.diya-dialog, \.diya-drawer-modal\)\[open\]::backdrop \{\s*opacity: 1;\s*background-color: transparent;/)
  })
})

describe('Drawer while it leaves', () => {
  it('keeps its column layout through the exit, not only while open', () => {
    // During the exit the dialog is no longer [open] but still displayed: a column layout tied
    // to [open] put the header beside the body for the 160ms of the slide.
    expect(bare).toMatch(/\.diya-root \.diya-drawer-modal \{ flex-direction:column; \}/)
    expect(bare).not.toMatch(/\.diya-drawer-modal\[open\] \{[^}]*flex-direction/)
  })
})

describe('an open Dialog or Drawer', () => {
  it('rests with no transform, so fixed popups inside place against the page', () => {
    // 1.1.0 left `translate: 0 0` and `scale: 1` on the open panel. Any value but none makes it
    // the containing block for position: fixed, so a Menu, Popover or Tooltip in a Drawer opened
    // off screen and couldn't be clicked.
    const open = bare.match(/\.diya-root :is\(\.diya-dialog, \.diya-drawer-modal\)\[open\] \{([^}]*)\}/)
    expect(open).not.toBeNull()
    expect(open![1]).toMatch(/scale: none;/)
    expect(open![1]).toMatch(/translate: none;/)
    const outsideStart = bare.replace(/@starting-style\s*\{[\s\S]*?\}\s*\}/g, '')
    for (const [, selector, body] of outsideStart.matchAll(/([^{}]*\.diya-(?:dialog|drawer-modal)[^{}]*\[open\][^{}]*)\{([^}]*)\}/g)) {
      if (selector.includes('::backdrop')) continue
      expect(body, selector.trim()).not.toMatch(/(?:^|;)\s*(?:transform|scale|translate|rotate|perspective|filter|contain|will-change)\s*:\s*(?!none\b)\S/)
    }
  })
})

describe('enter styles', () => {
  // @starting-style also fires for elements in the first HTML and whenever hidden content is
  // shown again, so it's only for what mounts or opens on demand.
  const startingRules = [...bare.matchAll(/@starting-style\s*\{([\s\S]*?\}\s*)\}/g)].flatMap(([, body]) => [...body.matchAll(/([^{}]+)\{/g)].map(([, selector]) => selector.trim()))

  it('starts only popups, Toast, an opening Dialog or Drawer and the phone menu', () => {
    expect(startingRules.length).toBeGreaterThan(0)
    const allowed = /^\.diya-root(\[data-glass='true'\])? (\.diya-floating|\.diya-toast-region|\.diya-toast|\.diya-dialog\[open\]|\.diya-drawer-modal\[open\]|:is\(\.diya-dialog, \.diya-drawer-modal\)\[open\]::backdrop|\.diya-site-mobile-nav:not\(\[hidden\]\))$/
    expect(startingRules.filter((selector) => !allowed.test(selector))).toEqual([])
  })

  it('passes @starting-style through, inside @layer diya', () => {
    const built = buildStyles(source)
    const layer = built.indexOf('@layer diya {')
    expect(built.indexOf('@starting-style')).toBeGreaterThan(layer)
    expect(built.match(/@starting-style/g)!.length).toBe(source.match(/@starting-style/g)!.length)
  })
})

// The nine theming tokens of 1.2. Each is read where it's used, with today's value as its
// fallback, and nothing declares it on .diya-root, so with none set nothing moves.
const theming = ['--diya-color-focus', '--diya-color-heading', '--diya-color-field', '--diya-color-field-line', '--diya-height-control-small', '--diya-height-control-medium', '--diya-height-control-large', '--diya-radius-popup', '--diya-radius-modal']

/** Every rule in a stylesheet, with the at-rules around it. */
function allRules(css: string) {
  const out: { selector: string; body: string; at: string[]; index: number }[] = []
  const stack: string[] = []
  let buffer = ''
  let index = 0
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; continue }
    if (char !== '}') { buffer += char; continue }
    const prelude = stack.pop() ?? ''
    if (!prelude.startsWith('@') && !/^(from|to|\d+%)/.test(prelude)) out.push({ selector: prelude, body: buffer, at: stack.filter(part => part.startsWith('@')), index: index++ })
    buffer = ''
  }
  return out
}
const distRules = allRules(dist)

describe('theming tokens (1.2)', () => {
  it('every focus outline reads --diya-color-focus with the text fallback', () => {
    const rings: string[] = []
    for (const rule of distRules) {
      if (rule.at.some(at => at.includes('forced-colors: active'))) continue
      for (const [, name, value] of rule.body.matchAll(/(?:^|;|\s)(outline(?:-color)?)\s*:\s*([^;]+)/g)) {
        if (/^(none|0)$/.test(value.trim()) || !/solid|var\(|currentColor/.test(value)) continue
        rings.push(`${rule.selector} :: ${name}: ${value.trim()}`)
      }
    }
    expect(rings.length).toBeGreaterThanOrEqual(32)
    // Alert's tone ink is its own; Chatbot's attach ring follows its muted text.
    const exceptions = /diya-alert button|diya-chat-attach/
    for (const ring of rings) {
      if (/diya-alert button/.test(ring)) { expect(ring).toContain('var(--diya-internal-alert-ink'); continue }
      if (/diya-chat-attach/.test(ring)) { expect(ring).toContain('var(--diya-color-focus, currentColor)'); continue }
      expect(ring, ring).toMatch(/var\(--diya-color-focus, var\(--diya-color-text\)\)/)
    }
    // 1.3: Dialog's scrolling body, a Tab stop when it overflows with nothing focusable inside.
    expect(rings.filter(ring => !exceptions.test(ring)).length).toBe(32)
  })

  it('the nested root resets the nine 1.2 tokens to initial, inside @layer diya', () => {
    const resets = distRules.filter(rule => rule.selector === '.diya-root .diya-root')
    expect(resets).toHaveLength(1)
    expect(resets[0].at).toEqual(['@layer diya'])
    const declared = Object.fromEntries([...resets[0].body.matchAll(/(--diya-[\w-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name, value.trim()]))
    expect(declared).toEqual(Object.fromEntries(theming.map(name => [name, 'initial'])))
  })

  it('the 1.2 tokens are never declared on .diya-root (E7)', () => {
    for (const rule of distRules) {
      if (rule.selector === '.diya-root .diya-root') continue
      for (const name of theming) expect(rule.body, `${rule.selector} declares ${name}`).not.toMatch(new RegExp(`(^|[;\\s])${name}\\s*:`))
    }
    // Each is read with a fallback wherever it's used, except inside the Glass field mix, where
    // an unset field color must make the mix invalid (see the Glass test below).
    const glassMix = 'color-mix(in srgb, var(--diya-color-field) var(--diya-internal-glass-field-strength), transparent)'
    expect(dist.split(glassMix)).toHaveLength(2)
    for (const name of theming) {
      const uses = [...dist.replace(glassMix, '').matchAll(new RegExp(`var\\(${name}(\\s*[,)])`, 'g'))]
      expect(uses.length, name).toBeGreaterThan(0)
      expect(uses.filter(([, next]) => next.trim() === ')'), `${name} read without a fallback`).toEqual([])
    }
  })

  it('the invalid field border comes after the field-line rule and wins', () => {
    const line = distRules.filter(rule => rule.at.length === 1 && /border-color:\s*var\(--diya-color-field-line/.test(rule.body))
    expect(line.map(rule => rule.selector.replace(/\s+/g, ' '))).toEqual([
      '.diya-root .diya-text-field-control, .diya-root .diya-select-control, .diya-root .diya-textarea textarea',
      '.diya-root .diya-combobox-control, .diya-root .diya-date-trigger',
    ])
    const invalid = distRules.find(rule => rule.selector.includes(".diya-text-field[data-invalid='true'] .diya-text-field-control") && /border-color:\s*var\(--diya-color-error\)/.test(rule.body))!
    expect(invalid).toBeDefined()
    for (const part of ['.diya-select-control', '.diya-textarea[data-invalid=\'true\'] textarea', '.diya-combobox-control', '.diya-date-trigger']) expect(invalid.selector).toContain(part)
    expect(invalid.index).toBeGreaterThan(Math.max(...line.map(rule => rule.index)))
  })

  it('Glass field fill mixes the field color once', () => {
    const fields = ".diya-root[data-glass='true'] :is(.diya-text-field-control, .diya-select-control, .diya-textarea textarea"
    const glass = distRules.filter(rule => rule.selector.startsWith(fields) || rule.selector.startsWith(".diya-root[data-glass='true'] :is(.diya-combobox-control"))
    const supported = glass.filter(rule => rule.at.join() === '@layer diya,@supports (backdrop-filter: blur(14px))')
    // The mix is worked out on the field itself, from the field color alone, at today's strength.
    const mix = supported.filter(rule => rule.body.includes('--diya-internal-glass-field:'))
    expect(mix).toHaveLength(1)
    const value = /--diya-internal-glass-field:\s*([^;]+)/.exec(mix[0].body)![1].trim()
    expect(value).toBe('color-mix(in srgb, var(--diya-color-field) var(--diya-internal-glass-field-strength), transparent)')
    expect(value.match(/color-mix/g)).toHaveLength(1)
    expect(value).not.toContain('--diya-internal-field-fill')
    // Unset, the mix is invalid and the field keeps today's fill: the private one, as before.
    expect(supported.filter(rule => /background:/.test(rule.body)).map(rule => /background:\s*([^;]+)/.exec(rule.body)![1].trim())).toEqual([
      'var(--diya-internal-glass-field, var(--diya-internal-field-fill))',
      'var(--diya-internal-glass-field, var(--diya-internal-popup-control-fill))',
    ])
    const strength = (selector: string) => distRules.find(rule => rule.selector === selector && rule.body.includes('--diya-internal-glass-field-strength'))?.body.match(/--diya-internal-glass-field-strength:\s*([^;]+)/)?.[1].trim()
    expect(strength(".diya-root[data-glass='true']")).toBe('56%')
    expect(strength(".diya-root[data-glass='true']:where([data-theme='light'])")).toBe('66%')
    // Increase Contrast, Reduce Transparency and forced colors make a set field color solid.
    const solid = glass.filter(rule => rule.at.length === 2 && rule.at[1].startsWith('@media'))
    expect(solid.map(rule => rule.at[1])).toEqual(['@media (prefers-contrast: more)', '@media (prefers-contrast: more)', '@media (prefers-reduced-transparency: reduce)', '@media (prefers-reduced-transparency: reduce)', '@media (forced-colors: active)', '@media (forced-colors: active)'])
    for (const rule of solid) expect(rule.body).toMatch(/background:\s*var\(--diya-color-field, var\(--diya-internal-(field|popup-control)-fill\)\)/)
    for (const rule of solid) expect(rule.index).toBeGreaterThan(mix[0].index)
  })

  // Step 9 replaces step 1's guard ("the Drawer doesn't read --diya-radius-modal yet"), as the
  // build plan names: the Drawer's open edge is the modal corner now.
  it('Dialog and Drawer read --diya-radius-modal', () => {
    const modal = 'var(--diya-radius-modal, calc(22px * var(--diya-corner-scale, 1)))'
    const radius = (selector: string) => distRules.find(rule => rule.selector === selector && rule.at.every(at => at.startsWith('@layer')) && rule.body.includes('border-radius'))!.body.match(/border-radius:\s*([^;]+)/)![1].trim()
    expect(radius('.diya-root .diya-dialog')).toBe(modal)
    expect(radius('.diya-root .diya-drawer-modal')).toBe(`${modal} 0 0 ${modal}`)
    expect(radius(".diya-root .diya-drawer-modal[data-side='left']")).toBe(`0 ${modal} ${modal} 0`)
    // No other Drawer rule rounds it, outside the phone rule below.
    for (const rule of distRules.filter(rule => rule.selector.includes('diya-drawer-modal') && /border-radius/.test(rule.body) && rule.at.every(at => at.startsWith('@layer')))) expect(rule.body, rule.selector).toContain('--diya-radius-modal')
  })

  it('the Drawer is square at max-width 440px', () => {
    const phone = distRules.filter(rule => rule.at.some(at => at.includes('(max-width: 440px)')) && rule.selector.includes('diya-drawer-modal'))
    // 1.3: filling the screen, both of its sides keep clear of a phone's safe-area insets.
    expect(phone.map(rule => [rule.selector.replace(/\s+/g, ' '), rule.body.trim()])).toEqual([
      [".diya-root .diya-drawer-modal, .diya-root .diya-drawer-modal[data-side='left']", '--diya-internal-drawer-start: max(24px, env(safe-area-inset-left, 0px) + 12px); --diya-internal-drawer-end: max(24px, env(safe-area-inset-right, 0px) + 12px);'],
      [".diya-root .diya-drawer-modal, .diya-root .diya-drawer-modal[data-side='left']", 'border-radius: 0;'],
    ])
  })
})

describe('Spinner (1.2)', () => {
  // MOT-1.2-01/02: Chromium froze the rotate property on an <svg> while the page was busy, and
  // WebKit froze a breathe on the inner circle, so the turn is a transform and Reduce Motion
  // animates the svg.
  const keyframes = (name: string) => bare.match(new RegExp(`@keyframes ${name} \\{[^{}]*(\\{[^{}]*\\}[^{}]*)*\\}`))?.[0] ?? ''

  it('Spinner turns with transform, never the rotate property; Reduce Motion animates the svg, not a circle', () => {
    const turn = keyframes('diya-spinner-turn')
    expect(turn).toMatch(/transform: rotate\(360deg\)/)
    expect(turn).not.toMatch(/(^|[{;\s])rotate\s*:/)
    expect(bare).toMatch(/\.diya-root \.diya-spinner svg \{[^}]*animation: diya-spinner-turn 1s linear infinite;/)
    // Reduced: motion="reduced", and the device setting unscoped from data-motion, as Progress.
    expect(bare).toMatch(/\.diya-root\[data-motion='reduced'\] \.diya-spinner svg \{ animation: diya-progress-breathe 2s ease-in-out infinite alternate; \}/)
    expect(bare).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.diya-root \.diya-spinner svg \{ animation: diya-progress-breathe 2s ease-in-out infinite alternate; \}\s*\.diya-root \.diya-spinner-arc \{ stroke-dashoffset: 0; \}\s*\}/)
    // Nothing animates a circle.
    for (const rule of bare.matchAll(/([^{}]+)\{([^{}]*animation[^{}]*)\}/g)) {
      if (/diya-spinner/.test(rule[1])) expect(rule[1], rule[1]).not.toMatch(/circle|-arc|-track/)
    }
  })

  it('beside words, a quarter em of air on each side; not with showLabel, not in a Button (K4)', () => {
    // O6 (named edit of N6's version): a Spinner that is a part of a Button, the Button's own or one
    // you put in it, has no air of its own; the Button's gap places it, as an icon.
    expect(bare).toMatch(/\.diya-root \.diya-spinner:not\(\[data-show-label\], \.diya-button-spinner, \.diya-button > \*, \.diya-button-label > \*, \.diya-button-leading-content > \*\) \{ margin-inline: 0\.25em; \}/)
  })

  it('waits the literal 400ms beat, never scaled, and fades in over the gated medium', () => {
    expect(bare).toMatch(/\.diya-root \.diya-spinner \{[^}]*--diya-internal-beat: 400ms;[^}]*animation: diya-spinner-arrive var\(--diya-internal-duration-medium\) var\(--diya-ease-enter\) var\(--diya-internal-beat\) both;/)
    expect(keyframes('diya-spinner-arrive')).toBe('@keyframes diya-spinner-arrive { from { opacity: 0; } }')
  })
})

describe('step 9 refinements (1.2)', () => {
  const body = (selector: string) => distRules.find(rule => rule.selector === selector && rule.at.every(at => at.startsWith('@layer')))?.body.trim()
  it('the small Choice and Checkbox box sits 2px down, on its line\'s center', () => {
    expect(body(".diya-root :is(.diya-choice[data-size='small'] .diya-choice-option input, .diya-checkbox-field[data-size='small'] .diya-checkbox)")).toBe('margin-top: 2px;')
  })

  it('the large Choice and Checkbox box draws a 5x10 tick and a 10x2 bar; small and medium marks don\'t change', () => {
    expect(body(".diya-root :is(.diya-choice[data-size='large'] .diya-choice-option input[type='checkbox'], .diya-checkbox-field[data-size='large'] .diya-checkbox)::before")).toBe('width: 5px; height: 10px;')
    // K2: the mixed look is the property, or the attribute while unchecked.
    expect(body(".diya-root :is(.diya-choice[data-size='large'] input[type='checkbox'], .diya-checkbox-field[data-size='large'] .diya-checkbox):is(:indeterminate, [data-indeterminate='true']:not(:checked))::before")).toBe('width: 10px; height: 2px;')
    expect(body(".diya-root :is(.diya-choice-option input[type='checkbox'], .diya-checkbox):checked::before")).toMatch(/width: 4px;\s*height: 8px;/)
  })

  it('Table progress rounds with the corner scale', () => {
    const progress = distRules.filter(rule => rule.selector.includes('.diya-table-progress progress') && rule.body.includes('border-radius'))
    expect(progress.map(rule => rule.selector)).toEqual(['.diya-root .diya-table-progress progress', '.diya-root .diya-table-progress progress::-webkit-progress-bar', '.diya-root .diya-table-progress progress::-webkit-progress-value', '.diya-root .diya-table-progress progress::-moz-progress-bar'])
    for (const rule of progress) expect(rule.body, rule.selector).toContain('border-radius:calc(10px * var(--diya-corner-scale, 1))')
  })
})

describe('Button loading (F12, F13)', () => {
  // Q3 (F16, named edit): unless it's disabled as well, which looks disabled.
  it('looks busy, not disabled: full color and the progress cursor, unless disabled as well', () => {
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\] \{\s*cursor: progress;\s*pointer-events: auto;\s*\}/)
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\]:not\(\[data-busy-disabled\]\) \{\s*opacity: 1;\s*\}/)
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\]\[data-busy-disabled\] \{\s*cursor: not-allowed;\s*\}/)
  })

  it('moves nothing: no padding or margin is animated or transitioned for loading', () => {
    expect(bare).not.toMatch(/diya-button-make-room|--diya-internal-button-(pad|room)/)
    for (const [, selector, body] of bare.matchAll(/([^{}]*diya-button[^{}]*)\{([^{}]*)\}/g)) {
      for (const [, name, value] of body.matchAll(/(transition-property|animation)\s*:\s*([^;]+)/g)) expect(`${selector.trim()} ${name}: ${value}`).not.toMatch(/padding|margin/)
    }
  })

  it('swaps in one frame on the beat and fades the label or icon back over fast', () => {
    // P3 (named edit): the spinner, the parts' hide and their fade back are important too.
    expect(bare).toMatch(/\.diya-root \.diya-button-spinner \{\s*animation: diya-spinner-arrive 0s linear var\(--diya-internal-beat\) both !important;\s*\}/)
    // L2: hidden by a zero-length animation on the beat, which needs no @starting-style.
    expect(bare).toMatch(/\{\s*animation: diya-spinner-arrive 0s linear var\(--diya-internal-beat\) reverse both !important;\s*\}/)
    expect(bare).not.toMatch(/@starting-style\s*\{[^{}]*diya-button/)
    // N1 (named edit of M2's version): the words go and come back from the Button, never by a style
    // of the box-less wrappers, which WebKit's accessible name can't take; the elements by opacity.
    // O4 (named edit): the Button's own hide and fade back are important, so an app's animation on
    // the Button can't replace them.
    // P1 (named edit): not an empty Button (an asChild <input> or <img>, which can't hold the spinner).
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\]:not\(\[data-icon-only='true'\], :empty\) \{\s*animation: diya-button-hide 0s linear var\(--diya-internal-beat\) forwards !important;\s*\}/)
    // P5 on Linux: in forced colors the hide also unforces the Button and paints its system colors, on
    // the beat and never before it (filled forwards only).
    expect(bare).toMatch(/@media \(forced-colors: active\) \{\s*@keyframes diya-button-hide \{ to \{ --diya-internal-busy-adjust: none; color: var\(--diya-internal-busy-ink\); background-color: ButtonFace; background-image: none; border-color: var\(--diya-internal-busy-ink\); box-shadow: none; -webkit-text-fill-color: transparent;[^}]*\} \}\s*@keyframes diya-button-hide-again \{ to \{ --diya-internal-busy-adjust: none; color: var\(--diya-internal-busy-ink\); background-color: ButtonFace; background-image: none; border-color: var\(--diya-internal-busy-ink\); box-shadow: none; -webkit-text-fill-color: transparent;/)
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\] \{\s*forced-color-adjust: var\(--diya-internal-busy-adjust\);\s*--diya-internal-busy-ink: ButtonText;\s*\}/)
    expect(bare).toMatch(/\.diya-root \.diya-button\[aria-busy='true'\]\[data-busy-disabled\] \{\s*--diya-internal-busy-ink: GrayText;\s*\}/)
    expect(bare).toMatch(/\.diya-root \.diya-button\[data-returning='true'\]:not\(\[aria-busy='true'\], \[data-icon-only='true'\]\) \{\s*animation: diya-button-return-text var\(--diya-internal-duration-fast\) var\(--diya-ease-enter\) !important;\s*\}/)
    expect(bare).toMatch(/\.diya-button\[data-returning='true'\]:not\(\[aria-busy='true'\]\) > \.diya-button-label > \*,[^{]*\{\s*animation: diya-button-return var\(--diya-internal-duration-fast\) var\(--diya-ease-enter\) !important;\s*\}/)
    expect(bare).toMatch(/@keyframes diya-button-hide \{ to \{ -webkit-text-fill-color: transparent; -webkit-text-stroke-color: transparent; text-shadow: none; text-decoration-color: transparent; \} \}/)
    for (const [selector, body] of [...bare.matchAll(/([^{}]*diya-button-(?:label|leading-content)[^{}]*)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]])) {
      const last = selector.split(',').map((part) => part.trim().split(/[\s>]+/).at(-1))
      if (last.some((part) => /^\.diya-button-(label|leading-content)$/.test(part!))) expect(body, selector).not.toMatch(/animation|color|text-shadow|opacity/)
    }
  })
})

describe('Button loading at rest (M2, M1)', () => {
  it('the label\'s wrappers have no box, so the Button lays out as without them; a leading part gets one only when it renders a single svg', () => {
    expect(bare).toMatch(/\.diya-root :is\(\.diya-button-label, \.diya-button-leading, \.diya-button-leading-content\) \{\s*display: contents;\s*\}/)
    expect(bare).toMatch(/\.diya-root \.diya-button-leading:has\(> \.diya-button-leading-content > svg:only-child\) \{\s*position: relative;\s*display: inline-flex;/)
    // The Button's own spinner is hidden at rest (M5; N6: by its own class).
    expect(bare).toMatch(/\.diya-root \.diya-button:not\(\[aria-busy='true'\]\) \.diya-button-spinner \{\s*display: none;\s*\}/)
  })
})
