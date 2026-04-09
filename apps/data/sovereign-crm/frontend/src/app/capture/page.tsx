'use client'

import dynamic from 'next/dynamic'

const CapturePage = dynamic(() => import('./capture-client'), { ssr: false })

export default function Page() {
  return <CapturePage />
}
