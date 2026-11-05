'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAppearance } from '../../app/Appearance'
import { frameHref, type ScreenEntry } from './screens-data'

export type Device = 'desktop' | 'phone'

/** The real viewport each device previews at. */
export const VIEWPORTS: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
}

const SOURCE = 'diya-screens'
/** The phone preview's height on a wide stage, and the stage width that counts as wide. */
export const PHONE_MAX_HEIGHT = 640
const PHONE_FIT_FROM = 520
/** Room above and below the stage's frame: the fixed header, the controls row and the stage's padding. */
const PHONE_CHROME = 260

/** Tall enough to read, short enough that the whole phone fits the window once the stage is in view. */
export function phoneHeight(windowHeight: number) {
  return windowHeight ? Math.max(420, Math.min(PHONE_MAX_HEIGHT, windowHeight - PHONE_CHROME)) : PHONE_MAX_HEIGHT
}

/*
 * A screen at a real viewport: the frame is 1440×900 (or 390×844) CSS
 * pixels, so the screen's own media queries see a real desktop or phone, and
 * it's scaled down to fit the stage. No will-change on the frame: Chrome then
 * paints it at its scaled size, so text stays crisp instead of a scaled
 * bitmap. Appearance changes reach the frame as messages, never a reload.
 */
export function ScreenStage({ screen, device }: { screen: Pick<ScreenEntry, 'id' | 'name' | 'status'>; device: Device }) {
  const { theme, glass } = useAppearance()
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [room, setRoom] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  // The address the frame first loads with; later changes travel as messages.
  const [src] = useState(() => frameHref(screen, theme, glass))
  const viewport = VIEWPORTS[device]
  // A phone on a wide stage stays about as tall as the desktop preview, so it
  // doesn't run off the bottom of the window; on a narrow one it fills the width.
  const tallest = device === 'phone' && room >= PHONE_FIT_FROM ? phoneHeight(windowHeight) / viewport.height : 1
  const scale = room ? Math.min(1, room / viewport.width, tallest) : 0

  useLayoutEffect(() => {
    const node = box.current
    if (!node) return
    const measure = () => {
      const style = getComputedStyle(node)
      setRoom(Math.floor(node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)))
      setWindowHeight(window.innerHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    if (typeof ResizeObserver !== 'function') return () => window.removeEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ source: SOURCE, type: 'appearance', theme, glass }, window.location.origin)
  }, [theme, glass])

  useEffect(send, [send])

  // The frame says when it's listening; answer with the current appearance.
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.source === SOURCE && event.data.type === 'ready') send()
    }
    window.addEventListener('message', listen)
    return () => window.removeEventListener('message', listen)
  }, [send])

  return (
    <div ref={box} className="screens-stage" data-device={device}>
      <div
        className="screens-viewport"
        data-measured={scale ? 'true' : undefined}
        style={{
          aspectRatio: `${viewport.width} / ${viewport.height}`,
          width: scale ? Math.round(viewport.width * scale) : undefined,
          maxWidth: viewport.width,
        }}
      >
        <iframe
          ref={frame}
          src={src}
          aria-label={`${screen.name}, live preview at ${viewport.width} by ${viewport.height}`}
          width={viewport.width}
          height={viewport.height}
          style={{ transform: scale ? `scale(${scale})` : undefined }}
        />
      </div>
    </div>
  )
}
