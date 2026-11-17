import { describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { PLAIN_WORDS, plainLine } from '../../components/mcp/plain-words'
import { MCP_API } from './catalog'
import { mcpDefinitions } from './definitions'
import { handleMcpRequest } from './server'

vi.setConfig({ testTimeout: 30_000 })

/** What an agent sees over HTTP, from the same handler the route uses. */
async function overHttp() {
  const client = new Client({ name: 'diya-definitions-test', version: '1' })
  await client.connect(
    new StreamableHTTPClientTransport(new URL('https://diya13.ai/mcp'), {
      fetch: (input, init) => handleMcpRequest(new Request(input instanceof Request ? input : String(input), init)),
    })
  )
  const [tools, prompts, resources] = await Promise.all([client.listTools(), client.listPrompts(), client.listResources()])
  const version = client.getServerVersion()?.version
  await client.close()
  return { version, tools: tools.tools.map((t) => t.name), prompts: prompts.prompts.map((p) => p.name), resources: resources.resources.map((r) => r.uri) }
}

describe('what the /mcp page lists', () => {
  it('is exactly what the server gives agents: every tool, prompt and resource, in order, and its version', async () => {
    const page = await mcpDefinitions()
    const agent = await overHttp()
    expect(page.tools.map((t) => t.name)).toEqual(agent.tools)
    expect(page.prompts.map((p) => p.name)).toEqual(agent.prompts)
    expect(page.resources.map((r) => r.name)).toEqual(agent.resources)
    expect(page.version).toBe(agent.version)
    expect(page.version).toBe(MCP_API.version)
  })

  it('has a plain line for each of them, and none for anything the server doesn’t have', async () => {
    const page = await mcpDefinitions()
    const names = [...page.tools, ...page.prompts, ...page.resources].map((d) => d.name)
    expect(Object.keys(PLAIN_WORDS).sort()).toEqual([...names].sort())
  })

  it('falls back to the server’s own description for a name it doesn’t know yet', () => {
    expect(plainLine({ kind: 'tool', name: 'get_screen', description: 'One Screen, as a file.' })).toBe('One Screen, as a file.')
    expect(plainLine({ kind: 'prompt', name: 'build_screen' })).toMatch(/^A prompt\. Builds a whole screen/)
  })
})
