import type { ApiErrorCode } from './api'

/** Map an ApiErrorCode to the corresponding i18n key in the errors namespace */
const ERROR_CODE_TO_I18N: Record<ApiErrorCode, string> = {
  network_error: 'errors.networkError',
  session_expired: 'errors.sessionExpired',
  service_overloaded: 'errors.serviceOverloaded',
  rate_limited: 'errors.rateLimited',
  upstream_error: 'errors.upstreamError',
  timeout: 'errors.timeout',
  quota_exceeded: 'errors.quotaExhausted',
  validation_error: 'errors.unknown',
  not_found: 'errors.notFound',
  forbidden: 'errors.forbidden',
  upgrade_required: 'errors.quotaExhausted',
  unknown: 'errors.unknown',
}

/**
 * Get the i18n key for a given error.
 * Works with both ApiError (has .code) and plain Error.
 */
export function getErrorI18nKey(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: ApiErrorCode }).code
    return ERROR_CODE_TO_I18N[code] || 'errors.unknown'
  }
  return 'errors.unknown'
}
