import type { ReactNode } from 'react'

export type DashboardIconName = 'overview' | 'transactions' | 'incoming' | 'outgoing' | 'bank' | 'settings' | 'bell' | 'download' | 'plus' | 'arrow' | 'check' | 'help' | 'menu'
export function DashboardIcon({ name, size = 18 }: { name: DashboardIconName; size?: number }) {
  const paths: Record<DashboardIconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    transactions: <><path d="M4 7h15m-3-3 3 3-3 3M20 17H5m3-3-3 3 3 3" /></>,
    incoming: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
    outgoing: <><path d="M12 15V3m-4 4 4-4 4 4M4 17v4h16v-4" /></>,
    bank: <><path d="m3 9 9-6 9 6H3Zm1 12h16M6 12v6m6-6v6m6-6v6" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8ZM10 20h4" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4v.1" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
