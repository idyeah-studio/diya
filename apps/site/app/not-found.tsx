import Link from 'next/link'
import { LostPage } from '../components/site/LostPage'
import { catalogIsOpen } from '../lib/catalog-route'
import styles from './not-found.module.css'

export default function NotFound() {
  // Decided per request (the root layout reads cookies): the library's way back appears with the catalog, at launch.
  if (catalogIsOpen()) return <LostPage />
  return (
    <main id="content" className={styles.page} aria-labelledby="not-found-heading" tabIndex={-1}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 id="not-found-heading" className={styles.heading}>This page isn’t available</h1>
        <p className={styles.description}>
          The address may be incorrect, or the page may not be available here.
          Return to the DIYA home page to continue.
        </p>
        <Link href="/" aria-label="Return to DIYA home" className={styles.link}>
          Return to DIYA home
        </Link>
      </div>
    </main>
  )
}
