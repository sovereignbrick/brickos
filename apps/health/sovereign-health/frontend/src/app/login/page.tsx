'use client'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { loginSchema, LoginInput } from '@/lib/validators'
import { api, setToken } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useBrand } from '@/lib/brand'
import { useOrg, getOrgLogo } from '@/lib/org-context'
import { getPlane, swapPlaneHost } from '@/lib/plane'
import { APP_CONFIG } from '@/lib/config'

function MfaVerifyForm({
  mfaToken,
  onSuccess,
  onExpired,
}: {
  mfaToken: string
  onSuccess: (data: { user: import('@/lib/types').User; token: string; refresh_token: string }) => void
  onExpired: () => void
}) {
  const t = useTranslations('auth.mfa')
  const tAuth = useTranslations('auth')
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [useRecovery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.mfa.verifyLogin(
        mfaToken,
        useRecovery ? undefined : code,
        useRecovery ? recoveryCode : undefined,
      )
      if (res.data.recovery_warning) {
        toast.warning(res.data.recovery_warning)
      }
      onSuccess(res.data as { user: import('@/lib/types').User; token: string; refresh_token: string })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      if (message.includes('expired') || message.includes('log in again')) {
        toast.error(tAuth('sessionExpired'))
        onExpired()
        return
      }
      // Try to extract attempts_remaining from error
      const match = message.match(/(\d+)/)
      if (match) {
        setAttemptsRemaining(parseInt(match[1]))
      }
      toast.error(message)
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-submit when 6 digits entered (TOTP mode only)
  useEffect(() => {
    if (!useRecovery && code.length === 6) {
      const form = document.getElementById('mfa-form') as HTMLFormElement
      form?.requestSubmit()
    }
  }, [code, useRecovery])

  return (
    <form id="mfa-form" onSubmit={handleSubmit} className="space-y-4">
      {useRecovery ? (
        <>
          <p className="text-sm text-muted-foreground">Enter one of your recovery codes</p>
          <input
            ref={inputRef}
            type="text"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder={t('recoveryPlaceholder')}
            className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => { setUseRecovery(false); setRecoveryCode('') }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {t('useAuthenticator')}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('enterCode')}
          </p>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('codePlaceholder')}
            className="w-full bg-white/5 border rounded-lg px-3 py-4 text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => { setUseRecovery(true); setCode('') }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {t('useRecovery')}
          </button>
        </>
      )}

      {attemptsRemaining !== null && attemptsRemaining <= 3 && (
        <p className="text-xs text-yellow-400">
          {t('attemptsRemaining', { count: attemptsRemaining })}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || (!useRecovery && code.length < 6) || (useRecovery && !recoveryCode.trim())}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {submitting ? t('verifying') : t('verify')}
      </button>
    </form>
  )
}

