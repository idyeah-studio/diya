import { ArrowUpRight } from 'lucide-react'
import { GitHubIcon } from '../site/links'
import { ORIEL_SCREENS, ORIEL_SOURCE_URL, ORIEL_URL } from '../oriel/links'

/**
 * Proof before the pitch: Oriel, a whole app made only from DIYA, live and
 * open source. Server-rendered and only part of the launched landing, so the
 * countdown never carries it.
 */
export function OrielBand() {
  return (
    <section className="ld-section ld-oriel" aria-labelledby="oriel-title">
      <div className="ld-wrap ld-oriel-grid">
        <div className="ld-oriel-copy">
          <p className="ld-eyebrow">
            <b>Oriel</b> · a reference app
          </p>
          <h2 id="oriel-title">Don’t take the catalog’s word for it. Here’s a whole app.</h2>
          <p className="ld-oriel-lede">
            Oriel is a small invoicing app made only from DIYA: four screens, no Tailwind, and one small stylesheet
            for its layout. Click anything; it starts fresh when you reload.
          </p>
          <p className="ld-oriel-lede">
            Invoices are just the example. The same pieces build a booking tool, a CRM, or your settings page.
          </p>
          <div className="ld-oriel-actions">
            <a className="diya-button" data-variant="solid" data-size="large" data-shape="pill" href={ORIEL_URL} target="_blank" rel="noopener">
              Open Oriel
              <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
              <span className="sr-only">, in a new tab</span>
            </a>
            <a className="ld-oriel-source" href={ORIEL_SOURCE_URL}>
              <GitHubIcon size={15} />
              Read the source
            </a>
          </div>
        </div>
        <ol className="ld-oriel-screens" aria-label="Oriel’s screens">
          {Object.values(ORIEL_SCREENS).map((screen) => (
            <li key={screen.name}>
              <a href={screen.href} target="_blank" rel="noopener">
                <span className="ld-oriel-name">{screen.name}</span>
                <span className="ld-oriel-shows">{screen.shows}</span>
                <span className="sr-only">, in a new tab</span>
                <span className="ld-index-go" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
