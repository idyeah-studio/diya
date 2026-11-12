// Two apps on one page with two different Reacts (18 and 19), as micro-frontends mid-upgrade:
// each app's toasts hold its own React's elements, so each React has its own toast store and
// stack. A toast() with a JSX description from one app never reaches the other's tree (S3; the
// design system's probe, DS-R3-01).
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import { createElement as h18, version as v18 } from 'react'
import { createRoot as root18 } from 'react-dom/client'
import * as A from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const site = join(here, '..', '..', '..', 'apps', 'site')
// Inside the site's tree, so the copy's 'react' is the site's React 19.
const copy = join(site, 'node_modules', '.cache', 'diya-react-19-copy')
type React19 = { createElement: typeof h18; useState: <T>(value: T) => [T, (value: T) => void]; version: string }
let C: typeof A
let R19: React19
let root19: (element: Element) => { render: (node: unknown) => void; unmount: () => void }
beforeAll(async () => {
  rmSync(copy, { recursive: true, force: true })
  mkdirSync(copy, { recursive: true })
  cpSync(join(here, '..', 'dist'), copy, { recursive: true })
  C = await import(/* @vite-ignore */ join(copy, 'index.js'))
  R19 = (await import(/* @vite-ignore */ join(site, 'node_modules', 'react', 'index.js'))).default
  root19 = (await import(/* @vite-ignore */ join(site, 'node_modules', 'react-dom', 'client.js'))).default.createRoot
})
afterAll(() => rmSync(copy, { recursive: true, force: true }))

const wait = (ms: number) => act(async () => { await new Promise((done) => setTimeout(done, ms)) })

describe('two Reacts on one page (S3)', () => {
  it('are two Reacts', () => {
    expect(v18.split('.')[0]).toBe('18')
    expect(R19.version.split('.')[0]).toBe('19')
  })

  it("an app's toast() with a JSX description shows in its own stack and never breaks the other app", async () => {
    const errors: string[] = []
    const onError = (event: ErrorEvent) => { errors.push(event.message) }
    window.addEventListener('error', onError)
    const a = document.createElement('div')
    const b = document.createElement('div')
    document.body.append(a, b)
    const appA = root18(a)
    await act(async () => { appA.render(h18(A.DiyaProvider, { theme: 'light' }, h18('p', null, 'app A'))) })
    const appB = root19(b)
    await act(async () => { appB.render(R19.createElement(C.DiyaProvider, { theme: 'dark' }, R19.createElement('p', null, 'app B'))) })
    await wait(50)
    function Count() { const [n] = R19.useState(3); return R19.createElement('b', null, `${n} files`) }
    await act(async () => { C.toast({ title: 'Uploaded', description: R19.createElement('span', null, 'From app B.'), duration: 0 }) })
    await act(async () => { C.toast({ title: 'Counted', description: R19.createElement(Count), duration: 0 }) })
    await act(async () => { A.toast({ title: 'Saved', description: h18('i', null, 'From app A.'), duration: 0 }) })
    await wait(80)
    // Both apps still render, and each toast is in its own app's stack, words and all.
    expect(a.textContent).toContain('app A')
    expect(b.textContent).toContain('app B')
    const titlesIn = (element: Element) => [...element.querySelectorAll('.diya-toast-list .diya-alert-title')].map((node) => node.textContent)
    expect(titlesIn(a)).toEqual(['Saved'])
    expect(titlesIn(b)).toEqual(['Uploaded', 'Counted'])
    expect(b.textContent).toContain('From app B.')
    expect(b.textContent).toContain('3 files')
    expect(a.textContent).toContain('From app A.')
    expect(errors).toEqual([])
    window.removeEventListener('error', onError)
    await act(async () => { appB.unmount(); appA.unmount() })
    a.remove()
    b.remove()
  })
})
