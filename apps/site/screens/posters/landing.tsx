'use client'
// SaaS landing page: a poster for a DIYA screen that waits on marketing sections. Thumbnail only; never offered as code.
import { Avatar, Button, SiteHeader, Tag } from '@idyeah/diya'
import { ArrowRight, CornerUpLeft, Inbox, LucideProvider, Moon, Paperclip, Search, Smile, Sparkles } from 'lucide-react'

const PRODUCT = 'Transom'
const NAV = [
  { value: 'product', label: 'Product', href: '#product' },
  { value: 'customers', label: 'Customers', href: '#customers' },
  { value: 'pricing', label: 'Pricing', href: '#pricing' },
  { value: 'changelog', label: 'Changelog', href: '#changelog' },
]

const CONVERSATIONS = [
  { name: 'Imani Brooks', subject: 'Charged twice for the annual plan', preview: 'Hi! I upgraded on Monday and see two charges…', time: '9:41', unread: true, current: true },
  { name: 'Tomás Herrera', subject: 'Export to CSV stops at 10,000 rows', preview: 'Is there a way to get the whole year out?', time: '9:12', unread: true },
  { name: 'Wen Zhao', subject: 'Adding a second workspace', preview: 'We’re opening an office in Lisbon and…', time: '8:57' },
  { name: 'Aaliyah Grant', subject: 'Thank you!', preview: 'That fixed it. You all are the best.', time: 'Yesterday' },
  { name: 'Rohan Mehta', subject: 'SSO with our identity provider', preview: 'Our IT team asked whether you support…', time: 'Yesterday' },
]

// Invented customers, drawn as monograms. Never real logos.
const CUSTOMERS = [
  { name: 'Fernhill', mark: 'circle' },
  { name: 'Oakmoor', mark: 'square' },
  { name: 'Bramble & Co.', mark: 'pair' },
  { name: 'Northgate', mark: 'diamond' },
  { name: 'Juniper Health', mark: 'arch' },
  { name: 'Cobalt Mile', mark: 'ring' },
]

const FEATURES = [
  {
    icon: <Inbox />,
    title: 'Every channel, one inbox',
    text: 'Email, chat and messages from inside your app land in one list, threaded by customer instead of by channel.',
  },
  {
    icon: <Sparkles />,
    title: 'Drafts that sound like you',
    text: 'Transom learns from your best replies and drafts the routine ones. You read, adjust a word or two, and send.',
  },
  {
    icon: <Moon />,
    title: 'Quiet hours, kept',
    text: 'Routing respects time zones and days off, so nobody gets paged at dinner over a password reset.',
  },
]

const FOOTER = [
  { title: 'Product', links: ['Inbox', 'Drafts', 'Routing', 'Pricing'] },
  { title: 'Company', links: ['About', 'Customers', 'Careers', 'Press'] },
  { title: 'Resources', links: ['Help center', 'Changelog', 'Status', 'Privacy'] },
]

