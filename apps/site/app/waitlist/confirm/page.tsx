import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TextLink } from '@idyeah/diya'
import { TokenForm } from '../../../components/waitlist/TokenForm'
import { WaitlistPage } from '../../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../../lib/catalog-route'
import { waitlistIsOpen } from '../../../lib/waitlist/open'

export const metadata: Metadata = {
  title: 'Confirm your spot · DIYA',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

// Opening this page changes nothing: mail scanners open every link. Only the
// button confirms, by posting the token; the answer comes back as /waitlist/confirmed.
export default async function WaitlistConfirm({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  // Closed before launch, like the rest of the list.
  if (!waitlistIsOpen()) notFound()
  const { token } = await searchParams
  const valid = typeof token === 'string' && token.length > 0 && token.length <= 200
  return (
    <WaitlistPage labelledBy="waitlist-confirm-heading" chrome={catalogIsOpen()}>
      <p className="wp-eyebrow">Relight · coming to DIYA Pro</p>
      <h1 id="waitlist-confirm-heading">{valid ? 'One click and you’re on the list.' : 'That link didn’t work.'}</h1>
      {valid ? (
        <>
          <p className="wp-lede">Confirm it’s you, and your spot on the Relight list counts.</p>
          <div className="wp-actions">
            <TokenForm action="/api/waitlist/confirm" token={token} label="Confirm my spot" />
          </div>
        </>
      ) : (
        <p className="wp-lede">
          It may have been cut short when it was copied. Join again from the home page for a fresh one; we send at most one email a day, so it may arrive tomorrow.
        </p>
      )}
      <div className="wp-actions">
        <TextLink href="/">Back to DIYA</TextLink>
      </div>
    </WaitlistPage>
  )
}
