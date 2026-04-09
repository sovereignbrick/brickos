'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'
const COOKIE_NAME = 'auth_token'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  tier: string
  email_verified: boolean
  mfa_enabled: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, refreshToken: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = () => Cookies.get(COOKIE_NAME)

  const login = useCallback((token: string, _refreshToken: string) => {
    Cookies.set(COOKIE_NAME, token, {
      expires: 7,
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    })
    refreshUser()
  }, [])

  const logout = useCallback(() => {
    Cookies.remove(COOKIE_NAME)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        const user = json.data?.user ?? json.data ?? json
        setUser(user)
      } else {
        Cookies.remove(COOKIE_NAME)
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshUser() }, [refreshUser])

  // Refresh on window focus (throttled)
  useEffect(() => {
    let lastRefresh = Date.now()
    const onFocus = () => {
      if (Date.now() - lastRefresh > 30_000) {
        lastRefresh = Date.now()
        refreshUser()
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
