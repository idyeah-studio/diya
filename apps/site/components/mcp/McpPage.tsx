import { Accordion, TextLink } from '@idyeah/diya'
import type { McpDefinitions } from '../../lib/mcp/definitions'
import { NEW_ISSUE_URL } from '../community/links'
import { API, MCP_URL } from '../reference/api'
import { Announcer } from './Announcer'
import { ConnectAgent } from './ConnectAgent'
import { CopyCommand } from './CopyCommand'
import { AGENTS, AgentSteps } from './agents'
import { plainLine } from './plain-words'
import { ServerStatus } from './ServerStatus'
import './mcp-page.css'

/** The Button props "Check it worked" expects in a good answer, as long as Button has them. */
export const CHECK_PROPS = ['asChild', 'href', 'loading', 'variant'].filter((prop) => prop in (API.components.Button?.props ?? {}))

// Without JavaScript: no status line and no copy keys (the text stays
// selectable), and every agent's steps one after another under their own
// headings. A fixed string, never reader input.
const NO_SCRIPT_STYLE = `.waitlist-page .mcp-page :is(.mcp-status,.mcp-copy-key,.mcp-connect),.waitlist-page .mcp-page .mcp-trouble .diya-accordion-heading svg{display:none}.waitlist-page .mcp-page .mcp-trouble .diya-accordion-content[hidden]{grid-template-rows:1fr;padding-bottom:20px;opacity:1;visibility:visible}.waitlist-page .mcp-page .mcp-address+h2{margin-top:48px}`

const link = (href: string, label: string) => (
  <TextLink href={href} inline>
    {label}
  </TextLink>
)

/**
 * diya13.ai/mcp in a browser: what the server is, how to connect an agent,
 * what it can ask, what the server keeps, and what to do when it doesn't
 * work. Agents asking the same address get the server (proxy.ts).
 */
export function McpPage({ definitions }: { definitions: McpDefinitions }) {
  const { version } = definitions
  const offered = [...definitions.tools, ...definitions.prompts, ...definitions.resources]
  return (
    <Announcer>
      <div className="mcp-page">
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: NO_SCRIPT_STYLE }} />
        </noscript>
        <p className="wp-eyebrow">@idyeah/diya {version}</p>
        <h1 id="mcp-heading">DIYA’s MCP server</h1>
        <p className="wp-lede">
          This address is for coding agents; your browser gets the readable version. Connect it once, and your agent
          looks DIYA up while it writes: the right component, its real props, a complete file. Read-only, free, no
          account.
        </p>

        <div className="mcp-address">
          <p className="mcp-label" id="mcp-address-label">
            Server address
          </p>
          <CopyCommand code={MCP_URL} name="server address" />
          <ServerStatus version={version} issueUrl={NEW_ISSUE_URL} />
        </div>

        <h2 id="connect">Connect it</h2>
        <ConnectAgent />
        <noscript>
          <div className="mcp-noscript">
            {AGENTS.map((agent) => (
              <section key={agent.id} aria-labelledby={`mcp-agent-${agent.id}`}>
                <h3 id={`mcp-agent-${agent.id}`}>{agent.label}</h3>
                <AgentSteps agent={agent} copy={false} />
              </section>
            ))}
          </div>
        </noscript>

        <h3 id="check">Check it worked</h3>
        <p>
          Ask your agent: <q>Use DIYA to list Button’s props.</q> It should look DIYA up and answer with{' '}
          {CHECK_PROPS.map((prop, index) => (
            <span key={prop}>
              {index > 0 && ', '}
              <code>{prop}</code>
            </span>
          ))}{' '}
          and the rest. In Claude Code, <code>/mcp</code> also shows <b>diya</b> as connected.
        </p>
        <p>
          Then ask for something real: <q>Build a settings page with DIYA.</q>
        </p>

        <h2 id="ask">What your agent can ask it</h2>
        <dl className="mcp-defs">
          {offered.map((definition) => (
            <div key={`${definition.kind}:${definition.name}`} data-kind={definition.kind}>
              <dt>
                <code>{definition.name}</code>
              </dt>
              <dd>{plainLine(definition)}</dd>
            </div>
          ))}
        </dl>

        <h2 id="keeps">What it sees and keeps</h2>
        <p>
          Only what your agent sends it: search words, such as “date range picker”, or a component’s name. Never your
          code or your files.
        </p>
        <p>
          We count those words, and which components were asked for, by day, to learn what to build next. Both counts are
          kept for a year. No IP address, no account, nothing that says who asked. {link('/privacy#this-site', 'Privacy')}
        </p>

        <h2 id="trouble">Not working?</h2>
        <Accordion
          className="mcp-trouble"
          headingLevel={3}
          multiple
          items={[
            {
              id: 'connect',
              label: 'My agent can’t connect',
              content: (
                <>
                  <p>
                    Check that the address ends in <code>/mcp</code> and the type is HTTP (some agents say Streamable
                    HTTP), not stdio. Behind a company proxy? Ask for <code>diya13.ai</code> to be allowed.
                  </p>
                  <p>
                    Meanwhile, your agent can read <code>node_modules/@idyeah/diya/dist/api.json</code>: the same API, in
                    one file.
                  </p>
                </>
              ),
            },
            {
              id: 'version',
              label: 'It answers about a different DIYA version',
              content: (
                <p>
                  This server answers for the latest release, DIYA {version}. Your app’s own{' '}
                  <code>node_modules/@idyeah/diya/dist/api.json</code> is the truth for the version you have; when they
                  differ, ask your agent to check there.
                </p>
              ),
            },
            {
              id: 'busy',
              label: 'It says “429” or “too many requests”',
              content: <p>The server limits bursts of requests from one place. Wait a minute; your agent will retry.</p>,
            },
          ]}
        />
        <p className="mcp-stuck">
          Still stuck? {link(NEW_ISSUE_URL, 'Open an issue on GitHub')} with your agent’s name and what it said.
        </p>

        <h2 id="protocol">For the protocol</h2>
        <p>
          MCP over Streamable HTTP, stateless. Send JSON-RPC with POST to this address. Browsers get this page; any other
          GET gets a 405, as it always has. The same API is in {link('/llms.txt', 'llms.txt')} and{' '}
          {link('/api.json', 'api.json')}.
        </p>
      </div>
    </Announcer>
  )
}
