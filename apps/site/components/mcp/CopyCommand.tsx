'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@idyeah/diya'
import { useAnnounce } from './Announcer'

const COPIED_FOR = 2400
/** Too long for one line beside Copy on a phone: on narrow screens its Copy key drops under it. */
export const isLong = (code: string) => code.length > 28 || code.includes('\n')

export const COPY_FAILED = 'Copy didn’t work. The text is selected above; press Command+C or Ctrl+C.'

function CopyIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </svg>
  )
}

/**
 * A command, address or config to paste, with a labeled Copy key named for
 * what it copies ("Copy Claude Code command"). Copied shows for 2.4s and is
 * said once. If the clipboard refuses, the text is selected and focused,
 * with how to copy it by hand. Without JavaScript the key hides and the text
 * stays selectable.
 */
export function CopyCommand({ code, name }: { code: string; name: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const text = useRef<HTMLElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const announce = useAnnounce()
  const help = useId()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function select() {
    const node = text.current
    if (!node) return
    node.focus()
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  async function copy() {
    window.clearTimeout(timer.current)
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      setState('copied')
      announce(`${name.charAt(0).toUpperCase()}${name.slice(1)} copied.`)
      timer.current = window.setTimeout(() => setState('idle'), COPIED_FOR)
    } catch {
      setState('failed')
      announce(COPY_FAILED)
      select()
    }
  }

  return (
    <div className="mcp-copy" data-long={isLong(code) || undefined}>
      <div className="mcp-copy-row">
        <code
          ref={text}
          className="mcp-copy-text"
          tabIndex={-1}
          aria-describedby={state === 'failed' ? help : undefined}
        >
          {code}
        </code>
        <Button
          variant="outline"
          size="small"
          shape="pill"
          className="mcp-copy-key"
          data-state={state === 'copied' ? 'copied' : undefined}
          aria-label={`Copy ${name}`}
          onClick={copy}
        >
          <CopyIcon done={state === 'copied'} />
          {state === 'copied' ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {state === 'failed' && (
        <p id={help} className="mcp-error">
          <span className="mcp-bang" aria-hidden="true">
            !
          </span>
          {COPY_FAILED}
        </p>
      )}
    </div>
  )
}
