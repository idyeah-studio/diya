// The toast stack: toast() in the outermost provider, at most 3 (2 on phones), room made by the
// oldest toast without an action, timers that pause while read, F8 and Escape, one announcement
// per toast, and no roles that collide with an app's own queries.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useEffect, useState } from 'react'
import { Button, DiyaProvider, toast } from '../dist/index.js'
import { toastSnapshot } from '../dist/toast/queue.js'

afterEach(async () => {
  act(() => toast.dismiss())
  await act(async () => {})
})

const shown = () => [...document.querySelectorAll('.diya-toast-list > .diya-toast .diya-alert-title')].map((node) => node.textContent)
const liveText = () => [...document.querySelectorAll('.diya-toast-host > [aria-live]')].map((node) => node.textContent).join('|')
const frame = () => act(() => new Promise<void>((done) => requestAnimationFrame(() => done())))

function phone(narrow: boolean) {
  const real = window.matchMedia.bind(window)
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => (query.includes('max-width: 600px') ? ({ matches: narrow, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } as MediaQueryList) : real(query)))
}

describe('toast() and its host', () => {
  it('waits for a provider, then shows', async () => {
    act(() => { toast({ title: 'Welcome back' }) })
    expect(document.querySelector('.diya-toast-list')).toBeNull()
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    await waitFor(() => expect(shown()).toEqual(['Welcome back']))
  })

  it('keeps a toast fired just before the provider swaps', async () => {
    function App() {
      const [page, setPage] = useState('edit')
      return page === 'edit'
        ? <DiyaProvider key="edit"><Button onClick={() => { toast({ title: 'Project saved' }); setPage('list') }}>Save</Button></DiyaProvider>
        : <DiyaProvider key="list"><p>Projects</p></DiyaProvider>
    }
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('Projects')).toBeTruthy())
    await waitFor(() => expect(shown()).toEqual(['Project saved']))
  })

  it('drops everything when the last provider really unmounts', async () => {
    const view = render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'One' }); toast({ title: 'Two' }) })
    await waitFor(() => expect(shown()).toEqual(['One', 'Two']))
    view.unmount()
    await act(async () => {})
    expect(toastSnapshot().entries).toEqual([])
  })

  it('StrictMode shows an effect\'s toast twice in development; an id dedupes it', async () => {
    function Saved({ id }: { id?: string }) {
      useEffect(() => { toast({ title: 'Synced', id }) }, [id])
      return null
    }
    const view = render(<StrictMode><DiyaProvider><Saved /></DiyaProvider></StrictMode>)
    await waitFor(() => expect(shown()).toEqual(['Synced', 'Synced']))
    view.unmount()
    await act(async () => {})
    render(<StrictMode><DiyaProvider><Saved id="sync" /></DiyaProvider></StrictMode>)
    await waitFor(() => expect(shown()).toEqual(['Synced']))
  })

  it('uses the first-mounted outermost provider; nested providers don\'t host', async () => {
    render(
      <>
        <DiyaProvider className="first"><DiyaProvider theme="dark" className="nested"><p>Nested</p></DiyaProvider></DiyaProvider>
        <DiyaProvider className="second"><p>Second</p></DiyaProvider>
      </>,
    )
    act(() => { toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(shown()).toEqual(['Draft saved']))
    expect(document.querySelectorAll('.diya-toast-host')).toHaveLength(2)
    expect(document.querySelector('.diya-toast-list .diya-toast')!.closest('.diya-root')!.classList.contains('first')).toBe(true)
    expect(document.querySelector('.nested .diya-toast-host')).toBeNull()
  })

  it('shows at most 3; 2 under 600px', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { for (const title of ['A', 'B', 'C', 'D']) toast({ title, action: { label: 'Undo', onClick: () => {} } }) })
    await waitFor(() => expect(shown()).toEqual(['A', 'B', 'C']))
    act(() => toast.dismiss())
    await act(async () => {})
    phone(true)
    const narrow = render(<DiyaProvider><p>Phone</p></DiyaProvider>)
    act(() => { for (const title of ['A', 'B', 'C']) toast({ title, action: { label: 'Undo', onClick: () => {} } }) })
    await waitFor(() => expect(shown()).toEqual(['A', 'B']))
    narrow.unmount()
  })

  it('the oldest toast without an action makes room', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    const undo = { label: 'Undo', onClick: () => {} }
    act(() => { toast({ title: 'Archived', action: undo }); toast({ title: 'Link copied' }); toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(shown()).toEqual(['Archived', 'Link copied', 'Draft saved']))
    act(() => { toast({ title: 'Export started' }) })
    await waitFor(() => expect(shown()).toEqual(['Archived', 'Draft saved', 'Export started']))
  })

  it('a new toast waits when every shown toast has an action', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    const undo = { label: 'Undo', onClick: () => {} }
    act(() => { for (const title of ['A', 'B', 'C']) toast({ title, id: title, action: undo }) })
    await waitFor(() => expect(shown()).toEqual(['A', 'B', 'C']))
    act(() => { toast({ title: 'D' }) })
    await act(async () => {})
    expect(shown()).toEqual(['A', 'B', 'C'])
    act(() => toast.dismiss('B'))
    await waitFor(() => expect(shown()).toEqual(['A', 'C', 'D']))
  })
})

