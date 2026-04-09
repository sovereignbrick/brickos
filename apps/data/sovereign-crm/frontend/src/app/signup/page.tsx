'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getBrand } from '@/lib/brand'
import { API_URL } from '@/lib/api-config'

export default function SignupPage() {
  const brand = getBrand()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message || 'Signup failed'); return }
      setSuccess(true)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <strong>{email}</strong>.
          </p>
          <Link href="/login" className="text-sm text-foreground hover:underline">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Image src={brand.logo} alt={brand.logoAlt} width={48} height={48} className="rounded-lg" />
          <h1 className="text-xl font-semibold">Create account</h1>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${strengthColors[strength]} transition-all`} style={{ width: `${strength * 25}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading || password.length < 8}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
