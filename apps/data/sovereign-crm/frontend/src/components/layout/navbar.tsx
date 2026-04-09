'use client'

import dynamic from 'next/dynamic'

const NavbarClient = dynamic(
  () => import('./navbar-client').then(mod => mod.default),
  { ssr: false }
)

export function Navbar() {
  return <NavbarClient />
}
