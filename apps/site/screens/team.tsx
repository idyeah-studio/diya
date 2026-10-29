'use client'
// Team & roles: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/settings/team/page.tsx. Vite: save as src/Team.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function TeamScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="team-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="Team & roles"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.team-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
