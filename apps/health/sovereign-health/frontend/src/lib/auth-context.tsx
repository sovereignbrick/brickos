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

// Sprint 049 #049-03 (Design 029 v0.3): the dedicated public-demo host.
// Unauth visitors here see the 3-profile picker + read-only app.
// Distinct from `demoHostname` which remained a staging RC host.
function checkEvalHost(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === APP_CONFIG.evalHost
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemo: boolean
  isDemoOnly: boolean
  isEvalHost: boolean
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
  isEvalHost: false,
  setUser: () => {},
  refreshUser: () => {},
  logout: () => {},
  handleSessionExpired: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoOnly] = useState(checkDemoOnly)
  const [isEvalHost] = useState(checkEvalHost)
  // Grace period after login to suppress spurious session-expired events
  // that fire before the new token is fully established across API calls.
  const loginTimestamp = useRef<number>(0)

  const setUserWithTracking = useCallback((newUser: User | null) => {
    if (newUser) {
      loginTimestamp.current = Date.now()
    }
    setUser(newUser)
  }, [])

  const refreshUser = useCallback(() => {
    // Skip auth fetch on demo hosts (legacy demo.* and new eval.*).
    if (isDemoOnly || isEvalHost || !Cookies.get('auth_token')) return
    api.auth.me()
      .then(res => setUserWithTracking(res.data))
      .catch(() => {})
  }, [isDemoOnly, isEvalHost, setUserWithTracking])

  useEffect(() => {
    // On public demo hosts or when no token exists, skip auth.
    if (isDemoOnly || isEvalHost || !Cookies.get('auth_token')) {
      setLoading(false)
      return
    }
    api.auth.me()
      .then(res => setUserWithTracking(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [isDemoOnly, isEvalHost, setUserWithTracking])

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
    // Suppress session-expired events within 5 seconds of login to prevent
    // redirect loops where API calls on the target page race with token
    // establishment and briefly return 401 (#0378).
    const LOGIN_GRACE_MS = 5000
    if (Date.now() - loginTimestamp.current < LOGIN_GRACE_MS) return
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

  // Sprint 049 (Design 029 v0.3): demo mode is active on either
  // isDemoOnly (legacy `demoHostname`, may be sunset) OR isEvalHost
  // (new `eval.sovereignhealth.io`), AND the visitor is not signed in.
  // On `isEvalHost` we never set an auth cookie, so `user` stays null
  // and demo mode stays active throughout the session.
  //
  // Everywhere else (authed app, org subdomains, admin plane),
  // <AuthGate> redirects unauthed visitors to /login, so `isDemo` is
  // false there -- even for unauth visits.
  const isDemo = !loading && (isDemoOnly || isEvalHost) && user === null

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, isDemoOnly, isEvalHost, setUser: setUserWithTracking, refreshUser, logout, handleSessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
