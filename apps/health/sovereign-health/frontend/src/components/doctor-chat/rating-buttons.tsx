'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface RatingButtonsProps {
  messageId: string
  conversationId: string
  onRate: (messageId: string, rating: 'helpful' | 'not_helpful') => Promise<void>
}

export function RatingButtons({ messageId, onRate }: RatingButtonsProps) {
  const t = useTranslations('doctorChat')
  const [rated, setRated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRate = async (rating: 'helpful' | 'not_helpful') => {
    if (rated || loading) return
    setLoading(true)
    try {
      await onRate(messageId, rating)
      setRated(true)
    } finally {
      setLoading(false)
    }
  }

  if (rated) {
    return (
      <span className="text-xs text-white/30 mt-2 inline-block">
        {t('thanksFeedback')}
      </span>
    )
  }

  return (
    <div className="flex gap-1 mt-2">
      <button
        onClick={() => handleRate('helpful')}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
        title={t('helpful')}
      >
        👍
      </button>
      <button
        onClick={() => handleRate('not_helpful')}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
        title={t('notHelpful')}
      >
        👎
      </button>
    </div>
  )
}
