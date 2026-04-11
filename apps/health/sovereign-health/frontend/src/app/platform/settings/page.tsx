'use client'
import { SettingsTab } from '@/components/admin/settings-tab'
export default function PlatformSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform Settings</h1>
      <p className="text-xs text-zinc-500">
        Cross-app BrickOS settings only. SHI app-specific settings (Dr. Alex prompts,
        info bars, health coach, content uploads) live in the SHI admin panel.
      </p>
      <SettingsTab scope="brickos" />
    </div>
  )
}
