import { handleConfirm, handleConfirmGet } from '../../../../lib/waitlist/handlers'
import { waitlistDeps } from '../../../../lib/waitlist/runtime'

/** The confirm page's button. */
export async function POST(request: Request) {
  return handleConfirm(request, waitlistDeps())
}

/** Opening this address shows the confirm page instead of acting. */
export async function GET(request: Request) {
  return handleConfirmGet(request)
}
