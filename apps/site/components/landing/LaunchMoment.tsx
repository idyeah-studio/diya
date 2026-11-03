'use client'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FlameMark } from '../site/FlameMark'
import { finishLaunchWatched, launchWatched } from './launch-signal'

export const LAUNCH_LINE = 'DIYA 1.0 is on npm. Happy Diwali.'
export const LAUNCH_ANNOUNCEMENT = 'DIYA has launched. The page now shows how to install it.'
const TOTAL_MS = 2400

/**
 * The lamp lighting, for whoever watched the countdown reach zero (about
 * 2.4s): the zeros give way to the wordmark, its D dot already vermilion,
 * the mark glides into the header, its dot giving one soft vermilion glow
 * as it lands (gone again by the time the header's own mark takes over),
 * and the hero rises into place. Reduced motion gets a 200ms cross-fade.
 * One polite announcement; focus never moves. Arriving later renders nothing.
 */
export function LaunchMoment() {
  const [phase, setPhase] = useState<'idle' | 'lighting' | 'lit'>('idle')
  const [announcement, setAnnouncement] = useState('')
  const [slot, setSlot] = useState<Element | null>(null)
  const overlay = useRef<HTMLDivElement>(null)

  // Layout effect: decide before the first paint of the launched page.
  useLayoutEffect(() => {
    if (!launchWatched()) return void delete document.documentElement.dataset.launchMoment
    setSlot(document.querySelector('[data-launch-line-slot]'))
    setPhase('lighting')
  }, [])
  // The overlay is in the DOM now, so the pre-paint veil can go.
  useLayoutEffect(() => {
    if (phase !== 'idle') delete document.documentElement.dataset.launchMoment
  }, [phase])

  useEffect(() => {
    if (phase !== 'lighting') return
    const node = overlay.current
    const animations: Animation[] = []
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      finishLaunchWatched()
      setPhase('lit')
    }
    const say = window.setTimeout(() => setAnnouncement(LAUNCH_ANNOUNCEMENT), 150)
    const fallback = window.setTimeout(end, TOTAL_MS + 800)
    try {
      if (!node || typeof node.animate !== 'function') throw new Error('No animation support')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) animations.push(node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }))
      else animations.push(...light(node))
      Promise.all(animations.map((animation) => animation.finished)).then(end, end)
    } catch {
      end()
    }
    return () => {
      window.clearTimeout(say)
      window.clearTimeout(fallback)
      animations.forEach((animation) => animation.cancel())
    }
  }, [phase])

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {phase === 'lighting' && (
        <div ref={overlay} className="ld-moment" aria-hidden="true">
          <div className="ld-moment-count countdown-content">
            <p className="countdown-heading">{LAUNCH_LINE}</p>
            <div className="countdown-time">
              {['Days', 'Hours', 'Minutes', 'Seconds'].map((unit, index) => (
                <Fragment key={unit}>
                  {index > 0 && <i>:</i>}
                  <span>
                    <b>00</b>
                    <small>{unit}</small>
                  </span>
                </Fragment>
              ))}
            </div>
          </div>
          <FlameMark className="ld-moment-mark" decorative glow />
        </div>
      )}
      {phase !== 'idle' &&
        slot &&
        createPortal(
          <p className="ld-launch-line">
            <span className="ld-launch-dot" aria-hidden="true" />
            {LAUNCH_LINE}
          </p>,
          slot,
        )}
    </>
  )
}

const ease = 'cubic-bezier(.2, .7, .2, 1)'

function light(node: HTMLDivElement) {
  const count = node.querySelector<HTMLElement>('.ld-moment-count')!
  const mark = node.querySelector<SVGSVGElement>('.ld-moment-mark')!
  const glow = mark.querySelector<SVGElement>('.site-mark-glow')!
  const target = document.querySelector<HTMLElement>('[data-site-mark] svg')
  const rise = Array.from(document.querySelectorAll<HTMLElement>('.ld-hero-copy > *'))
  const at = (ms: number) => ms / TOTAL_MS

  const first = mark.getBoundingClientRect()
  const last = target?.getBoundingClientRect()
  const glide = last
    ? `translate(${last.left - first.left}px, ${last.top - first.top}px) scale(${last.width / first.width})`
    : 'translateY(-24px) scale(.6)'

  const style = getComputedStyle(node)
  const veil = style.getPropertyValue('--ld-veil').trim() || 'rgb(8 12 13 / 24%)'
  const deep = style.getPropertyValue('--ld-veil-deep').trim() || 'rgb(8 12 13 / 55%)'
  const timing = { duration: TOTAL_MS, fill: 'forwards' as const }
  return [
    count.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-10px)', offset: at(400) },
        { opacity: 0, transform: 'translateY(-10px)' },
      ],
      { ...timing, easing: 'ease-out' },
    ),
    mark.animate(
      [
        { opacity: 0, transform: 'scale(.96)' },
        { opacity: 0, transform: 'scale(.96)', offset: at(200) },
        { opacity: 1, transform: 'none', offset: at(600), easing: ease },
        { opacity: 1, transform: 'none', offset: at(1600), easing: ease },
        { opacity: 1, transform: glide },
      ],
      timing,
    ),
    // One soft glow as the mark lands: up during the glide, out by the
    // moment the header's own (unglowing) mark takes over.
    glow.animate(
      [
        { opacity: 0 },
        { opacity: 0, offset: at(1800), easing: 'ease-out' },
        { opacity: 1, offset: at(2150), easing: 'ease-in' },
        { opacity: 0 },
      ],
      timing,
    ),
    node.animate(
      [
        { backdropFilter: 'blur(8px)', backgroundColor: veil },
        { backdropFilter: 'blur(8px)', backgroundColor: deep, offset: at(600) },
        { backdropFilter: 'blur(5px)', backgroundColor: veil, offset: at(1600) },
        { backdropFilter: 'blur(0px)', backgroundColor: 'rgb(0 0 0 / 0%)' },
      ],
      timing,
    ),
    ...(target ? [target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.995 }, { opacity: 1 }], timing)] : []),
    ...rise.map((element, index) =>
      element.animate(
        [
          { transform: 'translateY(12px)', opacity: 0.85 },
          { transform: 'translateY(12px)', opacity: 0.85, offset: at(1600 + index * 40) },
          { transform: 'none', opacity: 1 },
        ],
        { ...timing, easing: ease },
      ),
    ),
  ]
}
