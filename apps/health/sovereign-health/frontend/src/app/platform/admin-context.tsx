'use client'

import { createContext, useContext } from 'react'

export interface AdminContextType {
  isPlatform: boolean
  isOrgOwner: boolean
  isTechAdmin: boolean
  isCommercialAdmin: boolean
  orgId: string | null
  orgName: string | null
}

export const AdminContext = createContext<AdminContextType>({
  isPlatform: false, isOrgOwner: false, isTechAdmin: false,
  isCommercialAdmin: false, orgId: null, orgName: null,
})

export const useAdminContext = () => useContext(AdminContext)
