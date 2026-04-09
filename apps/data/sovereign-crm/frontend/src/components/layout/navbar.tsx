'use client'

import dynamic from 'next/dynamic'

const NavbarClient = dynamic(() => import('./navbar-client'), { ssr: false })

export function Navbar() {
  return <NavbarClient />
}
