'use client'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { resetPasswordSchema, ResetPasswordInput } from '@/lib/validators'
import { api } from '@/lib/api'
import Link from 'next/link'
import { toast } from '@/lib/toast'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

function ResetPasswordContent() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tRP = useTranslations('auth.resetPassword')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema),
  })

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push('/login'), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">{t('brandName')}</h1>
          </div>
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tRP('invalidLink')}</h2>
            <p className="text-muted-foreground text-sm">
              {tRP('invalidLinkMessage')}
            </p>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-block"
            >
              {tRP('requestNew')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">{t('brandName')}</h1>
          </div>
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tRP('updated')}</h2>
            <p className="text-muted-foreground text-sm">
              {tCommon('redirecting')}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await api.auth.resetPassword(token, data.password)
      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      if (message.includes('expired') || message.includes('invalid')) {
        toast.error(tRP('expired'))
      } else {
        toast.error(message)
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t('brandName')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{tRP('title')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="reset-password" className="text-sm font-medium block mb-1.5">{tCommon('newPassword')}</label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors pr-16"
                placeholder={t('passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="reset-confirm-password" className="text-sm font-medium block mb-1.5">{t('signup.confirmPassword')}</label>
            <input
              id="reset-confirm-password"
              type="password"
              {...register('confirm_password')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={t('signup.confirmPasswordPlaceholder')}
            />
            {errors.confirm_password && <p className="text-xs text-red-400 mt-1">{errors.confirm_password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting ? tRP('updating') : tRP('setButton')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300">
            {tRP('requestNew')}
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
