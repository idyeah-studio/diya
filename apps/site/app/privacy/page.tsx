import type { Metadata } from 'next'
import { connection } from 'next/server'
import { TextLink } from '@idyeah/diya'
import { WaitlistPage } from '../../components/waitlist/WaitlistPage'
import { catalogIsOpen } from '../../lib/catalog-route'
import { CONTACT_EMAIL, PRIVACY_UPDATED, SENDER_ORG } from '../../lib/waitlist/config'

export const metadata: Metadata = {
  title: 'Privacy · DIYA',
  description: 'What DIYA stores, why, for how long, who helps, your rights, and how to reach us.',
  alternates: { canonical: '/privacy' },
}

// A material change to this page means bumping CONSENT_VERSION and PRIVACY_UPDATED
// in lib/waitlist/config.ts together.
const SECTIONS = [
  { id: 'what', label: 'What we keep' },
  { id: 'why', label: 'Why we keep it' },
  { id: 'how-long', label: 'How long we keep it' },
  { id: 'who-helps', label: 'Who helps us' },
  { id: 'screen-requests', label: 'Screen requests' },
  { id: 'rights', label: 'Your rights' },
  { id: 'contact', label: 'How to reach us' },
] as const

const link = (href: string, label: string) => (
  <TextLink href={href} inline>
    {label}
  </TextLink>
)

