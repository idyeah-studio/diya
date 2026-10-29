'use client'

import { useEffect, useRef, useState } from 'react'

/** The server's own count, re-read when the local estimate can't be trusted. */
export const LAUNCH_SECONDS_PATH = '/api/launch'
/** A tick normally lands within a few ms of the second. A larger gap means
    the device slept, the tab was throttled, or the clock jumped. */
export const RESYNC_GAP_MS = 2000
/** How long the display may hold while waiting for the server. */
export const RESYNC_TIMEOUT_MS = 5000
/** A gap this long before zero means nobody was watching: a sleeping tab,
    a closed lid, a back/forward cache restore. */
export const SLEEP_GAP_MS = 60_000

/** How zero arrived: `watched` is false after a long gap or in a hidden tab. */
export type ZeroReached = { watched: boolean }

async function serverSeconds(signal: AbortSignal) {
  const response = await fetch(LAUNCH_SECONDS_PATH, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Launch time unavailable')
  const { seconds } = (await response.json()) as { seconds?: unknown }
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 0)
    throw new Error('Invalid launch time')
  return seconds
}

/**
 * Counts down from a server-rendered value.
 *
 * The server computes `initialSeconds` per request (app/page.tsx awaits
 * `connection()`), so that is the trustworthy number. The visitor's wall
 * clock is never compared with the deadline: a device running fast once
 * zeroed a live countdown, and one running slow added hours back to a
 * countdown the server had already ended.
 *
 * Between ticks it measures elapsed time from forward movement of
 * `Date.now()`, so a constant clock offset cancels out, and a clock set
 * back contributes nothing. Ticks align to whole seconds.
 *
 * Some moments a page cannot judge alone. After a gap between ticks it
 * cannot tell sleep (time really passed) from a clock jumped forward
 * (it did not). And zero is final, so it should be the server's call.
 * At those moments the display holds and the server is asked again
 * (`/api/launch`). If the server cannot answer within
 * RESYNC_TIMEOUT_MS, the local estimate stands, which treats a gap as
 * sleep: the common case for a laptop.
 *
 * Arriving after the server has reached zero means the countdown is
 * over: zero holds, and nothing is scheduled or fetched.
 *
 * `onZero` runs once when the count reaches zero on this page, and says
 * whether anyone was plausibly watching (see SLEEP_GAP_MS).
 * `phase` is the parent's word on what happens next: 'live' swaps the
 * heading for the launch line, 'failed' says it's live and offers a reload.
 */
export function LaunchCountdown({
  initialSeconds,
  onZero,
  phase,
  onReload,
}: {
  initialSeconds: number
  onZero?: (zero: ZeroReached) => void
  phase?: 'live' | 'failed'
  /** Runs just before the Reload button reloads the page. */
  onReload?: () => void
}) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const zeroHandler = useRef(onZero)
  const shown = useRef(seconds)
  const lastGap = useRef(0)
  useEffect(() => {
    zeroHandler.current = onZero
  })
  useEffect(() => {
    if (shown.current > 0 && seconds === 0)
      zeroHandler.current?.({
        watched: lastGap.current <= SLEEP_GAP_MS && document.visibilityState !== 'hidden',
      })
    shown.current = seconds
  }, [seconds])

  /* `useState` only reads its argument once, so a new server value
     (say a refresh that now returns 0) would otherwise be ignored and
     the old number shown forever. Adjusting during render, rather than
     in an effect, applies it before paint with no stale frame. This is
     React's documented pattern for state that follows a prop. */
  const [prevInitial, setPrevInitial] = useState(initialSeconds)
  if (initialSeconds !== prevInitial) {
    setPrevInitial(initialSeconds)
    setSeconds(initialSeconds)
  }

  useEffect(() => {
    if (initialSeconds <= 0) return

    let base = initialSeconds // seconds remaining when elapsed was zero
    let elapsedMs = 0
    let lastWall = Date.now()
    let timer: number | undefined
    let request: AbortController | null = null
    let requestTimeout: number | undefined

    const remaining = () => Math.max(0, Math.ceil(base - elapsedMs / 1000))
    const schedule = () => {
      window.clearTimeout(timer)
      /* Wake on the next whole second of elapsed time, so each digit
         rolls over on its boundary instead of drifting through it. */
      timer = window.setTimeout(tick, 1000 - (elapsedMs % 1000))
    }
    const settle = () => {
      const next = remaining()
      setSeconds(next)
      if (next === 0) window.clearTimeout(timer)
      else schedule()
    }

    /** Hold the display and ask the server. `unappliedMs` is time the
        page measured but has not counted, used only if the server fails. */
    const resync = (unappliedMs: number) => {
      window.clearTimeout(timer)
      const controller = new AbortController()
      request = controller
      requestTimeout = window.setTimeout(() => controller.abort(), RESYNC_TIMEOUT_MS)
      serverSeconds(controller.signal)
        .then((fresh) => {
          if (request !== controller) return
          base = fresh
          elapsedMs = 0
          lastWall = Date.now()
        })
        .catch(() => {
          if (request !== controller) return
          const now = Date.now()
          elapsedMs += unappliedMs + Math.max(0, now - lastWall)
          lastWall = now
        })
        .finally(() => {
          if (request !== controller) return
          window.clearTimeout(requestTimeout)
          request = null
          settle()
        })
    }

    const tick = () => {
      if (request) return // the display is holding for the server
      const now = Date.now()
      const delta = now - lastWall
      lastWall = now
      lastGap.current = delta
      if (delta > RESYNC_GAP_MS) return resync(delta)
      if (delta > 0) elapsedMs += delta
      if (remaining() === 0) return resync(0) // zero is the server's call
      settle()
    }

    timer = window.setTimeout(tick, 1000)
    /* A background tab's timers are throttled, so check the moment it is
       shown again, and when it is restored from the back/forward cache
       with its old JavaScript state. */
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      const pending = request
      request = null
      pending?.abort()
      window.clearTimeout(requestTimeout)
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [initialSeconds])

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return (
    <section className="launch-countdown" aria-label="DIYA launch countdown">
      <div className="countdown-content">
        <p className="countdown-heading">
          {phase === 'live' ? 'DIYA 1.0 is on npm. Happy Diwali.' : phase === 'failed' ? 'It’s live' : 'Coming soon'}
        </p>
        <div
          className="countdown-time"
          role="timer"
          aria-live="off"
          aria-label={`${count(days, 'day')}, ${count(hours, 'hour')}, ${count(minutes, 'minute')}, ${count(remainder, 'second')} remaining`}
        >
          <span aria-hidden="true"><b>{String(days).padStart(2, '0')}</b><small>Days</small></span>
          <i aria-hidden="true">:</i>
          <span aria-hidden="true"><b>{String(hours).padStart(2, '0')}</b><small>Hours</small></span>
          <i aria-hidden="true">:</i>
          <span aria-hidden="true"><b>{String(minutes).padStart(2, '0')}</b><small>Minutes</small></span>
          <i aria-hidden="true">:</i>
          <span aria-hidden="true"><b>{String(remainder).padStart(2, '0')}</b><small>Seconds</small></span>
        </div>
        {phase === 'failed' && (
          <button type="button" className="countdown-reload" onClick={() => {
              onReload?.()
              window.location.reload()
            }}>
            Reload
          </button>
        )}
        {phase && (
          <p role="status" className="sr-only">
            {phase === 'failed' ? 'DIYA has launched. Reload the page to see it.' : ''}
          </p>
        )}
      </div>
    </section>
  )
}

/** "1 day", "2 days": the timer's spoken name reads as a sentence. */
function count(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}
