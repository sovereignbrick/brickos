'use client'

import { useTranslations } from 'next-intl'
import { useInstall } from '@/lib/install-context'
import { usePush } from '@/lib/push-context'
import { Download, Check, Bell, BellOff } from 'lucide-react'

/**
 * Sprint 042 #528 Phase D: brickos master Notifications tab.
 *
 * Carved out of the Sprint 040 Account tab so device-level concerns
 * (PWA install, push subscriptions) live alongside the future
 * per-channel notification toggles instead of being mixed into
 * personal account settings.
 *
 * **Per-app PWA installation:** today the SHI frontend, the brickos
 * platform admin GUI, and the future white-label customer apps all
 * share one origin in dev/staging. That means one PWA per origin --
 * the install button installs whatever the current origin's manifest
 * declares. Once #526 (URL namespace consolidation) ships, each
 * brickos app gets its own origin (app.brickos.io vs
 * app.sovereignhealth.io vs life-algorithm.brickos.io etc.) and
 * the same install button auto-DTRT for whichever app the user is
 * currently on. No code change needed at that point -- the install
 * context already reads from the current page's manifest.
 */
export function NotificationsTab() {
  const tInstall = useTranslations('install')
  const tPush = useTranslations('push')
  const { canInstall, isInstalled, promptInstall } = useInstall()
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePush()

  return (
    <div className="space-y-4">
      {/* Install as PWA */}
      {(canInstall || isInstalled) && (
        <div className="border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{tInstall('title')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{tInstall('description')}</p>
          </div>
          {canInstall ? (
            <button
              onClick={promptInstall}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              {tInstall('button')}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
              <Check className="h-4 w-4" />
              {tInstall('installed')}
            </span>
          )}
        </div>
      )}

      {/* Push Notifications */}
      {pushSupported && (
        <div className="border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{tPush('title')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{tPush('description')}</p>
          </div>
          {pushPermission === 'denied' ? (
            <span className="text-xs text-muted-foreground">{tPush('denied')}</span>
          ) : pushSubscribed ? (
            <button
              onClick={pushUnsubscribe}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors"
            >
              <BellOff className="h-4 w-4" />
              {tPush('disable')}
            </button>
          ) : (
            <button
              onClick={pushSubscribe}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Bell className="h-4 w-4" />
              {tPush('enable')}
            </button>
          )}
        </div>
      )}

      {/* Sprint 042 #528 Phase D placeholder for future per-channel
          notification toggles (newsletter, payment failure, grace banner,
          ntfy/telegram for admins). Today these are scattered across
          Privacy (newsletter consent) and the admin dashboards. Pulling
          them into one place is Sprint 04N+ work. */}
    </div>
  )
}
