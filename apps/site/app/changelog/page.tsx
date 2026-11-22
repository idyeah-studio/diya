import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { ChangelogView, parseChangelog, type Changelog } from '../../components/community/changelog'
import { TrustBlock } from '../../components/community/TrustBlock'
import { WaitlistPage } from '../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../lib/catalog-route'
import { isLaunched, launchNow } from '../../lib/launch'
import { shareCard } from '../../lib/share-card'
import '../../components/community/community.css'

// The SDK's own CHANGELOG.md, the same file npm and GitHub show. It ships
// with the deployment, so this page always matches the code it describes.
const CHANGELOG_FILE = path.join(process.cwd(), '../../packages/diya/CHANGELOG.md')
let parsed: Changelog | undefined
function changelog() {
  parsed ??= parseChangelog(readFileSync(CHANGELOG_FILE, 'utf8'))
  return parsed
}

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  // Before launch the page is a 404, and its title and description stay unsaid too.
  if (!catalogIsOpen()) return {}
  const launched = isLaunched(launchNow())
  const indexable = launched && process.env.DIYA_CATALOG_PREVIEW !== '1'
  const title = 'Changelog — DIYA'
  const description = 'Every DIYA release, newest first, with who maintains it and how often it ships.'
  return {
    title,
    description,
    alternates: { canonical: '/changelog' },
    // From the launch moment the page has its own share card; a preview before it keeps the site's.
    ...(launched ? shareCard({ title, description, path: '/changelog' }) : {}),
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
  }
}

/** /changelog: who keeps DIYA going, the release cadence, and every release. Opens with the catalog. */
export default async function ChangelogPage() {
  await connection()
  if (!catalogIsOpen()) notFound()
  return (
    <WaitlistPage labelledBy="changelog-heading" chrome wide>
      <div className="cm-page">
        <p className="wp-eyebrow">@idyeah/diya</p>
        <h1 id="changelog-heading">Changelog</h1>
        <p className="wp-lede">
          Every release of DIYA, newest first. Breaking changes only come with a new major version, and each one is
          listed here with what to change.
        </p>
        <TrustBlock variant="page" />
        <ChangelogView changelog={changelog()} />
      </div>
    </WaitlistPage>
  )
}
