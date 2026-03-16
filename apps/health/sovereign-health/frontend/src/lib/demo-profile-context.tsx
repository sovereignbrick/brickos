'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type DemoProfile = 'optimized' | 'average' | 'at_risk'

const VALID_PROFILES: DemoProfile[] = ['optimized', 'average', 'at_risk']

/** Static profile metadata (slug + color).
 *  For localised name/desc use `getProfileLabel(slug, t)`. */
export const DEMO_PROFILES: { slug: DemoProfile; name: string; desc: string; color: string }[] = [
  { slug: 'optimized', name: 'Optimized', desc: 'Keto/carnivore, excellent metabolic health', color: '#4ade80' },
  { slug: 'average', name: 'Average', desc: 'Standard diet, borderline markers', color: '#fb923c' },
  { slug: 'at_risk', name: 'At Risk', desc: 'Pre-diabetic, metabolic syndrome', color: '#ef4444' },
]

/** Return the localised name + description for a demo profile.
 *  Pass `t = useTranslations('demo')`. Falls back to English defaults. */
export function getProfileLabel(slug: DemoProfile, t: (key: string) => string): { name: string; desc: string } {
  return {
    name: t(`profiles.${slug}.name`),
    desc: t(`profiles.${slug}.desc`),
  }
}

function parseProfile(value: string | null): DemoProfile {
  if (value && VALID_PROFILES.includes(value as DemoProfile)) return value as DemoProfile
  return 'optimized'
}

interface DemoProfileContextType {
  profile: DemoProfile
  setProfile: (p: DemoProfile) => void
}

const DemoProfileContext = createContext<DemoProfileContextType>({
  profile: 'optimized',
  setProfile: () => {},
})

export function DemoProfileProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const urlProfile = parseProfile(searchParams.get('profile'))
  const [localProfile, setLocalProfile] = useState<DemoProfile>(urlProfile)

  // Derive the active profile: prefer URL param when it differs from local state
  const profile = urlProfile !== 'optimized' ? urlProfile : localProfile

  const setProfile = useCallback((p: DemoProfile) => {
    setLocalProfile(p)
    const params = new URLSearchParams(searchParams.toString())
    if (p === 'optimized') {
      params.delete('profile')
    } else {
      params.set('profile', p)
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname])

  return (
    <DemoProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </DemoProfileContext.Provider>
  )
}

export const useDemoProfile = () => useContext(DemoProfileContext)
