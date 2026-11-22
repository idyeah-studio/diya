import { STUDIO } from '../community/links'
import { API } from '../reference/api'
import { GITHUB_URL, LICENSE_URL, NPM_URL } from '../site/links'
import { SITE } from '../../lib/site'

/*
 * The launched home page's one JSON-LD graph: the site, the studio that makes
 * it, and the package's source. The studio is a name and a web address only: no
 * postal address, no people, no email. The version is the installed
 * package's, read from its api.json like everything else on the site, so it
 * can't fall behind. Not SoftwareApplication: Google's result for that type
 * wants a rating and a price, and DIYA has neither.
 */
const studio = `${SITE}/#studio`

export const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'DIYA', alternateName: 'diya13.ai', url: `${SITE}/`, publisher: { '@id': studio } },
    { '@type': 'Organization', '@id': studio, name: STUDIO.name, url: STUDIO.url },
    {
      '@type': 'SoftwareSourceCode',
      '@id': `${SITE}/#code`,
      name: 'DIYA',
      alternateName: API.package,
      url: `${SITE}/`,
      codeRepository: GITHUB_URL,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'React',
      license: LICENSE_URL,
      version: API.version,
      sameAs: [NPM_URL],
      publisher: { '@id': studio },
    },
  ],
}

/** The graph as a script body: JSON with every `<` escaped, so no string in it can close the script. */
export function structuredDataScript(data: unknown = STRUCTURED_DATA) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
