import { connection } from 'next/server'
import { handleStatus, handleSubmit } from '../../../lib/screen-requests/handlers'
import { screenRequestDeps } from '../../../lib/screen-requests/runtime'

/** Whether screen requests are open, and a signed token that starts the form's fill-time clock. */
export async function GET(request: Request) {
  await connection()
  return handleStatus(request, screenRequestDeps())
}

/** A screen request from the Screens gallery: multipart/form-data, emailed to DIYA, never shown anywhere. */
export async function POST(request: Request) {
  return handleSubmit(request, screenRequestDeps())
}
