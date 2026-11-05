import Image from 'next/image'
import Link from 'next/link'
import { GITHUB_URL, GitHubIcon } from '../site/links'
import { SiteFooter } from '../site/SiteFooter'
import { NapkinSketch } from '../community/NapkinSketch'
import { ORIEL_SCREENS } from '../oriel/links'
import {
  CreateChip,
  GlassCards,
  InstallLine,
  LaunchMoment,
  PartsSheet,
  ProScreen,
  ProWaitlist,
  SiteHeader,
  SiteProvider,
} from './islands'
import { LandingStyles } from './LandingStyles'
import { OrielBand } from './OrielBand'
import { screens, thumbnailSrc } from '../screens/screens-data'
import { LAUNCH_PENDING_SCRIPT } from './launch-signal'

// The screens the landing shows, in gallery order; the count follows the registry.
const readyScreens = screens.filter((screen) => screen.status === 'ready')
const FEATURED = ['dashboard', 'pricing', 'listing']
const featuredScreens = readyScreens.filter((screen) => FEATURED.includes(screen.id))

const patterns = [
  ['page-header', 'Page Header'],
  ['site-header', 'Site Header'],
  ['side-navigation', 'Side Navigation'],
  ['card', 'Card'],
  ['table', 'Table'],
  ['data-viz', 'Data Viz'],
  ['form', 'Form'],
  ['wizard', 'Wizard'],
  ['file-upload', 'File Upload'],
  ['chatbot', 'Chatbot'],
  ['dialog', 'Dialog'],
  ['drawer', 'Drawer'],
  ['empty-state', 'Content State'],
] as const

const specs = [
  ['Light and Dark.', <>One prop: <code>theme</code>. Dark is designed, not inverted.</>],
  [
    'Your brand.',
    <>
      <code>brandColor</code> and <code>fontFamily</code> on the provider. Want more? Build a theme in the library and
      take home one CSS file.
    </>,
  ],
  [
    'Your language.',
    <>
      Every built-in string, from “Previous” to screen-reader text, through <code>messages</code> and <code>locale</code>.
    </>,
  ],
  ['DIYA Sans.', <>Our typeface ships with the styles, so there’s no font to fetch from anywhere else.</>],
] as const

/** The home page from the launch moment on. Server-rendered; only the
    interactive islands (header, chip, plates, sheet, waitlist) are client code. */
