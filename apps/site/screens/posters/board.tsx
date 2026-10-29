'use client'
// Board: a poster for a DIYA screen that waits on drag and drop. Thumbnail only; never offered as code.
import { ContentState } from '@idyeah/diya'
import { LucideProvider, Sparkles } from 'lucide-react'

export default function BoardPoster() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="board-poster">
        <ContentState
          headingLevel={1}
          icon={<Sparkles />}
          title="Board"
          description="This poster is being drawn."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.board-poster {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
