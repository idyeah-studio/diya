import { createCommand, type PackageManager } from '../site/package-manager'
import { NoteIcon } from './Step'

/** Get code, step 1: for someone with no app yet, create-diya does steps 1 and 2. */
export function CreateAppNote({ manager }: { manager: PackageManager }) {
  return (
    <div className="code-note">
      <NoteIcon />
      <span>
        <b>No app yet?</b> <code className="code-command">{createCommand(manager)}</code> sets up Next.js or Vite with the styles and provider
        already in place. Then skip to step 3.
      </span>
    </div>
  )
}