describe('timing', () => {
  it('timers pause on mouseenter and focus, and when hidden; resume with the time left', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    render(<DiyaProvider motion="off"><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved', duration: 1000 }) })
    await act(async () => {})
    expect(shown()).toEqual(['Draft saved'])
    act(() => { vi.advanceTimersByTime(600) })
    const list = document.querySelector('.diya-toast-list')!
    fireEvent.mouseEnter(list)
    act(() => { vi.advanceTimersByTime(5000) })
    expect(shown()).toEqual(['Draft saved'])
    fireEvent.mouseLeave(list)
    act(() => { vi.advanceTimersByTime(300) })
    expect(shown()).toEqual(['Draft saved'])
    fireEvent.focus(list.querySelector('button')!)
    act(() => { vi.advanceTimersByTime(5000) })
    expect(shown()).toEqual(['Draft saved'])
    fireEvent.blur(list.querySelector('button')!)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(shown()).toEqual(['Draft saved'])
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    // 600 + 300 ran: 100 left.
    act(() => { vi.advanceTimersByTime(90) })
    expect(shown()).toEqual(['Draft saved'])
    act(() => { vi.advanceTimersByTime(20) })
    expect(shown()).toEqual([])
  })

  it('action toasts never time out', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    render(<DiyaProvider motion="off"><p>App</p></DiyaProvider>)
    act(() => { toast({ title: '3 emails archived', duration: 500, action: { label: 'Undo', onClick: () => {} } }) })
    await act(async () => {})
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(shown()).toEqual(['3 emails archived'])
  })

  it('same id updates in place and restarts its time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    render(<DiyaProvider motion="off"><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Saving…', id: 'save', duration: 1000 }) })
    await act(async () => {})
    act(() => { vi.advanceTimersByTime(800) })
    act(() => { toast({ title: 'Saved', id: 'save', tone: 'success', duration: 1000 }) })
    await act(async () => {})
    expect(shown()).toEqual(['Saved'])
    act(() => { vi.advanceTimersByTime(800) })
    expect(shown()).toEqual(['Saved'])
    act(() => { vi.advanceTimersByTime(250) })
    expect(shown()).toEqual([])
  })
})

