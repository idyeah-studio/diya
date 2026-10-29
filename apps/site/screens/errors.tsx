'use client'
// Error & system pages: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/errors/page.tsx. Vite: save as src/ErrorPages.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function ErrorPagesScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="errors-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="Error & system pages"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.errors-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