function LoginContent() {
  const { setUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tToast = useTranslations('auth.toast')
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const { brand, mounted } = useBrand()
  const org = useOrg()
  const [mfaToken, setMfaToken] = useState<string | null>(null)

  // Sprint 044 #549: org branding overrides default brand
  const orgLogo = org.isOrg ? getOrgLogo(org.branding) : null
  const displayName = org.isOrg ? org.orgName : brand.appName
  const displaySubtitle = org.isOrg
    ? `Sign in to ${org.orgName}`
    : brand.subtitle

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
  })

  const emailValue = watch('email', '')

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success(t('emailVerified'))
    }
    if (searchParams.get('expired') === 'true') {
      toast.info(t('sessionExpired'))
    }
  }, [searchParams, t])

  useEffect(() => {
    api.auth.registrationStatus()
      .then(res => setRegistrationEnabled(res.data.enabled))
      .catch(() => {})
  }, [])

  const showWelcome = (userName?: string | null) => {
    const hasLoggedInBefore = localStorage.getItem('sh_has_logged_in')
    const name = userName || 'back'
    if (hasLoggedInBefore) {
      toast.success(tToast('welcomeBack', { name }), { duration: 2000 })
    } else {
      toast.success(tToast('welcomeNew', { name }), { duration: 5000 })
    }
    localStorage.setItem('sh_has_logged_in', '1')
  }

  /**
   * Decode the org_role claim out of a freshly-minted JWT so the post-
   * login landing can route patients to the end-user plane (instead of
   * landing them on /platform/org admin UI they have no business on).
   * Sprint 051 #0594 follow-up. Pure-function, no throws.
   */
  const extractOrgRole = (token: string): string | null => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1]))
      return typeof payload.org_role === 'string' ? payload.org_role : null
    } catch {
      return null
    }
  }

  const getReturnUrl = (token?: string) => {
    const returnParam = searchParams.get('return')
    if (returnParam && returnParam.startsWith('/') && !returnParam.startsWith('//')) {
      return returnParam
    }
    // Check for pending checkout stored by signup page
    try {
      const pending = sessionStorage.getItem('sh_pending_checkout')
      if (pending) {
        const { tier, interval, promo } = JSON.parse(pending)
        if (tier) {
          const params = new URLSearchParams({ tier, interval: interval || 'monthly' })
          if (promo) params.set('promo', promo)
          return `/checkout?${params.toString()}`
        }
      }
    } catch {}
    // Sprint 045 #564: default landing depends on plane. End users land on
    // /dashboard (SHI app); org admins on {slug}.brickos.io land on /org.
    // Sprint 051 #0594 follow-up: a PATIENT (org_member / consumer /
    // member) who lands on the admin plane login should NOT end up on
    // /platform/org -- that's an admin surface. Cross-plane to the end-
    // user equivalent of the same org subdomain.
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      const plane = getPlane(host)
      const orgRole = token ? extractOrgRole(token) : null
      const isPatient = orgRole === 'org_member' || orgRole === 'member' || orgRole === 'consumer'
      if (plane === 'admin' && isPatient) {
        const swapped = swapPlaneHost(host, 'end-user')
        if (swapped) {
          return `https://${swapped}/sovereign-health/dashboard`
        }
      }
      if (plane === 'admin') return '/platform/org'
    }
    return '/sovereign-health/dashboard'
  }

  const handleMfaSuccess = (data: { user: import('@/lib/types').User; token: string; refresh_token: string }) => {
    setToken(data.token)
    setUser(data.user)
    showWelcome(data.user.display_name)
    navigateTo(getReturnUrl(data.token))
  }

  // Sprint 051 #0594 follow-up: getReturnUrl may now return a
  // cross-plane absolute URL (https://...sovereignhealth.io/...). Next
  // router.push rejects absolute URLs on different origins; fall back
  // to window.location for those.
  const navigateTo = (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      window.location.href = url
    } else {
      router.push(url)
    }
  }

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await api.auth.login({ email: data.email.trim(), password: data.password.trim() })
      if (res.data.mfa_required && res.data.mfa_token) {
        setMfaToken(res.data.mfa_token)
        return
      }
      if (res.data.token && res.data.user) {
        setToken(res.data.token)
        setUser(res.data.user)
        showWelcome(res.data.user.display_name)
        navigateTo(getReturnUrl(res.data.token))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      if (message.includes('verify your email')) {
        setShowResend(true)
        setResendEmail(data.email)
      }
      const isNetworkError = message.includes('fetch') || message.includes('NetworkError') || message.includes('Failed to fetch')
      toast.error(isNetworkError ? t('networkError') : message)
    }
  }

  const handleResend = async () => {
    try {
      await api.auth.resendVerification(resendEmail || emailValue)
      toast.success(tToast('verificationSent'))
    } catch {
      toast.error(tToast('resendFailed'))
    }
  }

  // MFA verification screen
  if (mfaToken) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-lg brand-logo" data-brand={brand.logo.includes("brickos") ? "brickos" : "shi"} />
            <h1 className="text-2xl font-bold">{t('mfa.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('mfa.subtitle')}
            </p>
          </div>
          <MfaVerifyForm
            mfaToken={mfaToken}
            onSuccess={handleMfaSuccess}
            onExpired={() => setMfaToken(null)}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          {orgLogo ? (
            <Image src={orgLogo} alt={displayName} width={64} height={64} className="rounded-lg object-contain" unoptimized />
          ) : (
            // Sprint 046 #11 hotfix (round 7): use the existing useBrand()
            // hook -- it reads the brand_context cookie set by middleware
            // so the BrickOS cube appears on brickos.io hosts without an
            // SSR/CSR hydration mismatch. A raw `typeof window` check fails
            // because Next.js renders SSR with no window, producing /logo.png,
            // then the client keeps that value across hydration.
            <Image
              src={brand.logo}
              alt={brand.logoAlt}
              width={64}
              height={64}
              className="rounded-lg"
            />
          )}
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground text-sm">{displaySubtitle}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium block mb-1.5">{tCommon('email')}</label>
            <input
              id="login-email"
              type="email"
              {...register('email')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={t('emailPlaceholder')}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-sm font-medium">{t('password')}</label>
              <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                {t('forgotPassword')}
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              {...register('password')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={t('passwordPlaceholder')}
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting ? t('signingIn') : t('signInButton')}
          </button>
        </form>

        {showResend && (
          <div className="mt-4 rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4 text-center">
            <p className="text-sm text-yellow-300 mb-2">{t('emailNotVerified')}</p>
            <button
              onClick={handleResend}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {t('resendVerification')}
            </button>
          </div>
        )}

        {!org.isOrg && brand.showRegister && (registrationEnabled ? (
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              {t('noAccount')}
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              {t('noAccountWaitlist')}
            </Link>
          </p>
        ))}

        {!org.isOrg && brand.showDemo && (
          <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t('demoExplore')}
            </p>
            {/* Sprint 051 hotfix: was Link href="/sovereign-health/dashboard"
                which is auth-gated; unauthed visitors bounced back to
                /login in an infinite loop. Demo surface lives on a
                dedicated host per Design 029 -- cross-plane <a> avoids
                the auth gate entirely. */}
            <a
              href={`https://${APP_CONFIG.evalHost}/`}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {t('viewDemo')}
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
