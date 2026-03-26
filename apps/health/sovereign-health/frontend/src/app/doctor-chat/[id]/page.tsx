'use client'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'
import { useParams } from 'next/navigation'
import { ChatLayout } from '@/components/doctor-chat/chat-layout'
import { Navbar } from '@/components/layout/navbar'

export default function DoctorChatConversationPage() {
  const { loading } = useAuth()
  const tCommon = useTranslations('common')
  const params = useParams()
  const conversationId = params.id as string

  if (loading) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 min-h-0 max-w-5xl mx-auto w-full">
        <ChatLayout conversationId={conversationId} />
      </div>
    </div>
  )
}