export default function LandingPoster() {
  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <style>{css}</style>
      <div className="landing-poster">
        <SiteHeader
          className="landing-poster-header"
          brand={<Brand />}
          brandHref="#top"
          items={NAV}
          utilities={
            <>
              <Button variant="quiet" href="#sign-in">Sign in</Button>
              <Button variant="outline" href="#start">Start free</Button>
            </>
          }
        />

        <main>
          <section className="landing-poster-hero" aria-labelledby="landing-poster-title">
            <a className="landing-poster-eyebrow" href="#changelog">
              New: replies in 40 languages <ArrowRight />
            </a>
            <h1 id="landing-poster-title" className="landing-poster-title">Support, minus the noise.</h1>
            <p className="landing-poster-lede">
              {PRODUCT} gathers email, chat and in-app messages into one calm inbox, drafts the routine replies, and
              leaves the human ones to you.
            </p>
            <Button size="large" href="#start" className="landing-poster-cta">
              Start free <ArrowRight />
            </Button>
            <p className="landing-poster-fine">Free for teams of three. No card needed.</p>
          </section>

          <div className="landing-poster-shot" inert>
            <div className="landing-poster-window">
              <div className="landing-poster-chrome">
                <span className="landing-poster-dots"><i /><i /><i /></span>
                <span className="landing-poster-find"><Search /> Search conversations</span>
                <span className="landing-poster-team">
                  <Avatar name="Dara Okonkwo" size="small" status="online" />
                </span>
              </div>
              <div className="landing-poster-panes">
                <div className="landing-poster-list">
                  <p className="landing-poster-list-head">Inbox <span>12 open</span></p>
                  {CONVERSATIONS.map((item) => (
                    <div key={item.name} className="landing-poster-row" data-current={item.current || undefined}>
                      <Avatar name={item.name} size="small" />
                      <div className="landing-poster-row-text">
                        <p className="landing-poster-row-top">
                          <b data-unread={item.unread || undefined}>{item.name}</b>
                          <span>{item.time}</span>
                        </p>
                        <p className="landing-poster-row-subject">{item.subject}</p>
                        <p className="landing-poster-row-preview">{item.preview}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="landing-poster-thread">
                  <div className="landing-poster-thread-head">
                    <p className="landing-poster-thread-title">Charged twice for the annual plan</p>
                    <span className="landing-poster-thread-tags">
                      <Tag size="small">Billing</Tag>
                      <Tag size="small" tone="warning" leading="dot">Waiting on you</Tag>
                    </span>
                  </div>
                  <div className="landing-poster-message">
                    <Avatar name="Imani Brooks" size="small" />
                    <div>
                      <p className="landing-poster-message-meta"><b>Imani Brooks</b> · imani@example.com · 9:41 AM</p>
                      <p>
                        Hi! I upgraded to the annual plan on Monday and I see two charges of $480 on my card. Could you
                        refund one of them? Thanks so much.
                      </p>
                    </div>
                  </div>
                  <div className="landing-poster-draft">
                    <p className="landing-poster-draft-label"><Sparkles /> Suggested reply · follows your refund policy</p>
                    <p>
                      Hi Imani, sorry about that. The second charge was a duplicate, and I’ve refunded it just now. You’ll
                      see $480 back on your card in 3 to 5 business days.
                    </p>
                    <div className="landing-poster-draft-actions">
                      <Button size="small"><CornerUpLeft /> Send reply</Button>
                      <Button size="small" variant="quiet">Edit</Button>
                    </div>
                  </div>
                  <div className="landing-poster-composer">
                    <span>Reply to Imani, or type / for a saved reply</span>
                    <span className="landing-poster-composer-tools"><Paperclip /><Smile /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="landing-poster-logos" aria-labelledby="landing-poster-logos">
            <h2 id="landing-poster-logos" className="landing-poster-logos-title">2,400 support teams answer with {PRODUCT}</h2>
            <ul className="landing-poster-marks">
              {CUSTOMERS.map((customer) => (
                <li key={customer.name} className="landing-poster-mark" data-mark={customer.mark}>
                  <i aria-hidden="true" />
                  {customer.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-poster-features" aria-labelledby="landing-poster-features">
            <h2 id="landing-poster-features" className="landing-poster-section-title">Fewer tabs. Faster answers.</h2>
            <p className="landing-poster-section-lede">Everything a support team needs, in the order they need it.</p>
            <ul className="landing-poster-grid">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="landing-poster-feature">
                  <span className="landing-poster-icon" aria-hidden="true">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="landing-poster-footer">
          <div className="landing-poster-footer-brand">
            <Brand />
            <p>The calm inbox for support teams.</p>
          </div>
          {FOOTER.map((column) => (
            <nav key={column.title} aria-label={column.title} className="landing-poster-footer-column">
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link}><a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a></li>
                ))}
              </ul>
            </nav>
          ))}
          <p className="landing-poster-legal">© 2026 {PRODUCT}, Inc. Made for the people who answer.</p>
        </footer>
      </div>
    </LucideProvider>
  )
}

function Brand() {
  return (
    <span className="landing-poster-brand">
      <span className="landing-poster-logo" aria-hidden="true" />
      {PRODUCT}
    </span>
  )
}

const css = `
.landing-poster { min-height: 100dvh; color: var(--diya-color-text); background: var(--diya-color-surface); }
[data-glass='true'] .landing-poster { background: transparent; }
.landing-poster p { margin: 0; }
.landing-poster-header { position: sticky; top: 0; z-index: 2; }
.landing-poster-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.02em; }
.landing-poster-logo {
  width: 22px;
  height: 22px;
  border-radius: 7px 7px 3px 3px;
  background:
    linear-gradient(var(--diya-color-accent), var(--diya-color-accent)) center 7px / 100% 2px no-repeat,
    linear-gradient(var(--diya-color-accent), var(--diya-color-accent)) center / 2px 100% no-repeat;
  box-shadow: inset 0 0 0 2px var(--diya-color-accent);
}

.landing-poster-hero {
  display: grid;
  justify-items: center;
  padding: clamp(56px, 9vh, 96px) var(--diya-space-5) var(--diya-space-7);
  text-align: center;
}
.landing-poster-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--diya-space-5);
  padding: 6px 14px;
  border: 1px solid var(--diya-color-line);
  border-radius: 999px;
  font-size: var(--diya-text-caption);
  font-weight: 500;
  color: inherit;
  text-decoration: none;
}
.landing-poster-eyebrow svg { width: 15px; height: 15px; color: var(--diya-color-muted); }
.landing-poster-title {
  margin: 0;
  font-size: clamp(48px, 6.2vw, 88px);
  font-weight: 650;
  line-height: 0.98;
  letter-spacing: -0.048em;
  text-wrap: balance;
}
.landing-poster-lede {
  max-width: 600px;
  margin-top: var(--diya-space-5) !important;
  color: var(--diya-color-muted);
  font-size: clamp(var(--diya-text-large), 1.6vw, 22px);
  line-height: 1.45;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.landing-poster-cta { margin-top: var(--diya-space-6); }
.landing-poster-fine { margin-top: var(--diya-space-3) !important; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }

.landing-poster-shot {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(24px, 4.4vw, 64px) clamp(16px, 4.4vw, 64px) 0;
  overflow: hidden;
  border-radius: calc(28px * var(--diya-corner-scale, 1));
  background:
    radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--diya-color-surface) 55%, transparent), transparent 75%),
    linear-gradient(180deg, color-mix(in srgb, var(--diya-color-text) 14%, var(--diya-color-surface)), color-mix(in srgb, var(--diya-color-text) 30%, var(--diya-color-surface)));
}
.landing-poster-shot::before,
.landing-poster-shot::after {
  content: '';
  position: absolute;
  bottom: -12%;
  width: 24%;
  height: 92%;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--diya-color-surface) 92%, transparent), color-mix(in srgb, var(--diya-color-surface) 30%, transparent));
}
.landing-poster-shot::before { left: 3%; }
.landing-poster-shot::after { right: 3%; height: 74%; }
.landing-poster-window {
  position: relative;
  z-index: 1;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--diya-color-raised) 60%, var(--diya-color-line));
  border-bottom: 0;
  border-radius: calc(16px * var(--diya-corner-scale, 1)) calc(16px * var(--diya-corner-scale, 1)) 0 0;
  background: color-mix(in srgb, var(--diya-color-raised) 74%, transparent);
  backdrop-filter: blur(28px) saturate(1.2);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--diya-color-raised) 80%, transparent), 0 30px 70px -30px color-mix(in srgb, black 45%, transparent);
  font-size: var(--diya-text-body);
}
.landing-poster-chrome {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--diya-space-4);
  padding: var(--diya-space-3) var(--diya-space-4);
  border-bottom: 1px solid var(--diya-color-line);
}
.landing-poster-dots { display: flex; gap: 7px; }
.landing-poster-dots i { width: 11px; height: 11px; border-radius: 50%; background: color-mix(in srgb, var(--diya-color-text) 18%, transparent); }
.landing-poster-find {
  display: inline-flex;
  align-items: center;
  gap: var(--diya-space-2);
  width: min(360px, 40vw);
  height: 32px;
  padding-inline: var(--diya-space-3);
  border-radius: var(--diya-radius-control);
  background: color-mix(in srgb, var(--diya-color-text) 6%, transparent);
  color: var(--diya-color-muted);
  font-size: var(--diya-text-caption);
}
.landing-poster-find svg { width: 15px; height: 15px; }
.landing-poster-team { display: flex; justify-content: flex-end; }
.landing-poster-panes { display: grid; grid-template-columns: 340px minmax(0, 1fr); min-height: 520px; text-align: left; }
.landing-poster-list { padding: var(--diya-space-3); border-right: 1px solid var(--diya-color-line); }
.landing-poster-list-head { display: flex; justify-content: space-between; align-items: baseline; padding: var(--diya-space-2) var(--diya-space-3) var(--diya-space-3); font-size: var(--diya-text-large); font-weight: 650; letter-spacing: -0.015em; }
.landing-poster-list-head span { color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 400; letter-spacing: 0; }
.landing-poster-row { display: flex; gap: var(--diya-space-3); padding: var(--diya-space-3); border-radius: calc(10px * var(--diya-corner-scale, 1)); }
.landing-poster-row[data-current] { background: var(--diya-color-selected); }
.landing-poster-row-text { display: grid; gap: 2px; min-width: 0; flex: 1; }
.landing-poster-row-text p { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.landing-poster-row-top { display: flex; justify-content: space-between; gap: var(--diya-space-2); }
.landing-poster-row-top b { font-weight: 500; }
.landing-poster-row-top b[data-unread]::after { content: ''; display: inline-block; width: 7px; height: 7px; margin-left: 8px; vertical-align: 2px; border-radius: 50%; background: var(--diya-color-accent); }
.landing-poster-row-top b[data-unread] { font-weight: 650; }
.landing-poster-row-top span,
.landing-poster-row-preview { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.landing-poster-row-subject { font-size: var(--diya-text-caption); }

.landing-poster-thread { display: grid; grid-template-rows: auto auto auto 1fr; gap: var(--diya-space-5); padding: var(--diya-space-5) var(--diya-space-6); }
.landing-poster-composer {
  align-self: end;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--diya-space-3);
  min-height: 52px;
  padding: 0 var(--diya-space-4);
  border: 1px solid var(--diya-color-line);
  border-radius: calc(14px * var(--diya-corner-scale, 1));
  color: var(--diya-color-muted);
  font-size: var(--diya-text-caption);
}
.landing-poster-composer-tools { display: flex; gap: var(--diya-space-3); }
.landing-poster-thread-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); padding-bottom: var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line); }
.landing-poster-thread-title { font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.015em; }
.landing-poster-thread-tags { display: flex; gap: var(--diya-space-2); }
.landing-poster-message { display: flex; gap: var(--diya-space-3); max-width: 620px; line-height: 1.55; }
.landing-poster-message-meta { margin-bottom: var(--diya-space-1) !important; color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.landing-poster-message-meta b { color: var(--diya-color-text); font-weight: 600; }
.landing-poster-draft {
  display: grid;
  gap: var(--diya-space-3);
  max-width: 620px;
  margin-left: 44px;
  padding: var(--diya-space-4) var(--diya-space-5);
  border: 1px solid var(--diya-color-line);
  border-radius: calc(14px * var(--diya-corner-scale, 1));
  background: color-mix(in srgb, var(--diya-color-surface) 70%, transparent);
  line-height: 1.55;
}
.landing-poster-draft-label { display: flex; align-items: center; gap: var(--diya-space-2); color: var(--diya-color-muted); font-size: var(--diya-text-caption); font-weight: 500; }
.landing-poster-draft-label svg { width: 16px; height: 16px; }
.landing-poster-draft-actions { display: flex; gap: var(--diya-space-2); }

.landing-poster-logos { display: grid; justify-items: center; gap: var(--diya-space-6); padding: var(--diya-space-8) var(--diya-space-5) var(--diya-space-7); }
.landing-poster-logos-title { margin: 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); font-weight: 500; }
.landing-poster-marks { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--diya-space-6) clamp(32px, 5vw, 64px); margin: 0; padding: 0; list-style: none; }
.landing-poster-mark { display: inline-flex; align-items: center; gap: 9px; color: var(--diya-color-muted); font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; }
.landing-poster-mark i { width: 20px; height: 20px; background: currentColor; }
.landing-poster-mark[data-mark='circle'] i { border-radius: 50%; }
.landing-poster-mark[data-mark='square'] { font-stretch: 112%; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; font-size: var(--diya-text-large); }
.landing-poster-mark[data-mark='square'] i { border-radius: 5px; }
.landing-poster-mark[data-mark='pair'] { font-weight: 450; font-style: italic; letter-spacing: -0.01em; }
.landing-poster-mark[data-mark='pair'] i { width: 26px; border-radius: 0; background: radial-gradient(circle at 7px 50%, currentColor 6.5px, transparent 7px), radial-gradient(circle at 19px 50%, currentColor 6.5px, transparent 7px); }
.landing-poster-mark[data-mark='diamond'] { font-stretch: 85%; font-weight: 700; letter-spacing: 0.01em; }
.landing-poster-mark[data-mark='diamond'] i { width: 15px; height: 15px; transform: rotate(45deg); border-radius: 2px; }
.landing-poster-mark[data-mark='arch'] { font-weight: 500; letter-spacing: -0.03em; }
.landing-poster-mark[data-mark='arch'] i { border-radius: 999px 999px 0 0; }
.landing-poster-mark[data-mark='ring'] { font-stretch: 120%; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; font-size: var(--diya-text-body); }
.landing-poster-mark[data-mark='ring'] i { border-radius: 50%; background: none; box-shadow: inset 0 0 0 4px currentColor; }

.landing-poster-features { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: var(--diya-space-8) 0; border-top: 1px solid var(--diya-color-line); }
.landing-poster-section-title { max-width: 16ch; margin: 0; font-size: clamp(34px, 4.4vw, 56px); font-weight: 650; line-height: 1.04; letter-spacing: -0.04em; }
.landing-poster-section-lede { max-width: 600px; text-wrap: balance; margin-top: var(--diya-space-4) !important; color: var(--diya-color-muted); font-size: var(--diya-text-title); line-height: 1.45; letter-spacing: -0.01em; }
.landing-poster-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--diya-space-7); margin: var(--diya-space-8) 0 0; padding: 0; list-style: none; }
.landing-poster-feature { display: grid; align-content: start; gap: var(--diya-space-3); }
.landing-poster-feature h3 { margin: var(--diya-space-2) 0 0; font-size: var(--diya-text-title); font-weight: 600; letter-spacing: -0.015em; }
.landing-poster-feature p { color: var(--diya-color-muted); font-size: var(--diya-text-large); line-height: 1.5; }
.landing-poster-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--diya-color-line);
  border-radius: calc(12px * var(--diya-corner-scale, 1));
  background: var(--diya-color-raised);
}
.landing-poster-icon svg { width: 22px; height: 22px; }

.landing-poster-footer {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: var(--diya-space-6);
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: var(--diya-space-7) 0 var(--diya-space-6);
  border-top: 1px solid var(--diya-color-line);
  font-size: var(--diya-text-caption);
}
.landing-poster-footer-brand { display: grid; align-content: start; gap: var(--diya-space-3); }
.landing-poster-footer-brand p,
.landing-poster-legal { color: var(--diya-color-muted); }
.landing-poster-footer-column h2 { margin: 0 0 var(--diya-space-3); font-size: var(--diya-text-caption); font-weight: 600; }
.landing-poster-footer-column ul { display: grid; gap: var(--diya-space-2); margin: 0; padding: 0; list-style: none; }
.landing-poster-footer-column a { color: var(--diya-color-muted); text-decoration: none; }
.landing-poster-legal { grid-column: 1 / -1; padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); }

@media (max-width: 900px) {
  .landing-poster-panes { grid-template-columns: minmax(0, 1fr); min-height: 420px; }
  .landing-poster-thread { display: none; }
  .landing-poster-list { border-right: 0; }
  .landing-poster-grid { grid-template-columns: minmax(0, 1fr); gap: var(--diya-space-6); }
  .landing-poster-footer { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .landing-poster-footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 520px) {
  .landing-poster-hero { padding-top: var(--diya-space-7); }
  .landing-poster-shot { margin-inline: var(--diya-space-4); }
  .landing-poster-chrome { grid-template-columns: auto 1fr; }
  .landing-poster-find { width: auto; }
  .landing-poster-team { display: none; }
  .landing-poster-marks { gap: var(--diya-space-5) var(--diya-space-6); }
  .landing-poster-features { padding-block: var(--diya-space-7); }
  .landing-poster-footer { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`
