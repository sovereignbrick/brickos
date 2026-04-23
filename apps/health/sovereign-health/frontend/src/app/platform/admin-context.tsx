'use client'

import { createContext, useContext } from 'react'

export interface AdminContextType {
  isPlatform: boolean
  isOrgOwner: boolean
  isTechAdmin: boolean
  isCommercialAdmin: boolean
  /**
   * True when the current hostname resolves to a specific customer org
   * (e.g. test-clinic.demo.brickos.io, app.brickos.io with org cookie).
   * False when viewing the platform aggregate (demo.brickos.io).
   * ORGANIZATION-section sidebar items are gated on this to avoid
   * "Could not load members" errors when there's no org context.
   * Sprint 051 #0590.
   */
  isOrg: boolean
  orgId: string | null
  orgName: string | null
}

export const AdminContext = createContext<AdminContextType>({
  isPlatform: false, isOrgOwner: false, isTechAdmin: false,
  isCommercialAdmin: false, isOrg: false, orgId: null, orgName: null,
})

export const useAdminContext = () => useContext(AdminContext)
