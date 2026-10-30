'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Button, Tag } from '@idyeah/diya'
import { useAppearance } from '../../app/Appearance'
import { CatalogBrowser } from '../catalog/CatalogBrowser'
import { useListedScreens } from '../CatalogSearchProvider'
import { Icon } from '../Icon'
import { PreviewSetting } from '../PreviewControls'
import { GetScreenCodeDrawer } from './GetScreenCodeDrawer'
import { ScreenRequest } from './ScreenRequest'
import { ScreenStage, VIEWPORTS, type Device } from './ScreenStage'
import { CATEGORIES, frameHref, screens, thumbnailSrc, type LiveScreen, type PosterScreen, type ScreenEntry } from './screens-data'
import type { BuiltWithItem } from './screen-source'
import '../GalleryStudy.css'
import '../ComponentLibrary.css'
import '../ButtonLibrary.css'
import '../PageHeaderLibrary.css'
import './screens.css'

const GALLERY = '/explore?area=screens'
const screenHref = (id: string) => `/explore?area=screens&screen=${id}`
/** The request section, carrying the poster someone wants: the form starts with its name. */
const requestHref = (id: string) => `/explore?area=screens&want=${id}#request`

/**
 * The Screens area: the gallery (no screen chosen) or one screen's page, in
 * the catalog's own frame: the sidebar, then the document.
 */
export function ScreensLibrary(props: {
  screen: ScreenEntry | null
  source?: string | null
  builtWith?: BuiltWithItem[]
  /** Whether the gallery's request form takes requests (lib/screen-requests/runtime.ts). */
  requestsOpen?: boolean
  /** The poster a "Want this one?" link asked for (`want=` in the address). */
  want?: string | null
}) {
  const { screen } = props
  return (
    <main id="content" className="gallery-study component-library pattern-library screens-library">
      <div className="gallery-study-backdrop" aria-hidden="true" />
      <CatalogBrowser area="screens" current={screen?.id} />
      <div className="component-document">
        {screen ? <ScreenDocument key={screen.id} screen={screen} source={props.source ?? null} builtWith={props.builtWith ?? []} /> : <ScreensGallery requestsOpen={props.requestsOpen ?? false} want={props.want ?? null} />}
      </div>
    </main>
  )
}

