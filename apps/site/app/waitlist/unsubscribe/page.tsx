import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TextLink } from '@idyeah/diya'
import { WaitlistPage } from '../../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../../lib/catalog-route'
import { waitlistIsOpen } from '../../../lib/waitlist/open'
import { TokenForm } from '../../../components/waitlist/TokenForm'
import { CONTACT_EMAIL } from '../../../lib/waitlist/config'

export const metadata: Metadata = {
  title: 'Leave the Relight list · DIYA',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Params = { token?: string | string[]; s?: string | string[] }

// Opening this page never unsubscribes anyone: link scanners open every link.
// The button posts the token, and the result comes back here as `s`.
export default async function WaitlistUnsubscribe({ searchParams }: { searchParams: Promise<Params> }) {
  // Closed before launch, like the rest of the list.
  if (!waitlistIsOpen()) notFound()
  const { token, s } = await searchParams
  const contact = (
    <TextLink href={`mailto:${CONTACT_EMAIL}`} inline>
      {CONTACT_EMAIL}
    </TextLink>
  )
  let title: string
  let body: React.ReactNode
  if (s === 'done') {
    title = 'You’re off the list.'
    body = (
      <>
        <p className="wp-lede">You won’t get any more Relight emails.</p>
        <p className="wp-muted">
          We’ve deleted your answer to the question and kept only a note that you left, so nothing we send can reach you by mistake. Want that deleted too? Reply to
          any of our emails, or write to {contact}.
        </p>
      </>
    )
  } else if (s === 'error') {
    title = 'That didn’t go through.'
    body = (
      <p className="wp-lede">
        It’s on our side. Try the link in the email again in a little while, or write to {contact} and we’ll take you
        off by hand.
      </p>
    )
  } else if (typeof token === 'string' && token && s !== 'invalid') {
    title = 'Leave the Relight list?'
    body = (
      <>
        <p className="wp-lede">One click and we stop writing, for good.</p>
        <p className="wp-muted">Change your mind later? Write to {contact} and we’ll put you back.</p>
        <div className="wp-actions">
          <TokenForm action="/api/waitlist/unsubscribe" token={token} label="Leave the list" />
        </div>
      </>
    )
  } else {
    title = 'That link didn’t work.'
    body = (
      <p className="wp-lede">
        It may have been cut short when it was copied. Use the “Leave the list” link in any Relight email, or write to{' '}
        {contact} and we’ll take you off by hand.
      </p>
    )
  }
  return (
    <WaitlistPage labelledBy="waitlist-unsubscribe-heading" chrome={catalogIsOpen()}>
      <p className="site-relight">
        <span className="site-relight-name">Relight</span>
        <span className="sr-only">,</span> <span className="site-soon">Coming to DIYA Pro</span>
      </p>
      <h1 id="waitlist-unsubscribe-heading">{title}</h1>
      {body}
      <div className="wp-actions">
        <TextLink href="/">Back to DIYA</TextLink>
      </div>
    </WaitlistPage>
  )
}
