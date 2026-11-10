import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import type { Search } from './query-log'
import {
  buildScreenPrompt,
  COMPONENT_SECTIONS,
  componentIdFor,
  getComponent,
  getSetup,
  getTheme,
  listTokens,
  MCP_HEAD,
  rulesResource,
  searchComponents,
  SERVER_INSTRUCTIONS,
} from './tools'
import { MCP_API } from './catalog'

/*
 * DIYA's MCP server: five read-only tools, one resource and one prompt,
 * answered over stateless Streamable HTTP. Every request gets a fresh
 * server, so nothing is shared between callers.
 */

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] })
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

/** What the route counts: the words of each search, and the id of each component asked for. */
export type McpCounters = { onSearch?: (search: Search) => void; onComponent?: (id: string) => void }

export function createDiyaMcpServer({ onSearch, onComponent }: McpCounters = {}) {
  const server = new McpServer({ name: 'diya', title: 'DIYA', version: MCP_API.version }, { instructions: SERVER_INSTRUCTIONS })

  server.registerTool(
    'search_components',
    {
      title: 'Find a DIYA component',
      description:
        'Find the DIYA components or patterns for a job, in plain words ("toggle for email alerts", "settings form", "empty table"). Returns names, imports and when to use each.',
      inputSchema: {
        query: z.string().min(1).max(200).describe('What the UI needs to do'),
        limit: z.number().int().min(1).max(10).optional().describe('How many to return; 5 if left out'),
      },
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      const result = searchComponents({ query, limit })
      onSearch?.({ query, found: result.found })
      return text(result.text)
    }
  )

  server.registerTool(
    'get_component',
    {
      title: 'Get a DIYA component',
      description:
        'Everything needed to use one DIYA component or pattern correctly: import, props with types and defaults, content slots, controlled and uncontrolled state, the types its props use, accessibility, and a complete .tsx file that type-checks.',
      inputSchema: {
        name: z.string().min(1).max(80).describe('Export name, title or catalog id: "Switch", "Side Navigation", "text-input"'),
        include: z
          .array(z.enum(COMPONENT_SECTIONS))
          .optional()
          .describe('Sections to return; props, accessibility and example if left out'),
      },
      annotations: readOnly,
    },
    async ({ name, include }) => {
      const answer = text(getComponent({ name, include }))
      const id = componentIdFor(name)
      if (id) onComponent?.(id)
      return answer
    }
  )

  server.registerTool(
    'get_setup',
    {
      title: 'Set up DIYA',
      description:
        "The install command and the exact root files for an app (Next.js App Router providers and layout, or Vite's main.tsx), Tailwind v4 layer order, and DIYA's rules. Call it once per app, before writing components.",
      inputSchema: {
        framework: z.enum(['next', 'vite', 'other']).optional().describe('next if left out'),
        tailwind: z.boolean().optional().describe('The app uses Tailwind v4'),
        charts: z.boolean().optional().describe('The app needs Data Viz charts (adds echarts@6)'),
        packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional(),
      },
      annotations: readOnly,
    },
    async (args) => text(getSetup(args))
  )

  server.registerTool(
    'get_theme',
    {
      title: 'Theme DIYA',
      description:
        'Turns a brand color (and, if wanted, glass, a font and corners) into the one DiyaProvider line to write. Shows the accent tokens DIYA derives with their contrast, and says when a color will look faint.',
      inputSchema: {
        brandColor: z
          .union([z.string().max(9), z.object({ light: z.string().max(9), dark: z.string().max(9) })])
          .optional()
          .describe('A hex color, such as "#1F4E7A", or { light, dark }'),
        theme: z.enum(['system', 'light', 'dark']).optional(),
        glass: z.boolean().optional(),
        fontFamily: z.string().max(200).optional().describe('A CSS font-family stack'),
        corners: z.number().min(0).max(3).optional().describe('Corner scale: 0 square, 1 default, 2 round'),
      },
      annotations: readOnly,
    },
    async (args) => text(getTheme(args))
  )

  server.registerTool(
    'list_tokens',
    {
      title: 'List DIYA tokens',
      description:
        'The public --diya-* CSS custom properties with their Light and Dark values, which provider prop sets each, and which to change together.',
      inputSchema: {
        group: z.string().max(40).optional().describe('surfaces, text, actions, statuses, space, shape, type-scale, glass, …'),
      },
      annotations: readOnly,
    },
    async ({ group }) => text(listTokens({ group }))
  )

  server.registerResource(
    'rules',
    'diya://rules',
    { title: 'DIYA setup and rules', description: `Install, provider and the rules every screen follows (${MCP_HEAD})`, mimeType: 'text/markdown' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: rulesResource() }] })
  )

  server.registerPrompt(
    'build_screen',
    {
      title: 'Build a screen with DIYA',
      description: 'Build a whole screen, such as a settings page, a dashboard or a sign-up form, from DIYA components, in the right order.',
      argsSchema: {
        screen: z.string().describe('The screen, in your words'),
        framework: z.string().optional().describe('next or vite'),
      },
    },
    ({ screen, framework }) => ({
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text: buildScreenPrompt({ screen, framework }) } }],
    })
  )

  return server
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Max-Age': '86400',
}

function withHeaders(response: Response, headers: Record<string, string>) {
  const out = new Response(response.body, response)
  for (const [name, value] of Object.entries(headers)) out.headers.set(name, value)
  return out
}

/**
 * One MCP request in, one JSON response out. Only POST carries messages:
 * a stateless server has no stream to offer on GET and no session to end on
 * DELETE, so both answer 405, which MCP clients expect.
 */
export async function handleMcpRequest(request: Request, counters: McpCounters = {}) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: send MCP messages with POST.' }, id: null }), {
      status: 405,
      headers: { ...CORS, Allow: 'POST, OPTIONS', 'Content-Type': 'application/json' },
    })
  }
  const server = createDiyaMcpServer(counters)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  try {
    const response = await transport.handleRequest(request)
    // The JSON body is complete once handleRequest returns; read it before the server closes.
    const body = response.status === 202 || response.status === 204 ? null : await response.text()
    return withHeaders(new Response(body, response), { ...CORS, 'Cache-Control': 'no-store' })
  } finally {
    await server.close()
  }
}
