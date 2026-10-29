'use client'
import dynamic from 'next/dynamic'

/* site.css, loaded only where site chrome renders (see LandingStyles). */
export const SiteStyles = dynamic(() => import('./site-stylesheet'))
