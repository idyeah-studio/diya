'use client'
// SaaS landing page: a poster for a DIYA screen that waits on marketing sections. Thumbnail only; never offered as code.
import { ContentState } from '@idyeah/diya'
import { LucideProvider, Sparkles } from 'lucide-react'

export default function LandingPoster() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="landing-poster">
        <ContentState
          headingLevel={1}
          icon={<Sparkles />}
          title="SaaS landing page"
          description="This poster is being drawn."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.landing-poster {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
