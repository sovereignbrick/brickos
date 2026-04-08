'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAdminContext } from './admin-context'

interface OrgOption { id: string; name: string }

export interface PlatformFilterContext {
  appFilter: string
  orgFilter: string
  orgs: OrgOption[]
  setAppFilter: (v: string) => void
  setOrgFilter: (v: string) => void
  /** True when user is org admin (not platform admin) -- org filter is locked */
  isOrgLocked: boolean
}

const PlatformFilterCtx = createContext<PlatformFilterContext>({
  appFilter: 'all',
  orgFilter: 'all',
  orgs: [],
  setAppFilter: () => {},
  setOrgFilter: () => {},
  isOrgLocked: false,
})

export function PlatformFilterProvider({ children }: { children: React.ReactNode }) {
  const adminCtx = useAdminContext()
  const [appFilter, setAppFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [orgs, setOrgs] = useState<OrgOption[]>([])

  // Org admin auto-scoping: lock to their org
  const isOrgLocked = !adminCtx.isPlatform && !!adminCtx.orgId

  useEffect(() => {
    if (isOrgLocked && adminCtx.orgId) {
      setOrgFilter(adminCtx.orgId)
    }
  }, [isOrgLocked, adminCtx.orgId])

  useEffect(() => {
    // Platform admin: load all orgs for the dropdown
    // Org admin: still load orgs but dropdown will be disabled
    api.admin.organizations(1, 100).then(res => {
      setOrgs(res.data.filter(o => o.org_type !== 'personal').map(o => ({ id: o.id, name: o.name })))
    }).catch(() => {})
  }, [])

  // For org admin, prevent changing org filter
  const safeSetOrgFilter = isOrgLocked ? () => {} : setOrgFilter

  return (
    <PlatformFilterCtx.Provider value={{
      appFilter, orgFilter, orgs,
      setAppFilter, setOrgFilter: safeSetOrgFilter,
      isOrgLocked,
    }}>
      {children}
    </PlatformFilterCtx.Provider>
  )
}

export function usePlatformFilter() {
  return useContext(PlatformFilterCtx)
}
