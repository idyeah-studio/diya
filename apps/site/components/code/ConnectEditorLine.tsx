import { TextLink } from '@idyeah/diya'

/** Where the README shows how to add DIYA's MCP server to an editor. */
export const CONNECT_EDITOR_HREF = 'https://github.com/idyeah-studio/diya#use-it-with-an-ai-editor'

/** Get code, step 1: an AI editor connected to DIYA's MCP server fetches all of this itself. */
export function ConnectEditorLine() {
  return (
    <p>
      Working in Claude Code or Cursor? <TextLink href={CONNECT_EDITOR_HREF}>Connect your editor</TextLink> once and
      it fetches this for you.
    </p>
  )
}