export function LaunchedLanding() {
  return (
    <SiteProvider className="site-landing-root">
      {/* Before first paint: veil the page if this load is the watched launch (see LaunchMoment). */}
      <script dangerouslySetInnerHTML={{ __html: LAUNCH_PENDING_SCRIPT }} />
      <LandingStyles />
      <SiteHeader heroId="hero" />
      <main id="content" className="site-landing" tabIndex={-1}>
        <section id="hero" className="ld-hero" aria-labelledby="hero-title">
          <Backdrop priority position="62% 40%" />
          <div className="ld-hero-grid">
            <div className="ld-hero-copy">
              <div className="ld-launch-slot" data-launch-line-slot="" />
              <h1 id="hero-title">A library for your next app.</h1>
              <p className="ld-lede">
                <b>30 components, 13 patterns and {readyScreens.length} screens for React.</b> Free, MIT, yours to own.
              </p>
              <div className="ld-actions">
                <CreateChip />
                <Link className="diya-button ld-explore" data-variant="solid" data-size="medium" data-shape="pill" href="/explore?area=components">
                  Explore the library
                </Link>
              </div>
              <ul className="ld-meta">
                <li>
                  <a href={GITHUB_URL}>
                    <GitHubIcon size={15} />
                    Source on GitHub
                  </a>
                </li>
                <li>MIT license</li>
                <li>React 18.3 and 19</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="ld-section" aria-labelledby="package-title">
          <div className="ld-wrap">
            <div className="ld-section-head">
              <h2 id="package-title">What’s in the package</h2>
              <p>One install. Nothing held back for later.</p>
              <InstallLine />
            </div>
            <PartsSheet />
            <div className="ld-patterns">
              <div className="ld-sub-head">
                <div>
                  <h3>13 patterns.</h3>
                  <p>Tables, forms, wizards, charts, a chatbot: the bigger pieces, already put together.</p>
                </div>
              </div>
              <ol className="ld-index">
                {patterns.map(([id, name]) => (
                  <li key={id}>
                    <Link href={`/explore?area=patterns&pattern=${id}`}>
                      <span>{name}</span>
                      <span className="ld-index-go" aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ld-patterns ld-screens">
              <div className="ld-sub-head">
                <div>
                  <h3>{readyScreens.length} screens.</h3>
                  <p>Whole pages, ready to paste: one file each, with sample data and every state already working.</p>
                </div>
                <Link className="ld-screens-all" href="/explore?area=screens">
                  All {readyScreens.length} screens
                  <span className="ld-index-go" aria-hidden="true">→</span>
                </Link>
              </div>
              <ul className="ld-screens-list">
                {featuredScreens.map(({ id, name }) => (
                  <li key={id}>
                    <Link href={`/explore?area=screens&screen=${id}`}>
                      <span className="ld-screens-picture">
                        {(['light', 'dark'] as const).map((theme) => (
                          // Decorative: the screen's name follows. html[data-theme] shows one.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={theme} src={thumbnailSrc(id, theme)} data-theme-image={theme} alt="" width={896} height={560} loading="lazy" decoding="async" />
                        ))}
                      </span>
                      <span className="ld-screens-name">
                        {name}
                        <span className="ld-index-go" aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="ld-specs">
              {specs.map(([title, body]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="ld-glass" aria-labelledby="glass-title">
          <Backdrop position="30% 70%" />
          <div className="ld-wrap ld-glass-grid">
            <div>
              <h2 id="glass-title">
                Glass is one prop: <code>glass</code>
              </h2>
              <p>
                Same component, same code. Add the prop and every surface turns to frosted glass over whatever sits
                behind it. Free, like the rest.
              </p>
            </div>
            <GlassCards />
          </div>
        </section>

        <OrielBand />

        <section id="pro" className="ld-pro" aria-labelledby="pro-title">
          <div className="ld-wrap">
            <div className="ld-pro-head">
              <div>
                <p className="site-relight">
                  <span className="site-relight-name">Relight</span>
                  <span className="sr-only">,</span> <span className="site-soon">Coming to DIYA Pro</span>
                </p>
                <h2 id="pro-title">From a sketch to a screen you own.</h2>
              </div>
              <div className="ld-pro-body">
                <p>
                  <b>Any picture of a screen.</b> A screenshot, a wireframe, a whiteboard photo, a napkin sketch.
                </p>
                <p>
                  <b>Any kind of app.</b> Dashboards, settings, sign-up flows, landing pages, admin tools. Answer a
                  few questions and get working DIYA code back.
                </p>
                <p>It’s the one paid part of DIYA, and it isn’t ready yet.</p>
              </div>
            </div>
            <ProStages />
            <div className="ld-join" data-waitlist-block="">
              <div className="ld-join-lead">
                <h3>Get on the list</h3>
                <p>No date yet. Join, and you’ll hear the moment Relight opens.</p>
              </div>
              <ProWaitlist source="landing" />
            </div>
          </div>
        </section>

        <section className="ld-promise" aria-labelledby="promise-title">
          <div className="ld-wrap">
            <h2 id="promise-title">The fine print, in large print.</h2>
            <ol>
              <li>
                <span>The library stays MIT.</span>
              </li>
              <li>
                <span>Pro never gets a component the library lacks.</span>
              </li>
              <li>
                <span>
                  Pro’s code needs nothing from us but <code>@idyeah/diya</code>.
                </span>
              </li>
              <li>
                <span>Library screens stay free and MIT. Relight’s screens are yours.</span>
              </li>
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
      <LaunchMoment />
    </SiteProvider>
  )
}

function Backdrop({ priority = false, position }: { priority?: boolean; position: string }) {
  return (
    <>
      <div className="ld-photo" aria-hidden="true">
        <Image
          src="/images/concept-architecture.png"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          preload={priority}
          style={{ objectPosition: position }}
        />
      </div>
      <div className="ld-wash" aria-hidden="true" />
    </>
  )
}

function ProStages() {
  return (
    <ol className="ld-stages">
      <li>
        <p className="ld-stage-label">
          <span>1</span>Your screenshot or sketch
          <span className="sr-only">: a rough pen sketch of an invoices screen, on a paper napkin.</span>
        </p>
        <div className="ld-shot" data-sketch="napkin" aria-hidden="true">
          <NapkinSketch />
        </div>
      </li>
      <li>
        <p className="ld-stage-label">
          <span>2</span>A few questions
        </p>
        <div className="ld-ask" aria-hidden="true">
          <p className="ld-ask-q">Who opens this screen most?</p>
          <div className="ld-pills">
            <span data-on="">Finance lead</span>
            <span>Customer</span>
            <span>Support</span>
          </div>
          <div className="ld-ask-next">
            <p className="ld-ask-q">What should they do first?</p>
            <div className="ld-pills">
              <span>Pay</span>
              <span>Download</span>
            </div>
          </div>
        </div>
      </li>
      <li>
        <p className="ld-stage-label">
          <span>3</span>Your screen, in DIYA
        </p>
        <ProScreen />
        <p className="ld-made-of">
          Made of <code>SideNavigation</code> · <code>Metric</code> · <code>Table</code> · <code>Tag</code>
        </p>
        <p className="ld-made-of ld-real">
          <a href={ORIEL_SCREENS.invoices.href} target="_blank" rel="noopener">
            This screen is real. Open Oriel <span aria-hidden="true">→</span>
            <span className="sr-only">, in a new tab</span>
          </a>
        </p>
      </li>
    </ol>
  )
}
