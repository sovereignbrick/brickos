import Cookies from 'js-cookie'
import type { ImportSession, ImportMedication, ImportHistoryEntry, UserMedicationFull, CreateMedicationInput, AiUsageResponse, InfluenceFactor, CreateInfluenceFactorInput, MedImportSession, MeasurementImportSession } from './types'
import { APP_CONFIG } from './config'

// Error codes returned by the backend API
export type ApiErrorCode =
  | 'network_error'
  | 'session_expired'
  | 'service_overloaded'
  | 'rate_limited'
  | 'upstream_error'
  | 'timeout'
  | 'quota_exceeded'
  | 'validation_error'
  | 'not_found'
  | 'forbidden'
  | 'upgrade_required'
  | 'unknown'

export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

/** Classify a backend error code string into a typed ApiErrorCode */
export function classifyApiError(code: string | undefined, message: string): ApiErrorCode {
  if (code) {
    const known: ApiErrorCode[] = [
      'service_overloaded', 'rate_limited', 'upstream_error', 'timeout',
      'quota_exceeded', 'validation_error', 'not_found', 'forbidden', 'upgrade_required',
    ]
    if (known.includes(code as ApiErrorCode)) return code as ApiErrorCode
    if (code === 'service_unavailable') return 'service_overloaded'
    if (code === 'internal_error') return 'upstream_error'
  }
  // Fallback: classify from message text
  const msg = message.toLowerCase()
  if (msg.includes('offline') || msg.includes('connect')) return 'network_error'
  if (msg.includes('unauthorized') || msg.includes('session')) return 'session_expired'
  if (msg.includes('overloaded') || msg.includes('temporarily')) return 'service_overloaded'
  if (msg.includes('rate') || msg.includes('too many')) return 'rate_limited'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout'
  return 'unknown'
}

// Runtime API URL detection:
// - .onion domains: same origin (nginx proxy for all routes)
// - *.brickos.io: same origin (admin plane, same-origin path-mount)
// - *.sovereignhealth.io: same origin after Sprint 045 #562 (end-user plane,
//   app.sovereignhealth.io migrated to same-origin path-mount, wildcard org
//   subdomains have it from the start)
// - default: build-time NEXT_PUBLIC_API_URL
const API_BASE = (() => {
  if (typeof window === 'undefined') return APP_CONFIG.apiUrl
  const host = window.location.hostname
  if (host.endsWith('.onion')) return ''
  if (host.endsWith('.brickos.io')) return ''
  if (host.endsWith('.sovereignhealth.io')) return ''
  return APP_CONFIG.apiUrl
})()

function getToken(): string | undefined {
  return Cookies.get('auth_token')
}

// Sprint 045 #564: scope the auth cookie to the tenant's parent domain so
// sessions work across the platform's specific subdomains within a plane
// (e.g. app.brickos.io <-> {slug}.brickos.io on the admin plane). The two
// planes keep separate cookies by design -- an org admin signed in on
// brickos.io still has to sign in again on sovereignhealth.io.
function cookieDomainForHost(host: string): string | undefined {
  if (host.endsWith('.brickos.io')) return '.brickos.io'
  if (host.endsWith('.sovereignhealth.io')) return '.sovereignhealth.io'
  return undefined
}

export function setToken(token: string): void {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const domain = cookieDomainForHost(host)
  Cookies.set('auth_token', token, {
    expires: APP_CONFIG.sessionTimeoutHours / 24,
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
    path: '/',
    ...(domain ? { domain } : {}),
  })
}

export function clearToken(): void {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const domain = cookieDomainForHost(host)
  Cookies.remove('auth_token', { path: '/', ...(domain ? { domain } : {}) })
}

function getLocale(): string {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/locale=([^;]+)/)
  return match?.[1] || document.documentElement.lang || 'en'
}

function demoFetch(url: string): Promise<Response> {
  return fetch(url, { headers: { 'Accept-Language': getLocale() } })
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': getLocale(),
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Sprint 048 #048-18: add the impersonation token on every authed
  // call. Backend scope-gate middleware enforces read-only + hard-
  // excluded paths when this header is present; see
  // middleware/impersonation.rs.
  const impersonationToken = typeof window !== 'undefined'
    ? Cookies.get('impersonation_session')
    : undefined
  if (impersonationToken) {
    headers['X-Impersonation-Token'] = impersonationToken
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(
      'network_error',
      navigator.onLine === false
        ? 'You are offline. Please check your connection.'
        : 'Unable to connect to the server. Please try again.'
    )
  }

  if (res.status === 401) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message || 'Unauthorized'

    // Only treat as session expiry if we had a token (i.e., an authenticated
    // request was rejected). Unauthenticated 401s (e.g. wrong password on
    // /auth/login) should surface the real error message.
    if (token) {
      clearToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'))
      }
    }

    throw new ApiError('session_expired', message)
  }

  const json = await res.json()
  if (!res.ok) {
    const code = classifyApiError(json?.error?.code, json?.error?.message || '')
    throw new ApiError(code, json?.error?.message || `HTTP ${res.status}`)
  }
  return json
}

