'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export interface PlatformFilterContext {
  appFilter: string   // 'all' | 'shi' | 'sovereign-link' | 'sovereign-voice'
  orgFilter: string   // 'all' | org_id
  setAppFilter: (v: string) => void
  setOrgFilter: (v: string) => void
}

const PlatformFilterCtx = createContext<PlatformFilterContext>({
  appFilter: 'all',
  orgFilter: 'all',
  setAppFilter: () => {},
  setOrgFilter: () => {},
})

export function PlatformFilterProvider({ children }: { children: React.ReactNode }) {
  const [appFilter, setAppFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  return (
    <PlatformFilterCtx.Provider value={{ appFilter, orgFilter, setAppFilter, setOrgFilter }}>
      {children}
    </PlatformFilterCtx.Provider>
  )
}

export function usePlatformFilter() {
  return useContext(PlatformFilterCtx)
}
