import { llmsFull } from '../../components/reference/ai-docs'
import { aiChannelResponse } from '../../components/reference/ai-route'

/** Every component and pattern in one Markdown file: props, guidance, examples and tokens. */
export function GET() {
  return aiChannelResponse(llmsFull, 'text/plain; charset=utf-8')
}
