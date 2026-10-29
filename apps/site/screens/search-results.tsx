'use client'
// Search results: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/search/page.tsx. Vite: save as src/SearchResults.tsx and render it inside your DiyaProvider.
import { ContentState } from '@idyeah/diya'
import { Hammer, LucideProvider } from 'lucide-react'

export default function SearchResultsScreen() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <main className="search-results-page">
        <ContentState
          headingLevel={1}
          icon={<Hammer />}
          title="Search results"
          description="This screen is being built."
        />
      </main>
    </LucideProvider>
  )
}

const css = `
.search-results-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--diya-space-6, 32px) var(--diya-space-4, 16px);
}
`
