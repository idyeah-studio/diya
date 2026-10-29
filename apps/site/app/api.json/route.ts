import { API } from '../../components/reference/api'
import { aiChannelResponse } from '../../components/reference/ai-route'

/** The SDK's api.json at a stable address, exactly as the package ships it. */
export function GET() {
  return aiChannelResponse(() => JSON.stringify(API, null, 2), 'application/json; charset=utf-8')
}
