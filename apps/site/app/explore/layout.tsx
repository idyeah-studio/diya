import type { Metadata } from 'next'
import { connection } from 'next/server'
import { CatalogProvider } from '../../components/CatalogProvider'
import { CatalogSearchProvider } from '../../components/CatalogSearchProvider'
import { CatalogFlag } from '../../components/site/CatalogFlag'
import { isLaunched, launchNow } from '../../lib/launch'
/* The catalog's chrome styles, then the SDK stylesheet, then each page's
   component CSS: the cascade ties depend on that order. The SDK stylesheet
   is scoped to `.diya-root`, so loading it here keeps ~95 KB of unused,
   render-blocking CSS off the countdown. */
import '../../components/CatalogChrome.css'
import '../../components/AppearanceMaterials.css'
import '../../components/LibraryAppearance.css'
import '../../components/CatalogIntegration.css'
import '@idyeah/diya/styles.css'

// Indexable from the launch moment; a preview build never is.
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const indexable = isLaunched(launchNow()) && process.env.DIYA_CATALOG_PREVIEW !== '1'
  return indexable ? {} : { robots: { index: false, follow: false } }
}

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogSearchProvider>
      <CatalogFlag />
      <CatalogProvider>{children}</CatalogProvider>
    </CatalogSearchProvider>
  )
}
