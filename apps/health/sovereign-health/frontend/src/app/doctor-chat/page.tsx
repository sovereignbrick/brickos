'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'
import { ChatLayout } from '@/components/doctor-chat/chat-layout'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumb } from '@/components/breadcrumb'

export default function DoctorChatPage() {
  const { loading, isDemo } = useAuth()
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('q') || undefined
  const t = useTranslations('doctorChat')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')

  if (loading) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  if (isDemo) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="mb-4 text-left">
            <Breadcrumb items={[
              { label: tNav('overview'), href: '/dashboard' },
              { label: tNav('doctorChat') },
            ]} />
          </div>
          <div className="text-5xl mb-6">🩺</div>
          <h1 className="text-2xl font-bold mb-3">{t('meetDrAlex')}</h1>
          <p className="text-muted-foreground mb-2">
            {t('desc')}
          </p>
          <p className="text-muted-foreground mb-8">
            {t('registeredOnly')}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl transition-colors inline-block"
            >
              {tCommon('signUp')}
            </Link>
            <Link
              href="/login"
              className="bg-accent hover:bg-accent/80 text-foreground font-medium px-6 py-3 rounded-xl transition-colors inline-block"
            >
              {tNav('login')}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 min-h-0 max-w-5xl mx-auto w-full flex flex-col overflow-hidden">
        <ChatLayout initialPrompt={initialPrompt} />
      </div>
    </div>
  )
}
