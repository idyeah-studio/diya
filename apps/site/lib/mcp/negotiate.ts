/*
 * One address, two readers: diya13.ai/mcp is DIYA's MCP server for agents and
 * a readable page for people. MCP clients POST, or GET with
 * `Accept: text/event-stream`, so they never see HTML. A browser asks for
 * `text/html`, and gets the page. Any other GET keeps the server's 405.
 */

/** Where the proxy rewrites a browser's GET /mcp. Its canonical address is /mcp. */
export const MCP_PAGE_PATH = '/diya-mcp-page'

/** The media types an Accept header asks for, lowercased, without those it refuses (q=0). */
export function acceptedTypes(accept: string | null | undefined): string[] {
  if (!accept) return []
  return accept
    .split(',')
    .map((range) => {
      const [type, ...params] = range.split(';').map((part) => part.trim().toLowerCase())
      const q = params.find((param) => /^q\s*=/.test(param))
      const weight = q ? Number(q.replace(/^q\s*=\s*/, '')) : 1
      return { type, weight: Number.isNaN(weight) ? 1 : weight }
    })
    .filter(({ type, weight }) => type && weight > 0)
    .map(({ type }) => type)
}

/**
 * True for a browser asking for the page: a GET (or HEAD) whose Accept names
 * text/html and not text/event-stream. A Next client navigation (`RSC: 1`)
 * counts too, so a link inside the site lands on the page, not the 405.
 */
export function wantsMcpPage(request: { method: string; headers: Headers }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  const types = acceptedTypes(request.headers.get('accept'))
  if (types.includes('text/event-stream')) return false
  return types.includes('text/html') || request.headers.get('rsc') === '1'
}
