import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DiyaProvider, Progress } from '../dist/index.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
const block = reduced.slice(0, reduced.indexOf('\n}') + 2)

describe('Progress under Reduce Motion', () => {
  it('sets an indeterminate bar’s width in CSS, so Reduce Motion can widen it', () => {
    const view = render(<DiyaProvider><Progress label="Syncing" /></DiyaProvider>)
    const fill = view.container.querySelector('.diya-progress-track > span') as HTMLElement
    expect(fill.getAttribute('style')).toBe(null)
    view.rerender(<DiyaProvider><Progress label="Syncing" value={40} /></DiyaProvider>)
    expect(fill.style.width).toBe('40%')
    expect(css).toMatch(/\[data-indeterminate='true'\]\[data-variant='linear'\] \.diya-progress-track > span \{ width: 35%;/)
  })

  it('breathes a full bar and a full ring in place instead of freezing at a partial amount', () => {
    expect(block).toMatch(/\[data-variant='linear'\] \.diya-progress-track > span \{ width: 100%; transform: none; animation: diya-progress-breathe /)
    expect(block).toMatch(/\[data-variant='circular'\] \.diya-progress-fill-circle \{ stroke-dashoffset: 0; animation: diya-progress-breathe /)
    expect(block).toMatch(/\[data-variant='circular'\] svg \{ animation: none; \}/)
    expect(css).toMatch(/@keyframes diya-progress-breathe \{ from \{ opacity: \.25; \} to \{ opacity: \.7; \} \}/)
  })

  it('uses no !important, so an app can still restyle the bar', () => {
    expect(block).not.toContain('!important')
  })
})
