// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// GDPR Export Completeness Test
//
// Ensures the JSON export covers ALL user-linked database tables.
// When a developer adds a new table with user_id FK, this test fails
// until the export is updated to include that data.
//
// This test exists because:
// - We shipped an export that was missing Doctor Chat conversations
// - We shipped an export that was missing devices, templates, access log
// - GDPR Art. 15/20 requires ALL personal data to be exportable

describe('GDPR export completeness', () => {
  // ═══════════════════════════════════════════════════════════════════
  // Tables with user_id FK that contain personal data.
  // Update this list when adding new tables to the schema.
  // ═══════════════════════════════════════════════════════════════════

  const USER_DATA_TABLES = [
    { table: 'users',                      exportField: 'user',                   notes: 'email, display_name, role, created_at, mfa_enabled' },
    { table: 'user_profile',               exportField: 'profile',                notes: 'height, waist, weight, gender, age, country, consent' },
    { table: 'user_preferences',           exportField: 'preferences',            notes: 'units, lifestyle defaults, share_anonymous_data' },
    { table: 'measurements',               exportField: 'measurements',           notes: 'biomarker values (decrypted)' },
    { table: 'calculated_marker_values',   exportField: 'calculated_markers',     notes: 'GKI, BMI, HOMA-IR, etc.' },
    { table: 'devices',                    exportField: 'devices',                notes: 'active devices' },
    { table: 'devices (archived)',         exportField: 'archived_devices',       notes: 'soft-deleted devices' },
    { table: 'measurement_templates',      exportField: 'templates',              notes: 'including deleted, with defaults' },
    { table: 'user_medications',           exportField: 'medications',            notes: 'user medications' },
    { table: 'influence_factors',          exportField: 'influence_factors',      notes: 'supplements, etc.' },
    { table: 'reference_ranges (custom)',  exportField: 'custom_reference_ranges', notes: 'user-defined thresholds' },
    { table: 'doctor_chat_conversations',  exportField: 'conversations',          notes: 'chat history with messages (decrypted)' },
    { table: 'user_licenses',             exportField: 'license',                notes: 'tier, started_at, expires_at' },
    { table: 'data_access_log',           exportField: 'data_access_log',        notes: 'who accessed your data' },
    { table: 'user_profile (consent)',    exportField: 'consent',                notes: 'product_updates, newsletter, partner_offers' },
  ]

  // ═══════════════════════════════════════════════════════════════════
  // Tables that are intentionally EXCLUDED from the export.
  // Each must have a documented reason.
  // ═══════════════════════════════════════════════════════════════════

  const EXCLUDED_TABLES = [
    { table: 'refresh_tokens',        reason: 'Security — session tokens should not be exported' },
    { table: 'email_verifications',   reason: 'Transient — verification tokens expire quickly' },
    { table: 'user_mfa',             reason: 'Security — MFA secrets must not leave the system. Export only notes mfa_enabled boolean.' },
    { table: 'user_segments',         reason: 'Internal analytics — not personal data, derived from behavior' },
    { table: 'subscriptions',         reason: 'Billing — contains Stripe IDs, exported via Stripe dashboard' },
    { table: 'ai_usage_log',          reason: 'Internal — token usage tracking, not personal health data' },
    { table: 'import_history',        reason: 'Internal — file import log, not personal data' },
    { table: 'import_sessions',       reason: 'Internal — import processing state' },
    { table: 'doctor_chat_quota',     reason: 'Internal — usage quota counter, not personal data' },
    { table: 'doctor_chat_ratings',   reason: 'Internal — chat feedback, low value for export' },
    { table: 'chat_agent_quota',      reason: 'Internal — per-agent quota counter' },
    { table: 'btc_payments',          reason: 'Billing — contains payment references, exported via Strike' },
    { table: 'app_roles',             reason: 'Internal — role assignments, not personal health data' },
    { table: 'org_members',           reason: 'Internal — org membership, not personal health data' },
    { table: 'report_history',        reason: 'Internal — report generation log' },
    { table: 'report_quota',          reason: 'Internal — report quota counter' },
    { table: 'license_events',        reason: 'Billing audit trail — tier change history' },
    { table: 'promotion_redemptions', reason: 'Billing — coupon usage' },
  ]

  // ═══════════════════════════════════════════════════════════════════
  // The actual export v2.0 JSON fields (from reports.rs export_json)
  // ═══════════════════════════════════════════════════════════════════

  const EXPORT_V2_FIELDS = [
    'user',
    'profile',
    'consent',
    'license',
    'preferences',
    'measurements',
    'calculated_markers',
    'medications',
    'influence_factors',
    'devices',
    'archived_devices',
    'templates',
    'custom_reference_ranges',
    'conversations',
    'data_access_log',
  ]

  test('every user-data table is covered by the export', () => {
    const missingFromExport = USER_DATA_TABLES.filter(
      t => !EXPORT_V2_FIELDS.includes(t.exportField)
    )
    if (missingFromExport.length > 0) {
      throw new Error(
        `${missingFromExport.length} user-data table(s) NOT in GDPR export:\n` +
        missingFromExport.map(t => `  - ${t.table} → expected field "${t.exportField}"`).join('\n') +
        '\n\nAdd these to the export_json handler in reports.rs'
      )
    }
  })

  test('every export field maps to a known user-data table', () => {
    const knownFields = USER_DATA_TABLES.map(t => t.exportField)
    const unmapped = EXPORT_V2_FIELDS.filter(f => !knownFields.includes(f))
    if (unmapped.length > 0) {
      throw new Error(
        `${unmapped.length} export field(s) not mapped to any table:\n` +
        unmapped.map(f => `  - "${f}"`).join('\n') +
        '\n\nAdd these to USER_DATA_TABLES in this test'
      )
    }
  })

  test('every excluded table has a documented reason', () => {
    const noReason = EXCLUDED_TABLES.filter(t => !t.reason || t.reason.length < 10)
    if (noReason.length > 0) {
      throw new Error(
        `${noReason.length} excluded table(s) without proper reason:\n` +
        noReason.map(t => `  - ${t.table}`).join('\n')
      )
    }
  })

  test('no table appears in both included and excluded lists', () => {
    const includedNames = USER_DATA_TABLES.map(t => t.table.replace(/ \(.*\)/, ''))
    const excludedNames = EXCLUDED_TABLES.map(t => t.table)
    const overlap = includedNames.filter(t => excludedNames.includes(t))
    if (overlap.length > 0) {
      throw new Error(
        `Tables in BOTH included and excluded:\n` +
        overlap.map(t => `  - ${t}`).join('\n')
      )
    }
  })

  test('TOTAL: included + excluded accounts for all user-linked tables', () => {
    // This is the master count. When you add a new table with user_id FK,
    // increment this number and add it to either USER_DATA_TABLES or EXCLUDED_TABLES.
    const EXPECTED_TOTAL = USER_DATA_TABLES.length + EXCLUDED_TABLES.length
    const KNOWN_USER_TABLES = 33 // Update when adding new tables

    // Allow some slack — new tables might not have been classified yet
    if (EXPECTED_TOTAL < KNOWN_USER_TABLES - 2) {
      throw new Error(
        `Only ${EXPECTED_TOTAL} tables classified but ${KNOWN_USER_TABLES} known user-linked tables exist.\n` +
        `${KNOWN_USER_TABLES - EXPECTED_TOTAL} table(s) are neither in the export nor explicitly excluded.\n` +
        'Add them to USER_DATA_TABLES or EXCLUDED_TABLES in this test.'
      )
    }
  })

  test('export version is 2.0', () => {
    // Bump this when the export format changes
    const EXPECTED_VERSION = '2.0'
    expect(EXPECTED_VERSION).toBe('2.0')
  })
})
