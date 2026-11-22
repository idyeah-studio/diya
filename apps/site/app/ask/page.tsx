import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { TextLink } from '@idyeah/diya'
import { DISCUSSIONS_URL, MAINTAINER, NEW_ISSUE_URL, NEW_REQUEST_URL } from '../../components/community/links'
import { WaitlistPage } from '../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../lib/catalog-route'
import { isLaunched, launchNow } from '../../lib/launch'
import { shareCard } from '../../lib/share-card'
import '../../components/community/community.css'

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  // Before launch the page is a 404, and its title and description stay unsaid too.
  if (!catalogIsOpen()) return {}
  const launched = isLaunched(launchNow())
  const indexable = launched && process.env.DIYA_CATALOG_PREVIEW !== '1'
  const title = 'Ask for a component — DIYA'
  const description = 'What makes a good component request, and where to send it.'
  return {
    title,
    description,
    alternates: { canonical: '/ask' },
    // From the launch moment the page has its own share card; a preview before it keeps the site's.
    ...(launched ? shareCard({ title, description, path: '/ask' }) : {}),
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
  }
}

const TIPS = [
  {
    title: 'Start with the screen.',
    example: '“A billing page where people switch plans” tells me more than “a radio card.”',
  },
  {
    title: 'Say what you do today.',
    example: 'The workaround, the other library you reached for, or the CSS you wrote by hand.',
  },
  {
    title: 'Add a picture if you have one.',
    example: 'A screenshot or a sketch on a napkin. Blur anything private.',
  },
  {
    title: 'One thing per request.',
    example: 'So a vote counts for one thing, and other people can add their case to it.',
  },
] as const

/** /ask: a short note on a good component request, then the way to GitHub Discussions. Opens with the catalog. */
export default async function AskPage() {
  await connection()
  if (!catalogIsOpen()) notFound()
  return (
    <WaitlistPage labelledBy="ask-heading" chrome>
      <div className="cm-page">
        <p className="wp-eyebrow">Ask for a component</p>
        <h1 id="ask-heading">What should DIYA have next?</h1>
        <p className="wp-lede">
          Requests live in GitHub Discussions, where anyone can add a vote or their own case. I’m {MAINTAINER.name},
          DIYA’s maintainer. I read every request, and the most-wanted shape the next release.
        </p>
        <h2>What makes a good request</h2>
        <ol className="cm-tips">
          {TIPS.map((tip) => (
            <li key={tip.title}>
              <p>
                <b>{tip.title}</b>
                <span>{tip.example}</span>
              </p>
            </li>
          ))}
        </ol>
        <div className="wp-actions">
          <a className="diya-button" data-variant="solid" data-size="large" data-shape="pill" href={NEW_REQUEST_URL}>
            Ask on GitHub
          </a>
          <TextLink href={DISCUSSIONS_URL}>See what others asked</TextLink>
        </div>
        <p className="cm-note">
          You’ll need a GitHub account. Something broken rather than missing?{' '}
          <TextLink href={NEW_ISSUE_URL} inline>
            Report a bug
          </TextLink>{' '}
          instead.
        </p>
      </div>
    </WaitlistPage>
  )
}
