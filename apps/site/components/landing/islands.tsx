'use client'
import dynamic from 'next/dynamic'

/* The landing's client components, each in its own lazily loaded chunk.
   The countdown shares this route, and statically imported client code
   would ride along in its bundle before launch. Server rendering is kept. */
export const SiteProvider = dynamic(() => import('../site/SiteProvider').then((m) => m.SiteProvider))
export const SiteHeader = dynamic(() => import('../site/SiteHeader').then((m) => m.SiteHeader))
export const InstallChip = dynamic(() => import('../site/InstallChip').then((m) => m.InstallChip))
export const CreateChip = dynamic(() => import('./CreateChip').then((m) => m.CreateChip))
export const InstallLine = dynamic(() => import('./CreateChip').then((m) => m.InstallLine))
export const PartsSheet = dynamic(() => import('./PartsSheet').then((m) => m.PartsSheet))
export const GlassCards = dynamic(() => import('./GlassBand').then((m) => m.GlassCards))
export const ProScreen = dynamic(() => import('./ProScreen').then((m) => m.ProScreen))
export const ProWaitlist = dynamic(() =>
  import('../waitlist/ProWaitlist').then((m) => m.ProWaitlist),
)
export const LaunchMoment = dynamic(() => import('./LaunchMoment').then((m) => m.LaunchMoment))
