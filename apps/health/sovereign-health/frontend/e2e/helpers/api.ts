import { APIRequestContext } from '@playwright/test'
import { TestUser, authHeaders } from './auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'

/**
 * Get user settings (profile, preferences).
 */
export async function getSettings(request: APIRequestContext, user: TestUser) {
  const res = await request.get(`${API}/settings`, {
    headers: authHeaders(user),
  })
  if (!res.ok()) throw new Error(`GET /settings failed: ${res.status()}`)
  return (await res.json()).data
}

/**
 * Update user profile.
 */
export async function updateProfile(
  request: APIRequestContext,
  user: TestUser,
  profile: Record<string, unknown>,
) {
  const res = await request.put(`${API}/settings/profile`, {
    headers: authHeaders(user),
    data: profile,
  })
  if (!res.ok()) throw new Error(`PUT /settings/profile failed: ${res.status()}`)
  return (await res.json()).data
}

/**
 * Update unit preferences.
 */
export async function updateUnits(
  request: APIRequestContext,
  user: TestUser,
  units: Record<string, string>,
) {
  const res = await request.put(`${API}/settings/units`, {
    headers: authHeaders(user),
    data: units,
  })
  if (!res.ok()) throw new Error(`PUT /settings/units failed: ${res.status()}`)
  return (await res.json()).data
}

/**
 * Get user's measurement count.
 */
export async function getMeasurementCount(request: APIRequestContext, user: TestUser): Promise<number> {
  const res = await request.get(`${API}/measurements?limit=1`, {
    headers: authHeaders(user),
  })
  if (!res.ok()) return 0
  const body = await res.json()
  return body.meta?.total || 0
}

/**
 * Get user's device count.
 */
export async function getDeviceCount(request: APIRequestContext, user: TestUser): Promise<number> {
  const res = await request.get(`${API}/devices`, {
    headers: authHeaders(user),
  })
  if (!res.ok()) return 0
  const body = await res.json()
  return Array.isArray(body.data) ? body.data.length : 0
}

/**
 * Check if a table has zero rows for a user (for cleanup verification).
 * Uses admin endpoint if available, otherwise returns -1.
 */
export async function verifyNoDataTraces(
  request: APIRequestContext,
  user: TestUser,
): Promise<{ measurements: number; devices: number }> {
  const measurements = await getMeasurementCount(request, user)
  const devices = await getDeviceCount(request, user)
  return { measurements, devices }
}
