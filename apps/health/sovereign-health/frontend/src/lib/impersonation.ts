// Sprint 048 #048-18/19: practitioner impersonation client state.
//
// Two cookies back the client-side state:
//   impersonation_session   -- UUID session id, sent as X-Impersonation-Token
//   impersonation_patient   -- base64(JSON) of { name, email, user_id }
//                              for banner rendering without another round-trip
//
// Both are session cookies (no `expires`) so closing the tab clears
// them. The backend's impersonation_sessions row has its own 30-min
// idle timeout which is authoritative for access control -- the cookie
// is a convenience for UX only. A stale cookie with a dead session
// just triggers 401s that flow through the normal expired-session
// handling.

import Cookies from 'js-cookie'

export interface ImpersonationPatient {
  user_id: string
  name: string
  email: string
}

export interface ImpersonationSession {
  session_id: string
  patient: ImpersonationPatient
  expires_at: string
}

const COOKIE_SESSION = 'impersonation_session'
const COOKIE_PATIENT = 'impersonation_patient'

function cookieDomainForHost(host: string): string | undefined {
  if (host.endsWith('.brickos.io')) return '.brickos.io'
  if (host.endsWith('.sovereignhealth.io')) return '.sovereignhealth.io'
  return undefined
}

function encodePatient(p: ImpersonationPatient): string {
  return typeof window !== 'undefined'
    ? window.btoa(JSON.stringify(p))
    : Buffer.from(JSON.stringify(p)).toString('base64')
}

function decodePatient(raw: string): ImpersonationPatient | null {
  try {
    const json = typeof window !== 'undefined'
      ? window.atob(raw)
      : Buffer.from(raw, 'base64').toString('utf-8')
    return JSON.parse(json) as ImpersonationPatient
  } catch {
    return null
  }
}

export function getImpersonationSession(): ImpersonationSession | null {
  if (typeof window === 'undefined') return null
  const sessionId = Cookies.get(COOKIE_SESSION)
  const patientRaw = Cookies.get(COOKIE_PATIENT)
  if (!sessionId || !patientRaw) return null
  const patient = decodePatient(patientRaw)
  if (!patient) return null
  return { session_id: sessionId, patient, expires_at: '' }
}

export function setImpersonationSession(
  sessionId: string,
  patient: ImpersonationPatient,
): void {
  const host = window.location.hostname
  const domain = cookieDomainForHost(host)
  const opts: Cookies.CookieAttributes = {
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
    path: '/',
    ...(domain ? { domain } : {}),
  }
  Cookies.set(COOKIE_SESSION, sessionId, opts)
  Cookies.set(COOKIE_PATIENT, encodePatient(patient), opts)
}

export function clearImpersonationSession(): void {
  if (typeof window === 'undefined') return
  const host = window.location.hostname
  const domain = cookieDomainForHost(host)
  const opts: Cookies.CookieAttributes = { path: '/', ...(domain ? { domain } : {}) }
  Cookies.remove(COOKIE_SESSION, opts)
  Cookies.remove(COOKIE_PATIENT, opts)
}

export function isImpersonating(): boolean {
  return getImpersonationSession() !== null
}
