'use client'

import { useTranslations } from 'next-intl'

export function TypingIndicator() {
  const t = useTranslations('doctorChat')
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-teal-500/15 flex items-center justify-center text-sm">
        🩺
      </div>
      <div className="flex items-center gap-2 pt-1.5">
        <span className="text-sm text-white/50">{t('thinking')}</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
