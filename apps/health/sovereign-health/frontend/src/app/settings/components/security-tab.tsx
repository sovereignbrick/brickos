'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

export function SecurityTab() {
  const t = useTranslations('settings.security')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const { isDemo } = useAuth()
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // MFA setup flow state
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'recovery' | 'done'>('idle')
  const [setupData, setSetupData] = useState<{ setup_token: string; qr_svg: string; secret_base32: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [setupSubmitting, setSetupSubmitting] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [recoveryAcked, setRecoveryAcked] = useState(false)

  // Disable flow
  const [showDisable, setShowDisable] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  // Regenerate flow
  const [showRegen, setShowRegen] = useState(false)
  const [regenCode, setRegenCode] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // Change password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMfaCode, setPwMfaCode] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    api.mfa.status().then(res => {
      setMfaEnabled(res.data.enabled)
      setMfaVerifiedAt(res.data.verified_at)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [isDemo])

  const handleEnableMfa = async () => {
    try {
      const res = await api.mfa.setup()
      setSetupData(res.data)
      setSetupStep('qr')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    }
  }

  const handleVerifySetup = async () => {
    if (!setupData) return
    setSetupSubmitting(true)
    try {
      const res = await api.mfa.verifySetup(setupData.setup_token, setupCode)
      setRecoveryCodes(res.data.recovery_codes)
      setSetupStep('recovery')
      setMfaEnabled(true)
      setMfaVerifiedAt(new Date().toISOString())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setSetupSubmitting(false)
    }
  }

  const handleDisableMfa = async () => {
    setDisabling(true)
    try {
      await api.mfa.disable(disableCode)
      setMfaEnabled(false)
      setMfaVerifiedAt(null)
      setShowDisable(false)
      setDisableCode('')
      toast.success(tToast('mfaDisabled'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setDisabling(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await api.mfa.regenerateRecovery(regenCode)
      setRecoveryCodes(res.data.recovery_codes)
      setShowRegen(false)
      setRegenCode('')
      setSetupStep('recovery')
      setRecoveryAcked(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setRegenerating(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast.error(tToast('passwordMismatch')); return }
    if (newPw.length < 8) { toast.error(tToast('passwordTooShort')); return }
    setChangingPw(true)
    try {
      const res = await api.changePassword(currentPw, newPw, mfaEnabled ? pwMfaCode || undefined : undefined)
      toast.success(res.data.message)
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwMfaCode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setChangingPw(false)
    }
  }

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    toast.success(tToast('recoveryCodesCopied'))
  }

  const downloadRecoveryCodes = () => {
    const text = `Sovereign Health - Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n\nEach code can only be used once.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'recovery-codes.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center text-muted-foreground py-8">{tCommon('loading')}</div>

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Security settings are not available in demo mode.</p>
        </div>
      </div>
    )
  }

  // Recovery codes modal
  if (setupStep === 'recovery' && recoveryCodes.length > 0) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium">{t('recoveryCodes')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('recoveryCodesDesc')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="bg-card border border-border rounded px-3 py-2 text-sm font-mono text-center">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={copyRecoveryCodes} className="px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors">
              {t('copyAll')}
            </button>
            <button onClick={downloadRecoveryCodes} className="px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors">
              {t('downloadCodes')}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recoveryAcked} onChange={e => setRecoveryAcked(e.target.checked)} className="rounded" />
            I have saved my recovery codes
          </label>
          <button
            onClick={() => { setSetupStep('done'); setRecoveryCodes([]) }}
            disabled={!recoveryAcked}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // MFA QR setup step
  if (setupStep === 'qr' && setupData) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium">{t('setupMfa')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('scanQr')}
          </p>
          <div className="flex justify-center bg-white rounded-lg p-4 max-w-[240px] mx-auto" dangerouslySetInnerHTML={{ __html: setupData.qr_svg }} />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('manualEntry')}</p>
            <p className="font-mono text-sm bg-card border border-border rounded px-3 py-2 select-all break-all">
              {setupData.secret_base32}
            </p>
          </div>
          <div>
            <label htmlFor="settings-mfa-setup-code" className="text-sm text-muted-foreground block mb-1.5">
              {t('enterCode')}
            </label>
            <input
              id="settings-mfa-setup-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={setupCode}
              onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-accent border rounded-lg px-3 py-3 text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleVerifySetup}
              disabled={setupSubmitting || setupCode.length < 6}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {setupSubmitting ? 'Verifying...' : t('verify')}
            </button>
            <button
              onClick={() => { setSetupStep('idle'); setSetupData(null); setSetupCode('') }}
              className="px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Two-Factor Authentication */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('twoFactor')}</h3>
        {mfaEnabled ? (
          <>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">Enabled</span>
              {mfaVerifiedAt && (
                <span className="text-xs text-muted-foreground">
                  since {new Date(mfaVerifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowRegen(true)}
                className="px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
              >
                {t('regenerate')}
              </button>
              <button
                onClick={() => setShowDisable(true)}
                className="px-4 py-2 text-sm text-red-400 border border-red-800 rounded-lg hover:bg-red-600/10 transition-colors"
              >
                {t('disableMfa')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('twoFactorDesc')}
            </p>
            <button
              onClick={handleEnableMfa}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              {t('enableMfa')}
            </button>
          </>
        )}
      </div>

      {/* Disable MFA modal */}
      {showDisable && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Disable Two-Factor Authentication?</h2>
            <p className="text-sm text-muted-foreground">
              This will remove the extra security from your account.
              Enter your current authenticator code to confirm.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-accent border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDisable(false); setDisableCode('') }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={disabling || disableCode.length < 6}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {disabling ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate recovery codes modal */}
      {showRegen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Regenerate Recovery Codes</h2>
            <p className="text-sm text-muted-foreground">
              Enter your current authenticator code to generate new recovery codes.
              This will invalidate all existing recovery codes.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={regenCode}
              onChange={e => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-accent border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowRegen(false); setRegenCode('') }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || regenCode.length < 6}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('changePassword')}</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label htmlFor="settings-current-password" className="text-sm text-muted-foreground block mb-1">{t('currentPassword')}</label>
            <input id="settings-current-password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="settings-new-password" className="text-sm text-muted-foreground block mb-1">{tCommon('newPassword')}</label>
            <input id="settings-new-password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {newPw.length > 0 && newPw.length < 8 && (
              <p className="text-xs text-yellow-400 mt-1">{t('security.passwordTooShort')}</p>
            )}
          </div>
          <div>
            <label htmlFor="settings-confirm-password" className="text-sm text-muted-foreground block mb-1">{t('confirmNewPassword')}</label>
            <input id="settings-confirm-password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <p className="text-xs text-red-400 mt-1">{t('security.passwordMismatch')}</p>
            )}
          </div>
          {mfaEnabled && (
            <div>
              <label htmlFor="settings-mfa-code" className="text-sm text-muted-foreground block mb-1">{t('mfaCode')}</label>
              <input id="settings-mfa-code" type="text" inputMode="numeric" maxLength={6} value={pwMfaCode}
                onChange={e => setPwMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-accent border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={changingPw || !currentPw || newPw.length < 8 || newPw !== confirmPw}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {changingPw ? t('changing') : t('changeButton')}
          </button>
        </div>
      </div>

    </div>
  )
}
