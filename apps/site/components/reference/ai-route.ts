import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { catalogIsOpen } from '../../lib/catalog-route'

/**
 * Serves an AI-channel file. Before launch, without the preview flag, it is
 * a 404, exactly as /explore is; from the launch moment it is public, and
 * any origin may read it so agents and editors can fetch it directly.
 */
export async function aiChannelResponse(body: () => string, contentType: string) {
  await connection()
  if (!catalogIsOpen()) notFound()
  return new Response(body(), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