export default async function Privacy() {
  // Request time: the header appears with the catalog, at launch.
  await connection()
  const contact = link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)
  return (
    <WaitlistPage labelledBy="privacy-heading" chrome={catalogIsOpen()} wide>
      <p className="wp-eyebrow">Last updated {PRIVACY_UPDATED}</p>
      <h1 id="privacy-heading">Privacy</h1>
      <p className="wp-lede">
        The DIYA library is code you install. It doesn’t collect anything or call home. This site keeps personal details
        in two places only: the waitlist for Relight, part of DIYA Pro, and the screen requests people send from the
        Screens gallery. This page says exactly what those are.
      </p>
      <nav aria-label="On this page">
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.id}>{link(`#${section.id}`, section.label)}</li>
          ))}
        </ul>
      </nav>

      <h2 id="what">What we keep</h2>
      <p>When you join the waitlist for Relight, part of DIYA Pro, we keep:</p>
      <ul>
        <li>Your email address.</li>
        <li>
          Your answer to “What would you rebuild first?”, if you gave one, and the few words you typed if you chose
          “Something else”.
        </li>
        <li>Which form you used: the home page or the catalog.</li>
        <li>When you joined, when we last emailed you, when you confirmed, and when you left, if you did.</li>
        <li>Whether you were one of the first 200 people to confirm.</li>
        <li>Which version of this page was current when you last signed up.</li>
        <li>
          Scrambled, one-way versions of the confirm and “Leave the list” links we email you, so the links work without
          us keeping the links themselves.
        </li>
      </ul>
      <p>
        To stop people flooding the form, we also count recent attempts. Each count is filed under a keyed one-way
        scramble of the IP address or the email address used, and one shared count covers every email we send. The form
        also carries a short signed code tied to a scrambled IP address, to tell people from bots; we don’t store it. We
        never store your IP address itself.
      </p>
      <p>
        Joining is up to you; no law or contract requires it. We need your email address to put you on the list, so
        without it you simply aren’t on it. The question is optional.
      </p>

      <h2 id="why">Why we keep it</h2>
      <ul>
        <li>
          <strong>To run the list you asked to join:</strong> to confirm the address is yours, to welcome you once you do,
          to tell you when Relight is ready, and to honor the founding offer for the first 200. Your answer to the question helps decide what Relight
          learns first. We rely on your consent for this (GDPR Article 6(1)(a)), given when you join and confirmed with
          the link in our first email.
        </li>
        <li>
          <strong>To keep the form free of abuse:</strong> the attempt counts, and the request logs our host keeps. We rely
          on our legitimate interest in keeping the site working and free of spam (Article 6(1)(f)).
        </li>
        <li>
          <strong>To keep you off the list once you leave:</strong> a short record that you left, so nothing we send can
          reach you by mistake. That’s our legitimate interest, and yours.
        </li>
      </ul>
      <p>
        That’s all. We don’t sell your email, rent it, share it with anyone except the services below, or use it for
        advertising. We don’t profile you or make automated decisions about you. The one automatic step is founding
        status, which goes to the first 200 people to confirm, in the order they confirm.
      </p>

      <h2 id="how-long">How long we keep it</h2>
      <ul>
        <li>
          <strong>While you’re on the list:</strong> until you leave, or until we close the Relight list, when we delete the
          whole list.
        </li>
        <li>
          <strong>If you never confirm:</strong> we delete the address 30 days after the last confirmation email we sent
          it. That clean-up runs whenever someone uses the form or a confirm link, so on a quiet day it can happen a little
          later. Entering the same address again restarts the 30 days only when we actually send a new email, which is at
          most once a day. Confirm links stop working after 7 days.
        </li>
        <li>
          <strong>If you leave,</strong> confirmed or not, we delete your answer to the question and keep only your
          address, which form you used, the dates and whether you were founding. Ask and we’ll delete that too.
        </li>
        <li>
          <strong>Attempt counts</strong> are deleted after two days, the next time anyone uses the form.
        </li>
      </ul>

      <h2 id="who-helps">Who helps us</h2>
      <ul>
        <li>
          <strong>Vercel</strong> hosts this site and counts its visits. Like any web host, it sees your IP address and
          browser details when you load a page and keeps short-lived request logs.
        </li>
        <li>
          <strong>Neon</strong> runs the database that holds the waitlist and screen requests.
        </li>
        <li>
          <strong>Postmark</strong> sends our emails, including the one that brings each screen request to us. It keeps a
          copy of each message, your address included, for 45 days, and keeps addresses that bounce or report us as spam
          on a do-not-send list.
        </li>
        <li>
          <strong>Microsoft 365</strong> holds our email, including the copy of each screen request that comes to us. It
          also holds our copies of the waitlist emails, described under Our emails.
        </li>
      </ul>
      <p>
        Each one handles your details only to provide its service to us. We’re based in the United States, and these
        services store and process your details in the US and the other countries where they run. Each service’s data-processing terms say how it
        protects personal data, including data from the EU and UK: {link('https://vercel.com/legal/dpa', 'Vercel')},{' '}
        {link('https://neon.com/dpa', 'Neon')}, {link('https://postmarkapp.com/dpa', 'Postmark')} and{' '}
        {link('https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA', 'Microsoft')}.
      </p>

      <h2 id="screen-requests">Screen requests</h2>
      <p>When you send a request from “Don’t see your screen?” in the Screens gallery, we keep:</p>
      <ul>
        <li>What you wrote, and the picture if you added one.</li>
        <li>Your email address.</li>
        <li>Which screen’s page you came from, if you followed a “Want this one?” link.</li>
        <li>Whether you ticked “Also tell me when it’s ready”, and which version of this page was current then.</li>
        <li>When you sent it, and when we replied.</li>
        <li>
          A keyed one-way scramble of your IP address, so one place can’t send too many requests. Never the IP address
          itself. The form uses the same attempt counts and signed code as the waitlist, described above.
        </li>
      </ul>
      <p>
        Your browser shrinks the picture before it’s sent, which also leaves behind anything else the file carried, such
        as where a photo was taken. Requests are private: nothing you send is shown on this site, and no page or link
        serves your picture. Each request comes to us as one email, picture attached, so we can reply. Nothing is sent to
        you when you send it.
      </p>
      <ul>
        <li>
          <strong>Why:</strong> to reply about your request, which needs your email address. That rests on our
          legitimate interest in answering what you asked (Article 6(1)(f)). If you tick “Also tell me when it’s ready”,
          we’ll also send one email when that screen is ready. That rests on your consent (Article 6(1)(a)), it’s
          separate from the reply, and you can take it back any time by writing to us.
        </li>
        <li>
          <strong>For how long:</strong> we delete the request, its picture and the email that brought it 90 days after
          we reply, or 365 days after you sent it if we never do. If we close a request, as we would spam, it goes at
          the next clean-up. The clean-up runs whenever someone sends a request, so on a quiet day it can happen a little
          later. If you ticked “Also tell me when it’s ready”, we keep only your email address, which screen it was, the
          version of this page you agreed to and the dates, until that screen ships or 2 years after your request,
          whichever comes first. Your words and your picture still go on the schedule above.
        </li>
        <li>
          <strong>Who helps:</strong> Vercel receives the request, Neon stores it, Postmark carries it to us and
          Microsoft 365 holds that email, as described above.
        </li>
        <li>
          <strong>To delete it sooner,</strong> write to {contact} from the address you used, and we’ll delete it.
        </li>
      </ul>

      <h2 id="rights">Your rights</h2>
      <p>Wherever you live, you can ask us to:</p>
      <ul>
        <li>show you what we hold about you, and give you a copy you can take elsewhere;</li>
        <li>fix anything that’s wrong;</li>
        <li>delete it;</li>
        <li>pause using it while a question about it is sorted out.</li>
      </ul>
      <p>
        <strong>You can object</strong> to the parts that rest on our legitimate interests, and we’ll stop unless we have
        a strong reason that outweighs yours, such as keeping the form free of abuse.
      </p>
      <p>
        <strong>You can withdraw your consent at any time</strong> with the “Leave the list” link at the bottom of any
        email: it opens a page with one button. Leaving doesn’t undo what we did before you left.
      </p>
      <p>
        To ask for any of these, reply to any of our emails or write to {contact}. It’s free. We’ll answer within 30
        days, usually much sooner, and may ask you to write from the address in question so we know it’s yours.
      </p>
      <p>
        If you’re in the EU or the UK and think we’ve handled your details badly, you can complain to a data protection
        authority: in the UK, the {link('https://ico.org.uk/make-a-complaint/', 'Information Commissioner’s Office')}; in
        the EU, the one where you live or work ({link('https://www.edpb.europa.eu/about-edpb/about-edpb/members_en', 'see the list')}).
        We’d be glad to hear from you first, but you don’t have to.
      </p>

      <h2 id="emails">Our emails</h2>
      <p>
        No tracking pixels and no link tracking. We switch off open and click tracking on every message, so we can’t
        tell whether you opened an email or what you clicked, and every link goes straight where it says. Every message
        has a one-click way off the list. Apart from the one welcome after you confirm, we send any address at most one
        email a day. If a message fails to send,
        our logs record the error, never your address.
      </p>
      <p>
        So we can see what went out, a copy of each one comes to our own inbox, with your address masked (like{' '}
        <code>m•••@example.com</code>) and links that can’t confirm or remove anyone.
      </p>

      <h2 id="this-site">On this site</h2>
      <p>
        We count visits with Vercel Web Analytics: no cookies, nothing that follows you to other sites, and we only see
        totals, like which pages were read and where visitors came from. No ad trackers, no third-party cookies. Your
        browser keeps a few small things for you:
      </p>
      <ul>
        <li>
          Two cookies, <code>diya-theme</code> and <code>diya-glass</code>, that remember your appearance settings for a
          year.
        </li>
        <li>
          In local storage, <code>diya:package-manager</code> for the install command you prefer,{' '}
          <code>diya:setup-copied</code> so Get code folds the setup steps you’ve already copied, and{' '}
          <code>diya-customize-v2</code> for any theme you build in the catalog.
        </li>
        <li>
          If you join the waitlist, <code>diya:waitlist</code> in local storage: a masked address like{' '}
          <code>m•••@example.com</code>, your answer to the question, when you joined, whether you’ve confirmed and are
          founding, and a short one-way fingerprint of the address (16 characters of a SHA-256 hash), so this browser can
          tell you’re already on the list if you enter the same address again.
        </li>
        <li>
          In session storage, for this tab only, <code>diya:launch-watched</code> if you watched the launch countdown
          reach zero.
        </li>
      </ul>
      <p>None of these leave your browser. Clearing this site’s data removes them.</p>
      <p>
        If you connect your editor to DIYA’s MCP server, we count the words it searches for, such as “date range picker”,
        to learn what to build next: only those words, the day, whether DIYA had an answer and how many times they were
        asked, kept for a year. No IP address, no account, nothing that says who asked.
      </p>

      <h2 id="children">Children</h2>
      <p>
        The waitlist and screen requests aren’t meant for anyone under 16. If you’re under 16, please don’t join or send
        a request. If we learn that someone under 16 has, we’ll delete their details.
      </p>

      <h2 id="contact">How to reach us</h2>
      <p>
        DIYA is made by {SENDER_ORG}, based in California. We decide how your details are used, which makes us the
        “controller” in data protection terms. Write to {contact} about anything on this page; Vishal Mehta reads every
        message.
      </p>

      <h2 id="changes">Changes</h2>
      <p>
        If this page changes in a way that matters, we’ll update the date at the top and, if you’re on the list, tell you
        before it takes effect.
      </p>
    </WaitlistPage>
  )
}
