'use client'
import { useEffect, useState } from 'react'
import { Button, Popover, Tabs } from '@idyeah/diya'

export type McpInstall = {
  claude: string
  cursorJson: string
  cursorLink: string
  vscodeCommand: string
  vscodeLink: string
}

function CopyIcon({ done }: { done: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {done ? <path d="m5 12 5 5 9-10" /> : <path d="M8 8h12v12H8zM16 8V4H4v12h4" />}
    </svg>
  )
}

/** A command or config to paste, with its own copy button. */
function CodeToCopy({ code, label }: { code: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (state !== 'copied') return
    const timer = window.setTimeout(() => setState('idle'), 2400)
    return () => window.clearTimeout(timer)
  }, [state])
  return (
    <div className="connect-editor-code">
      <pre>
        <code>{code}</code>
      </pre>
      <Button
        variant="quiet"
        size="small"
        iconOnly
        aria-label={state === 'copied' ? `${label} copied` : `Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            setState('copied')
          } catch {
            setState('failed')
          }
        }}
      >
        <CopyIcon done={state === 'copied'} />
      </Button>
      <span className="item-reference-sr" role="status">
        {state === 'copied' ? `${label} copied.` : ''}
      </span>
      {state === 'failed' && <p role="status">Copy didn’t work. Select the text above and press Command+C or Ctrl+C.</p>}
    </div>
  )
}

/**
 * "Connect your editor": how to add DIYA's MCP server to Claude Code,
 * Cursor or VS Code, one line each, beside "Copy for AI".
 */
export function ConnectEditor({ install }: { install: McpInstall }) {
  const [editor, setEditor] = useState('claude')
  return (
    <Popover
      label="Connect your editor"
      trigger={
        <Button variant="quiet" size="small" shape="pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5" />
          </svg>
          Connect your editor
        </Button>
      }
    >
      <div className="connect-editor-panel">
        <p className="connect-editor-title">Connect DIYA to your editor</p>
        <p className="connect-editor-lead">
          Your AI looks DIYA up while it writes: the right component, its real props, code that compiles. Read-only, no
          account.
        </p>
        <Tabs
          label="Editor"
          size="small"
          variant="pill"
          value={editor}
          onValueChange={setEditor}
          items={[
            {
              value: 'claude',
              label: 'Claude Code',
              content: (
                <div className="connect-editor-step">
                  <p>Run this once in your project:</p>
                  <CodeToCopy label="Claude Code command" code={install.claude} />
                </div>
              ),
            },
            {
              value: 'cursor',
              label: 'Cursor',
              content: (
                <div className="connect-editor-step">
                  <Button asChild size="small" shape="pill">
                    <a href={install.cursorLink}>Add to Cursor</a>
                  </Button>
                  <p>
                    Or add this to <code>.cursor/mcp.json</code>:
                  </p>
                  <CodeToCopy label="Cursor settings" code={install.cursorJson} />
                </div>
              ),
            },
            {
              value: 'vscode',
              label: 'VS Code',
              content: (
                <div className="connect-editor-step">
                  <Button asChild size="small" shape="pill">
                    <a href={install.vscodeLink}>Add to VS Code</a>
                  </Button>
                  <p>Or run:</p>
                  <CodeToCopy label="VS Code command" code={install.vscodeCommand} />
                </div>
              ),
            },
          ]}
        />
        <p className="connect-editor-then">
          Then ask it: <q>Build a settings page with DIYA.</q>
        </p>
      </div>
    </Popover>
  )
}
