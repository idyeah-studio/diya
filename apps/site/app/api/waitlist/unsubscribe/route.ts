import { handleUnsubscribe, handleUnsubscribeGet } from '../../../../lib/waitlist/handlers'
import { waitlistDeps } from '../../../../lib/waitlist/runtime'

/** RFC 8058 one-click unsubscribe, and the unsubscribe page's form. */
export async function POST(request: Request) {
  return handleUnsubscribe(request, waitlistDeps())
}

/** Opening the one-click address in a browser shows the page instead of acting. */
export async function GET(request: Request) {
  return handleUnsubscribeGet(request)
}
