import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { McpPage } from '../../components/mcp/McpPage'
import { WaitlistPage } from '../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../lib/catalog-route'
import { isLaunched, launchNow } from '../../lib/launch'
import { shareCard } from '../../lib/share-card'
import { mcpDefinitions } from '../../lib/mcp/definitions'

/*
 * diya13.ai/mcp for people. proxy.ts rewrites a browser's GET /mcp here, so
 * the address stays /mcp, which is also its canonical URL. Agents asking the
 * same address get the server (app/mcp/route.ts). Opens with the catalog.
 */

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  if (!catalogIsOpen()) return {}
  const launched = isLaunched(launchNow())
  const indexable = launched && process.env.DIYA_CATALOG_PREVIEW !== '1'
  const title = 'MCP server — DIYA'
  const description = 'Connect your coding agent to DIYA’s read-only MCP server: how, what it can ask, and what the server keeps.'
  return {
    title,
    description,
    alternates: { canonical: '/mcp' },
    // From the launch moment the page has its own share card; a preview before it keeps the site's.
    ...(launched ? shareCard({ title, description, path: '/mcp' }) : {}),
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
  }
}

export default async function McpServerPage() {
  await connection()
  if (!catalogIsOpen()) notFound()
  return (
    <WaitlistPage labelledBy="mcp-heading" chrome wide>
      <McpPage definitions={await mcpDefinitions()} />
    </WaitlistPage>
  )
}
