'use client'
// Record detail: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/projects/[id]/page.tsx. Vite: save as src/RecordDetail.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function RecordDetailScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="record-detail-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="Record detail"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.record-detail-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
