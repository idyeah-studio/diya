import { connection } from 'next/server'
import { handleJoin, handleStatus } from '../../../lib/waitlist/handlers'
import { waitlistDeps } from '../../../lib/waitlist/runtime'

/** Whether the list is open, and a signed token that starts the form's fill-time clock. */
export async function GET(request: Request) {
  await connection()
  return handleStatus(request, waitlistDeps())
}

/** Join the Relight (DIYA Pro) waitlist. */
export async function POST(request: Request) {
  return handleJoin(request, waitlistDeps())
}
