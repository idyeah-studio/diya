import { connection } from 'next/server'
import { launchNow, secondsUntilLaunch } from '../../../lib/launch'

/** The server's own count, for the countdown to re-check itself against. */
export async function GET() {
  await connection()
  return Response.json(
    { seconds: secondsUntilLaunch(launchNow()) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
