'use client'
// Create & edit: a poster for a DIYA screen that waits on a rich-text editor. Thumbnail only; never offered as code.
import { ContentState } from '@idyeah/diya'
import { LucideProvider, Sparkles } from 'lucide-react'

export default function CreateEditPoster() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="create-edit-poster">
        <ContentState
          headingLevel={1}
          icon={<Sparkles />}
          title="Create & edit"
          description="This poster is being drawn."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.create-edit-poster {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
