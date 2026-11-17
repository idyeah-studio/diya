import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createDiyaMcpServer } from './server'

/** One thing an agent can ask the server for, as the server itself lists it. */
export type McpDefinition = { kind: 'tool' | 'prompt' | 'resource'; name: string; title?: string; description?: string }
export type McpDefinitions = { name: string; version: string; tools: McpDefinition[]; prompts: McpDefinition[]; resources: McpDefinition[] }

let cached: Promise<McpDefinitions> | undefined

/**
 * What DIYA's MCP server offers, read from the server itself: the same
 * server the route answers with, asked over MCP in memory. The /mcp page
 * lists these, so its list can't drift from what agents get.
 */
export function mcpDefinitions(): Promise<McpDefinitions> {
  cached ??= readDefinitions().catch((error) => {
    cached = undefined
    throw error
  })
  return cached
}

async function readDefinitions(): Promise<McpDefinitions> {
  const server = createDiyaMcpServer()
  const client = new Client({ name: 'diya-site', version: '1' })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverSide), client.connect(clientSide)])
  try {
    const info = client.getServerVersion()
    const [{ tools }, { prompts }, { resources }] = await Promise.all([client.listTools(), client.listPrompts(), client.listResources()])
    return {
      name: info?.name ?? 'diya',
      version: info?.version ?? '',
      tools: tools.map(({ name, title, description }) => ({ kind: 'tool', name, title, description })),
      prompts: prompts.map(({ name, title, description }) => ({ kind: 'prompt', name, title, description })),
      resources: resources.map(({ uri, title, description }) => ({ kind: 'resource', name: uri, title, description })),
    }
  } finally {
    await client.close()
    await server.close()
  }
}
