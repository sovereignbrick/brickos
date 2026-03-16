import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, type Locale } from './config'
import { cookies } from 'next/headers'
import { unflattenKeys, deepMerge } from './utils'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value || defaultLocale) as Locale
  const staticMessages = (await import(`./messages/${locale}.json`)).default

  // Fetch DB-managed strings and merge over static (DB wins)
  let messages = staticMessages
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const res = await fetch(
      `${apiUrl}/v1/content/strings?section=app&lang=${locale}`,
      { next: { revalidate: 300 } }
    )
    if (res.ok) {
      const json = await res.json()
      const flat: Array<{ key: string; value: string }> = json?.data || []
      if (flat.length > 0) {
        const dbMessages = unflattenKeys(flat)
        messages = deepMerge(staticMessages, dbMessages) as typeof staticMessages
      }
    }
  } catch {
    // Fallback to static-only if API unavailable
  }

  return { locale, messages }
})
