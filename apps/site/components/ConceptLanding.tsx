'use client'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppearance } from '../app/Appearance'
import { Icon } from './Icon'
import { LAUNCH_SECONDS_PATH, LaunchCountdown, type ZeroReached } from './LaunchCountdown'
import { ConceptBackdrop } from './ConceptBackdrop'
import { markLaunchWatched } from './landing/launch-signal'

/** Zeros hold for this long, plus up to JITTER_MS, before the page asks the
    server for the launched landing; the jitter spreads a crowd's requests. */
export const ZERO_HOLD_MS = 600
export const ZERO_JITTER_MS = 800
/** A refresh that hasn't replaced the countdown by now has failed. */
export const REFRESH_TIMEOUT_MS = 8000

export function ConceptLanding({ initialSeconds }: { initialSeconds: number }) {
  const concept = 'architecture'
  const phase = useLaunchRefresh(initialSeconds)
  const [font, setFont] = useState('Sans')
  const { light, glass, changeTheme, changeGlass } = useAppearance()
  return (
    <main id="content" className="concept-landing" data-concept={concept}>
      <ConceptBackdrop />
      <section className="concept-hero">
        <h1>A library for your next app.</h1>
        <p aria-hidden="true">Components and patterns. In code.</p>
      </section>
      <section
        className="concept-cards"
        aria-label="Interactive component previews"
        data-light={light}
        data-glass={glass}
        inert
        aria-hidden="true"
      >
        <article className="concept-panel typography-panel">
          <h2>Typography</h2>
          <div className="type-preview">
            <span
              style={{
                fontFamily:
                  font === 'Serif'
                    ? 'Georgia, serif'
                    : font === 'Sans'
                      ? "'DIYA Sans', 'DIYA Sans Fallback', Arial, sans-serif"
                      : 'monospace',
              }}
            >
              Aa
            </span>
            <div role="group" aria-label="Preview typography">
              {['Sans', 'Serif', 'Mono'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  aria-pressed={font === f}
                  style={{
                    fontFamily:
                      f === 'Serif'
                        ? 'Georgia, serif'
                        : f === 'Sans'
                          ? "'DIYA Sans', 'DIYA Sans Fallback', Arial, sans-serif"
                          : 'monospace',
                  }}
                >
                  {f}
                  <span>Regular</span>
                </button>
              ))}
            </div>
          </div>
        </article>
        <article className="concept-panel appearance-study">
          <h2>Appearance</h2>
          <div className="concept-segments" role="group" aria-label="Preview card appearance">
            <button aria-pressed={light} onClick={() => changeTheme('light')}>
              <Icon name="sun" size={16} />
              Light
            </button>
            <button aria-pressed={!light} onClick={() => changeTheme('dark')}>
              <Icon name="moon" size={16} />
              Dark
            </button>
          </div>
          <div className="concept-glass-row">
            <span>Glass</span>
            <button
              role="switch"
              aria-label="Preview glass"
              aria-checked={glass}
              onClick={() => changeGlass(!glass)}
              className="showcase-switch"
            >
              <span />
            </button>
          </div>
        </article>
        <article className="concept-panel profile-study">
          <span className="concept-avatar" aria-hidden="true">
            AC
          </span>
          <div>
            <h2>Alex Chen</h2>
            <p>Product designer</p>
            <span>Profile · Component preview</span>
          </div>
        </article>
      </section>
      <LaunchCountdown
        initialSeconds={initialSeconds}
        onZero={phase.lightUp}
        phase={phase.value}
        onReload={phase.reload}
      />
    </main>
  )
}

/** At zero: hold, check the server answers, then fetch the launched page in
    place. Next turns a refresh that fails (a 5xx, the network) into a full
    page load, which could land on a browser error page, so the check comes
    first and a failure stays here as "It's live" with a Reload button. The
    lighting is reserved for people who watched; a sleeper's tab just
    refreshes. */
function useLaunchRefresh(initialSeconds: number) {
  const router = useRouter()
  const [value, setValue] = useState<'live' | 'failed'>()
  const timers = useRef<number[]>([])
  const request = useRef<AbortController | null>(null)
  const watchedZero = useRef(false)
  const clear = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    request.current?.abort()
    request.current = null
  }
  useEffect(() => clear, [])
  // A new non-zero count from the server means it isn't launch yet after all.
  useEffect(() => {
    if (initialSeconds <= 0) return
    clear()
    setValue(undefined)
  }, [initialSeconds])

  function lightUp({ watched }: ZeroReached) {
    clear()
    watchedZero.current = watched
    if (watched) setValue('live')
    const hold = (watched ? ZERO_HOLD_MS : 0) + Math.random() * ZERO_JITTER_MS
    timers.current.push(
      window.setTimeout(async () => {
        const controller = new AbortController()
        request.current = controller
        const answered = await serverAnswers(controller)
        if (request.current !== controller) return // unmounted, or superseded
        request.current = null
        if (!answered) return setValue('failed')
        if (watched) markLaunchWatched()
        startTransition(() => router.refresh())
        timers.current.push(window.setTimeout(() => setValue('failed'), REFRESH_TIMEOUT_MS))
      }, hold),
    )
  }
  // Someone who watched zero and reloads by hand still gets the lighting.
  const reload = () => {
    if (watchedZero.current) markLaunchWatched()
  }
  return { value, lightUp, reload }
}

async function serverAnswers(controller: AbortController) {
  const timeout = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
  try {
    const response = await fetch(LAUNCH_SECONDS_PATH, { cache: 'no-store', signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}
