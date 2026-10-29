import { CADENCE, CHECKS, MAINTAINER, SPONSORS_URL } from './links'

/**
 * Who keeps DIYA going, how often it ships, and the checks anyone can verify.
 * Server-safe, with no state. Needs `.diya-root` above it for its colors and
 * the community stylesheet (CommunityStyles) for its layout.
 *
 * - `footer`: two quiet lines and a row of plain links, for the colophon.
 * - `page`: the same facts as a short list with a sentence each, for /changelog.
 */
export function TrustBlock({ variant = 'footer' }: { variant?: 'footer' | 'page' }) {
  const maintainer = <a href={MAINTAINER.url}>{MAINTAINER.name}</a>
  if (variant === 'footer')
    return (
      <div className="cm-trust" data-variant="footer">
        <p>Maintained by {maintainer}.</p>
        <p>{CADENCE}</p>
        <ul className="cm-checks" aria-label="Checks you can verify">
          {CHECKS.map((check) => (
            <li key={check.label}>
              <a href={check.href}>{check.label}</a>
            </li>
          ))}
          {SPONSORS_URL && (
            <li>
              <a href={SPONSORS_URL}>Sponsor</a>
            </li>
          )}
        </ul>
      </div>
    )
  return (
    <dl className="cm-trust" data-variant="page">
      <div>
        <dt>Maintainer</dt>
        <dd>{maintainer}, at IDYeah Studio. I read every issue and every request.</dd>
      </div>
      <div>
        <dt>Cadence</dt>
        <dd>{CADENCE}</dd>
      </div>
      {CHECKS.map((check) => (
        <div key={check.label}>
          <dt>
            <a href={check.href}>{check.label}</a>
          </dt>
          <dd>{check.description}</dd>
        </div>
      ))}
      {SPONSORS_URL && (
        <div>
          <dt>
            <a href={SPONSORS_URL}>GitHub Sponsors</a>
          </dt>
          <dd>DIYA is free. Sponsoring pays for the time it takes to keep it that way.</dd>
        </div>
      )}
    </dl>
  )
}
