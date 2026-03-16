'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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
  logout: () => void
  handleSessionExpired: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  isDemoOnly: false,
  setUser: () => {},
  logout: () => {},
  handleSessionExpired: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoOnly] = useState(checkDemoOnly)

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
    <AuthContext.Provider value={{ user, loading, isDemo, isDemoOnly, setUser, logout, handleSessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
