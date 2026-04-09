'use client'

import dynamic from 'next/dynamic'

const GraphClient = dynamic(() => import('./graph-client'), { ssr: false })

export default function Page() {
  return <GraphClient />
}
