import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { MemorySearchLog, setSearchLog } from './query-log'

/*
 * A real MCP client (the SDK's own) talking to app/mcp/route.ts, with the
 * route's fetch handed straight to the client: no port, no network, no
 * database. Next's request helpers are stood in for: `after` work is
 * collected and run when the test says so.
 */
const afterWork: (() => unknown)[] = []
vi.mock('next/server', () => ({
  connection: async () => undefined,
  after: (work: () => unknown) => {
    afterWork.push(work)
  },
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  },
}))

// The route builds the catalog index on first use; a cold, loaded runner needs room.
vi.setConfig({ testTimeout: 30_000 })

const route = await import('../../app/mcp/route')
const ORIGIN = 'https://diya13.ai'

/** Calls the route the way Next would, by method. */
async function routeFetch(input: string | URL | Request, init?: RequestInit) {
  const request = new Request(input instanceof Request ? input : new URL(String(input), ORIGIN), init)
  const handler = route[request.method as 'GET' | 'POST' | 'DELETE' | 'OPTIONS']
  return handler(request)
}

async function connect() {
  const client = new Client({ name: 'diya-protocol-test', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', ORIGIN), { fetch: routeFetch }))
  return client
}

const textOf = (result: Awaited<ReturnType<Client['callTool']>>) =>
  (result.content as { type: string; text: string }[]).map((part) => part.text).join('\n')

beforeEach(() => {
  afterWork.length = 0
  vi.stubEnv('DIYA_CATALOG_PREVIEW', '1')
  vi.stubEnv('DIYA_NOW', '2026-11-01T12:00:00Z')
})
afterEach(() => {
  vi.unstubAllEnvs()
  setSearchLog(undefined)
})

describe('the /mcp route', () => {
  it('is a 404 before launch without the preview flag, like /llms.txt', async () => {
    vi.stubEnv('DIYA_CATALOG_PREVIEW', '')
    for (const method of ['GET', 'POST', 'OPTIONS'])
      await expect(routeFetch('/mcp', { method, body: method === 'POST' ? '{}' : undefined }), method).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
    vi.stubEnv('DIYA_NOW', '2026-11-07T08:00:01Z')
    expect((await routeFetch('/mcp', { method: 'OPTIONS' })).status).toBe(204)
  })

  it('introduces itself and lists five read-only tools, one resource and one prompt', async () => {
    const client = await connect()
    expect(client.getServerVersion()).toMatchObject({ name: 'diya', title: 'DIYA' })
    expect(client.getInstructions()).toContain('call get_component for every component you use')
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual(['search_components', 'get_component', 'get_setup', 'get_theme', 'list_tokens'])
    for (const tool of tools) expect(tool.annotations, tool.name).toMatchObject({ readOnlyHint: true, openWorldHint: false })
    expect((await client.listResources()).resources.map((r) => r.uri)).toEqual(['diya://rules'])
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(['build_screen'])
    await client.close()
  })

  it('answers every tool, the resource and the prompt', async () => {
    const client = await connect()
    const call = async (name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: args })
      expect(result.isError, name).toBeFalsy()
      return textOf(result)
    }
    expect(await call('search_components', { query: 'toggle for email notifications' })).toContain('1. Switch')
    expect(await call('get_component', { name: 'Switch' })).toContain('## Complete file (`SwitchExample.tsx`)')
    expect(await call('get_setup', { framework: 'vite' })).toContain('src/main.tsx')
    expect(await call('get_theme', { brandColor: '#1F4E7A' })).toContain('<DiyaProvider brandColor="#1F4E7A">')
    expect(await call('list_tokens', { group: 'space' })).toContain('`--diya-space-4` `16px`')
    const rules = await client.readResource({ uri: 'diya://rules' })
    expect((rules.contents[0] as { text: string }).text).toContain('npm install @idyeah/diya')
    const prompt = await client.getPrompt({ name: 'build_screen', arguments: { screen: 'a settings page', framework: 'next' } })
    expect((prompt.messages[0].content as { text: string }).text).toMatch(/^Build a settings page with DIYA/)
    await client.close()
  })

  it('rejects bad arguments as a tool error the agent can read', async () => {
    const client = await connect()
    const result = await client.callTool({ name: 'get_component', arguments: { name: '' } })
    expect(result.isError).toBe(true)
    await client.close()
  })

  it('counts searches after answering, and only the words', async () => {
    const log = new MemorySearchLog()
    setSearchLog(log)
    const client = await connect()
    await client.callTool({ name: 'search_components', arguments: { query: '  Date RANGE  ' } })
    await client.callTool({ name: 'search_components', arguments: { query: 'carousel' } })
    await client.callTool({ name: 'search_components', arguments: { query: 'email me at someone@example.com' } })
    await client.callTool({ name: 'get_component', arguments: { name: 'Switch' } })
    expect(log.counts.size).toBe(0)
    await Promise.all(afterWork.map((work) => work()))
    expect([...log.counts.values()].map(({ query, found, count }) => ({ query, found, count }))).toEqual([
      { query: 'date range', found: true, count: 1 },
      { query: 'carousel', found: false, count: 1 },
    ])
    await client.close()
  })

  it('answers GET and DELETE with 405, OPTIONS with CORS, and never caches', async () => {
    for (const method of ['GET', 'DELETE']) {
      const response = await routeFetch('/mcp', { method })
      expect(response.status, method).toBe(405)
      expect(response.headers.get('allow')).toBe('POST, OPTIONS')
    }
    const preflight = await routeFetch('/mcp', { method: 'OPTIONS' })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*')
    const response = await routeFetch('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'curl', version: '0' } },
      }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toMatchObject({ result: { serverInfo: { name: 'diya' } } })
  })
})
