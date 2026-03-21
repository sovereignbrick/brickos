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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tCommon('loading')}</div>

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <ChatLayout conversationId={conversationId} />
    </div>
  )
}
