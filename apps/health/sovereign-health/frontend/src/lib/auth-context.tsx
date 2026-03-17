'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { User } from './types'
import { api, clearToken } from './api'
import Cookies from 'js-cookie'
import { APP_CONFIG } from './config'

function checkDemoOnly(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === APP_CONFIG.demoHostname
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemo: boolean
  isDemoOnly: boolean
  setUser: (user: User | null) => void
  refreshUser: () => void
  logout: () => void
  handleSessionExpired: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  isDemoOnly: false,
  setUser: () => {},
  refreshUser: () => {},
  logout: () => {},
  handleSessionExpired: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoOnly] = useState(checkDemoOnly)

  const refreshUser = useCallback(() => {
    if (isDemoOnly || !Cookies.get('auth_token')) return
    api.auth.me()
      .then(res => setUser(res.data))
      .catch(() => {})
  }, [isDemoOnly])

  useEffect(() => {
    // On demo.sovereignhealth.io or when no token exists, skip auth
    if (isDemoOnly || !Cookies.get('auth_token')) {
      setLoading(false)
      return
    }
    api.auth.me()
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [isDemoOnly])

  // Re-fetch user profile on window focus to pick up tier/license changes
  const lastRefresh = useRef(Date.now())
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastRefresh.current < 30_000) return // throttle: once per 30s
      lastRefresh.current = Date.now()
      refreshUser()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshUser])

  const logout = () => {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  const handleSessionExpired = useCallback(() => {
    if (!user) return
    clearToken()
    setUser(null)
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?expired=true&return=${returnUrl}`
  }, [user])

  useEffect(() => {
    const handler = () => handleSessionExpired()
    window.addEventListener('session-expired', handler)
    return () => window.removeEventListener('session-expired', handler)
  }, [handleSessionExpired])

  const isDemo = !loading && (user === null || isDemoOnly)

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, isDemoOnly, setUser, refreshUser, logout, handleSessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
