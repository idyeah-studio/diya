'use client'
// Help center & FAQ: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/help/page.tsx. Vite: save as src/HelpCenter.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function HelpCenterScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="help-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="Help center & FAQ"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.help-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
