// Two copies of the package on one page (peer variants, an injected workspace copy, a hot
// reload) share the page's one toast stack: their <Toast>s get places of their own, and the
// page's outermost provider shows every toast, whichever copy it's from (R8; the design
// system's probe).
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import * as A from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const copy = join(here, '..', 'node_modules', '.cache', 'diya-second-copy')
let B: typeof A
beforeAll(async () => {
  rmSync(copy, { recursive: true, force: true })
  mkdirSync(copy, { recursive: true })
  cpSync(join(here, '..', 'dist'), copy, { recursive: true })
  B = await import(/* @vite-ignore */ join(copy, 'index.js'))
})
afterAll(() => rmSync(copy, { recursive: true, force: true }))
afterEach(async () => {
  act(() => A.toast.dismiss())
  await act(async () => {})
})

const places = () => [...document.querySelectorAll('.diya-toast-list > .diya-toast')].map((place) => [...place.querySelectorAll('.diya-alert-title')].map((title) => `${title.textContent}:${title.closest('.diya-root')?.getAttribute('data-theme')}`).join(','))

describe('two copies of the package on one page (R8)', () => {
  it('is a second copy: its own modules', () => {
    expect(B.DiyaProvider).not.toBe(A.DiyaProvider)
  })

  it("each copy's <Toast> gets its own place in one column, in its own provider's look", async () => {
    render(
      <A.DiyaProvider theme="light">
        <A.Toast title="From copy A" duration={0} onDismiss={() => {}}>a</A.Toast>
        <B.DiyaProvider theme="dark"><B.Toast title="From copy B" duration={0} onDismiss={() => {}}>b</B.Toast></B.DiyaProvider>
      </A.DiyaProvider>,
    )
    await waitFor(() => expect(places()).toEqual(['From copy A:light', 'From copy B:dark']))
    expect(document.querySelectorAll('.diya-toast-list')).toHaveLength(1)
  })

  it("toast() from either copy shows in the page's outermost provider, not in a nested copy's", async () => {
    render(
      <A.DiyaProvider theme="light" className="outer-a">
        <B.DiyaProvider theme="dark" className="inner-b"><p>Inner</p></B.DiyaProvider>
      </A.DiyaProvider>,
    )
    await act(async () => {})
    act(() => { B.toast({ title: 'From B', duration: 0 }); A.toast({ title: 'From A', duration: 0 }) })
    await waitFor(() => expect(places()).toEqual(['From B:light', 'From A:light']))
    const lists = [...document.querySelectorAll('.diya-toast-list')]
    expect(lists).toHaveLength(1)
    expect(lists[0].closest('.inner-b')).toBeNull()
    expect(lists[0].closest('.outer-a')).not.toBeNull()
  })
})

// The store is a protocol between versions: each copy fills the fields it reads (R9).
describe('a page store made by another 1.x copy, without fields this copy adds (R9)', () => {
  const KEY = Symbol.for('@idyeah/diya/toast@1')
  afterEach(() => { delete (globalThis as Record<symbol, unknown>)[KEY] })
  it('still shows toast() and <Toast>s, each in its own place', async () => {
    const listeners = new Set()
    // Only what every 1.x copy has: no <Toast> places, no slot count, no copy layer, no focus chain.
    // One store per React (S3, DS-R3-01): this React's, under the page's key.
    ;(globalThis as Record<symbol, unknown>)[KEY] = new WeakMap([[createElement, { entries: [], hosts: [], version: 0, listeners, snapshot: { entries: [], hosts: [], slots: [], version: 0 }, count: 0, order: 0, dropping: false, paused: false }]])
    render(
      <A.DiyaProvider theme="light">
        <A.Toast title="First" duration={0} onDismiss={() => {}} />
        <A.Toast title="Second" duration={0} onDismiss={() => {}} />
      </A.DiyaProvider>,
    )
    act(() => { A.toast({ title: 'Third', duration: 0 }) })
    await waitFor(() => expect(places()).toEqual(['First:light', 'Second:light', 'Third:light']))
  })
})
