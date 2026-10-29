import { Overview } from './Overview'

import { BRAND } from '@/lib/brand'

export const metadata = { title: { absolute: `${BRAND.name} · a demo app made with DIYA` } }

export default function Page() {
  return <Overview />
}
