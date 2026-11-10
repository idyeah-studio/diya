import { notFound } from 'next/navigation'
import { after, connection } from 'next/server'
import { catalogIsOpen } from '../../lib/catalog-route'
import { handleMcpRequest } from '../../lib/mcp/server'
import { componentLog, recordComponents } from '../../lib/mcp/component-log'
import { recordSearches, searchLog, type Search } from '../../lib/mcp/query-log'

/**
 * DIYA's MCP server for AI editors, at diya13.ai/mcp. Gated exactly
 * like /llms.txt: a 404 before launch without the preview flag, public from
 * the launch moment. Stateless, read-only, no account.
 */
async function handle(request: Request) {
  await connection()
  if (!catalogIsOpen()) notFound()
  const searches: Search[] = []
  const components: string[] = []
  const response = await handleMcpRequest(request, {
    onSearch: (search) => searches.push(search),
    onComponent: (id) => components.push(id),
  })
  // Counted after the answer has gone, so it never slows an agent down.
  if (searches.length) after(() => recordSearches(searchLog(), searches))
  if (components.length) after(() => recordComponents(componentLog(), components))
  return response
}

export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS }
