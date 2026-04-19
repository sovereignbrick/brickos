'use client'

/**
 * Sprint 044 #548: OrgContext provider for white-label branding.
 *
 * Pre-login:  fetches /api/v1/org/branding for login page theming
 * Post-login: decodes JWT for org_id + org_role
 * Provides:   orgId, orgRole, orgSlug, orgName, branding, isOrg
 *
 * Wraps the entire app so any component can call useOrg().
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import Cookies from 'js-cookie'

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgBranding {
  primary_color?: string
  accent_color?: string
  logo_url?: string | null
  logo_base64?: string | null
  footer_text?: string | null
  app_name?: string | null
  role_labels?: Record<string, string>
}

export interface OrgState {
  orgId: string | null
  orgSlug: string | null
  orgName: string
  orgRole: string | null
  branding: OrgBranding
  isOrg: boolean
  loading: boolean
}

const DEFAULT_STATE: OrgState = {
  orgId: null,
  orgSlug: null,
  orgName: 'BrickOS',
  orgRole: null,
  branding: {
    primary_color: '#f97316',
    accent_color: '#0ea5e9',
  },
  isOrg: false,
  loading: true,
}

const OrgContext = createContext<OrgState>(DEFAULT_STATE)

// ── Provider ─────────────────────────────────────────────────────────────────

export function OrgContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrgState>(DEFAULT_STATE)

  useEffect(() => {
    // 1. Fetch branding from public endpoint (works pre-login)
    fetchBranding()

    // 2. If logged in, also extract org claims from JWT
    const token = Cookies.get('auth_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.org_id) {
          setState(prev => ({
            ...prev,
            orgId: payload.org_id,
            orgRole: payload.org_role || null,
          }))
        }
      } catch {
        // Invalid token -- ignore
      }
    }
  }, [])

  async function fetchBranding() {
    try {
      const res = await fetch('/api/v1/org/branding')
      if (!res.ok) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      const json = await res.json()
      const data = json.data
      if (data) {
        setState(prev => ({
          ...prev,
          orgId: data.org_id || prev.orgId,
          orgSlug: data.org_slug || null,
          orgName: data.org_name || 'BrickOS',
          branding: data.branding || prev.branding,
          isOrg: data.is_org || false,
          loading: false,
        }))

        // Inject CSS custom properties for org branding
        if (data.branding?.primary_color) {
          document.documentElement.style.setProperty(
            '--brand-primary',
            data.branding.primary_color,
          )
        }
        if (data.branding?.accent_color) {
          document.documentElement.style.setProperty(
            '--brand-accent',
            data.branding.accent_color,
          )
        }
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    } catch {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  return <OrgContext.Provider value={state}>{children}</OrgContext.Provider>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOrg(): OrgState {
  return useContext(OrgContext)
}

// ── Utility ──────────────────────────────────────────────────────────────────

/** Get the org logo URL (prefers base64, falls back to URL). */
export function getOrgLogo(branding: OrgBranding): string | null {
  if (branding.logo_base64) {
    return `data:image/png;base64,${branding.logo_base64}`
  }
  return branding.logo_url || null
}