function ScreensGallery({ requestsOpen, want }: { requestsOpen: boolean; want: string | null }) {
  const listed = useListedScreens()
  const shown = screens.filter((screen) => listed.has(screen.id))
  return (
    <>
      <header className="screens-intro">
        <h2>Whole pages, ready to paste</h2>
        <p>Each one is a single file built from DIYA, with sample data and its states already working. Paste it into Next.js or Vite and it runs.</p>
      </header>
      {CATEGORIES.map((category, index) => {
        const items = shown.filter((screen) => screen.category === category)
        if (!items.length) return null
        return (
          <section key={category} className="screens-category" aria-labelledby={`screens-category-${index}`}>
            <h3 id={`screens-category-${index}`}>{category}</h3>
            <ul className="screens-grid">
              {items.map((screen) => (
                <li key={screen.id}>
                  <ScreenCard screen={screen} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      <ScreenRequest open={requestsOpen} want={want} />
    </>
  )
}

/** Light and dark thumbnails; html[data-theme] shows one. Decorative: the card's name follows. */
function Thumbnail({ id }: { id: string }) {
  return (
    <>
      {(['light', 'dark'] as const).map((theme) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={theme}
          className="screens-thumb"
          data-theme-image={theme}
          src={thumbnailSrc(id, theme)}
          alt=""
          width={896}
          height={560}
          loading="lazy"
          decoding="async"
        />
      ))}
    </>
  )
}

function ScreenCard({ screen }: { screen: ScreenEntry }) {
  return (
    <article className="screens-card" data-status={screen.status}>
      <div className="screens-card-picture">
        {screen.status === 'building' ? (
          <div className="screens-card-progress">
            <span>In progress</span>
          </div>
        ) : (
          <Thumbnail id={screen.id} />
        )}
        {screen.status === 'poster' && <span className="screens-card-soon">Coming soon</span>}
      </div>
      <div className="screens-card-text">
        <h4>
          <Link className="screens-card-link" href={screenHref(screen.id)}>
            {screen.name}
          </Link>
        </h4>
        <p>{screen.description}</p>
        {screen.status === 'poster' && (
          <p className="screens-card-waiting">
            Waiting on {screen.waitingOn}.{' '}
            <Link className="screens-card-want" href={requestHref(screen.id)}>
              Want this one?
            </Link>
          </p>
        )}
      </div>
    </article>
  )
}

function ScreenDocument({ screen, source, builtWith }: { screen: ScreenEntry; source: string | null; builtWith: BuiltWithItem[] }) {
  const { theme, glass } = useAppearance()
  const [device, setDevice] = useState<Device>('desktop')
  const [drawer, setDrawer] = useState(false)
  // On a phone, start where the reader is: the phone layout at full size.
  useEffect(() => {
    if (window.matchMedia?.('(max-width: 700px)').matches) setDevice('phone')
  }, [])
  const poster = screen.status === 'poster'
  const viewport = VIEWPORTS[device]
  return (
    <>
      <header className="screens-heading">
        <Link className="screens-back" href={GALLERY}>
          <ArrowLeft size={16} strokeWidth={1.6} aria-hidden="true" />
          All screens
        </Link>
        <div className="screens-title">
          <h2>{screen.name}</h2>
          {poster && <Tag size="small">Coming soon</Tag>}
          {screen.status === 'building' && <Tag size="small">In progress</Tag>}
        </div>
        {!poster && (
          <div className="screens-actions">
            {source && (
              <Button variant="quiet" size="small" shape="pill" className="library-download" onClick={() => setDrawer(true)}>
                <Icon name="code" size={16} />
                Get code
              </Button>
            )}
            <a className="diya-button screens-open" data-variant="quiet" data-size="small" data-shape="pill" href={frameHref(screen, theme, glass)} target="_blank" rel="noopener">
              <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
              Open full page
              <span className="screens-sr">, in a new tab</span>
            </a>
          </div>
        )}
        <p>{screen.description}</p>
      </header>

      <section className="pattern-stage screens-stage-panel" aria-label={`${screen.name} preview`}>
        <div className="pattern-controls screens-controls">
          <PreviewSetting label="Viewport" options={['Desktop', 'Phone']} value={device === 'desktop' ? 'Desktop' : 'Phone'} onChange={(value) => setDevice(value === 'Phone' ? 'phone' : 'desktop')} />
          <p className="screens-size">
            {viewport.width} × {viewport.height}
          </p>
        </div>
        <ScreenStage screen={screen} device={device} />
      </section>

      {poster ? <PosterNotes screen={screen} /> : <ScreenNotes screen={screen} builtWith={builtWith} />}

      {!poster && source && (
        <GetScreenCodeDrawer screen={screen} source={source} open={drawer} onOpenChange={setDrawer} theme={theme} glass={glass} />
      )}
    </>
  )
}

function ScreenNotes({ screen, builtWith }: { screen: LiveScreen; builtWith: BuiltWithItem[] }) {
  return (
    <div className="screens-notes">
      <section aria-labelledby="screens-try">
        <h3 id="screens-try">Try this</h3>
        <p>{screen.tryThis}</p>
      </section>
      {builtWith.length > 0 && (
        <section aria-labelledby="screens-built">
          <h3 id="screens-built">Built with</h3>
          <ul className="screens-built-with">
            {builtWith.map((item) => (
              <li key={item.id}>
                <Link href={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PosterNotes({ screen }: { screen: PosterScreen }) {
  return (
    <div className="screens-notes">
      <section aria-labelledby="screens-waiting">
        <h3 id="screens-waiting">Waiting on {screen.waitingOn}</h3>
        <p>{screen.note}</p>
        <p>
          <Link className="screens-want" href={requestHref(screen.id)}>
            Want this one? Tell me
          </Link>
        </p>
      </section>
    </div>
  )
}
