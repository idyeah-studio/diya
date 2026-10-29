'use client'
import { useState } from 'react'
import { useAppearance } from '../app/Appearance'
import { Icon } from './Icon'
import { ConceptBackdrop } from './ConceptBackdrop'
import { LandingStyles } from './landing/LandingStyles'
import { SiteHeader, SiteProvider } from './landing/islands'
import { CatalogFlag } from './site/CatalogFlag'
// The preview build's home before launch. Its styles used to arrive with the
// catalog header in the root layout; that header now lives in /explore.
import './CatalogChrome.css'
import './AppearanceMaterials.css'
import './LibraryAppearance.css'
import './CatalogIntegration.css'
export function CatalogHome() {
  const concept = 'architecture'
  const [font, setFont] = useState('Sans')
  const { light, glass, changeTheme, changeGlass } = useAppearance()
  return (
    <>
      {/* Preview builds only: the site header, so the preview home can reach the catalog. */}
      <CatalogFlag />
      <LandingStyles />
      <SiteProvider className="site-root-bare">
        <SiteHeader />
      </SiteProvider>
      <main id="content" className="concept-landing" data-concept={concept}>
        <ConceptBackdrop />
        <section className="concept-hero">
          <h1>A library for your next app.</h1>
          <p>Components and patterns. In code.</p>
          <a className="concept-cta" href="/explore">
            Explore
          </a>
        </section>
        <section
          className="concept-cards"
          aria-label="Interactive component previews"
          data-light={light}
          data-glass={glass}
        >
          <article className="concept-panel typography-panel">
            <h2>Typography</h2>
            <div className="type-preview">
              <span
                style={{
                  fontFamily:
                    font === 'Serif'
                      ? 'Georgia, serif'
                      : font === 'Sans'
                        ? "'DIYA Sans', 'DIYA Sans Fallback', Arial, sans-serif"
                        : 'monospace',
                }}
              >
                Aa
              </span>
              <div role="group" aria-label="Preview typography">
                {['Sans', 'Serif', 'Mono'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFont(f)}
                    aria-pressed={font === f}
                    style={{
                      fontFamily:
                        f === 'Serif'
                          ? 'Georgia, serif'
                          : f === 'Sans'
                            ? "'DIYA Sans', 'DIYA Sans Fallback', Arial, sans-serif"
                            : 'monospace',
                    }}
                  >
                    {f}
                    <span>Regular</span>
                  </button>
                ))}
              </div>
            </div>
          </article>
          <article className="concept-panel appearance-study">
            <h2>Appearance</h2>
            <div className="concept-segments" role="group" aria-label="Preview card appearance">
              <button aria-pressed={light} onClick={() => changeTheme('light')}>
                <Icon name="sun" size={16} />
                Light
              </button>
              <button aria-pressed={!light} onClick={() => changeTheme('dark')}>
                <Icon name="moon" size={16} />
                Dark
              </button>
            </div>
            <div className="concept-glass-row">
              <span>Glass</span>
              <button
                role="switch"
                aria-label="Preview glass"
                aria-checked={glass}
                onClick={() => changeGlass(!glass)}
                className="showcase-switch"
              >
                <span />
              </button>
            </div>
          </article>
          <article className="concept-panel profile-study">
            <span className="concept-avatar" aria-hidden="true">
              AC
            </span>
            <div>
              <h2>Alex Chen</h2>
              <p>Product designer</p>
              <span>Profile · Component preview</span>
            </div>
          </article>
        </section>
      </main>
    </>
  )
}
