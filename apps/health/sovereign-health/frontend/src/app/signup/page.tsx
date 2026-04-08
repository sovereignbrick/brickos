'use client'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { signupSchema, SignupInput } from '@/lib/validators'
import { api, setToken } from '@/lib/api'
import Cookies from 'js-cookie'
import Link from 'next/link'
import Image from 'next/image'
import { useBrand } from '@/lib/brand'
import { toast } from '@/lib/toast'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import { useContent } from '@/lib/content-context'
import { locales, localeNames } from '@/i18n/config'
import { COUNTRIES, detectCountryFromLocale } from '@/lib/countries'

function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations('auth.signup.strength')
  const tCommon = useTranslations('common')
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const labels = [t('weak'), tCommon('fair'), tCommon('good'), t('strong'), t('veryStrong')]
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-400']
  const idx = Math.min(score, 4)

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= idx ? colors[idx] : 'bg-zinc-700'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[idx]}</p>
    </div>
  )
}

function SignupContent() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const ts = useTranslations('auth.signup')
  const tToast = useTranslations('auth.toast')
  const brand = useBrand()
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [submittedPassword, setSubmittedPassword] = useState('')
  const [verifyingLogin, setVerifyingLogin] = useState(false)
  const [earlyAccessEmail, setEarlyAccessEmail] = useState('')
  const [earlyAccessSubmitted, setEarlyAccessSubmitted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setUser } = useAuth()
  const referralCode = useRef<string | null>(null)
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLocaleSwitch = (newLocale: string) => {
    setContentLocale(newLocale)
    setLangOpen(false)
    router.refresh()
  }

  // Store pending checkout from URL params (tier, interval, promo)
  useEffect(() => {
    const tier = searchParams.get('tier')
    const interval = searchParams.get('interval')
    if (tier) {
      const pending = { tier, interval: interval || 'monthly', promo: searchParams.get('promo') || undefined, method: searchParams.get('method') || undefined }
      sessionStorage.setItem('sh_pending_checkout', JSON.stringify(pending))
    }
  }, [searchParams])

  // Detect referral code from URL param or cookie (first-touch)
  useEffect(() => {
    const refParam = searchParams.get('ref')?.trim().toLowerCase()
    const refCookie = Cookies.get('sh_ref')?.trim().toLowerCase()
    const code = refParam || refCookie || null

    if (code && code.length > 0) {
      referralCode.current = code
      // Also set/refresh the cookie on the app domain
      if (!refCookie) {
        Cookies.set('sh_ref', code, { expires: 30, sameSite: 'lax', path: '/' })
      }
      // Fire click tracking (fire and forget)
      api.affiliate.click(code)
    }
  }, [searchParams])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: {
      consent_newsletter: false,
      country: detectCountryFromLocale(),
    },
  })

  const password = watch('password', '')

  useEffect(() => {
    api.auth.registrationStatus()
      .then(res => setRegistrationEnabled(res.data.enabled))
      .catch(() => setRegistrationEnabled(true))
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (!submitted) return
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  const onSubmit = async (data: SignupInput) => {
    try {
      await api.auth.signup({
        email: data.email.trim(),
        password: data.password.trim(),
        display_name: data.display_name || undefined,
        tos_accepted: data.tos_accepted,
        referred_by: referralCode.current || undefined,
        locale: contentLocale,
        consent_newsletter: data.consent_newsletter,
        country: data.country || undefined,
      })
      // Clear referral cookie after successful registration
      Cookies.remove('sh_ref')
      setSubmittedEmail(data.email)
      setSubmittedPassword(data.password)
      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('registrationFailed'))
    }
  }

  const handleResend = async () => {
    try {
      await api.auth.resendVerification(submittedEmail)
      toast.success(tToast('verificationSent'))
      setCanResend(false)
      setResendCooldown(60)
    } catch {
      toast.error(tToast('resendFailed'))
    }
  }

  const handleVerifiedLogin = async () => {
    if (!submittedEmail || !submittedPassword) {
      router.push('/login')
      return
    }
    setVerifyingLogin(true)
    try {
      const res = await api.auth.login({ email: submittedEmail, password: submittedPassword })
      if (res.data.token && res.data.user) {
        setToken(res.data.token)
        setUser(res.data.user)
        // Check for pending checkout
        try {
          const pending = sessionStorage.getItem('sh_pending_checkout')
          if (pending) {
            const { tier, interval, promo, method } = JSON.parse(pending)
            if (tier) {
              const params = new URLSearchParams({ tier, interval: interval || 'monthly' })
              if (promo) params.set('promo', promo)
              if (method && method !== 'card') params.set('method', method)
              router.replace(`/checkout?${params.toString()}`)
              return
            }
          }
        } catch {}
        router.replace('/dashboard')
      } else if (res.data.mfa_required) {
        router.push('/login')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('not verified') || msg.includes('EMAIL_NOT_VERIFIED')) {
        toast.error(t('emailNotVerified'))
      } else {
        toast.error(msg || tToast('somethingWentWrong'))
      }
    } finally {
      setVerifyingLogin(false)
    }
  }

  const handleEarlyAccess = async () => {
    try {
      await api.earlyAccess.submit(earlyAccessEmail)
      setEarlyAccessSubmitted(true)
      toast.success(tToast('addedToWaitlist'))
    } catch {
      toast.error(tToast('somethingWentWrong'))
    }
  }

  const languageSelector = (
    <div className="absolute top-4 right-4" ref={langRef}>
      <button
        onClick={() => setLangOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        aria-label={tCommon('changeLanguage')}
      >
        {contentLocale.toUpperCase()}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {langOpen && (
        <div className="absolute right-0 top-8 w-32 rounded-xl border bg-zinc-900 shadow-xl py-1 z-50">
          {locales.map(loc => (
            <button
              key={loc}
              onClick={() => handleLocaleSwitch(loc)}
              className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                contentLocale === loc
                  ? 'text-foreground bg-white/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const brandingHeader = (title?: string) => (
    <div className="mb-8 flex flex-col items-center gap-3">
      <img src={brand.logo} alt={brand.logoAlt} width={64} height={64} className="rounded-lg" />
      <h1 className="text-2xl font-bold">{t('brandName')}</h1>
      {title && <p className="text-muted-foreground text-sm">{title}</p>}
    </div>
  )

  // Loading state
  if (registrationEnabled === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        {languageSelector}
        <div className="w-full max-w-sm text-center">
          <p className="text-muted-foreground text-sm">{t('signingIn').replace('...', '') + '...'}</p>
        </div>
      </main>
    )
  }

  // Registration closed
  if (!registrationEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        {languageSelector}
        <div className="w-full max-w-sm text-center">
          {brandingHeader(ts('createAccount'))}

          <div className="rounded-2xl border border-dashed p-8 space-y-4">
            <p className="text-muted-foreground text-sm">
              {ts('registrationClosed')}
            </p>
            {earlyAccessSubmitted ? (
              <p className="text-green-400 text-sm font-medium">{ts('onList')}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={earlyAccessEmail}
                  onChange={e => setEarlyAccessEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="flex-1 bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleEarlyAccess}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {ts('joinButton')}
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              {ts('alreadyHaveAccount')}
            </Link>
          </p>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {ts('exploreDemo')}
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {t('viewDemo')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Submitted - verification pending
  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        {languageSelector}
        <div className="w-full max-w-sm text-center">
          {brandingHeader()}
          <div className="rounded-2xl border p-8 space-y-4">
            <div className="text-4xl">&#9993;</div>
            <h2 className="text-lg font-semibold">{ts('checkEmail')}</h2>
            <p className="text-muted-foreground text-sm">
              {ts('verificationSent', { email: submittedEmail })}
            </p>
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                {t('resendVerification')}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {ts('resendIn', { seconds: resendCooldown })}
              </p>
            )}
            <button
              onClick={handleVerifiedLogin}
              disabled={verifyingLogin}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {verifyingLogin ? '...' : ts('iveVerified')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              {t('signInButton')}
            </Link>
          </p>
        </div>
      </main>
    )
  }

  // Registration form
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      {languageSelector}
      <div className="w-full max-w-sm">
        <div className="text-center">
          {brandingHeader(ts('createAccount'))}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="text-sm font-medium block mb-1.5">{tCommon('email')}</label>
            <input
              id="signup-email"
              type="email"
              {...register('email')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={t('emailPlaceholder')}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="signup-password" className="text-sm font-medium block mb-1.5">{t('password')}</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors pr-16"
                placeholder={ts('minChars')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPassword ? ts('hide') : ts('show')}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            <PasswordStrength password={password} />
          </div>
          <div>
            <label htmlFor="signup-confirm-password" className="text-sm font-medium block mb-1.5">{ts('confirmPassword')}</label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                {...register('confirm_password')}
                className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors pr-16"
                placeholder={ts('confirmPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? ts('hide') : ts('show')}
              </button>
            </div>
            {errors.confirm_password && <p className="text-xs text-red-400 mt-1">{errors.confirm_password.message}</p>}
          </div>
          <div>
            <label htmlFor="signup-display-name" className="text-sm font-medium block mb-1.5">{ts('displayName')}</label>
            <input
              id="signup-display-name"
              type="text"
              {...register('display_name')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={ts('displayNamePlaceholder')}
            />
            {errors.display_name && <p className="text-xs text-red-400 mt-1">{errors.display_name.message}</p>}
          </div>
          <div>
            <label htmlFor="signup-country" className="text-sm font-medium block mb-1.5">{ts('country')}</label>
            <select
              id="signup-country"
              {...register('country')}
              className="w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="">{ts('selectCountry')}</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {contentLocale === 'de' ? c.name.de : c.name.en}
                </option>
              ))}
            </select>
            {errors.country && <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>}
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('tos_accepted')} className="mt-0.5 rounded" />
              <span className="text-xs text-muted-foreground">
                {ts.rich('agreeTerms', {
                  terms: (chunks) => (
                    <a href="https://sovereignhealth.io/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{chunks}</a>
                  ),
                  privacy: (chunks) => (
                    <a href="https://sovereignhealth.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{chunks}</a>
                  ),
                })}
              </span>
            </label>
            {errors.tos_accepted && <p className="text-xs text-red-400">{errors.tos_accepted.message}</p>}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('age_confirmed')} className="mt-0.5 rounded" />
              <span className="text-xs text-muted-foreground">
                {ts('ageConfirm')}
              </span>
            </label>
            {errors.age_confirmed && <p className="text-xs text-red-400">{errors.age_confirmed.message}</p>}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('consent_newsletter')} className="mt-0.5 rounded" />
              <span className="text-xs text-muted-foreground">{ts('newsletter')}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting ? ts('creating') : ts('createButton')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link
            href={(() => {
              const tier = searchParams.get('tier')
              if (tier) {
                const interval = searchParams.get('interval') || 'monthly'
                const promo = searchParams.get('promo')
                const method = searchParams.get('method')
                const returnUrl = `/checkout?tier=${tier}&interval=${interval}${promo ? `&promo=${promo}` : ''}${method && method !== 'card' ? `&method=${method}` : ''}`
                return `/login?return=${encodeURIComponent(returnUrl)}`
              }
              return '/login'
            })()}
            className="text-blue-400 hover:text-blue-300"
          >
            {ts('alreadyHaveAccount')}
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}
