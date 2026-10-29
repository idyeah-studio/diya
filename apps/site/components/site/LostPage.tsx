'use client'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useId, useState } from 'react'
import { Search } from '@idyeah/diya'
import { catalogGroups, catalogHref, filterGroups, type CatalogListArea } from '../catalog/catalog-index'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { SiteProvider } from './SiteProvider'
import styles from '../../app/not-found.module.css'

const SitePageStyles = dynamic(() => import('./site-page-stylesheets'))

const areas: CatalogListArea[] = ['components', 'patterns']

/**
 * The 404 once the library is public: the site header over the photograph,
 * and two ways back, a search across components and patterns, and the
 * library itself. Before launch, app/not-found.tsx shows its plain page.
 */
export function LostPage() {
  const [query, setQuery] = useState('')
  const resultsId = useId()
  const matches = query.trim()
    ? areas.flatMap((area) =>
        filterGroups(catalogGroups[area], query).flatMap((group) => group.items.map((item) => ({ area, ...item })))
      )
    : []
  return (
    <SiteProvider className={styles.root}>
      <SitePageStyles />
      <SiteHeader />
      <main id="content" className={styles.lost} aria-labelledby="not-found-heading" tabIndex={-1}>
        <div className={styles.photo} aria-hidden="true">
          <Image src="/images/concept-architecture.png" alt="" fill sizes="100vw" quality={70} style={{ objectPosition: '70% 45%' }} />
        </div>
        <div className={styles.wash} aria-hidden="true" />
        <div className={styles.panel}>
          <p className={styles.lostCode}>404</p>
          <h1 id="not-found-heading" className={styles.lostHeading}>This page isn’t here.</h1>
          <p className={styles.lostText}>
            The address may have a typo, or the page has moved. Search the library, or start from the components.
          </p>
          <div role="search" aria-label="Library search" className={styles.search}>
            <Search
              label="Search components and patterns"
              hideLabel
              placeholder="Search the library"
              value={query}
              onValueChange={setQuery}
              clearable={!!query}
              aria-controls={resultsId}
            />
          </div>
          <div id={resultsId} className={styles.results}>
            {matches.length > 0 && (
              <ul aria-label="Matches">
                {matches.slice(0, 6).map((item) => (
                  <li key={`${item.area}-${item.id}`}>
                    <Link href={catalogHref(item.area, item.id)}>
                      <span>{item.title}</span>
                      <small>{item.area === 'components' ? 'Component' : 'Pattern'}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.status} role="status" aria-live="polite" data-quiet={matches.length ? '' : undefined}>
              {query.trim() ? (matches.length ? `${matches.length} found` : `Nothing matches “${query.trim()}”.`) : ''}
            </p>
          </div>
          <div className={styles.actions}>
            <Link className="diya-button" data-variant="solid" data-size="medium" href="/explore?area=components">
              Browse components
            </Link>
            <Link className="diya-button" data-variant="outline" data-size="medium" href="/explore?area=patterns">
              Patterns
            </Link>
            <Link className="diya-button" data-variant="quiet" data-size="medium" href="/" aria-label="Return to DIYA home">
              Home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </SiteProvider>
  )
}
