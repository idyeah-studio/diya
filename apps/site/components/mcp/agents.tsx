import type { ReactNode } from 'react'
import { Button } from '@idyeah/diya'
import { MCP_INSTALL, MCP_URL } from '../reference/api'
import { CopyCommand } from './CopyCommand'

/** One way in: a line of words, then a link to the agent's installer or something to paste. */
type Step = { text?: ReactNode; link?: { href: string; label: string }; code?: { code: string; name: string } }
export type Agent = { id: string; label: string; steps: Step[] }

/**
 * "Connect it", one tab per agent: the "Connect your editor" popover's three
 * (from the same MCP_INSTALL), plus Codex and a way for any other agent.
 */
export const AGENTS: Agent[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    steps: [{ text: 'Run this once in your project:', code: { code: MCP_INSTALL.claude, name: 'Claude Code command' } }],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    steps: [
      { link: { href: MCP_INSTALL.cursorLink, label: 'Add to Cursor' } },
      {
        text: (
          <>
            Or add this to <code>.cursor/mcp.json</code>:
          </>
        ),
        code: { code: MCP_INSTALL.cursorJson, name: 'Cursor settings' },
      },
    ],
  },
  {
    id: 'vscode',
    label: 'VS Code',
    steps: [
      { link: { href: MCP_INSTALL.vscodeLink, label: 'Add to VS Code' } },
      { text: 'Or run:', code: { code: MCP_INSTALL.vscodeCommand, name: 'VS Code command' } },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    steps: [{ text: 'Run this once:', code: { code: MCP_INSTALL.codex, name: 'Codex command' } }],
  },
  {
    id: 'other',
    label: 'Other agents',
    steps: [
      {
        text: 'Add this address wherever your agent lists MCP servers. Choose HTTP (some agents say Streamable HTTP), not stdio.',
        code: { code: MCP_URL, name: 'address for other agents' },
      },
    ],
  },
]

/** One agent's steps. `copy={false}` prints plain, selectable text, for the page without JavaScript. */
export function AgentSteps({ agent, copy = true }: { agent: Agent; copy?: boolean }) {
  return (
    <div className="mcp-agent">
      {agent.steps.map((step, index) => (
        <div className="mcp-agent-step" key={index}>
          {step.link && (
            <Button asChild size="small" shape="pill" className="mcp-agent-link">
              <a href={step.link.href}>{step.link.label}</a>
            </Button>
          )}
          {step.text && <p>{step.text}</p>}
          {step.code &&
            (copy ? (
              <CopyCommand code={step.code.code} name={step.code.name} />
            ) : (
              <div className="mcp-copy" data-multiline={step.code.code.includes('\n') || undefined}>
                <div className="mcp-copy-row">
                  <code className="mcp-copy-text">{step.code.code}</code>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
