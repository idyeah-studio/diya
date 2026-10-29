import { CatalogHome } from '../components/CatalogHome'
import { ConceptLanding } from '../components/ConceptLanding'
import { LaunchedLanding } from '../components/landing/LaunchedLanding'
import { connection } from 'next/server'
import { isLaunched, launchNow, secondsUntilLaunch } from '../lib/launch'

// Decided per request on the server, so the launched page never reaches the
// browser before LAUNCH_AT, and the countdown's own refresh at zero brings it
// in. (The landing loads its stylesheets itself; see LandingStyles.)
export default async function Home() {
  await connection()
  const now = launchNow()
  if (isLaunched(now)) return <LaunchedLanding />
  if (process.env.DIYA_CATALOG_PREVIEW === '1') return <CatalogHome />
  return <ConceptLanding initialSeconds={secondsUntilLaunch(now)} />
}
