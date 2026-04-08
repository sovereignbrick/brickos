'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface OrgOption { id: string; name: string }

export interface PlatformFilterContext {
  appFilter: string
  orgFilter: string
  orgs: OrgOption[]
  setAppFilter: (v: string) => void
  setOrgFilter: (v: string) => void
}

const PlatformFilterCtx = createContext<PlatformFilterContext>({
  appFilter: 'all',
  orgFilter: 'all',
  orgs: [],
  setAppFilter: () => {},
  setOrgFilter: () => {},
})

export function PlatformFilterProvider({ children }: { children: React.ReactNode }) {
  const [appFilter, setAppFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [orgs, setOrgs] = useState<OrgOption[]>([])

  useEffect(() => {
    api.admin.organizations(1, 100).then(res => {
      setOrgs(res.data.filter(o => o.org_type !== 'personal').map(o => ({ id: o.id, name: o.name })))
    }).catch(() => {})
  }, [])

  return (
    <PlatformFilterCtx.Provider value={{ appFilter, orgFilter, orgs, setAppFilter, setOrgFilter }}>
      {children}
    </PlatformFilterCtx.Provider>
  )
}

export function usePlatformFilter() {
  return useContext(PlatformFilterCtx)
}
