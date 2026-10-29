import type { ReactNode } from 'react'
import { DiyaProvider } from '@idyeah/diya'

// Your one brand color. Leave it undefined for DIYA's neutral near-black.
const brandColor: string | undefined = undefined

// theme="system" follows the visitor's Light or Dark setting in CSS, from the
// first paint. Adding React Router or TanStack Router? Pass its Link as
// linkComponent={Link}, and every DIYA href goes through your router.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <DiyaProvider theme="system" brandColor={brandColor}>
      {children}
    </DiyaProvider>
  )
}
