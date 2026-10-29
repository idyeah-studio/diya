import { Overview } from './Overview'

import { BRAND } from '@/lib/brand'

export const metadata = { title: { absolute: `${BRAND.name}` } }

export default function Page() {
  return <Overview />
}
