import type { Metadata } from 'next'
import { TextLink } from '@idyeah/diya'
import { ConfirmedNote } from '../../../components/waitlist/ConfirmedNote'
import { notFound } from 'next/navigation'
import { WaitlistPage } from '../../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../../lib/catalog-route'
import { readConfirmedStatus, type ConfirmedStatus } from '../../../lib/waitlist/confirmed-status'
import { waitlistIsOpen } from '../../../lib/waitlist/open'
import { waitlistDeps } from '../../../lib/waitlist/runtime'

export const metadata: Metadata = {
  title: 'Relight waitlist · DIYA',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const CONTENT: Record<ConfirmedStatus, { title: string; body: string[] }> = {
  founding: {
    title: 'You’re confirmed.',
    body: [
      'You’re one of the first 200, so early access and the founding price for a year are yours when Relight opens. No card.',
      'It’s quiet from here until Relight is ready. I’ll write then.',
    ],
  },
  listed: {
    title: 'You’re confirmed.',
    body: [
      'The 200 founding spots have gone, but you’re on the list and you’ll hear the moment Relight opens.',
      'It’s quiet from here until then.',
    ],
  },
  expired: {
    title: 'That link has expired.',
    body: ['Confirm links last seven days. Join again from the home page and we’ll send a fresh one.'],
  },
  invalid: {
    title: 'That link didn’t work.',
    body: [
      'It may have been cut short when it was copied, or it belongs to an address that has since left the list. Join again from the home page for a fresh one; we send at most one email a day, so it may arrive tomorrow.',
    ],
  },
  error: {
    title: 'We couldn’t confirm you just now.',
    body: ['That one’s on our side. Try the link again in a little while; it stays good for seven days.'],
  },
}

type Params = { s?: string | string[]; t?: string | string[]; sig?: string | string[] }

export default async function WaitlistConfirmed({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  // Closed before launch, like the rest of the list.
  if (!waitlistIsOpen()) notFound()
  const status = readConfirmedStatus(params, waitlistDeps()?.secret ?? null)
  const content = CONTENT[status]
  const confirmed = status === 'founding' || status === 'listed'
  return (
    <WaitlistPage labelledBy="waitlist-confirmed-heading" chrome={catalogIsOpen()}>
      <p className="wp-eyebrow">Relight · coming to DIYA Pro</p>
      <h1 id="waitlist-confirmed-heading">{content.title}</h1>
      {content.body.map((line, index) => (
        <p key={line} className={index === 0 ? 'wp-lede' : 'wp-muted'}>
          {line}
        </p>
      ))}
      {confirmed && (
        <p className="wp-muted">
          Meanwhile, the library is free and MIT: <code>npm install @idyeah/diya</code>
        </p>
      )}
      <div className="wp-actions">
        <TextLink href="/">Back to DIYA</TextLink>
      </div>
      {confirmed && <ConfirmedNote founding={status === 'founding'} />}
    </WaitlistPage>
  )
}
