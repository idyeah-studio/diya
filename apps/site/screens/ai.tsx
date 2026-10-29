'use client'
// AI assistant: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/assistant/page.tsx. Vite: save as src/Assistant.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function AssistantScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="ai-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="AI assistant"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.ai-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
