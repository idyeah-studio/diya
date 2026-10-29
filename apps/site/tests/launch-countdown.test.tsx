import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import {
  LaunchCountdown,
  LAUNCH_SECONDS_PATH,
  RESYNC_TIMEOUT_MS,
} from '../components/LaunchCountdown'
import { LAUNCH_AT, secondsUntilLaunch } from '../lib/launch'

vi.mock('next/server', () => ({ connection: async () => {} }))

const HOUR = 3600

/** Remaining seconds, read from the timer's accessible name. */
function remaining() {
  const label = screen.getByRole('timer').getAttribute('aria-label') ?? ''
  const m = label.match(/^(\d+) days?, (\d+) hours?, (\d+) minutes?, (\d+) seconds? remaining$/)
  if (!m) throw new Error(`unreadable timer label: ${label}`)
  return Number(m[1]) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])
}

/** The digits a sighted visitor sees, e.g. "00:00:59:59". */
function visibleDigits() {
  return Array.from(screen.getByRole('timer').querySelectorAll('b'))
    .map((b) => b.textContent)
    .join(':')
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** Let pending promises (the server re-check) settle. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

type Reply = number | Error | 'hang' | { seconds: unknown }
/** Stub the server's answers to /api/launch, in order. */
function serverSays(...replies: Reply[]) {
  const mock = vi.fn((_url: string, init?: RequestInit) => {
    const reply = replies.length > 1 ? replies.shift()! : replies[0]
    if (reply === 'hang')
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      )
    if (reply instanceof Error) return Promise.reject(reply)
    const body = typeof reply === 'number' ? { seconds: reply } : reply
    return Promise.resolve(Response.json(body))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

let fetchMock: ReturnType<typeof serverSays>
beforeEach(() => {
  vi.useFakeTimers()
  // Unless a test says otherwise, the server is unreachable.
  fetchMock = serverSays(new Error('offline'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the countdown trusts the server, not the visitor’s clock', () => {
  it('a device clock running AHEAD does not zero a live countdown', () => {
    /* The server says an hour remains; the device believes launch was
       an hour ago. The old mount effect read the device clock and
       jumped straight to zero. */
    vi.setSystemTime(LAUNCH_AT + HOUR * 1000)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(0)
    expect(remaining()).toBe(HOUR)
    /* Holding at HOUR is not enough: a component with no effect at all
       would pass that. It must count down from the server's value. */
    advance(5000)
    expect(remaining()).toBe(HOUR - 5)
  })

  it('a device clock running BEHIND does not reopen an ended countdown', () => {
    /* The server has already reached zero; the device is five hours
       slow. The old code added those five hours back. */
    vi.setSystemTime(LAUNCH_AT - 5 * HOUR * 1000)
    render(<LaunchCountdown initialSeconds={0} />)
    advance(3000)
    expect(remaining()).toBe(0)
  })

  it('an ended countdown never schedules a timer at all', () => {
    vi.setSystemTime(LAUNCH_AT - HOUR * 1000)
    render(<LaunchCountdown initialSeconds={0} />)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('renders the server value on the server, so hydration agrees', () => {
    /* Whatever the client clock says, the first render must be the
       server's number, or React reports a hydration mismatch. */
    vi.setSystemTime(LAUNCH_AT + 99 * HOUR * 1000)
    const html = renderToString(<LaunchCountdown initialSeconds={HOUR + 61} />)
    expect(html).toContain('0 days, 1 hour, 1 minute, 1 second remaining')
  })
})

describe('counting', () => {
  it('counts down by elapsed time, regardless of clock offset', () => {
    vi.setSystemTime(LAUNCH_AT + 7 * HOUR * 1000) // badly skewed
    render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(5000)
    expect(remaining()).toBe(HOUR - 5)
  })

  it('rolls seconds, minutes, hours and days over on the boundary', () => {
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={24 * HOUR} />)
    expect(visibleDigits()).toBe('01:00:00:00')
    advance(999)
    expect(visibleDigits()).toBe('01:00:00:00')
    advance(1)
    expect(visibleDigits()).toBe('00:23:59:59')
  })

  it('shows whole days and names each unit as a sentence', () => {
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={20 * 24 * HOUR + 9 * HOUR + 14 * 60 + 14} />)
    expect(visibleDigits()).toBe('20:09:14:14')
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe(
      '20 days, 9 hours, 14 minutes, 14 seconds remaining',
    )
    expect(Array.from(screen.getByRole('timer').querySelectorAll('small'), (s) => s.textContent)).toEqual([
      'Days', 'Hours', 'Minutes', 'Seconds',
    ])
  })

  it('reaches zero only when the server agrees, then holds and stops', async () => {
    const server = serverSays(0)
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={2} />)
    advance(2000)
    /* Zero is final, so the display holds at one while it asks. */
    expect(remaining()).toBe(1)
    expect(server).toHaveBeenCalledTimes(1)
    expect(server.mock.calls[0][0]).toBe(LAUNCH_SECONDS_PATH)
    await flush()
    expect(remaining()).toBe(0)
    advance(60_000)
    expect(remaining()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(server).toHaveBeenCalledTimes(1)
  })

  it('keeps counting if the server says it is not zero yet', async () => {
    /* A device running fast within one interval reaches zero early. */
    const server = serverSays(3, 0)
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={2} />)
    advance(2000)
    await flush()
    expect(remaining()).toBe(3)
    advance(3000)
    await flush()
    expect(remaining()).toBe(0)
    expect(server).toHaveBeenCalledTimes(2)
  })

  it('still reaches zero if the server cannot be asked', async () => {
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={2} />)
    advance(2000)
    await flush()
    expect(remaining()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('timing discipline', () => {
  it('re-aligns to the whole second after a mid-second resync', () => {
    /* Without alignment, a resync at 1.5s would push the next tick to
       2.5s and the display would sit a full second stale at 2s. */
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(1000)
    expect(remaining()).toBe(HOUR - 1)
    advance(500)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(remaining()).toBe(HOUR - 1)
    advance(500) // t = 2.0s, exactly on the boundary
    expect(remaining()).toBe(HOUR - 2)
  })

  it('keeps exactly one pending timer however many resyncs arrive', () => {
    /* Each resync must replace the pending tick, not stack another:
       otherwise every visibility change adds a parallel timer chain. */
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    for (let i = 0; i < 5; i++) {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
    }
    expect(vi.getTimerCount()).toBe(1)
    advance(3000)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('survives React StrictMode double-mounting with one timer chain', () => {
    vi.setSystemTime(0)
    render(
      <StrictMode>
        <LaunchCountdown initialSeconds={HOUR} />
      </StrictMode>,
    )
    advance(5000)
    expect(remaining()).toBe(HOUR - 5)
    expect(vi.getTimerCount()).toBe(1)
  })
})

describe('following the server value', () => {
  it('shows zero when the server value changes to zero after mount', () => {
    /* useState reads its argument once; without following the prop, a
       refresh that returns 0 left the old number on screen forever. */
    vi.setSystemTime(0)
    const { rerender } = render(<LaunchCountdown initialSeconds={HOUR} />)
    rerender(<LaunchCountdown initialSeconds={0} />)
    expect(remaining()).toBe(0)
    advance(5000)
    expect(remaining()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('takes a new non-zero server value immediately, with no stale frame', () => {
    vi.setSystemTime(0)
    const { rerender } = render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(3000)
    rerender(<LaunchCountdown initialSeconds={100} />)
    expect(remaining()).toBe(100)
    advance(2000)
    expect(remaining()).toBe(98)
  })
})

describe('the clock moving underneath it', () => {
  it('never gains time when the device clock is set back', () => {
    vi.setSystemTime(LAUNCH_AT - 10 * HOUR * 1000)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(10_000)
    expect(remaining()).toBe(HOUR - 10)

    /* Someone sets their clock back an hour, or an NTP correction
       steps it backwards. */
    act(() => {
      vi.setSystemTime(Date.now() - HOUR * 1000)
    })
    advance(1000)
    expect(remaining()).toBeLessThanOrEqual(HOUR - 10)

    /* And it resumes counting, rather than freezing until the wall
       clock catches back up an hour later. */
    advance(5000)
    expect(remaining()).toBeLessThan(HOUR - 10)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks the server instead of trusting a clock jumped forward', async () => {
    /* Someone sets their clock two hours ahead mid-session. From inside
       the page that looks exactly like waking from sleep. */
    const server = serverSays(HOUR - 11)
    vi.setSystemTime(LAUNCH_AT - 10 * HOUR * 1000)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    advance(10_000)
    act(() => {
      vi.setSystemTime(Date.now() + 2 * HOUR * 1000)
    })
    advance(1000)
    /* Held, not dropped to zero, while it asks. */
    expect(remaining()).toBe(HOUR - 10)
    expect(server).toHaveBeenCalledTimes(1)
    await flush()
    expect(remaining()).toBe(HOUR - 11)
    advance(1000)
    expect(remaining()).toBe(HOUR - 12)
  })

  it('treats a gap as sleep when the server cannot be reached', async () => {
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 30 * 60 * 1000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flush()
    expect(remaining()).toBe(HOUR - 30 * 60)
  })

  it('stops waiting for a server that hangs, then uses its own estimate', async () => {
    serverSays('hang')
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 10 * 60 * 1000)
      window.dispatchEvent(new Event('pageshow'))
    })
    expect(remaining()).toBe(HOUR)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESYNC_TIMEOUT_MS)
    })
    expect(remaining()).toBe(HOUR - 10 * 60 - RESYNC_TIMEOUT_MS / 1000)
  })

  it('ignores a malformed server answer', async () => {
    serverSays({ seconds: 'soon' })
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 60 * 1000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flush()
    expect(remaining()).toBe(HOUR - 60)
  })

  it('asks once, however many events arrive while it waits', async () => {
    const server = serverSays('hang')
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 60 * 1000)
      for (let i = 0; i < 4; i++) document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('pageshow'))
    })
    expect(server).toHaveBeenCalledTimes(1)
    /* While it waits, the display holds and nothing else is scheduled:
       only the request's own timeout is pending. */
    expect(remaining()).toBe(HOUR)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('abandons the request when it unmounts', () => {
    const server = serverSays('hang')
    vi.setSystemTime(0)
    const { unmount } = render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 60 * 1000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const signal = server.mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('catches up from the server the moment a throttled tab is shown', async () => {
    const server = serverSays(HOUR - 30 * 60)
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)

    /* Thirty minutes pass while the tab is hidden and its timers are
       throttled: the clock moves, no tick runs. */
    act(() => {
      vi.setSystemTime(Date.now() + 30 * 60 * 1000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(server).toHaveBeenCalledTimes(1)
    await flush()
    expect(remaining()).toBe(HOUR - 30 * 60)
  })

  it('catches up when restored from the back/forward cache', async () => {
    serverSays(HOUR - 10 * 60)
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    act(() => {
      vi.setSystemTime(Date.now() + 10 * 60 * 1000)
      window.dispatchEvent(new Event('pageshow'))
    })
    await flush()
    expect(remaining()).toBe(HOUR - 10 * 60)
  })
})

describe('accessibility contract', () => {
  it('keeps the timer silent to assistive technology', () => {
    /* A per-second live region would interrupt a screen reader
       every second. */
    vi.setSystemTime(0)
    render(<LaunchCountdown initialSeconds={HOUR} />)
    expect(screen.getByRole('timer').getAttribute('aria-live')).toBe('off')
  })

  it('leaves no timers or listeners behind on unmount', () => {
    /* `visibilitychange` lives on document but `pageshow` lives on
       window; checking only one target let a leaked listener through. */
    vi.setSystemTime(0)
    const docAdd = vi.spyOn(document, 'addEventListener')
    const docRemove = vi.spyOn(document, 'removeEventListener')
    const winAdd = vi.spyOn(window, 'addEventListener')
    const winRemove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<LaunchCountdown initialSeconds={HOUR} />)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    const count = (spy: typeof docAdd, type: string) =>
      spy.mock.calls.filter(([t]) => t === type).length
    expect(count(docAdd, 'visibilitychange')).toBeGreaterThan(0)
    expect(count(docRemove, 'visibilitychange')).toBe(count(docAdd, 'visibilitychange'))
    expect(count(winAdd, 'pageshow')).toBeGreaterThan(0)
    expect(count(winRemove, 'pageshow')).toBe(count(winAdd, 'pageshow'))
    for (const spy of [docAdd, docRemove, winAdd, winRemove]) spy.mockRestore()
  })
})

describe('the deadline and its route', () => {
  it('is midnight Pacific standard time at the start of 7 November 2026', () => {
    expect(new Date(LAUNCH_AT).toISOString()).toBe('2026-11-07T08:00:00.000Z')
    expect(secondsUntilLaunch(LAUNCH_AT - 1500)).toBe(2)
    expect(secondsUntilLaunch(LAUNCH_AT)).toBe(0)
    expect(secondsUntilLaunch(LAUNCH_AT + 60_000)).toBe(0)
  })

  it('serves the server count uncached', async () => {
    vi.setSystemTime(LAUNCH_AT - 90_500)
    const { GET } = await import('../app/api/launch/route')
    const response = await GET()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ seconds: 91 })
  })
})
