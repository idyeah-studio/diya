'use client'
import { useEffect, useState } from 'react'
import { Button } from '@idyeah/diya'

/**
 * Copies a Markdown brief for one item, written for an AI coding agent.
 * If the clipboard refuses, the brief opens in place, selected, with how
 * to copy it.
 */
export function CopyForAi({ brief, title }: { brief: string; title: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (state !== 'copied') return
    const timer = window.setTimeout(() => setState('idle'), 2400)
    return () => window.clearTimeout(timer)
  }, [state])
  return (
    <div className="item-reference-ai">
      <Button
        variant="outline"
        size="small"
        shape="pill"
        aria-describedby="item-reference-ai-note"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(brief)
            setState('copied')
          } catch {
            setState('failed')
          }
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {state === 'copied' ? (
            <path d="m5 12 5 5 9-10" />
          ) : (
            <path d="M8 8h12v12H8zM16 8V4H4v12h4" />
          )}
        </svg>
        {state === 'copied' ? 'Copied for AI' : 'Copy for AI'}
      </Button>
      <p id="item-reference-ai-note">A Markdown brief for Claude, Cursor or v0: install, setup, props and a complete example.</p>
      <span className="item-reference-sr" role="status">
        {state === 'copied' ? `${title} brief copied.` : ''}
      </span>
      {state === 'failed' && (
        <div className="item-reference-ai-fallback">
          <p role="status">Copy didn’t work. The brief is selected below; press Command+C or Ctrl+C.</p>
          <textarea
            readOnly
            aria-label={`${title} brief for AI`}
            value={brief}
            rows={8}
            ref={(node) => {
              node?.focus()
              node?.select()
            }}
          />
        </div>
      )}
    </div>
  )
}
