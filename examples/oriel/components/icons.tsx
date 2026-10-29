// DIYA 1.0 doesn't export icons, so the app draws the few it needs.
// Decorative: hidden from screen readers; the label next to each carries the meaning.
import type { ReactNode } from 'react'

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const OverviewIcon = () => (
  <Svg>
    <path d="M4 19V11M10 19V5M16 19v-6M22 19H2" />
  </Svg>
)
export const InvoiceIcon = () => (
  <Svg>
    <path d="M6 3h9l4 4v14l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L4 21V5a2 2 0 0 1 2-2Z" />
    <path d="M8 9h6M8 13h8" />
  </Svg>
)
export const CustomersIcon = () => (
  <Svg>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.5.7 2.6 2.2 3 4.6" />
  </Svg>
)
export const SettingsIcon = () => (
  <Svg>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
)
export const CodeIcon = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Svg>
)
export const PlusIcon = () => (
  <Svg size={16}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const ArrowIcon = () => (
  <Svg size={16}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
)
export const MoreIcon = () => (
  <Svg>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </Svg>
)
export const DownloadIcon = () => (
  <Svg size={16}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
)
