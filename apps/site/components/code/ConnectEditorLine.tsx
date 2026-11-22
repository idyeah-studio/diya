import { TextLink } from '@idyeah/diya'
import { MCP_PATH } from '../community/links'

/** DIYA's MCP server page, which shows how to connect each editor. */
export const CONNECT_EDITOR_HREF = MCP_PATH

/** Get code, step 1: an AI editor connected to DIYA's MCP server fetches all of this itself. */
export function ConnectEditorLine() {
  return (
    <p>
      Working in Claude Code or Cursor? <TextLink href={CONNECT_EDITOR_HREF}>Connect your editor</TextLink> once and
      it fetches this for you.
    </p>
  )
}
