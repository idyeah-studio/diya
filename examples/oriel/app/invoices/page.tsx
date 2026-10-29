import { Suspense } from 'react'
import { Invoices } from './Invoices'

export const metadata = { title: 'Invoices' }

export default function Page() {
  return (
    <Suspense>
      <Invoices />
    </Suspense>
  )
}
