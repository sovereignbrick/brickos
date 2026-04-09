'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { useAuth } from '@/lib/auth-context'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8084'
const TABS = ['Profile', 'Security', 'Account', 'Data & Privacy'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Tab bar */}
        <div className="mt-6 flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 text-sm transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'Profile' && <ProfileTab />}
          {activeTab === 'Security' && <SecurityTab />}
          {activeTab === 'Account' && <AccountTab />}
          {activeTab === 'Data & Privacy' && <DataPrivacyTab />}
        </div>
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function ProfileTab() {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user?.display_name) setDisplayName(user.display_name)
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      // TODO: wire to PUT /api/v1/settings/profile when endpoint exists
      await new Promise(r => setTimeout(r, 500))
      setSaved(true)
      refreshUser()
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Manage your display name and preferences.</p>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="text-sm font-medium">Display name</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input type="email" value={user?.email || ''} disabled
            className="mt-1 w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
          <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-400">Saved</span>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security Tab
// ---------------------------------------------------------------------------

function SecurityTab() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  // Password strength
  const strength = newPassword.length === 0 ? 0
    : newPassword.length < 8 ? 1
    : newPassword.length < 12 ? 2
    : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4 : 3
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match')
      return
    }
    setChangingPassword(true)
    setPasswordMessage('')
    try {
      // TODO: wire to PUT /api/v1/settings/password
      await new Promise(r => setTimeout(r, 500))
      setPasswordMessage('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* MFA Section */}
      <div>
        <h3 className="text-lg font-medium">Two-factor authentication</h3>
        {user?.mfa_enabled ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Enabled
            </span>
            <button className="text-sm text-red-400 hover:text-red-300">Disable MFA</button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
            <button className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Set up MFA
            </button>
          </div>
        )}
      </div>

      {/* Password Change */}
      <div>
        <h3 className="text-lg font-medium">Change password</h3>
        <form onSubmit={handlePasswordChange} className="mt-3 max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium">Current password</label>
            <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">New password</label>
            <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            {newPassword.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${strengthColors[strength]} transition-all`} style={{ width: `${strength * 25}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Confirm new password</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
              {passwordMessage}
            </p>
          )}
          <button type="submit" disabled={changingPassword || newPassword.length < 8}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {changingPassword ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account Tab
// ---------------------------------------------------------------------------

function AccountTab() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Subscription</h3>
        <div className="mt-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Current tier:</span>
            <span className="rounded bg-zinc-600 px-2 py-0.5 text-xs font-bold text-white">
              {(user?.tier || 'glimpse').charAt(0).toUpperCase() + (user?.tier || 'glimpse').slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data & Privacy Tab
// ---------------------------------------------------------------------------

function DataPrivacyTab() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // TODO: wire to POST /api/v1/settings/data-export
      await new Promise(r => setTimeout(r, 1000))
      // Simulate download
      const data = { exported_at: new Date().toISOString(), contacts: [], companies: [], projects: [] }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Export your data</h3>
        <p className="mt-1 text-sm text-muted-foreground">Download all your CRM data as JSON.</p>
        <button onClick={handleExport} disabled={exporting}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Download JSON export'}
        </button>
      </div>

      <div>
        <h3 className="text-lg font-medium">Anonymous data sharing</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Help improve the platform by sharing anonymous usage statistics.
        </p>
        <label className="mt-3 flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
          <span className="text-sm">Share anonymous usage data</span>
        </label>
      </div>
    </div>
  )
}
