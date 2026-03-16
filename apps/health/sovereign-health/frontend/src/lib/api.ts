import Cookies from 'js-cookie'
import type { ImportSession, ImportMedication, ImportHistoryEntry, UserMedicationFull, CreateMedicationInput, AiUsageResponse, InfluenceFactor, CreateInfluenceFactorInput, MedImportSession } from './types'
import { APP_CONFIG } from './config'

// On .onion domains, the API is served from the same origin via nginx routing.
// NEXT_PUBLIC_API_URL is baked at build time and points to the clearnet API,
// so we override it at runtime when accessed via Tor.
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname.endsWith('.onion')
    ? ''
    : APP_CONFIG.apiUrl

function getToken(): string | undefined {
  return Cookies.get('auth_token')
}

export function setToken(token: string): void {
  Cookies.set('auth_token', token, {
    expires: APP_CONFIG.sessionTimeoutHours / 24,
    sameSite: 'strict',
    path: '/',
  })
}

export function clearToken(): void {
  Cookies.remove('auth_token')
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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

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

    throw new Error(message)
  }

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`)
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

export const api = {
  auth: {
    signup: (body: { email: string; password: string; display_name?: string; tos_accepted: boolean; referred_by?: string; locale?: string }) =>
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
    deleteAccount: () =>
      request<{ data: { deleted: boolean; message: string } }>(
        '/settings/account', { method: 'DELETE' }
      ),
    updateAnonymousData: (share: boolean) =>
      request<{ data: { updated: boolean } }>(
        '/settings/anonymous-data', { method: 'PUT', body: JSON.stringify({ share_anonymous_data: share }) }
      ),
  },
  templates: {
    list: () =>
      request<{ data: import('./types').MeasurementTemplate[] }>('/measurement-templates'),
    create: (body: { name: string; marker_slugs: string[]; is_default?: boolean; display_order?: number }) =>
      request<{ data: import('./types').MeasurementTemplate }>(
        '/measurement-templates', { method: 'POST', body: JSON.stringify(body) }
      ),
    update: (id: string, body: { name?: string; marker_slugs?: string[]; is_default?: boolean; display_order?: number }) =>
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
    checkout: (tier: string, interval: string, promo_code?: string) =>
      request<{ data: { checkout_url: string } }>(
        '/billing/checkout', { method: 'POST', body: JSON.stringify({ tier, interval, promo_code: promo_code || undefined }) }
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
  license: {
    get: () =>
      request<{ data: import('./types').LicenseInfo }>('/license'),
    tiers: () => {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
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
    confirm: (sessionId: string, markers: Array<{ marker_slug: string; value: number }>, opts?: { measured_at?: string; protocol_tag?: string; device_id?: string }) =>
      request<{ data: { session_id: string; measurements_created: number; message: string } }>(`/import/${sessionId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, markers, ...opts }),
      }),
    confirmMedications: (sessionId: string, medications: Array<{ name: string; factor_type?: string; dosage?: string; frequency?: string; form?: string; prescriber?: string; ingredients?: Array<{ name: string; amount?: string; role?: string }> }>) =>
      request<{ data: { session_id: string; influence_factors_created: number; message: string } }>(`/import/${sessionId}/confirm-medications`, {
        method: 'POST',
        body: JSON.stringify({ medications }),
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
  admin: {
    dashboard: () =>
      request<{ data: {
        total_users: number; verified_users: number; total_measurements: number;
        active_7d: number; active_30d: number; signups_7d: number;
        early_access_count: number; tier_distribution: Array<{ tier: string; count: number }>;
      } }>('/admin/dashboard'),
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
    listUsers: (params?: { page?: number; per_page?: number; search?: string; sort?: string; order?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.per_page) qs.set('per_page', String(params.per_page))
      if (params?.search) qs.set('search', params.search)
      if (params?.sort) qs.set('sort', params.sort)
      if (params?.order) qs.set('order', params.order)
      return request<{ data: import('./types').AdminUser[]; meta: { page: number; per_page: number; total: number } }>(`/admin/users?${qs}`)
    },
    updateUserLicense: (userId: string, body: { tier?: string; override_active: boolean; note?: string }) =>
      request<{ data: import('./types').LicenseOverrideResult }>(`/admin/users/${userId}/license`, { method: 'PUT', body: JSON.stringify(body) }),
    listWebPages: () =>
      request<{ data: import('./types').WebPage[] }>('/admin/content/web-pages'),
    addWebSection: (pageId: string, body: { key: string; section_type?: string }) =>
      request<{ data: { id: string; key: string; section_type: string } }>(`/admin/content/web-pages/${pageId}/sections`, { method: 'POST', body: JSON.stringify(body) }),
    updateWebTranslation: (sectionId: string, locale: string, value: string) =>
      request<{ data: { updated: boolean } }>(`/admin/content/web-sections/${sectionId}/translations/${locale}`, { method: 'PUT', body: JSON.stringify({ value }) }),
    deleteWebSection: (sectionId: string) =>
      request<{ data: { deleted: boolean } }>(`/admin/content/web-sections/${sectionId}`, { method: 'DELETE' }),
    aiUsage: (period?: string, date?: string) => {
      const params = new URLSearchParams()
      if (period) params.set('period', period)
      if (date) params.set('date', date)
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
    newsletterSubscribers: (page = 1, perPage = 50) =>
      request<{ data: {
        subscribers: Array<{
          id: string; email: string; source: string; subscribed: boolean;
          confirmed: boolean; confirmed_at: string | null;
          unsubscribed_at: string | null; mailgun_synced: boolean; created_at: string;
        }>;
        meta: { total: number; subscribed: number; unsubscribed: number; pending: number; page: number; per_page: number };
      } }>(`/admin/newsletter/subscribers?page=${page}&per_page=${perPage}`),
    newsletterExport: async () => {
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const r = await fetch(`${API_BASE}/admin/newsletter/export`, {
        credentials: 'include',
        headers,
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
}
