import { llmsIndex } from '../../components/reference/ai-docs'
import { aiChannelResponse } from '../../components/reference/ai-route'

/** The llms.txt index: what DIYA is, how to set it up, and a line per item. */
export function GET() {
  return aiChannelResponse(llmsIndex, 'text/plain; charset=utf-8')
}
