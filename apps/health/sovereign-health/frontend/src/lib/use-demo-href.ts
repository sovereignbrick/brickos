'use client'

import { useSearchParams } from 'next/navigation'

export function useDemoHref() {
  const searchParams = useSearchParams()
  const profile = searchParams.get('profile')

  return (href: string): string => {
    if (!profile || profile === 'optimized') return href
    const separator = href.includes('?') ? '&' : '?'
    return `${href}${separator}profile=${profile}`
  }
}
