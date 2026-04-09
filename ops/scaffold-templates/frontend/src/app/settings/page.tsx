'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/navbar'

const TABS = ['Profile', 'Security', 'Account', 'Data & Privacy'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Tab bar */}
        <div className="mt-6 flex gap-1 border-b border-border">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm transition-colors ${
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
          {activeTab === 'Profile' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Profile settings (display name, country).</p>
              {/* TODO: Implement profile form */}
            </div>
          )}
          {activeTab === 'Security' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">MFA setup, password change.</p>
              {/* TODO: Implement MFA setup/disable, password change with strength indicator */}
            </div>
          )}
          {activeTab === 'Account' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Subscription tier, license info.</p>
              {/* TODO: Show tier from platform DB via brickos-billing */}
            </div>
          )}
          {activeTab === 'Data & Privacy' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">GDPR data export, data sharing toggle.</p>
              {/* TODO: JSON export, anonymous sharing toggle */}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
