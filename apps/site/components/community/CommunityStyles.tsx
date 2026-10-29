'use client'
import dynamic from 'next/dynamic'

/* community.css, loaded only where the footer or the catalog renders. The
   footer is part of the home route, and a static import would put this
   stylesheet in the countdown's CSS before launch (see SiteStyles). */
export const CommunityStyles = dynamic(() => import('./community-stylesheet'))
