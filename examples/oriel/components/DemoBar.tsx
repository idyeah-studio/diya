'use client'
import { usePathname } from 'next/navigation'
import { Inline, TextLink } from '@idyeah/diya'
import { CodeIcon } from './icons'
import { BRAND } from '@/lib/brand'

// The one part of this app that only makes sense as a demo: a quiet line at the
// foot of each screen that says what this is and links to the file behind it. Building
// your own app from it? Delete this file and its line in Shell.tsx.

const SOURCE = 'https://github.com/idyeah-studio/diya/blob/main/examples/oriel'

const FILES: [prefix: string, file: string][] = [
  ['/invoices', 'app/invoices/Invoices.tsx'],
  ['/customers', 'app/customers/Customers.tsx'],
  ['/settings', 'app/settings/Settings.tsx'],
  ['/', 'app/Overview.tsx'],
]

export function DemoBar() {
  const path = usePathname()
  const file = FILES.find(([prefix]) => (prefix === '/' ? path === '/' : path.startsWith(prefix)))?.[1] ?? 'app/Overview.tsx'
  return (
    <Inline className="demo-bar" justify="between" gap={3} as="aside" aria-label="About this demo">
      <span className="demo-bar-note">{BRAND.name} is a demo, made only from DIYA components.</span>
      <TextLink href={`${SOURCE}/${file}`} leadingIcon={<CodeIcon />}>
        View this screen’s source
      </TextLink>
    </Inline>
  )
}