describe('keyboard', () => {
  it('F8 focuses the newest toast\'s first button; Esc returns to the origin', async () => {
    render(<DiyaProvider><Button>Edit</Button></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved' }); toast({ title: '3 emails archived', action: { label: 'Undo', onClick: () => {} } }) })
    await waitFor(() => expect(shown()).toHaveLength(2))
    const edit = screen.getByRole('button', { name: 'Edit' })
    edit.focus()
    fireEvent.keyDown(document, { key: 'F8' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await waitFor(() => expect(shown()).toEqual(['Draft saved']))
    expect(document.activeElement).toBe(edit)
  })

  it('F8 does nothing when the app handled it', async () => {
    render(<DiyaProvider><Button>Edit</Button></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(shown()).toHaveLength(1))
    const edit = screen.getByRole('button', { name: 'Edit' })
    edit.focus()
    const event = new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(document.activeElement).toBe(edit)
  })

  it('Esc never sends focus to body when the origin is gone', async () => {
    function App() {
      const [edit, setEdit] = useState(true)
      return <DiyaProvider>{edit && <Button onClick={() => setEdit(false)}>Edit</Button>}<Button>Stay</Button></DiyaProvider>
    }
    render(<App />)
    act(() => { toast({ title: 'One' }); toast({ title: 'Two' }) })
    await waitFor(() => expect(shown()).toHaveLength(2))
    screen.getByRole('button', { name: 'Edit' }).focus()
    fireEvent.keyDown(document, { key: 'F8' })
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Edit' })) })
    // The origin left the page while focus was in the stack.
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await waitFor(() => expect(shown()).toEqual(['One']))
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.closest('.diya-toast')).not.toBeNull()
  })

  it('closing a focused toast moves focus to the next toast', async () => {
    render(<DiyaProvider><Button>Edit</Button></DiyaProvider>)
    act(() => { toast({ title: 'One' }); toast({ title: 'Two' }) })
    await waitFor(() => expect(shown()).toHaveLength(2))
    const close = screen.getByRole('button', { name: 'Dismiss: Two' })
    close.focus()
    fireEvent.click(close)
    await waitFor(() => expect(shown()).toEqual(['One']))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dismiss: One' }))
  })

  it('an action runs, closes its toast and returns focus', async () => {
    const undo = vi.fn()
    render(<DiyaProvider><Button>Edit</Button></DiyaProvider>)
    act(() => { toast({ title: '3 emails archived', action: { label: 'Undo', onClick: undo } }) })
    await waitFor(() => expect(shown()).toHaveLength(1))
    screen.getByRole('button', { name: 'Edit' }).focus()
    fireEvent.keyDown(document, { key: 'F8' })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undo).toHaveBeenCalledOnce()
    await waitFor(() => expect(shown()).toEqual([]))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit' }))
  })
})

describe('roles and words', () => {
  it('the region is named "Notifications (F8)" and is a region only while non-empty', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    await act(async () => {})
    expect(screen.queryByRole('region')).toBeNull()
    act(() => { toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Notifications (F8)' })).toBeTruthy())
    act(() => toast.dismiss())
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull())
  })

  it('an empty provider adds no role=status, role=alert or role=region', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    await act(async () => {})
    expect(document.querySelector('.diya-toast-host')).not.toBeNull()
    expect(screen.queryAllByRole('status')).toEqual([])
    expect(screen.queryAllByRole('alert')).toEqual([])
    expect(screen.queryAllByRole('region')).toEqual([])
  })

  it('getByText(title) finds exactly one element while a toast shows', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved', description: 'Saved a moment ago.' }) })
    await waitFor(() => expect(shown()).toHaveLength(1))
    await frame()
    expect(screen.getAllByText('Draft saved')).toHaveLength(1)
    expect(screen.getAllByText('Saved a moment ago.')).toHaveLength(1)
    // Inside the stack the Alert has no status role of its own: the live region speaks.
    expect(screen.queryAllByRole('status')).toEqual([])
  })

  it('the announcement is read once, with the tone prefix and the F8 hint', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved', tone: 'success' }) })
    await waitFor(() => expect(liveText()).toBe('Success: Draft saved.|'))
    act(() => { toast({ title: '3 emails archived', description: 'Undo within a minute.', action: { label: 'Undo', onClick: () => {} } }) })
    await waitFor(() => expect(liveText()).toBe('Info: 3 emails archived. Undo within a minute. Press F8 to reach Undo.|'))
    act(() => { toast({ title: 'Couldn\'t sync', tone: 'error', urgent: true }) })
    await waitFor(() => expect(liveText()).toBe('Info: 3 emails archived. Undo within a minute. Press F8 to reach Undo.|Error: Couldn\'t sync.'))
    // One text node per announcement, in a live region with no role.
    for (const region of document.querySelectorAll('.diya-toast-host > [aria-live]')) {
      expect(region.getAttribute('role')).toBeNull()
      expect(region.childNodes.length).toBeLessThanOrEqual(1)
    }
  })

  it('a same-id update speaks again only when its words change', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Saving…', id: 'save' }) })
    await waitFor(() => expect(liveText()).toBe('Info: Saving…|'))
    const polite = document.querySelector('.diya-toast-host > [aria-live=polite]')!
    const writes: string[] = []
    new MutationObserver(() => writes.push(polite.textContent ?? '')).observe(polite, { childList: true, characterData: true, subtree: true })
    act(() => { toast({ title: 'Saving…', id: 'save', duration: 2000 }) })
    await frame()
    await act(async () => {})
    expect(writes.filter(Boolean)).toEqual([])
    act(() => { toast({ title: 'Saved', id: 'save', tone: 'success' }) })
    await waitFor(() => expect(liveText()).toBe('Success: Saved.|'))
  })

  it('names each close button for its toast', async () => {
    render(<DiyaProvider><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dismiss: Draft saved' })).toBeTruthy())
  })

  it('motion off: dismiss is synchronous, no copy', async () => {
    render(<DiyaProvider motion="off"><p>App</p></DiyaProvider>)
    act(() => { toast({ title: 'Draft saved' }) })
    await waitFor(() => expect(shown()).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss: Draft saved' }))
    expect(shown()).toEqual([])
    expect(document.querySelector('.diya-toast-copies')!.children).toHaveLength(0)
  })
})
