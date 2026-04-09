'use client'

import dynamic from 'next/dynamic'

const SearchClient = dynamic(
  () => import('./search-client').then(mod => mod.default),
  { ssr: false }
)

export default function Page() {
  return <SearchClient />
}
