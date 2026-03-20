'use client'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validators'
import { api } from '@/lib/api'
import Link from 'next/link'
import { toast } from '@/lib/toast'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tFP = useTranslations('auth.forgotPasswordPage')
  const tToast = useTranslations('auth.toast')
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await api.auth.forgotPassword(data.email)
      setSubmitted(true)
    } catch {
      toast.error(tToast('forgotPasswordFailed'))
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="Sovereign Health Intelligence" width={64} height={64} className="rounded-lg" />
            <h1 className="text-2xl font-bold">{t('brandName')}</h1>
          </div>
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tFP('checkInbox')}</h2>
            <p className="text-muted-foreground text-sm">
              {tFP('checkInboxMessage')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              {tFP('backToLogin')}
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Sovereign Health Intelligence" width={64} height={64} className="rounded-lg" />
          <h1 className="text-2xl font-bold">{t('brandName')}</h1>
          <p className="text-muted-foreground text-sm">{tFP('title')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="text-sm font-medium block mb-1.5">{tCommon('email')}</label>
            <input
              id="forgot-email"
              type="email"
              {...register('email')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={t('emailPlaceholder')}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting ? tFP('sending') : tFP('sendButton')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            {tFP('backToLogin')}
          </Link>
        </p>
      </div>
    </main>
  )
}
