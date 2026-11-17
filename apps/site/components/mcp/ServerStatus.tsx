'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnnounce } from './Announcer'

/** The one request this page makes: the server's tool list, which nothing counts. */
export const TOOLS_LIST = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} } as const
/** How long the line waits before it says the server didn't answer. */
export const CHECK_TIMEOUT = 8000

type Status = { state: 'checking' } | { state: 'answering'; tools: number } | { state: 'failed' }

const toolsLabel = (n: number) => `${n} ${n === 1 ? 'tool' : 'tools'}`

/** Asks the server at `endpoint` for its tools: their number, or null if it didn't answer. */
export async function countTools(endpoint: string, signal: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      // The same headers every MCP client sends; the proxy never sees this request.
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify(TOOLS_LIST),
      cache: 'no-store',
      signal,
    })
    if (!response.ok) return null
    const body = (await response.json()) as { result?: { tools?: unknown } }
    return Array.isArray(body?.result?.tools) ? body.result.tools.length : null
  } catch {
    return null
  }
}

/**
 * A quiet, live line under the server address: Checking, Answering (with the
 * version and the tool count the server just gave) or Didn't answer, with
 * Check again. It's read in place, not a live region: only the result of
 * Check again is said, once. It keeps its height in every state, so nothing
 * below it moves. Without JavaScript it's hidden (the page's noscript style).
 */
export function ServerStatus({ version, endpoint = '/mcp', issueUrl }: { version: string; endpoint?: string; issueUrl: string }) {
  const [status, setStatus] = useState<Status>({ state: 'checking' })
  const line = useRef<HTMLParagraphElement>(null)
  const pending = useRef<AbortController | null>(null)
  const announce = useAnnounce()

  const check = useCallback(
    async (say: boolean) => {
      pending.current?.abort()
      const controller = new AbortController()
      pending.current = controller
      const timeout = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT)
      setStatus({ state: 'checking' })
      const tools = await countTools(endpoint, controller.signal)
      window.clearTimeout(timeout)
      // A newer check, or the page closing, owns the line now.
      if (pending.current !== controller) return
      pending.current = null
      setStatus(tools === null ? { state: 'failed' } : { state: 'answering', tools })
      if (say) announce(tools === null ? 'The server didn’t answer just now.' : `The server is answering now: DIYA ${version}, ${toolsLabel(tools)}.`)
    },
    [announce, endpoint, version]
  )

  useEffect(() => {
    void check(false)
    return () => {
      const controller = pending.current
      pending.current = null
      controller?.abort()
    }
  }, [check])

  return (
    <p ref={line} className="mcp-status" data-state={status.state} tabIndex={-1}>
      <span className="mcp-status-dot" aria-hidden="true" />
      {status.state === 'checking' && <span>Checking the server…</span>}
      {status.state === 'answering' && (
        <span>
          Answering now · DIYA {version} · {toolsLabel(status.tools)}
        </span>
      )}
      {status.state === 'failed' && (
        <span>
          The server didn’t answer just now. Agents retry on their own; if it lasts,{' '}
          <a href={issueUrl}>tell us on GitHub</a>.{' '}
          <button
            type="button"
            className="mcp-status-again"
            onClick={() => {
              // The key goes away while it checks, so focus waits on the line.
              line.current?.focus()
              void check(true)
            }}
          >
            Check again
          </button>
        </span>
      )}
    </p>
  )
}
