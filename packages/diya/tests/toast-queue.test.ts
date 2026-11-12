// @vitest-environment node
// toast()'s queue: a plain module a server file can import. On the server it does nothing and
// stores nothing; in the browser one store per page, shared by every copy of the package.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const KEY = Symbol.for('@idyeah/diya/toast@1')
const globals = globalThis as unknown as Record<string | symbol, unknown>
const asBrowser = () => { globals.window = globalThis }
afterEach(() => { delete globals.window; delete globals[KEY] })

describe('toast() on the server', () => {
  it('returns an id and does nothing on the server', async () => {
    const { toast } = await import('../dist/index.js')
    expect(typeof globals.window).toBe('undefined')
    expect(toast({ title: 'Draft saved', id: 'save' })).toBe('save')
    expect(toast({ title: 'Draft saved' })).toMatch(/^t-server-\d+$/)
    toast.dismiss()
  })

  it('never stores on the server', async () => {
    const { toast } = await import('../dist/toast/queue.js')
    toast({ title: 'One visitor\'s secret' })
    expect(globals[KEY]).toBeUndefined()
  })
})

describe('toast() in the browser', () => {
  it('same id updates in place', async () => {
    asBrowser()
    const { toast, toastSnapshot } = await import('../dist/toast/queue.js')
    toast({ title: 'Saving…', id: 'save' })
    toast({ title: 'Other' })
    toast({ title: 'Saved', tone: 'success', id: 'save' })
    const entries = toastSnapshot().entries
    expect(entries.map((entry) => entry.title)).toEqual(['Saved', 'Other'])
    expect(entries[0]).toMatchObject({ id: 'save', tone: 'success', version: 1, order: 1 })
  })

  it('dismiss() clears shown and waiting', async () => {
    asBrowser()
    const { toast, toastSnapshot, registerHost, settleToasts } = await import('../dist/toast/queue.js')
    registerHost({})
    const undo = { label: 'Undo', onClick: () => {} }
    for (const title of ['A', 'B', 'C']) toast({ title, id: title, action: undo })
    for (const title of ['D', 'E']) toast({ title, id: title })
    settleToasts(3)
    expect(toastSnapshot().entries.map((entry) => entry.status)).toEqual(['shown', 'shown', 'shown', 'waiting', 'waiting'])
    toast.dismiss('D')
    expect(toastSnapshot().entries.map((entry) => entry.id)).toEqual(['A', 'B', 'C', 'E'])
    toast.dismiss('A')
    // A shown toast leaves through its stack, which plays its exit and then removes it.
    expect(toastSnapshot().entries.find((entry) => entry.id === 'A')?.status).toBe('leaving')
    toast.dismiss()
    expect(toastSnapshot().entries.every((entry) => entry.status === 'leaving')).toBe(true)
  })

  it('two module copies share one store', async () => {
    asBrowser()
    const one = await import('../dist/toast/queue.js?copy=one' as string)
    const two = await import('../dist/toast/queue.js?copy=two' as string)
    expect(one.toast).not.toBe(two.toast)
    one.toast({ title: 'From copy one', id: 'x' })
    expect(two.toastSnapshot().entries.map((entry: { title: string }) => entry.title)).toEqual(['From copy one'])
  })

  it('makes room with the oldest toast without an action; with none, the new one waits', async () => {
    asBrowser()
    const { toast, toastSnapshot, registerHost, settleToasts } = await import('../dist/toast/queue.js')
    registerHost({})
    const undo = { label: 'Undo', onClick: () => {} }
    toast({ title: 'A', id: 'A', action: undo })
    toast({ title: 'B', id: 'B' })
    toast({ title: 'C', id: 'C', action: undo })
    settleToasts(3)
    toast({ title: 'D', id: 'D' })
    settleToasts(3)
    const status = () => Object.fromEntries(toastSnapshot().entries.map((entry) => [entry.id, entry.status]))
    expect(status()).toEqual({ A: 'shown', B: 'leaving', C: 'shown', D: 'shown' })
    toast({ title: 'E', id: 'E', action: undo })
    settleToasts(3)
    expect(status()).toMatchObject({ D: 'leaving', E: 'shown' })
    toast({ title: 'F', id: 'F' })
    settleToasts(3)
    expect(status()).toMatchObject({ A: 'shown', C: 'shown', E: 'shown', F: 'waiting' })
  })

  it('narrowing sends the oldest without an action out; with every toast holding an action, the extra waits at the front', async () => {
    asBrowser()
    const { toast, toastSnapshot, registerHost, settleToasts } = await import('../dist/toast/queue.js')
    registerHost({})
    const undo = { label: 'Undo', onClick: () => {} }
    for (const id of ['A', 'B', 'C']) toast({ title: id, id, action: undo })
    settleToasts(3)
    settleToasts(2)
    expect(toastSnapshot().entries.map((entry) => `${entry.id}:${entry.status}`)).toEqual(['A:shown', 'B:shown', 'C:waiting'])
  })

  it('queue.js has no directive and no browser globals', () => {
    const text = readFileSync(resolve(process.cwd(), 'dist/toast/queue.js'), 'utf8')
    expect(text).not.toMatch(/use client/)
    expect(text).not.toMatch(/\b(window|document|navigator)\.\w|\brequestAnimationFrame\b/)
    expect(text).not.toMatch(/\buse[A-Z]\w*\(/)
  })
})
