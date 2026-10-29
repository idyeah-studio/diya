'use client'
import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { Button } from '../button/Button.js'
import { useDiyaMessages } from '../DiyaProvider.js'
import { Icon } from '../Icon.js'
import { cx } from '../internal/cx.js'
import { codeBlockMessages } from './messages.js'

declare module '../messages.js' {
  interface DiyaMessages {
    codeBlock: typeof codeBlockMessages
  }
}

export type CodeBlockProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The code to show and copy, exactly as written. It is set in a monospace font, without syntax colors. */
  code: string
  /** A short name above the code, such as its language ('TypeScript') or file ('app/page.tsx'). It also names the code for screen readers. */
  label?: string
}

type Status = 'idle' | 'copied' | 'failed'

/** A block of code with a Copy button. Long lines scroll sideways in a region that takes keyboard focus, and Copy announces its result politely. */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock({ code, label, className, ...props }, ref) {
  const t = useDiyaMessages('codeBlock', codeBlockMessages)
  const [status, setStatus] = useState<Status>('idle')
  const content = useRef<HTMLElement>(null)
  // Each copy, a new code string and unmounting start a new operation, so a late result never lands on the wrong code.
  const operation = useRef(0)
  useEffect(() => {
    operation.current += 1
    setStatus('idle')
  }, [code])
  useEffect(() => () => { operation.current += 1 }, [])
  useEffect(() => {
    if (status !== 'copied') return
    const timer = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [status])

  async function copy() {
    const current = ++operation.current
    setStatus('idle')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      if (current === operation.current) setStatus('copied')
    } catch {
      if (current !== operation.current) return
      // Without clipboard access, select the code so it can be copied by hand.
      if (content.current) window.getSelection()?.selectAllChildren(content.current)
      setStatus('failed')
    }
  }

  const copied = status === 'copied'
  const button = (
    <Button variant="quiet" size="small" className="diya-code-block-copy" onClick={() => void copy()}>
      <Icon name={copied ? 'check' : 'copy'} size={16} />
      {copied ? t.copied : t.copy}
    </Button>
  )
  return (
    <div {...props} ref={ref} className={cx('diya-code-block', className)} data-labelled={label ? 'true' : undefined}>
      {label && <div className="diya-code-block-header"><span className="diya-code-block-label">{label}</span>{button}</div>}
      <pre className="diya-code-block-code" tabIndex={0} role="region" aria-label={label ? t.namedCode(label) : t.code}><code ref={content}>{code}</code></pre>
      {!label && button}
      <span className="diya-code-block-status" role="status" data-failed={status === 'failed' ? 'true' : undefined}>
        {copied ? t.copied : status === 'failed' ? t.copyFailed : ''}
      </span>
    </div>
  )
})
