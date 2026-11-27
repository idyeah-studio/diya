import { GITHUB_URL, NPM_URL } from '../site/links'

/*
 * Where the trust and community surfaces point. One place to change a URL.
 * Every page that shows these is gated with the catalog (lib/catalog-route).
 */

/** The studio named in the footer. */
export const STUDIO = {
  name: 'IDYeah Studio',
  url: 'https://www.idyeah.studio',
} as const

/** The maintainer named in the footer and on /changelog. */
export const MAINTAINER = {
  name: 'Vishal Mehta',
  // Their page on the studio's site.
  url: 'https://www.idyeah.studio/person',
} as const

/** The stated release cadence, word for word wherever it appears. */
export const CADENCE = 'A minor release about every four weeks; regressions fixed within 72 hours.'

/** GitHub Discussions on the public repository: the home of component requests. */
export const DISCUSSIONS_URL = `${GITHUB_URL}/discussions`
/** Starts a new request in the Ideas category (GitHub's default category for this). */
export const NEW_REQUEST_URL = `${DISCUSSIONS_URL}/new?category=ideas`
/** Bugs belong in issues, not requests. */
export const NEW_ISSUE_URL = `${GITHUB_URL}/issues/new/choose`
/** The on-site page that explains a good request, then hands off to Discussions. */
export const ASK_PATH = '/ask'
/** The on-site changelog, rendered from the SDK's CHANGELOG.md. */
export const CHANGELOG_PATH = '/changelog'
/** DIYA's MCP server: the page for people, at the address agents connect to. */
export const MCP_PATH = '/mcp'
/** The MCP server's listing on Glama, a directory of MCP servers. */
export const GLAMA_LISTING = 'https://glama.ai/mcp/connectors/ai.diya13/diya'
/** Glama's badge for the listing: an image Glama serves, showing the score it gives the connector. */
export const GLAMA_BADGE = `${GLAMA_LISTING}/badges/score.svg`
/** Crit8, the review tool this site was audited with; credited in the footer. */
export const CRIT8_URL = 'https://crit8.ai'

/**
 * The checks a stranger can verify for themselves, as plain links rather
 * than badge images.
 */
export const CHECKS = [
  {
    label: 'CI',
    href: `${GITHUB_URL}/actions/workflows/ci.yml`,
    description: 'Every pull request and every commit to main is type-checked, built and tested.',
  },
  {
    label: 'Bundle size',
    href: 'https://bundlephobia.com/package/@idyeah/diya',
    description: 'What DIYA adds to your bundle.',
  },
  {
    label: 'npm provenance',
    href: `${NPM_URL}#provenance`,
    description: 'Each release on npm links back to the commit and the workflow that built it.',
  },
] as const

/**
 * GitHub Sponsors. Null until the profile exists; while it's null, nothing
 * mentions sponsoring.
 */
export const SPONSORS_URL: string | null = null
