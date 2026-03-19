'use client'

import { useEffect, useState } from 'react'
import { SITE_CONFIG } from '@/lib/config'

interface InfoBarData {
  enabled: boolean
  message: string
  color: string
  button: boolean
  button_text: string
  button_url: string
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-600 text-white',
  yellow: 'bg-amber-500 text-black',
  red: 'bg-red-600 text-white',
  green: 'bg-emerald-600 text-white',
  purple: 'bg-purple-600 text-white',
}

export function InfoBar() {
  const [data, setData] = useState<InfoBarData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('sh_web_infobar_dismissed')
    if (stored) { setDismissed(true); return }

    fetch(`${SITE_CONFIG.apiUrl}/api/config/infobar?target=web`)
      .then(r => r.json())
      .then(res => {
        if (res.data?.enabled && res.data?.message) setData(res.data)
      })
      .catch(() => {})
  }, [])

  if (!data || dismissed) return null

  const colors = COLOR_MAP[data.color] || COLOR_MAP.blue

  return (
    <div className={`${colors} px-4 py-2 text-sm flex items-center justify-center gap-3`}>
      <span className="text-center flex-1">{data.message}</span>
      {data.button && data.button_text && data.button_url && (
        <a
          href={data.button_url}
          target={data.button_url.startsWith('http') ? '_blank' : undefined}
          rel={data.button_url.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-medium text-xs transition-colors"
        >
          {data.button_text}
        </a>
      )}
      <button
        onClick={() => { setDismissed(true); sessionStorage.setItem('sh_web_infobar_dismissed', '1') }}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
