import type { ReactNode } from 'react'
import type { McpDefinition } from '../../lib/mcp/definitions'

/**
 * One plain line per thing the server offers, for people. The names and the
 * list come from the server itself (lib/mcp/definitions.ts); a name without a
 * line here falls back to the server's own description, so the page is never
 * missing anything the server has. lib/mcp/definitions.test.ts fails until a
 * new name gets its line. Identifiers are set as code, like every other one
 * on the page.
 */
export const PLAIN_WORDS: Record<string, ReactNode> = {
  search_components: 'Finds the component for a job, with when to use it and what to use instead.',
  get_component: 'Props, guidance and a complete example for one component.',
  get_setup: 'The install command, the root files for a Next.js or Vite app, and the rules every screen follows.',
  get_theme: (
    <>
      Your brand color and font, set once on <code>DiyaProvider</code>, in Light, Dark and Glass.
    </>
  ),
  list_tokens: (
    <>
      The public <code>--diya-*</code> tokens, with their Light and Dark values and what each one is for.
    </>
  ),
  build_screen: 'Builds a whole screen, such as a settings page, in the right order.',
  'diya://rules': 'Setup and the rules every screen follows, to read once.',
}

const KIND_LEAD: Record<McpDefinition['kind'], string> = { tool: '', prompt: 'A prompt. ', resource: 'A resource. ' }

/** What the page says about one definition. */
export function plainLine(definition: McpDefinition): ReactNode {
  return (
    <>
      {KIND_LEAD[definition.kind]}
      {PLAIN_WORDS[definition.name] ?? definition.description ?? definition.title ?? ''}
    </>
  )
}
