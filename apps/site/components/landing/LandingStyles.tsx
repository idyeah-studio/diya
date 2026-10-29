'use client'
import dynamic from 'next/dynamic'

/* The landing's stylesheets, loaded with the launched page only. A static
   import would put them in the route's CSS, and the countdown shares that
   route: before launch it would download ~140 KB it never uses. */
export const LandingStyles = dynamic(() => import('./landing-stylesheets'))
