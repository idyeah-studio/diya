import Link from 'next/link'
import { CommunityStyles } from '../community/CommunityStyles'
import { ASK_PATH, CHANGELOG_PATH } from '../community/links'
import { TrustBlock } from '../community/TrustBlock'
import { FlameMark } from './FlameMark'
import { GITHUB_URL, LICENSE_URL, NPM_URL } from './links'
import { SiteStyles } from './SiteStyles'

/**
 * The colophon footer shared by the landing and the catalog. No props; it
 * needs a DIYA provider (`.diya-root`) above it for its colors. It names the
 * maintainer and the release cadence, links the on-site changelog and the
 * component request page, and links Relight to the landing section. It only
 * renders once the catalog is open, so its links never lead to a 404.
 *
 * <SiteFooter />
 */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <SiteStyles />
      <CommunityStyles />
      <div className="site-foot-wrap">
        <div className="site-foot-grid">
          <div className="site-foot-brand">
            <Link href="/" aria-label="DIYA home" className="site-foot-home">
              <FlameMark decorative />
            </Link>
            <p>DIYA is made by IDYeah Studio.</p>
            <TrustBlock />
          </div>
          <div role="group" aria-labelledby="site-foot-get">
            <h2 id="site-foot-get">Get it</h2>
            <ul>
              <li>
                <a href={NPM_URL}>
                  npm <small>@idyeah/diya</small>
                </a>
              </li>
              <li>
                <a href={GITHUB_URL}>
                  GitHub <small>idyeah-studio/diya</small>
                </a>
              </li>
              <li>
                <a href={LICENSE_URL}>MIT license</a>
              </li>
              <li>
                <Link href={CHANGELOG_PATH}>Changelog</Link>
              </li>
            </ul>
          </div>
          <div role="group" aria-labelledby="site-foot-library">
            <h2 id="site-foot-library">Library</h2>
            <ul>
              <li>
                <Link href="/explore?area=components">Components</Link>
              </li>
              <li>
                <Link href="/explore?area=patterns">Patterns</Link>
              </li>
              <li>
                <Link href="/explore?area=screens">Screens</Link>
              </li>
              <li>
                <Link href={ASK_PATH}>Ask for a component</Link>
              </li>
            </ul>
          </div>
          <div role="group" aria-labelledby="site-foot-studio">
            <h2 id="site-foot-studio">Studio</h2>
            <ul>
              <li>
                <Link href="/#pro">
                  Relight <small>Waitlist</small>
                </Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="site-foot-fine">
          <p>
            Set in DIYA Sans, a modified Mona Sans under the SIL Open Font License. This site is built with DIYA.
          </p>
          <p>
            <em>First lit on 7 November 2026, the eve of Diwali.</em>
            <span>© 2026 IDYeah Studio LLC</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
