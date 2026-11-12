// The fields' client markup must stay exactly as 1.1.1 rendered it: every class, attribute
// and id, through error, help, disabled, sizes, icons and open popups, on React 18 and 19.
// 1.2 moves the fields onto Field's internal parts; this proves nobody sees a difference.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { createElement, version } from 'react'
import * as lib from '../dist/index.js'
import { FIXED_DATE, fieldCases, stepProps, type Fixture } from './fixtures/field-markup-cases.js'

const writeTo = process.env.DIYA_WRITE_FIXTURES
const fixture: Fixture = writeTo ? {} : JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/field-markup-1.1.1.json'), 'utf8'))
const captured: Record<string, string> = {}

beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'], now: FIXED_DATE }) })
afterAll(() => { if (writeTo) writeFileSync(resolve(writeTo, `${version}-client.json`), `${JSON.stringify(captured, null, 2)}\n`) })

/** One mounted provider per field, re-rendered through each step in order; the markup after each. */
function walk(field: (typeof fieldCases)[number]) {
  const out: Record<string, string> = {}
  const tree = (props: Record<string, unknown>) => createElement(lib.DiyaProvider, { theme: 'light' }, field.render(lib, props))
  const view = render(tree({}))
  for (const step of field.steps) {
    act(() => { view.rerender(tree(stepProps(step))) })
    if (step.act === 'open') {
      const opener = view.container.querySelector<HTMLElement>('input[role=combobox], .diya-date-trigger')!
      act(() => { fireEvent.click(opener) })
      act(() => { fireEvent.keyDown(opener, { key: 'ArrowDown' }) })
    }
    // 1.2's toast host (its always-present live regions and the stack) is the provider's, made in
    // the browser only (api.md 5); the fields' own markup is what's frozen.
    const copy = view.container.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.diya-toast-host').forEach((host) => host.remove())
    out[step.name] = copy.innerHTML
  }
  view.unmount()
  return out
}

describe(`field markup on React ${version}`, () => {
  for (const field of fieldCases) {
    it(`reproduces the frozen 1.1.1 markup: ${field.name}`, () => {
      const steps = walk(field)
      for (const [step, html] of Object.entries(steps)) {
        if (writeTo) captured[`${field.name}/${step}`] = html
        else expect(html, `${field.name} › ${step}`).toBe(fixture[version].client[`${field.name}/${step}`])
      }
    })
  }
})
