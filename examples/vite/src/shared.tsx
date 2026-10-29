import type { ReactNode } from 'react'
export function Result({ children }: { children: ReactNode }) { return <p className="example-result" role="status">{children}</p> }
export function Glyph({ kind = 'plus' }: { kind?: 'plus' | 'grid' | 'check' | 'info' | 'download' }) {
  const paths = { plus: 'M12 4v16M4 12h16', grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z', check: 'm5 12 4 4L19 6', info: 'M12 11v6m0-10v.1', download: 'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5' }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'info' && <circle cx="12" cy="12" r="9" />}<path d={paths[kind]} /></svg>
}
