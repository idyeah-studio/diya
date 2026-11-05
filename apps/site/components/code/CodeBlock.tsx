'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@idyeah/diya'
import { highlight, type CodeLanguage } from './highlight'
import './code.css'

const FAILED = 'Copy didn’t work. The code is selected; press Command+C or Ctrl+C.'

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

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * A recessed code well: a label row with Copy, then the code. Copy always
 * copies all of it, even while a long snippet is folded. If the clipboard
 * refuses, the code is selected and focused instead, with how to copy it.
 */
export function CodeBlock({
  code,
  language,
  label,
  name,
  collapseAfter,
  actions,
  onCopied,
  wrap = false,
}: {
  code: string
  language: CodeLanguage
  /** Shown in the well's label row: a file or place. */
  label: string
  /** What it is, for the Copy button's name and its announcement ("install command"). */
  name: string
  /** Fold snippets longer than this many lines. */
  collapseAfter?: number
  /** Buttons shown before Copy. */
  actions?: ReactNode
  onCopied?: () => void
  /** Wrap long lines instead of scrolling them, and let the label wrap beside Copy: for one-line commands in a narrow drawer. */
  wrap?: boolean
}) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false),
    [pending, setPending] = useState(false),
    [expanded, setExpanded] = useState(false)
  const pre = useRef<HTMLPreElement>(null)
  const operation = useRef(0)
  const busy = useRef(false)
  const current = useRef(code)
  current.current = code
  const uid = useId()
  const lines = code.split('\n').length
  const folded = !!collapseAfter && lines > collapseAfter && !expanded

  /* A new snippet starts clean; a copy still in flight for the old one is ignored. */
  useEffect(() => {
    operation.current += 1
    busy.current = false
    setCopied(false)
    setFailed(false)
    setPending(false)
    return () => {
      operation.current += 1
    }
  }, [code])
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  function selectCode() {
    const node = pre.current
    if (!node) return
    node.focus({ preventScroll: false })
    const range = node.ownerDocument.createRange()
    range.selectNodeContents(node)
    const selection = node.ownerDocument.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  async function copy() {
    if (busy.current) return
    busy.current = true
    const request = ++operation.current
    const source = code
    const live = () => {
      const node = pre.current
      const dialog = node?.closest('dialog')
      return operation.current === request && current.current === source && !!node?.isConnected && !node.closest('[hidden], [inert]') && (!dialog || dialog.open)
    }
    setPending(true)
    setCopied(false)
    setFailed(false)
    try {
      await navigator.clipboard.writeText(source)
      if (live()) {
        setCopied(true)
        onCopied?.()
      }
    } catch {
      if (live()) {
        setFailed(true)
        if (folded) setExpanded(true)
        selectCode()
      }
    } finally {
      if (operation.current === request) {
        busy.current = false
        setPending(false)
      }
    }
  }

  return (
    <div className="code-well" data-folded={folded || undefined} data-wrap={wrap || undefined}>
      <div className="code-well-bar">
        <span className="code-well-label">{label}</span>
        <span className="code-well-actions">
          {actions}
          <Button
            variant="outline"
            size="small"
            shape="pill"
            className="code-key"
            data-state={copied ? 'copied' : undefined}
            aria-label={`Copy ${name}`}
            loading={pending}
            onClick={copy}
          >
            <CopyIcon done={copied} />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </span>
      </div>
      <pre
        ref={pre}
        id={`${uid}-code`}
        tabIndex={0}
        role="textbox"
        aria-readonly="true"
        aria-multiline="true"
        aria-label={sentence(name)}
        aria-describedby={failed ? `${uid}-help` : undefined}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault()
            selectCode()
          }
        }}
      >
        <code>{highlight(code, language)}</code>
      </pre>
      {!!collapseAfter && lines > collapseAfter && (
        <button
          type="button"
          className="code-well-expand"
          aria-expanded={expanded}
          aria-controls={`${uid}-code`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : `Show all ${lines} lines`}
        </button>
      )}
      <span className="code-sr" role="status">
        {copied ? `${sentence(name)} copied.` : ''}
      </span>
      {failed && (
        <p id={`${uid}-help`} className="code-well-help" role="status">
          {FAILED}
        </p>
      )}
    </div>
  )
}
