'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const AnnounceContext = createContext<(message: string) => void>(() => {})

/** Says something once, politely, through the page's one status region. */
export const useAnnounce = () => useContext(AnnounceContext)

/**
 * The /mcp page's one polite status region: copy results and "Check again".
 * Nothing is said on load. The same words twice in a row are said twice:
 * the region empties first, then fills on the next frame.
 */
export function Announcer({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const frame = useRef(0)
  useEffect(() => () => window.cancelAnimationFrame(frame.current), [])
  const announce = useCallback((next: string) => {
    window.cancelAnimationFrame(frame.current)
    setMessage('')
    frame.current = window.requestAnimationFrame(() => setMessage(next))
  }, [])
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p className="mcp-sr" role="status">
        {message}
      </p>
    </AnnounceContext.Provider>
  )
}
