import { test, expect } from '@playwright/test'
import { login, loginViaUI, authHeaders } from './helpers/auth'
import { getSettings, updateProfile, updateUnits } from './helpers/api'
import { SAMPLE_PROFILES, SAMPLE_UNITS } from './helpers/fixtures'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 2: Profile & Settings', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('2.1 settings page loads with tabs', async ({ page }) => {
    await loginViaUI(page, EMAIL, PASSWORD)
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('2.2 can read settings via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const settings = await getSettings(request, user)
    expect(settings).toBeTruthy()
    expect(settings).toHaveProperty('email')
  })

  test('2.3 can update profile via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    // Save current settings to restore later
    const original = await getSettings(request, user)

    // Update profile
    await updateProfile(request, user, SAMPLE_PROFILES.standard)

    // Verify update
    const updated = await getSettings(request, user)
    expect(updated.gender).toBe('male')

    // Restore original if different
    if (original.gender !== 'male') {
      await updateProfile(request, user, { gender: original.gender })
    }
  })

  test('2.4 can switch units via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const original = await getSettings(request, user)

    // Switch to imperial
    await updateUnits(request, user, SAMPLE_UNITS.imperial)
    const updated = await getSettings(request, user)
    expect(updated.glucose_unit).toBe('mg/dL')

    // Restore original
    await updateUnits(request, user, { glucose_unit: original.glucose_unit || 'mmol/L' })
  })

  test('2.5 can update locale via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)

    // Switch to German
    await updateProfile(request, user, { locale: 'de' })
    const deSettings = await getSettings(request, user)
    expect(deSettings.locale).toBe('de')

    // Switch back to English
    await updateProfile(request, user, { locale: 'en' })
    const enSettings = await getSettings(request, user)
    expect(enSettings.locale).toBe('en')
  })

  test('2.6 content endpoints respect locale', async ({ request }) => {
    // English zones
    const enRes = await request.get(`${API}/v1/content/zones?locale=en`)
    expect(enRes.ok()).toBeTruthy()
    const enData = await enRes.json()
    expect(enData.locale).toBe('en')

    // German zones
    const deRes = await request.get(`${API}/v1/content/zones?locale=de`)
    expect(deRes.ok()).toBeTruthy()
    const deData = await deRes.json()
    expect(deData.locale).toBe('de')

    // Names should differ between locales
    if (enData.data.length > 0 && deData.data.length > 0) {
      // At least some zone names should be different in DE vs EN
      const enNames = enData.data.map((z: { name: string }) => z.name)
      const deNames = deData.data.map((z: { name: string }) => z.name)
      const allSame = enNames.every((n: string, i: number) => n === deNames[i])
      expect(allSame).toBeFalsy()
    }
  })

  test('2.7 lifestyle defaults via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)

    // Set lifestyle defaults
    const res = await request.put(`${API}/settings/lifestyle`, {
      headers: authHeaders(user),
      data: {
        show_extended_lifestyle: true,
        default_diet_protocol: 'keto',
        default_fasting_protocol: '16_8',
      },
    })
    expect(res.ok()).toBeTruthy()

    // Verify
    const settings = await getSettings(request, user)
    expect(settings.default_diet_protocol).toBe('keto')

    // Reset
    await request.put(`${API}/settings/lifestyle`, {
      headers: authHeaders(user),
      data: {
        show_extended_lifestyle: false,
        default_diet_protocol: null,
        default_fasting_protocol: null,
      },
    })
  })
})