async function rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (res.status === 401) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message || 'Unauthorized'
    if (token) {
      clearToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'))
      }
    }
    throw new Error(message)
  }
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`)
  }
  return json
}

interface SearchResult {
  entity_type: string
  entity_id: string
  title: string
  subtitle: string | null
  snippet: string | null
  url_path: string | null
  external_url: string | null
  score: number
  metadata: Record<string, unknown> | null
  user_context: { status: string | null; last_measured: string | null; is_stale: boolean } | null
  related_calculated: string[] | null
}

interface SearchResponse {
  total_results: number
  limit: number
  offset: number
  results: SearchResult[]
  user_results: SearchResult[]
  facets: Array<{ type: string; count: number }>
  blind_spots: Array<{ type: string; message: string; action_url: string }>
  dr_alex_cta: { message: string; url: string } | null
  login_cta: { message: string; url: string } | null
}

interface SuggestResponse {
  suggestions: Array<{ text: string; type: string; url: string }>
}

export type { SearchResult, SearchResponse, SuggestResponse }

export const api = {
  auth: {
    signup: (body: { email: string; password: string; display_name?: string; tos_accepted: boolean; referred_by?: string; locale?: string; consent_newsletter?: boolean; consent_product_updates?: boolean; country?: string }) =>
      request<{ data: { message: string } | { user: import('./types').User; token: string; refresh_token: string } }>(
        '/auth/signup', { method: 'POST', body: JSON.stringify(body) }
      ),
    login: (body: { email: string; password: string }) =>
      request<{ data: { user?: import('./types').User; token?: string; refresh_token?: string; mfa_required?: boolean; mfa_token?: string } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify(body) }
      ),
    me: () =>
      request<{ data: import('./types').User }>('/auth/me'),
    registrationStatus: async (): Promise<{ data: { enabled: boolean } }> => {
      try {
        const r = await fetch(`${API_BASE}/auth/registration-status`)
        if (!r.ok) return { data: { enabled: true } }
        const json = await r.json()
        if (typeof json?.data?.enabled !== 'boolean') return { data: { enabled: true } }
        return json
      } catch {
        return { data: { enabled: true } }
      }
    },
    resendVerification: (email: string) =>
      request<{ data: { message: string } }>(
        '/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }
      ),
    forgotPassword: (email: string) =>
      request<{ data: { message: string } }>(
        '/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }
      ),
    resetPassword: (token: string, password: string) =>
      request<{ data: { message: string } }>(
        '/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }
      ),
    verify: (token: string) =>
      rawRequest(`/auth/verify?token=${encodeURIComponent(token)}`).then(r => r.json()) as Promise<{ data: { verified?: boolean; already_verified?: boolean; redirect?: string }; error?: { code: string; message: string } | null }>,
  },
  measurements: {
    create: (body: object) =>
      request<{ data: { measurements: import('./types').Measurement[]; calculated: import('./types').CalculatedMarker[] } }>(
        '/measurements', { method: 'POST', body: JSON.stringify(body) }
      ),
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<import('./types').PaginatedResponse<import('./types').Measurement>>(
        `/measurements${qs}`
      )
    },
    get: (id: string) =>
      request<{ data: import('./types').Measurement }>(`/measurements/${id}`),
    filters: () =>
      request<{ data: import('./types').MeasurementFilters }>('/measurements/filters'),
    update: (id: string, body: object) =>
      request<{ data: import('./types').Measurement }>(`/measurements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ data: { deleted: boolean } }>(`/measurements/${id}`, { method: 'DELETE' }),
  },
  sync: {
    version: () =>
      request<{ data: { current_version: number } }>('/sync/version'),
    changes: (sinceVersion: number, tables?: string) => {
      const params = new URLSearchParams({ since_version: String(sinceVersion) })
      if (tables) params.set('tables', tables)
      return request<{ data: { measurements: Array<{ id: string; [key: string]: unknown }>; measurement_templates: unknown[]; user_medications: unknown[]; current_version: number } }>(
        `/sync/changes?${params}`
      )
    },
  },
  push: {
    vapidKey: () =>
      request<{ data: { vapid_public_key: string } }>('/push/vapid-key'),
    subscribe: (body: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      request<{ data: { subscribed: boolean } }>('/push/subscribe', { method: 'POST', body: JSON.stringify(body) }),
    unsubscribe: (body: { endpoint: string }) =>
      request<{ data: { unsubscribed: boolean } }>('/push/unsubscribe', { method: 'DELETE', body: JSON.stringify(body) }),
  },
  zones: {
    list: () =>
      request<{ data: import('./types').Zone[] }>('/zones'),
    get: (slug: string) =>
      request<{ data: import('./types').ZoneDetail }>(`/zones/${slug}`),
  },
  calculatedMarkers: {
    list: () =>
      request<{ data: import('./types').CalculatedMarker[] }>('/calculated-markers'),
  },
  trends: {
    get: (markerSlug: string, days = 30) =>
      request<{ data: import('./types').TrendData }>(`/trends/${markerSlug}?days=${days}`),
  },
  export: {
    csv: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][])
      ).toString() : ''
      const token = getToken()
      return fetch(`${API_BASE}/export/csv${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
  },
  markers: {
    list: () =>
      request<{ data: import('./types').MarkerDef[] }>('/markers'),
    detail: (slug: string) =>
      request<{ data: import('./types').MarkerDetail }>(`/markers/${slug}`),
    measurements: (slug: string, limit = 5) =>
      request<{ data: import('./types').MarkerMeasurement[] }>(`/markers/${slug}/measurements?limit=${limit}`),
    trend: (slug: string, period = '3m') =>
      request<{ data: import('./types').TrendData }>(`/markers/${slug}/trend?period=${period}`),
    content: (slug: string) =>
      request<{ data: import('./types').MarkerContent[] }>(`/markers/${slug}/content`),
    foods: (slug: string) =>
      request<{ data: import('./types').MarkerFood[] }>(`/markers/${slug}/foods`),
    supplements: (slug: string) =>
      request<{ data: import('./types').MarkerSupplement[] }>(`/markers/${slug}/supplements`),
    references: (slug: string) =>
      request<{ data: import('./types').MarkerReference[] }>(`/markers/${slug}/references`),
  },
  devices: {
    list: () =>
      request<{ data: import('./types').DeviceInfo[] }>('/devices'),
    create: (body: {
      name: string
      manufacturer?: string | null
      model?: string | null
      device_type: string
      markers?: string[]
      is_default?: boolean
      notes?: string | null
      lab_address?: string
      lab_postal_code?: string
      lab_city?: string
      lab_country?: string
    }) =>
      request<{ data: import('./types').DeviceInfo }>('/devices', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      request<{ data: { message: string } }>(`/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ data: { message: string } }>(`/devices/${id}`, {
        method: 'DELETE',
      }),
    setDefault: (id: string) =>
      request<{ data: { message: string } }>(`/devices/${id}/default`, {
        method: 'POST',
      }),
    history: (id: string) =>
      request<{ data: Array<{ month: string; count: number }> }>(
        `/devices/${id}/history`
      ),
  },
  labs: {
    list: () =>
      request<{ data: Array<{ id: string; name: string; address?: string; postal_code?: string; city?: string; country?: string; phone?: string; notes?: string; created_at: string }> }>('/labs'),
    create: (body: { name: string; address?: string; postal_code?: string; city?: string; country?: string; phone?: string; notes?: string }) =>
      request<{ data: { id: string } }>('/labs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      request<{ data: string }>(`/labs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ data: string }>(`/labs/${id}`, { method: 'DELETE' }),
  },
  demo: {
    zones: (profile?: string) => {
      const qs = profile ? `?profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/zones${qs}`).then(r => r.json()) as Promise<{ data: import('./types').Zone[] }>
    },
    zone: (slug: string, profile?: string) => {
      const qs = profile ? `?profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/zones/${slug}${qs}`).then(r => r.json()) as Promise<{ data: import('./types').ZoneDetail }>
    },
    measurements: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return demoFetch(`${API_BASE}/demo/measurements${qs}`).then(r => r.json()) as Promise<import('./types').PaginatedResponse<import('./types').Measurement>>
    },
    trends: (markerSlug: string, days = 30, profile?: string) => {
      const profileParam = profile ? `&profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/trends/${markerSlug}?days=${days}${profileParam}`).then(r => r.json()) as Promise<{ data: import('./types').TrendData }>
    },
    markerDetail: (slug: string, profile?: string) => {
      const qs = profile ? `?profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/markers/${slug}${qs}`).then(r => r.json()) as Promise<{ data: import('./types').MarkerDetail }>
    },
    markerMeasurements: (slug: string, limit = 5, profile?: string) => {
      const profileParam = profile ? `&profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/markers/${slug}/measurements?limit=${limit}${profileParam}`).then(r => r.json()) as Promise<{ data: import('./types').MarkerMeasurement[] }>
    },
    markerTrend: (slug: string, period = '3m', profile?: string) => {
      const profileParam = profile ? `&profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/markers/${slug}/trend?period=${period}${profileParam}`).then(r => r.json()) as Promise<{ data: import('./types').TrendData }>
    },
    markerContent: (slug: string) =>
      demoFetch(`${API_BASE}/demo/markers/${slug}/content`).then(r => r.json()) as Promise<{ data: import('./types').MarkerContent[] }>,
    markerFoods: (slug: string) =>
      demoFetch(`${API_BASE}/demo/markers/${slug}/foods`).then(r => r.json()) as Promise<{ data: import('./types').MarkerFood[] }>,
    markerSupplements: (slug: string) =>
      demoFetch(`${API_BASE}/demo/markers/${slug}/supplements`).then(r => r.json()) as Promise<{ data: import('./types').MarkerSupplement[] }>,
    markerReferences: (slug: string) =>
      demoFetch(`${API_BASE}/demo/markers/${slug}/references`).then(r => r.json()) as Promise<{ data: import('./types').MarkerReference[] }>,
    measurementFilters: (profile?: string) => {
      const qs = profile ? `?profile=${profile}` : ''
      return demoFetch(`${API_BASE}/demo/measurements/filters${qs}`).then(r => r.json()) as Promise<{ data: import('./types').MeasurementFilters }>
    },
  },
  settings: {
    get: () =>
      request<{ data: import('./types').UserSettings }>('/settings'),
    updateProfile: (body: Partial<import('./types').UserProfile>) =>
      request<{ data: { updated: boolean } }>(
        '/settings/profile', { method: 'PUT', body: JSON.stringify(body) }
      ),
    updateUnits: (body: Partial<import('./types').UnitPreferences>) =>
      request<{ data: { updated: boolean } }>(
        '/settings/units', { method: 'PUT', body: JSON.stringify(body) }
      ),
    updateLifestyle: (body: Partial<import('./types').LifestyleDefaults>) =>
      request<{ data: { updated: boolean } }>(
        '/settings/lifestyle', { method: 'PUT', body: JSON.stringify(body) }
      ),
    updateReferenceRange: (markerSlug: string, body: {
      protocol_context?: string
      orange_min?: number | null
      green_min?: number | null
      green_max?: number | null
      orange_max?: number | null
    }) =>
      request<{ data: { updated: boolean } }>(
        `/settings/reference-ranges/${markerSlug}`, { method: 'PUT', body: JSON.stringify(body) }
      ),
    updateReferenceRangesBulk: (ranges: {
      marker_slug: string
      protocol_context?: string
      orange_min?: number | null
      green_min?: number | null
      green_max?: number | null
      orange_max?: number | null
    }[]) =>
      request<{ data: { updated: number } }>(
        '/settings/reference-ranges/bulk', { method: 'PUT', body: JSON.stringify({ ranges }) }
      ),
    deleteReferenceRange: (markerSlug: string, protocolContext = 'standard') =>
      request<{ data: { deleted: boolean } }>(
        `/settings/reference-ranges/${markerSlug}?protocol_context=${protocolContext}`, { method: 'DELETE' }
      ),
    deleteAllReferenceRanges: () =>
      request<{ data: { deleted: boolean } }>(
        '/settings/reference-ranges', { method: 'DELETE' }
      ),
    exportAll: () => {
      const token = getToken()
      return fetch(`${API_BASE}/settings/export-all`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
    resetData: (confirm?: string) =>
      request<{ data: { confirmed: boolean; deleted: Record<string, number> } }>('/settings/reset-data', {
        method: 'POST',
        body: JSON.stringify({ confirm: confirm || '' }),
      }),
    deleteAccount: () =>
      request<{ data: { deleted: boolean; message: string } }>(
        '/settings/account', { method: 'DELETE' }
      ),
    updateAnonymousData: (share: boolean) =>
      request<{ data: { updated: boolean } }>(
        '/settings/anonymous-data', { method: 'PUT', body: JSON.stringify({ share_anonymous_data: share }) }
      ),
    getConsent: () =>
      request<{ data: { consent_newsletter: boolean; consent_partner_offers: boolean } }>(
        '/settings/consent'
      ),
    updateConsent: (body: { consent_newsletter?: boolean; consent_partner_offers?: boolean }) =>
      request<{ data: { updated: boolean } }>(
        '/settings/consent', { method: 'PUT', body: JSON.stringify(body) }
      ),
    getAccessLog: () =>
      request<{ data: Array<{ accessed_by: string; action: string; resource: string; created_at: string }> }>(
        '/settings/access-log'
      ),
  },
  templates: {
    list: () =>
      request<{ data: import('./types').MeasurementTemplate[] }>('/measurement-templates'),
    create: (body: { name: string; marker_slugs: string[]; is_default?: boolean; display_order?: number; defaults?: Record<string, unknown> }) =>
      request<{ data: import('./types').MeasurementTemplate }>(
        '/measurement-templates', { method: 'POST', body: JSON.stringify(body) }
      ),
    update: (id: string, body: { name?: string; marker_slugs?: string[]; is_default?: boolean; display_order?: number; defaults?: Record<string, unknown> }) =>
      request<{ data: import('./types').MeasurementTemplate }>(
        `/measurement-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }
      ),
    delete: (id: string) =>
      request<{ data: { deleted: boolean } }>(
        `/measurement-templates/${id}`, { method: 'DELETE' }
      ),
    touch: (id: string) =>
      request<{ data: string }>(
        `/measurement-templates/${id}/touch`, { method: 'POST' }
      ),
  },
  earlyAccess: {
    submit: (email: string) =>
      fetch(`${API_BASE}/early-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(r => r.json()) as Promise<{ data: { message: string }; error: null }>,
  },
  newsletter: {
    subscribe: (email: string, source?: string) =>
      fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: source || 'website', website_url: '' }),
      }).then(r => r.json()) as Promise<{ data: { message: string }; error: null }>,
    unsubscribe: (email: string, token: string) =>
      fetch(`${API_BASE}/api/newsletter/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      }).then(r => r.json()) as Promise<{ data: { message: string }; error: null }>,
  },
  doctorChat: {
    sendQuestion: (question: string, conversationId?: string, agentType?: string) =>
      request<{ data: import('./types').DoctorChatResponse }>(
        '/doctor-chat',
        {
          method: 'POST',
          body: JSON.stringify({
            question,
            ...(conversationId ? { conversation_id: conversationId } : {}),
            ...(agentType ? { agent_type: agentType } : {}),
          }),
        }
      ),
    getConversations: (page = 1) =>
      request<import('./types').PaginatedResponse<import('./types').Conversation>>(
        `/doctor-chat/conversations?page=${page}&per_page=50`
      ),
    getConversation: (id: string) =>
      request<{ data: import('./types').ConversationDetail }>(
        `/doctor-chat/conversations/${id}`
      ),
    renameConversation: (id: string, title: string) =>
      request<{ data: { updated: boolean } }>(
        `/doctor-chat/conversations/${id}`,
        { method: 'PUT', body: JSON.stringify({ title }) }
      ),
    deleteConversation: (id: string) =>
      request<{ data: { deleted: boolean } }>(
        `/doctor-chat/conversations/${id}`,
        { method: 'DELETE' }
      ),
    rateMessage: (conversationId: string, messageId: string, rating: 'helpful' | 'not_helpful') =>
      request<{ data: null }>(
        `/doctor-chat/conversations/${conversationId}/rate`,
        { method: 'POST', body: JSON.stringify({ message_id: messageId, rating }) }
      ),
    getQuota: () =>
      request<{ data: import('./types').QuotaResponse }>('/doctor-chat/quota'),
  },
  medications: {
    catalog: (search?: string, category?: string) => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      return request<{ data: import('./types').MedicationCatalogItem[] }>(
        `/medications/catalog?${params.toString()}`
      )
    },
    list: () =>
      request<{ data: import('./types').UserMedication[] }>('/medications'),
    create: (data: Record<string, unknown>) =>
      request<{ data: { id: string } }>(
        '/medications',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ data: { updated: boolean } }>(
        `/medications/${id}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),
    delete: (id: string) =>
      request<{ data: { deleted: boolean } }>(
        `/medications/${id}`,
        { method: 'DELETE' }
      ),
    interactions: () =>
      request<{ data: import('./types').MedicationInteraction[] }>('/medications/interactions'),
  },
  mfa: {
    setup: () =>
      request<{ data: { setup_token: string; qr_svg: string; secret_base32: string; uri: string } }>(
        '/auth/mfa/setup', { method: 'POST' }
      ),
    verifySetup: (setup_token: string, code: string) =>
      request<{ data: { enabled: boolean; recovery_codes: string[] } }>(
        '/auth/mfa/verify-setup', { method: 'POST', body: JSON.stringify({ setup_token, code }) }
      ),
    disable: (code: string) =>
      request<{ data: { enabled: boolean } }>(
        '/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code }) }
      ),
    verifyLogin: (mfa_token: string, code?: string, recovery_code?: string) =>
      request<{ data: { user: import('./types').User; token: string; refresh_token: string; recovery_warning?: string } }>(
        '/auth/mfa/verify-login', { method: 'POST', body: JSON.stringify({ mfa_token, code, recovery_code }) }
      ),
    regenerateRecovery: (code: string) =>
      request<{ data: { recovery_codes: string[] } }>(
        '/auth/mfa/regenerate-recovery', { method: 'POST', body: JSON.stringify({ code }) }
      ),
    status: () =>
      request<{ data: { enabled: boolean; verified_at: string | null } }>('/auth/mfa/status'),
  },
  changePassword: (current_password: string, new_password: string, mfa_code?: string) =>
    request<{ data: { message: string } }>(
      '/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password, mfa_code }) }
    ),
  billing: {
    checkout: (tier: string, interval: string, promo_code?: string, customer_type?: string, company_name?: string, vat_id?: string) =>
      request<{ data: { checkout_url: string } }>(
        '/billing/checkout', { method: 'POST', body: JSON.stringify({ tier, interval, promo_code: promo_code || undefined, customer_type: customer_type || undefined, company_name: company_name || undefined, vat_id: vat_id || undefined }) }
      ),
    portal: () =>
      request<{ data: { portal_url: string } }>('/billing/portal'),
    sync: () =>
      request<{ data: {
        synced: boolean; reason?: string; tier_slug?: string; billing_interval?: string;
        status?: string; current_period_end?: string; cancel_at_period_end?: boolean;
        payment_method?: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
        invoices?: Array<{
          id: string; number: string; amount_paid: number; currency: string;
          status: string; created: number; invoice_pdf: string; hosted_invoice_url: string;
        }>;
      } }>('/billing/sync', { method: 'POST' }),
    status: () =>
      request<{ data: { stripe_enabled: boolean; has_subscription: boolean; payment_method: string; btc_payment: {
        tier: string; period_months: number; amount_eur: number; amount_sats: number | null;
        paid_at: string | null; prepaid_from: string | null; prepaid_until: string | null;
      } | null; subscription: {
        tier_slug: string; billing_interval: string; status: string;
        current_period_end: string; cancel_at_period_end: boolean;
        cancelled_at: string | null; grace_period_end: string | null;
      } | null } }>('/billing/status'),
    changePlan: (tier: string, interval: string) =>
      request<{ data: { message: string } }>(
        '/billing/change-plan', { method: 'POST', body: JSON.stringify({ tier, interval }) }
      ),
    changeInterval: (interval: string) =>
      request<{ data: { message: string } }>(
        '/billing/change-interval', { method: 'POST', body: JSON.stringify({ interval }) }
      ),
    history: () =>
      request<{ data: { payments: Array<{
        event_type: string; amount_cents: number | null;
        status: string; created_at: string;
      }> } }>('/billing/history'),
    cancel: (reason?: string) =>
      request<{ data: { message: string; ends_at: string } }>(
        '/billing/cancel', { method: 'POST', body: JSON.stringify({ reason: reason || null }) }
      ),
    reactivate: () =>
      request<{ data: { message: string } }>(
        '/billing/reactivate', { method: 'POST' }
      ),
    btc: {
      createInvoice: (tier: string, period_months: number, promo_code?: string) =>
        request<{ data: {
          invoice_id: string; strike_invoice_id: string; tier: string; period_months: number;
          price_breakdown: { monthly_price: number; base_total_eur: number; annual_discount_eur: number; promo_discount_eur: number; btc_discount_percent: number; btc_discount_eur: number };
          amount_eur: number; amount_btc: number | null; amount_sats: number | null;
          lightning_invoice: string | null; on_chain_address: string | null; qr_data: string;
          expires_at: string; promo_applied: string | null;
        } }>('/billing/btc/create-invoice', {
          method: 'POST',
          body: JSON.stringify({ tier, period_months, promo_code: promo_code || undefined }),
        }),
      checkInvoice: (invoiceId: string) =>
        request<{ data: { status: string; paid_at: string | null } }>(
          `/billing/btc/check/${invoiceId}`
        ),
      status: () =>
        request<{ data: {
          has_btc_subscription: boolean; is_active?: boolean; tier?: string;
          period_months?: number; amount_eur?: number; amount_sats?: number | null;
          paid_at?: string; prepaid_from?: string; prepaid_until?: string;
        } }>('/billing/btc/status'),
      prices: () =>
        request<{ data: {
          tiers: Array<{ tier: string; monthly_price_eur: number; periods: Array<{
            period_months: number; total_eur: number; effective_monthly_eur: number;
            savings_percent: number; annual_discount_eur: number; btc_discount_eur: number;
          }> }>;
          btc_discount_percent: number;
        } }>('/billing/btc/prices'),
    },
  },
  invoices: {
    list: () =>
      request<{ data: { invoices: Array<{
        id: string; date: string; amount_cents: number | null; currency: string;
        tier: string | null; status: string; pdf_url: string | null;
        hosted_url: string | null; invoice_number: string | null;
      }> } }>('/api/invoices'),
    pdf: (id: string) => `/api/invoices/${id}/pdf`,
  },
  paymentGateways: {
    public: () =>
      request<{ data: {
        fiat: { active: string | null; available: string[] };
        btc: { active: string | null; available: string[]; discount_percent: number };
      } }>('/api/payments/gateways'),
  },
  payments: {
    preview: (data: { tier: string; interval: string; payment_method?: string; promo_code?: string }) =>
      request<{ data: { breakdown: {
        list_price: string; promo_discount: string; btc_discount: string;
        charged_amount: string; savings: string; savings_pct: number;
        floor_applied: boolean; promo_code?: string; promo_pct?: number;
      } } }>('/api/payments/preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  promotions: {
    validate: (code: string, tier?: string) =>
      request<{ data: {
        valid: boolean; reason?: string; code?: string; name?: string;
        discount?: string; discount_type?: string; discount_value?: number;
        duration?: string; prices?: Array<{ tier: string; original_price: number; discounted_price: number; currency: string }>;
      } }>('/v1/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({ code, tier: tier || undefined }),
      }),
  },
  // Sprint 040 #484 -- multi-org switcher
  myOrgs: () =>
    request<{
      data: Array<{
        id: string
        name: string
        slug: string
        org_type: string
        role: string
        joined_at: string
      }>
    }>('/me/orgs'),
  license: {
    get: () =>
      request<{ data: import('./types').LicenseInfo }>('/license'),
    tiers: () => {
      // Sprint 046 hotfix 2026-04-20: don't re-resolve the base here.
      // NEXT_PUBLIC_API_URL is "/api" on staging -> `${base}/reports/...`
      // produces /api/reports/... which the backend 404s (backend scope
      // is at root). Reuse API_BASE (same-origin '' on brickos.io /
      // sovereignhealth.io wildcards via runtime detection).
      const base = API_BASE
      return fetch(`${base}/license/tiers`).then(r => r.json()) as Promise<{ data: import('./types').LicenseTier[] }>
    },
    downgrade: (targetTier: string, reason?: string) =>
      request<{ data: { downgraded: boolean; grace_period_ends: string } }>(
        '/license/downgrade',
        { method: 'PUT', body: JSON.stringify({ target_tier: targetTier, reason }) }
      ),
  },
  reports: {
    healthPdf: (period: string, zones?: string[]) => {
      // Sprint 046 hotfix 2026-04-20: don't re-resolve the base here.
      // NEXT_PUBLIC_API_URL is "/api" on staging -> `${base}/reports/...`
      // produces /api/reports/... which the backend 404s (backend scope
      // is at root). Reuse API_BASE (same-origin '' on brickos.io /
      // sovereignhealth.io wildcards via runtime detection).
      const base = API_BASE
      const token = document.cookie.match(/token=([^;]+)/)?.[1] || ''
      return fetch(`${base}/reports/health-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ period, zones }),
      })
    },
    quota: () =>
      request<{ data: { used: number; limit: number | null; period: string } }>('/reports/quota'),
    history: () =>
      request<{ data: Array<{ id: string; report_type: string; period: string; file_size_bytes: number | null; created_at: string }> }>('/reports/history'),
    exportJson: (opts?: { period?: string; markers?: string; protected?: boolean }) => {
      // Sprint 046 hotfix 2026-04-20: don't re-resolve the base here.
      // NEXT_PUBLIC_API_URL is "/api" on staging -> `${base}/reports/...`
      // produces /api/reports/... which the backend 404s (backend scope
      // is at root). Reuse API_BASE (same-origin '' on brickos.io /
      // sovereignhealth.io wildcards via runtime detection).
      const base = API_BASE
      const token = document.cookie.match(/token=([^;]+)/)?.[1] || ''
      const params = new URLSearchParams()
      if (opts?.period) params.set('period', opts.period)
      if (opts?.markers) params.set('markers', opts.markers)
      if (opts?.protected) params.set('protected', 'true')
      const qs = params.toString()
      return fetch(`${base}/export/json${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    exportCsv: (opts?: { period?: string; zones?: string; markers?: string; protected?: boolean }) => {
      // Sprint 046 hotfix 2026-04-20: don't re-resolve the base here.
      // NEXT_PUBLIC_API_URL is "/api" on staging -> `${base}/reports/...`
      // produces /api/reports/... which the backend 404s (backend scope
      // is at root). Reuse API_BASE (same-origin '' on brickos.io /
      // sovereignhealth.io wildcards via runtime detection).
      const base = API_BASE
      const token = document.cookie.match(/token=([^;]+)/)?.[1] || ''
      const params = new URLSearchParams()
      if (opts?.period) params.set('period', opts.period)
      if (opts?.zones) params.set('zones', opts.zones)
      if (opts?.markers) params.set('markers', opts.markers)
      if (opts?.protected) params.set('protected', 'true')
      const qs = params.toString()
      return fetch(`${base}/export/csv${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
  },
  import: {
    uploadLab: (files: File[]) => {
      const fd = new FormData()
      files.forEach(file => fd.append('files', file))
      return uploadRequest<{ data: ImportSession }>('/import/upload', fd)
    },
    uploadMedication: (files: File[]) => {
      const fd = new FormData()
      files.forEach(file => fd.append('files', file))
      return uploadRequest<{ data: MedImportSession }>('/import/upload-medication', fd)
    },
    confirm: (sessionId: string, markers: Array<{ marker_slug: string; value: number }>, opts?: { measured_at?: string; protocol_tag?: string; device_id?: string; lab_id?: string; lab_name?: string; lab_address?: string; lab_postal_code?: string; lab_city?: string; lab_country?: string }) =>
      request<{ data: { session_id: string; measurements_created: number; message: string } }>(`/import/${sessionId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, markers, ...opts }),
      }),
    confirmMedications: (sessionId: string, medications: Array<{ name: string; brand?: string; factor_type?: string; dosage?: string; frequency?: string; form?: string; prescriber?: string; ingredients?: Array<{ name: string; amount?: string; unit?: string; role?: string; notes?: string }> }>) =>
      request<{ data: { session_id: string; influence_factors_created: number; message: string } }>(`/import/${sessionId}/confirm-medications`, {
        method: 'POST',
        body: JSON.stringify({ medications }),
      }),
    uploadMeasurements: (files: File[]) => {
      const fd = new FormData()
      files.forEach(file => fd.append('files', file))
      return uploadRequest<{ data: MeasurementImportSession }>('/import/upload-measurements', fd)
    },
    confirmMeasurements: (sessionId: string, columnMapping: Array<{ marker_slug: string; device_id?: string | null; unit?: string }>, selectedRows: number[], skipDuplicates?: boolean, protocolOverrides?: Record<string, string>, context?: { measured_at_override?: string; diet_protocol?: string; fasting_protocol?: string; meal_timing_tag?: string }) =>
      request<{ data: { session_id: string; measurements_created: number; duplicates_skipped: number; message: string } }>('/import/confirm-measurements', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, column_mapping: columnMapping, selected_rows: selectedRows, skip_duplicates: skipDuplicates ?? true, ...(protocolOverrides ? { protocol_overrides: protocolOverrides } : {}), ...(context || {}) }),
      }),
    rollbackImport: (sessionId: string) =>
      request<{ data: { session_id: string; measurements_deleted: number; message: string } }>(`/import/sessions/${sessionId}/rollback`, {
        method: 'DELETE',
      }),
    getSession: (id: string) =>
      request<{ data: ImportSession }>(`/import/${id}`),
    history: () =>
      request<{ data: ImportHistoryEntry[] }>('/import/history'),
  },
  userMedications: {
    list: (active?: string) => {
      const params = new URLSearchParams()
      if (active) params.set('active', active)
      return request<{ data: UserMedicationFull[] }>(`/user-medications?${params}`)
    },
    get: (id: string) =>
      request<{ data: UserMedicationFull }>(`/user-medications/${id}`),
    create: (data: CreateMedicationInput) =>
      request<{ data: UserMedicationFull }>('/user-medications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<CreateMedicationInput>) =>
      request<{ data: UserMedicationFull }>(`/user-medications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      request<{ data: { message: string } }>(`/user-medications/${id}`, {
        method: 'DELETE',
      }),
    restore: (id: string) =>
      request<{ data: UserMedicationFull }>(`/user-medications/${id}/restore`, {
        method: 'PUT',
      }),
  },
  influenceFactors: {
    list: () =>
      request<{ data: InfluenceFactor[] }>('/influence-factors'),
    get: (id: string) =>
      request<{ data: InfluenceFactor }>(`/influence-factors/${id}`),
    create: (data: CreateInfluenceFactorInput) =>
      request<{ data: InfluenceFactor }>('/influence-factors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<CreateInfluenceFactorInput>) =>
      request<{ data: InfluenceFactor }>(`/influence-factors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      request<{ data: { message: string } }>(`/influence-factors/${id}`, {
        method: 'DELETE',
      }),
    restore: (id: string) =>
      request<{ data: InfluenceFactor }>(`/influence-factors/${id}/restore`, {
        method: 'PUT',
      }),
  },
  healthMetrics: async () => {
    const res = await rawRequest('/api/v1/health/metrics')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  admin: {
    dashboard: () =>
      request<{ data: {
        total_users: number; verified_users: number; total_measurements: number;
        active_7d: number; active_30d: number; signups_7d: number;
        early_access_count: number; tier_distribution: Array<{ tier: string; count: number }>;
      } }>('/admin/dashboard'),
    services: () =>
      request<{ services: Array<{ name: string; environment: string; status: string; version: string | null; latency_ms: number | null; checked_at: string }>; checked_at: string }>('/admin/services'),
    users: (page = 1, perPage = 50, search?: string) => {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (search) params.set('search', search)
      return request<{ data: Array<{
        id: string; email: string; display_name: string | null; role: string;
        email_verified: boolean; tier: string; measurement_count: number; created_at: string;
      }>; meta: { page: number; per_page: number; total: number } }>(`/admin/users?${params}`)
    },
    updateRole: (userId: string, role: string) =>
      request<{ data: { message: string } }>(`/admin/users/${userId}/role`, {
        method: 'PUT', body: JSON.stringify({ role }),
      }),
    updateTier: (userId: string, tierSlug: string) =>
      request<{ data: { message: string } }>(`/admin/users/${userId}/tier`, {
        method: 'PUT', body: JSON.stringify({ tier_slug: tierSlug }),
      }),
    earlyAccess: () =>
      request<{ data: Array<{ email: string; created_at: string; source: string }> }>('/admin/early-access'),
    emailStats: () =>
      request<{ data: { total_sent: number; total_opened: number; total_clicked: number } }>('/admin/email/stats'),
    contentList: (table: string) =>
      request<{ data: Array<Record<string, unknown>>; total: number }>(`/admin/content/${table}`),
    contentUpdateTranslation: (table: string, id: string, locale: string, fields: Record<string, unknown>) =>
      request<{ data: { message: string } }>(`/admin/content/${table}/${id}/translations/${locale}`, {
        method: 'PUT', body: JSON.stringify({ fields }),
      }),
    translationStatus: () =>
      request<{ data: { locales: Array<{
        locale: string; total: number; translated: number; percentage: number;
        missing_by_table: Array<{ table_name: string; missing_count: number }>;
      }> } }>('/admin/content/translation-status'),
    listUsers: (params?: { page?: number; per_page?: number; search?: string; sort?: string; order?: string; org_id?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.per_page) qs.set('per_page', String(params.per_page))
      if (params?.search) qs.set('search', params.search)
      if (params?.sort) qs.set('sort', params.sort)
      if (params?.order) qs.set('order', params.order)
      if (params?.org_id && params.org_id !== 'all') qs.set('org_id', params.org_id)
      return request<{ data: import('./types').AdminUser[]; meta: { page: number; per_page: number; total: number } }>(`/admin/users?${qs}`)
    },
    updateUserLicense: (userId: string, body: { tier?: string; override_active: boolean; note?: string }) =>
      request<{ data: import('./types').LicenseOverrideResult }>(`/admin/users/${userId}/license`, { method: 'PUT', body: JSON.stringify(body) }),
    // Sprint 040 #476 -- manual lifecycle template send
    listLifecycleTemplates: () =>
      request<{ data: { templates: string[] } }>('/admin/templates/list'),
    sendLifecycleTemplate: (body: {
      template_name: string
      recipient_email: string
      locale?: string
      vars?: Record<string, string | number>
    }) =>
      request<{ data: { template_name: string; recipient: string; locale: string; status: string } }>(
        '/admin/templates/send',
        { method: 'POST', body: JSON.stringify(body) },
      ),
    listWebPages: () =>
      request<{ data: import('./types').WebPage[] }>('/admin/content/web-pages'),
    addWebSection: (pageId: string, body: { key: string; section_type?: string }) =>
      request<{ data: { id: string; key: string; section_type: string } }>(`/admin/content/web-pages/${pageId}/sections`, { method: 'POST', body: JSON.stringify(body) }),
    updateWebTranslation: (sectionId: string, locale: string, value: string) =>
      request<{ data: { updated: boolean } }>(`/admin/content/web-sections/${sectionId}/translations/${locale}`, { method: 'PUT', body: JSON.stringify({ value }) }),
    deleteWebSection: (sectionId: string) =>
      request<{ data: { deleted: boolean } }>(`/admin/content/web-sections/${sectionId}`, { method: 'DELETE' }),
    aiUsage: (period?: string, date?: string, appKey?: string) => {
      const params = new URLSearchParams()
      if (period) params.set('period', period)
      if (date) params.set('date', date)
      if (appKey && appKey !== 'all') params.set('app_key', appKey)
      return request<{ data: AiUsageResponse }>(`/admin/ai-usage?${params}`)
    },
    promotions: () =>
      request<{ data: Array<{ id: string; code: string; name: string; discount_type: string; discount_value: number; currency: string; duration: string; duration_months: number | null; applicable_tiers: string[] | null; max_redemptions: number | null; redemption_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean; status: string; stripe_coupon_id: string; stripe_promo_code_id: string | null; created_at: string; created_by_email: string | null }> }>('/admin/promotions'),
    createPromotion: (data: {
      code: string; name: string; discount_type: string; discount_value: number;
      currency?: string; duration: string; duration_months?: number;
      applicable_tiers?: string[]; max_redemptions?: number;
      starts_at?: string; expires_at?: string;
    }) =>
      request<{ data: { id: string; code: string; message: string } }>('/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePromotion: (id: string, data: { is_active?: boolean; max_redemptions?: number; expires_at?: string; name?: string; applicable_tiers?: string[] }) =>
      request<{ data: { message: string } }>(`/admin/promotions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivatePromotion: (id: string) =>
      request<{ data: { message: string } }>(`/admin/promotions/${id}`, { method: 'DELETE' }),
    promotionRedemptions: (id: string) =>
      request<{ data: { promotion: Record<string, unknown> | null; redemptions: Array<{ id: string; user_id: string; email: string | null; display_name: string | null; tier: string | null; redeemed_at: string }> } }>(`/admin/promotions/${id}/redemptions`),
    promoPreview: (discountPct: number) =>
      request<{ data: {
        tiers: Array<{
          tier: string;
          monthly: { list_cents: number; scenarios: Record<string, { charged: number; net: number; net_pct: number; floor_applied: boolean }> };
          yearly: { list_cents: number; scenarios: Record<string, { charged: number; net: number; net_pct: number; floor_applied: boolean }> };
        }>;
        warnings: string[];
      } }>('/admin/promo/preview', {
        method: 'POST',
        body: JSON.stringify({ discount_pct: discountPct }),
      }),
    paymentGateways: () =>
      request<{ data: { gateways: Array<{
        id: string; enabled: boolean; is_active_fiat: boolean; is_active_btc: boolean;
        config_valid: boolean; last_success: string | null; last_failure: string | null;
        failure_count: number;
      }> } }>('/admin/payments/gateways'),
    activateGateway: (id: string, role: string) =>
      request<{ data: { message: string } }>(`/admin/payments/gateways/${id}/activate`, {
        method: 'POST', body: JSON.stringify({ role }),
      }),
    toggleGateway: (id: string) =>
      request<{ data: { gateway_id: string; enabled: boolean } }>(`/admin/payments/gateways/${id}/toggle`, {
        method: 'POST',
      }),
    testGateway: (id: string) =>
      request<{ data: { success: boolean; latency_ms?: number; error?: string } }>(`/admin/payments/gateways/${id}/test`, {
        method: 'POST',
      }),
    refundSubscription: (userId: string, body: { reason?: string; full_refund?: boolean; force?: boolean }) =>
      request<{ data: {
        refund_id: string; amount_refunded_cents: number;
        subscription_cancelled: boolean; affiliate_conversion_refunded: boolean;
        user_tier: string;
      } }>(`/admin/subscriptions/${userId}/refund`, {
        method: 'POST', body: JSON.stringify(body),
      }),
    refundList: () =>
      request<{ data: { refunds: Array<{
        id: string; user_id: string; stripe_refund_id: string | null;
        amount_cents: number; reason: string | null; forced: boolean;
        admin_id: string; created_at: string;
      }> } }>('/admin/refunds'),
    newsletterSubscribers: (page = 1, perPage = 50, appKey?: string) => {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (appKey && appKey !== 'all') params.set('app_key', appKey)
      return request<{ data: {
        subscribers: Array<{
          id: string; email: string; source: string; subscribed: boolean;
          confirmed: boolean; confirmed_at: string | null;
          unsubscribed_at: string | null; mailgun_synced: boolean; created_at: string;
        }>;
        meta: { total: number; subscribed: number; unsubscribed: number; pending: number; page: number; per_page: number };
      } }>(`/admin/newsletter/subscribers?${params}`)
    },
    newsletterExport: async () => {
      // Sprint 041 #534 fix: previously sent an Authorization: Bearer header
      // which triggered a CORS preflight on cross-origin (demo.* -> api-demo.*).
      // The backend's CORS allow-list didn't advertise Authorization for this
      // route, so the preflight failed and the browser threw NetworkError
      // before the actual GET ever went out. Every other admin call uses the
      // request() wrapper with cookie auth (credentials: 'include', no
      // Authorization header), which counts as a simple request and skips
      // the preflight entirely. Match that pattern.
      const r = await fetch(`${API_BASE}/admin/newsletter/export`, {
        credentials: 'include',
      })
      if (!r.ok) throw new Error('Export failed')
      return r.text()
    },
    newsletterSync: () =>
      request<{ data: { message: string; synced: number; failed: number } }>('/admin/newsletter/sync', {
        method: 'POST',
      }),
    affiliateList: (page = 1, perPage = 50) =>
      request<{ data: { affiliates: Array<{
        affiliate_code: string; total_conversions: number;
        total_commission_cents: number; unpaid_commission_cents: number;
      }> } }>(`/admin/affiliates?page=${page}&per_page=${perPage}`),
    affiliateQueue: () =>
      request<{ data: { queue: Array<{
        conversion_id: string; affiliate_code: string;
        commission_amount_cents: number | null;
        evaluation_ends_at: string | null; created_at: string;
      }> } }>('/admin/affiliates/queue'),
    affiliateQueueCount: () =>
      request<{ data: { count: number } }>('/admin/affiliates/queue/count'),
    affiliateApprove: (conversionId: string) =>
      request<{ data: Record<string, unknown> }>(`/admin/conversions/${conversionId}/approve`, { method: 'POST' }),
    affiliateReject: (conversionId: string, reason?: string) =>
      request<{ data: Record<string, unknown> }>(`/admin/conversions/${conversionId}/reject`, {
        method: 'POST', body: JSON.stringify({ reason: reason || null }),
      }),
    affiliateCreatePayouts: () =>
      request<{ data: { payouts: Array<{
        id: string; affiliate_code: string; amount_cents: number;
        payout_method: string; status: string; created_at: string;
      }> } }>('/admin/payouts/create', { method: 'POST' }),
    affiliateMarkPaid: (payoutId: string, payoutReference: string) =>
      request<{ data: Record<string, unknown> }>(`/admin/payouts/${payoutId}/mark-paid`, {
        method: 'POST', body: JSON.stringify({ payout_reference: payoutReference }),
      }),
    affiliatePayouts: () =>
      request<{ data: { payouts: Array<{
        id: string; affiliate_code: string; amount_cents: number | null;
        payout_method: string; payout_reference: string | null;
        status: string; paid_at: string | null; created_at: string;
      }> } }>('/admin/payouts'),
    contentStrings: (params?: { section?: string; search?: string; page?: number; per_page?: number }) => {
      const qs = new URLSearchParams()
      if (params?.section) qs.set('section', params.section)
      if (params?.search) qs.set('search', params.search)
      if (params?.page) qs.set('page', String(params.page))
      if (params?.per_page) qs.set('per_page', String(params.per_page))
      return request<{ data: Array<{
        id: string; section: string; key: string; value_en: string;
        value_de: string | null; description: string | null;
        updated_at: string | null; updated_by: string | null;
      }>; meta: { page: number; per_page: number; total: number } }>(`/admin/content-strings?${qs}`)
    },
    contentStringsUpdate: (id: string, body: { value_en?: string; value_de?: string; description?: string }) =>
      request<{ data: { message: string } }>(`/admin/content-strings/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    contentStringsCreate: (body: { section: string; key: string; value_en: string; value_de?: string; description?: string }) =>
      request<{ data: { id: string; section: string; key: string; value_en: string; value_de: string | null } }>('/admin/content-strings', {
        method: 'POST', body: JSON.stringify(body),
      }),
    contentStringsExport: (section = 'app') => {
      const token = getToken()
      return fetch(`${API_BASE}/admin/content-strings/export?section=${section}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
    settings: () =>
      request<{ data: Record<string, Array<{
        key: string; value: unknown; description: string | null;
        category: string; updated_at: string | null; updated_by: string | null;
      }>> }>('/admin/settings'),
    updateSetting: (key: string, value: unknown) =>
      request<{ data: { key: string; value: unknown } }>(`/admin/settings/${key}`, {
        method: 'PUT', body: JSON.stringify({ value }),
      }),
    publishWebsite: () =>
      request<{ data: { success: boolean; message: string; duration_ms: number; timestamp: string } }>('/admin/publish-website', {
        method: 'POST',
      }),
    links: (appKey?: string, orgId?: string) => {
      const params = new URLSearchParams()
      if (appKey && appKey !== 'all') params.set('app_key', appKey)
      if (orgId && orgId !== 'all') params.set('org_id', orgId)
      const qs = params.toString()
      return request<{ data: { links: Array<{
        id: string; code: string; target_url: string; link_type: string;
        domain: string; app_key: string; affiliate_code: string | null;
        title: string | null; is_active: boolean;
        total_clicks: number; clicks_7d: number; clicks_30d: number;
        created_at: string;
      }>; summary: Array<{ prefix: string; link_type: string; link_count: number; total_clicks: number }> } }>(`/admin/links${qs ? '?' + qs : ''}`)
    },
    createCampaignLink: (body: { code: string; target_url: string; title?: string }) =>
      request<{ data: { id: string; short_link: string; code: string; target_url: string; created_at: string } }>('/admin/links/campaign', {
        method: 'POST', body: JSON.stringify(body),
      }),
    affiliateSummary: () =>
      request<{ data: { total_users: number; affiliate_users: number; direct_users: number; total_affiliates: number; total_conversions: number; conversion_rate: number; top_affiliates: Array<{ affiliate_code: string; email: string; display_name: string | null; referral_count: number; org_name: string | null }> } }>('/admin/affiliate-summary'),
    organizations: (
      page = 1,
      perPage = 25,
      search?: string,
      orgType?: string,
      status?: string,
      expiresWithin?: number,
    ) => {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (search) params.set('search', search)
      if (orgType) params.set('org_type', orgType)
      if (status) params.set('status', status)
      if (expiresWithin) params.set('expires_within', String(expiresWithin))
      return request<{
        data: Array<{
          id: string
          name: string
          slug: string
          org_type: string
          billing_email: string | null
          is_active: boolean
          member_count: number
          branding: Record<string, unknown>
          created_at: string
          // Sprint 040 #477: license summary fields
          tier_slug: string | null
          max_members: number | null
          max_owners: number | null
          max_practitioners: number | null
          expires_at: string | null
          revoked_at: string | null
          stripe_invoice_id: string | null
          lifecycle_status:
            | 'active'
            | 'grace'
            | 'expired'
            | 'revoked'
            | 'no_license'
        }>
        meta: { page: number; per_page: number; total: number }
      }>(`/admin/organizations?${params}`)
    },
    // Sprint 040 #479/#483 -- licensing data model read endpoints
    listFeatureRegistry: () =>
      request<{
        data: Array<{
          slug: string
          app_slug: string
          category: string
          name_en: string
          name_de: string
          description_en: string | null
          description_de: string | null
          is_active: boolean
        }>
      }>('/admin/licensing/feature-registry'),
    listLicensingTiers: () =>
      request<{
        data: Array<{
          slug: string
          name: string
          description: string | null
          app_key: string | null
          sort_order: number
          is_active: boolean
          // Sprint 042 #530: per-tier seat defaults from brickos.license_tiers.
          // -1 means unlimited (matches the seat-enforcement check
          // `max >= 0` in admin_orgs.rs:921). null means the tier predates
          // the seat-default seed migration -- the License tab will fall
          // back to a hardcoded sensible minimum (1/0/0) in that case.
          default_max_owners: number | null
          default_max_practitioners: number | null
          default_max_members: number | null
        }>
      }>('/admin/licensing/tiers'),
    restoreRevokedLicense: (jti: string) =>
      request<{ data: { restored: boolean; license_id: string } }>(
        `/admin/licensing/revocations/${jti}/restore`,
        { method: 'POST' },
      ),
    listRevocations: () =>
      request<{
        data: Array<{
          jti: string
          org_id: string
          org_name: string | null
          org_slug: string | null
          revoked_at: string
          reason: string | null
          original_exp: string
          revoked_by_email: string | null
        }>
      }>('/admin/licensing/revocations'),
    // Sprint 040 #479 -- license issuance / revoke / history per org
    generateOrgLicense: (
      orgId: string,
      body: {
        features: string[]
        aud?: string[]
        max_owners: number
        max_practitioners: number
        max_members: number
        expires_days: number
        billing_model?: string
        tier?: string
        notes?: string
      },
    ) =>
      request<{
        data: {
          id: string
          license_key: string
          jti: string
          org_id: string
          org_name: string
          tier_slug: string
          features: string[]
          max_owners: number
          max_practitioners: number
          max_members: number
          issued_at: string
          expires_at: string
          billing_model: string
        }
      }>(`/admin/organizations/${orgId}/license`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revokeOrgLicense: (orgId: string, reason?: string) =>
      request<{ data: { revoked: boolean; license_id: string } }>(
        `/admin/organizations/${orgId}/license/revoke`,
        { method: 'POST', body: JSON.stringify({ reason }) },
      ),
    // Sprint 040 #482 -- dormant user cohort
    listDormantUsers: () =>
      request<{
        data: Array<{
          id: string
          email: string
          display_name: string | null
          tier: string
          lifecycle_status: 'active' | 'dormant' | 'pending_deletion'
          created_at: string
          last_active_at: string | null
          pending_deletion_at: string | null
          org_count: number
        }>
      }>('/admin/users/dormant'),
    updateUserLifecycleStatus: (
      userId: string,
      lifecycleStatus: 'active' | 'dormant' | 'pending_deletion',
    ) =>
      request<{ data: { updated: boolean; lifecycle_status: string } }>(
        `/admin/users/${userId}/lifecycle-status`,
        { method: 'PUT', body: JSON.stringify({ lifecycle_status: lifecycleStatus }) },
      ),
    // Sprint 040 #481 -- per-org invoices (Stripe Invoices API)
    listInvoiceProducts: () =>
      request<{
        data: Array<{
          slug: string
          name: string
          default_unit_amount_cents: number
          billing_period: 'monthly' | 'yearly' | 'one-time'
          description: string
        }>
      }>('/admin/invoice-products'),
    deleteOrgInvoice: (orgId: string, invoiceId: string) =>
      request<{ data: { deleted: boolean } }>(
        `/admin/organizations/${orgId}/invoices/${invoiceId}`,
        { method: 'DELETE' },
      ),
    listOrgInvoices: (orgId: string) =>
      request<{
        data: Array<{
          id: string
          stripe_invoice_id: string | null
          currency: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'failed'
          line_items: Array<{
            product_slug: string
            name: string
            quantity: number
            unit_amount_cents: number
          }>
          total_amount_cents: number
          due_days: number
          memo: string | null
          created_at: string
          sent_at: string | null
          paid_at: string | null
        }>
      }>(`/admin/organizations/${orgId}/invoices`),
    createOrgInvoice: (
      orgId: string,
      body: {
        currency: string
        line_items: Array<{
          product_slug: string
          name: string
          quantity: number
          unit_amount_cents: number
        }>
        due_days?: number
        memo?: string
      },
    ) =>
      request<{ data: { id: string; status: string; total_amount_cents: number } }>(
        `/admin/organizations/${orgId}/invoices`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    syncOrgInvoiceToStripe: (orgId: string, invoiceId: string, stripeCustomerId: string) =>
      request<{ data: { id: string; stripe_invoice_id: string; status: string } }>(
        `/admin/organizations/${orgId}/invoices/${invoiceId}/sync`,
        { method: 'POST', body: JSON.stringify({ stripe_customer_id: stripeCustomerId }) },
      ),
    // Sprint 040 #480 -- branding tab
    updateOrgBranding: (orgId: string, branding: Record<string, unknown>) =>
      request<{ data: { updated: boolean } }>(`/admin/organizations/${orgId}/branding`, {
        method: 'PUT',
        body: JSON.stringify({ branding }),
      }),
    listOrgDomains: (orgId: string) =>
      request<{
        data: Array<{
          id: string
          domain: string
          ssl_status: 'pending' | 'active' | 'failed'
          verified_at: string | null
          created_at: string
        }>
      }>(`/admin/organizations/${orgId}/domains`),
    addOrgDomain: (orgId: string, domain: string) =>
      request<{ data: { id: string; domain: string; ssl_status: string } }>(
        `/admin/organizations/${orgId}/domains`,
        { method: 'POST', body: JSON.stringify({ domain }) },
      ),
    deleteOrgDomain: (orgId: string, domainId: string) =>
      request<{ data: { deleted: boolean } }>(
        `/admin/organizations/${orgId}/domains/${domainId}`,
        { method: 'DELETE' },
      ),
    listOrgAuditLog: (orgId: string) =>
      request<{
        data: Array<{
          id: string
          action: string
          target_type: string
          target_id: string
          payload: Record<string, unknown>
          created_at: string
          actor_user_id: string | null
          actor_email: string | null
        }>
      }>(`/admin/organizations/${orgId}/audit`),
    listOrgLicenseHistory: (orgId: string) =>
      request<{
        data: Array<{
          id: string
          tier_slug: string
          features: string[]
          max_owners: number
          max_practitioners: number
          max_members: number
          issued_at: string
          expires_at: string
          revoked_at: string | null
          jti: string
          notes: string | null
          stripe_invoice_id: string | null
          issued_by_email: string | null
        }>
      }>(`/admin/organizations/${orgId}/license/history`),
    // Sprint 040 #478 -- single org detail (Overview/License/Branding)
    getOrganization: (id: string) =>
      request<{
        data: {
          id: string
          name: string
          slug: string
          org_type: string
          billing_email: string | null
          is_active: boolean
          created_at: string
          branding: Record<string, unknown>
          license: {
            tier_slug: string | null
            features: string[]
            max_owners: number | null
            max_practitioners: number | null
            max_members: number | null
            expires_at: string | null
            revoked_at: string | null
            issued_at: string | null
            jti: string | null
            stripe_invoice_id: string | null
            lifecycle_status: 'active' | 'grace' | 'expired' | 'revoked' | 'no_license'
          }
          seats: { owners: number; practitioners: number; members: number; total: number }
        }
      }>(`/admin/organizations/${id}`),
    createOrganization: (body: { name: string; slug: string; org_type: string; billing_email?: string; admin_email?: string }) =>
      request<{
        data: {
          id: string
          slug: string
          admin_user_id: string | null
          admin_was_invited: boolean
        }
      }>('/admin/organizations', { method: 'POST', body: JSON.stringify(body) }),
    updateOrganization: (id: string, body: { name?: string; org_type?: string; billing_email?: string; is_active?: boolean }) =>
      request<{ data: { updated: boolean } }>(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteOrganization: (id: string) =>
      request<{ data: { deleted: boolean; mode: 'hard' | 'soft' } }>(
        `/admin/organizations/${id}`,
        { method: 'DELETE' },
      ),
    deletePreviewOrganization: (id: string) =>
      request<{
        data: {
          org: { id: string; name: string; slug: string }
          counts: {
            members: number
            licenses: number
            invoices: number
            domains: number
            audit_entries: number
          }
          details: {
            members: Array<{ email: string; role: string }>
            licenses: Array<{
              tier_slug: string
              issued_at: string | null
              expires_at: string | null
              revoked: boolean
            }>
            invoices: Array<{
              memo: string
              status: string
              total_amount_cents: number
              currency: string
              created_at: string | null
            }>
          }
        }
      }>(`/admin/organizations/${id}/delete-preview`),
    orgMembers: (orgId: string) =>
      request<{ data: Array<{ id: string; user_id: string; email: string; display_name: string | null; role: string; joined_at: string; last_active_at: string | null }> }>(`/admin/organizations/${orgId}/members`),
    addOrgMember: (orgId: string, body: { email: string; role: string }) =>
      request<{ data: { added: boolean; user_id: string; role: string } }>(`/admin/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    updateMemberRole: (orgId: string, memberId: string, role: string) =>
      request<{ data: { updated: boolean } }>(`/admin/organizations/${orgId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
    removeOrgMember: (orgId: string, memberId: string) =>
      request<{ data: { removed: boolean } }>(`/admin/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' }),
  },
  affiliate: {
    me: () =>
      request<{ data: {
        affiliate_code: string;
        referral_link: string;
        stats: {
          total_clicks: number; total_signups: number; paid_conversions: number;
          pending_commission_cents: number; approved_commission_cents: number; paid_commission_cents: number;
        };
        btc: { pending_sats: number; approved_sats: number; paid_sats: number };
        has_eur_commissions: boolean;
        has_btc_commissions: boolean;
        payout_settings: { method: string | null; btc_address: string | null } | null;
        vanity_link: string | null;
      } }>('/api/affiliate/me'),
    updateSettings: (body: { payout_method: string; btc_address?: string }) =>
      request<{ data: { message: string } }>('/api/affiliate/me/settings', {
        method: 'PUT', body: JSON.stringify(body),
      }),
    conversions: (page = 1, perPage = 20, sort = 'date', order = 'desc') =>
      request<{ data: {
        conversions: Array<{ id: string; status: string; commission_amount_cents: number | null; commission_btc_sats: number | null; payout_method_snapshot: string | null; referred_email: string | null; created_at: string }>;
        total: number; page: number; per_page: number;
      } }>(`/api/affiliate/me/conversions?page=${page}&per_page=${perPage}&sort=${sort}&order=${order}`),
    click: (affiliate_code: string) =>
      fetch(`${API_BASE}/api/affiliate/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliate_code }),
      }).catch(() => {}),
    setVanity: (code: string) =>
      request<{ data: { vanity_link: string; code: string } }>('/api/affiliate/me/vanity', {
        method: 'PUT', body: JSON.stringify({ code }),
      }),
    checkVanity: (code: string) =>
      request<{ data: { available: boolean; reason: string | null } }>(`/api/affiliate/vanity/check?code=${encodeURIComponent(code)}`),
  },
  links: {
    list: () =>
      request<Array<{ id: string; code: string; target_url: string; link_type: string; domain: string; app_key: string; affiliate_code: string | null; title: string | null; is_active: boolean; expires_at: string | null; total_clicks: number; clicks_7d: number; clicks_30d: number; created_at: string }>>('/api/v1/links'),
    create: (body: { target_url: string; code?: string; title?: string; expires_at?: string }) =>
      request<{ id: string; code: string; target_url: string }>('/api/v1/links', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: string, body: { target_url?: string; title?: string; is_active?: boolean; expires_at?: string | null }) =>
      request<{ id: string; code: string; target_url: string; is_active: boolean }>(`/api/v1/links/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/v1/links/${id}`, { method: 'DELETE' }),
    analytics: (id: string, days = 30) =>
      request<{ stats: { total_clicks: number; clicks_7d: number; clicks_30d: number; unique_visitors_7d: number }; clicks_by_day: Array<{ date: string; clicks: number }>; top_referrers: Array<{ domain: string; clicks: number }> }>(`/api/v1/links/${id}/analytics?days=${days}`),
  },
  contentStrings: {
    get: (section = 'app', lang = 'en') =>
      request<{ data: Array<{ key: string; value: string }> }>(
        `/v1/content/strings?section=${section}&lang=${lang}`
      ),
  },
  content: {
    zones: (locale?: string) =>
      request<{ data: Array<{ id: string; zone_slug: string; zone_icon: string; zone_color: string; display_order: number; name: string; description: string | null; short_description: string | null }>; locale: string; total: number }>(`/v1/content/zones${locale ? `?locale=${locale}` : ''}`),
    markers: (locale?: string, zone?: string) => {
      const params = new URLSearchParams()
      if (locale) params.set('locale', locale)
      if (zone) params.set('zone', zone)
      const qs = params.toString()
      return request<{ data: Array<{ id: string; marker_slug: string; unit_canonical: string; display_order: number; zone_slug: string | null; is_calculated: boolean | null; name: string; description: string | null; tooltip: string | null }>; locale: string; total: number }>(`/v1/content/markers${qs ? `?${qs}` : ''}`)
    },
    tiers: (locale?: string) =>
      request<{ data: Array<{ id: string; slug: string; price_monthly_eur: number | null; price_annual_eur: number | null; display_order: number; is_active: boolean; highlight: boolean; name: string; tagline: string | null; description: string | null }>; locale: string; total: number }>(`/v1/content/tiers${locale ? `?locale=${locale}` : ''}`),
    dietProtocols: (locale?: string) =>
      request<{ data: Array<{ id: string; slug: string; category: string; name: string; category_label: string | null; short_description: string | null }>; locale: string; total: number }>(`/v1/content/diet-protocols${locale ? `?locale=${locale}` : ''}`),
    eatingPatterns: (locale?: string) =>
      request<{ data: Array<{ id: string; slug: string; name: string; description: string | null }>; locale: string; total: number }>(`/v1/content/eating-patterns${locale ? `?locale=${locale}` : ''}`),
    foodCategories: (locale?: string) =>
      request<{ data: Array<{ id: string; slug: string; icon: string | null; name: string }>; locale: string; total: number }>(`/v1/content/food-categories${locale ? `?locale=${locale}` : ''}`),
    uiStrings: (locale?: string, context?: string) => {
      const params = new URLSearchParams()
      if (locale) params.set('locale', locale)
      if (context) params.set('context', context)
      const qs = params.toString()
      return request<{ data: Array<{ key: string; context: string | null; value: string }>; locale: string; total: number }>(`/v1/content/ui-strings${qs ? `?${qs}` : ''}`)
    },
  },
  search: {
    query: (params: { q: string; type_filter?: string; locale?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams()
      qs.set('q', params.q)
      if (params.type_filter) qs.set('type_filter', params.type_filter)
      if (params.locale) qs.set('locale', params.locale)
      if (params.limit) qs.set('limit', String(params.limit))
      if (params.offset) qs.set('offset', String(params.offset))
      return request<{ data: SearchResponse }>(`/api/v1/search?${qs}`).then(r => r.data)
    },
    suggest: (params: { q: string; locale?: string; limit?: number }) => {
      const qs = new URLSearchParams()
      qs.set('q', params.q)
      if (params.locale) qs.set('locale', params.locale)
      if (params.limit) qs.set('limit', String(params.limit))
      return request<{ data: SuggestResponse }>(`/api/v1/search/suggest?${qs}`).then(r => r.data)
    },
  },
}
