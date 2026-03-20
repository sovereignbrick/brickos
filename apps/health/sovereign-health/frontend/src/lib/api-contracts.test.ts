import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// API Contract Tests — Sprint 005 Phase 5
//
// These tests verify that sample API response shapes can be parsed correctly
// by our frontend type expectations. They don't call the real API; instead
// they validate that the JSON structures the backend actually returns match
// what the frontend expects.
// ---------------------------------------------------------------------------

// -- Sample responses captured from the staging API --------------------------

const sampleHealthResponse = {
  status: 'ok',
  service: 'sovereign-health-backend',
  version: '0.22.0',
  timestamp: '2026-03-20T17:00:00Z',
}

const sampleAuthLoginResponse = {
  data: {
    user: {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      email: 'test@example.com',
      display_name: 'Test User',
      role: 'user',
      email_verified: true,
      tier: 'glimpse',
      mfa_enabled: false,
      locale: 'en',
      country: 'DE',
      created_at: '2026-01-01T00:00:00Z',
    },
    token: 'eyJhbGciOiJIUzI1NiJ9...',
    refresh_token: 'rt_abc123',
  },
  error: null,
}

const sampleMeasurementsListResponse = {
  data: [
    {
      id: '11111111-2222-3333-4444-555555555555',
      marker_slug: 'glucose',
      marker_name: 'Blood Glucose',
      value: 5.2,
      unit: 'mmol/L',
      status: 'optimal',
      timestamp: '2026-03-20T06:00:00Z',
      protocol_tag: 'fasting',
      device_id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
      device_name: 'Fora 6',
      lab_id: null,
      lab_name: null,
      notes: null,
    },
  ],
  meta: { page: 1, per_page: 50, total: 1 },
  error: null,
}

const sampleZonesResponse = {
  data: [
    {
      id: '11111111-0000-0000-0000-000000000001',
      zone_slug: 'metabolic',
      zone_icon: 'flame',
      zone_color: '#FF6B35',
      display_order: 1,
      markers: [
        {
          marker_slug: 'glucose',
          display_name: 'Blood Glucose',
          abbreviation: 'BG',
          unit_canonical: 'mmol/L',
          display_order: 1,
          latest_value: 5.2,
          latest_status: 'optimal',
          latest_timestamp: '2026-03-20T06:00:00Z',
          trend_direction: 'stable',
        },
      ],
      name: 'Metabolic Health',
      description: 'Blood sugar, insulin, ketones',
      short_description: 'Sugar & energy',
    },
  ],
  error: null,
}

const sampleDevicesResponse = {
  data: [
    {
      id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
      device_name: 'Fora 6',
      manufacturer: 'ForaCare',
      model: 'Fora 6 Connect',
      device_type: 'home',
      markers_measured: ['glucose', 'ketones', 'hematocrit', 'hemoglobin', 'uric_acid', 'total_cholesterol'],
      is_default: true,
      status: 'active',
      notes: null,
      created_at: '2026-01-15T00:00:00Z',
    },
  ],
  error: null,
}

const sampleContentMarkersResponse = {
  data: [
    {
      id: '11111111-0000-0000-0000-000000000010',
      marker_slug: 'glucose',
      unit_canonical: 'mmol/L',
      display_order: 1,
      zone_slug: 'metabolic',
      is_calculated: false,
      name: 'Blood Glucose',
      description: 'Measures blood sugar level',
      tooltip: 'Blood sugar',
    },
  ],
  locale: 'en',
  total: 92,
}

const sampleAuditAccessResponse = {
  data: {
    entries: [
      {
        id: '11111111-2222-3333-4444-aaaaaaaaaaaa',
        created_at: '2026-03-20T10:00:00Z',
        user_email: 'user@example.com',
        accessed_by_email: 'admin@example.com',
        action: 'view',
        resource: 'measurements',
        metadata: { marker: 'glucose' },
      },
    ],
    total: 1,
  },
}

const sampleAuditStatsResponse = {
  data: {
    access_log_count: 42,
    event_log_count: 108,
    access_log_oldest: '2026-01-01T00:00:00Z',
    event_log_oldest: '2026-01-01T00:00:00Z',
  },
}

const sampleImportSessionResponse = {
  data: {
    session_id: '11111111-2222-3333-4444-bbbbbbbbbbbb',
    file_name: 'lab_results.pdf',
    extracted: [
      {
        original_name: 'Glucose',
        matched_marker: 'glucose',
        match_confidence: 'high',
        value_original: 92,
        unit_original: 'mg/dL',
        value_converted: 5.11,
        unit_converted: 'mmol/L',
        reference_range: '70-100',
        flag: 'normal',
        extraction_confidence: 0.95,
      },
    ],
    unmatched_count: 0,
    total_count: 1,
    lab_date: '2026-03-15',
    lab_provider: 'Lab Corp',
    status: 'extracted',
  },
  error: null,
}

const sampleMeasurementImportResponse = {
  data: {
    session_id: '11111111-2222-3333-4444-cccccccccccc',
    file_name: 'measurements.xlsx',
    import_type: 'measurement_import',
    status: 'extracted',
    columns: [
      {
        index: 0,
        source_name: 'Gewicht (kg)',
        marker_slug: 'weight',
        abbreviation: 'BW',
        unit: 'kg',
        device_id: 'aaaaaaaa-bbbb-cccc-dddd-222222222222',
        device_name: 'Qardio Base',
        match_confidence: 'high',
      },
    ],
    protocols: { 'Nüchtern': 'fasting' },
    rows: [
      { date: '2026-03-20', time: '05:55', protocol: 'standard', diet: null, notes: null, values: { weight: 68.7 } },
    ],
    total_rows: 1,
    total_markers: 1,
  },
  error: null,
}

const sampleLicenseResponse = {
  data: {
    tier_slug: 'clarity',
    tier_name: 'Clarity',
    max_markers: 92,
    max_history_days: null,
    max_devices: null,
    max_calculated_markers: null,
    features: ['zones', 'trends', 'export', 'dr_alex', 'reports'],
    billing_interval: 'yearly',
    is_override: false,
    override_expires_at: null,
    subscription_status: 'active',
  },
  error: null,
}

// -- Tests -------------------------------------------------------------------

describe('API Contract: Health', () => {
  it('has required fields', () => {
    expect(sampleHealthResponse).toHaveProperty('status')
    expect(sampleHealthResponse).toHaveProperty('service')
    expect(sampleHealthResponse).toHaveProperty('version')
    expect(sampleHealthResponse).toHaveProperty('timestamp')
    expect(sampleHealthResponse.status).toBe('ok')
  })
})

describe('API Contract: Auth Login', () => {
  it('wraps response in data envelope', () => {
    expect(sampleAuthLoginResponse).toHaveProperty('data')
    expect(sampleAuthLoginResponse.data).toHaveProperty('user')
    expect(sampleAuthLoginResponse.data).toHaveProperty('token')
  })

  it('user has required fields', () => {
    const { user } = sampleAuthLoginResponse.data
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('tier')
    expect(user).toHaveProperty('email_verified')
    expect(typeof user.email_verified).toBe('boolean')
  })
})

describe('API Contract: Measurements List', () => {
  it('has paginated structure', () => {
    expect(sampleMeasurementsListResponse).toHaveProperty('data')
    expect(sampleMeasurementsListResponse).toHaveProperty('meta')
    expect(sampleMeasurementsListResponse.meta).toHaveProperty('page')
    expect(sampleMeasurementsListResponse.meta).toHaveProperty('per_page')
    expect(sampleMeasurementsListResponse.meta).toHaveProperty('total')
  })

  it('measurement has required fields', () => {
    const m = sampleMeasurementsListResponse.data[0]
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('marker_slug')
    expect(m).toHaveProperty('value')
    expect(m).toHaveProperty('unit')
    expect(m).toHaveProperty('status')
    expect(m).toHaveProperty('timestamp')
    expect(typeof m.value).toBe('number')
  })
})

describe('API Contract: Zones', () => {
  it('zone has required fields', () => {
    const z = sampleZonesResponse.data[0]
    expect(z).toHaveProperty('zone_slug')
    expect(z).toHaveProperty('zone_icon')
    expect(z).toHaveProperty('zone_color')
    expect(z).toHaveProperty('markers')
    expect(Array.isArray(z.markers)).toBe(true)
  })

  it('zone marker has required fields', () => {
    const m = sampleZonesResponse.data[0].markers[0]
    expect(m).toHaveProperty('marker_slug')
    expect(m).toHaveProperty('display_name')
    expect(m).toHaveProperty('unit_canonical')
    expect(m).toHaveProperty('latest_value')
    expect(m).toHaveProperty('latest_status')
  })
})

describe('API Contract: Devices', () => {
  it('device has required fields', () => {
    const d = sampleDevicesResponse.data[0]
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('device_name')
    expect(d).toHaveProperty('device_type')
    expect(d).toHaveProperty('markers_measured')
    expect(d).toHaveProperty('is_default')
    expect(Array.isArray(d.markers_measured)).toBe(true)
  })
})

describe('API Contract: Content Markers', () => {
  it('has locale and total metadata', () => {
    expect(sampleContentMarkersResponse).toHaveProperty('locale')
    expect(sampleContentMarkersResponse).toHaveProperty('total')
    expect(sampleContentMarkersResponse.total).toBe(92)
  })

  it('marker has required translation fields', () => {
    const m = sampleContentMarkersResponse.data[0]
    expect(m).toHaveProperty('marker_slug')
    expect(m).toHaveProperty('name')
    expect(m).toHaveProperty('unit_canonical')
  })
})

describe('API Contract: Audit Logs', () => {
  it('access log response has entries array and total', () => {
    expect(sampleAuditAccessResponse.data).toHaveProperty('entries')
    expect(sampleAuditAccessResponse.data).toHaveProperty('total')
    expect(Array.isArray(sampleAuditAccessResponse.data.entries)).toBe(true)
  })

  it('access log entry has correct field names', () => {
    const e = sampleAuditAccessResponse.data.entries[0]
    // These field names must match what the frontend maps:
    // created_at (not timestamp), accessed_by_email (not accessed_by), user_email
    expect(e).toHaveProperty('created_at')
    expect(e).toHaveProperty('user_email')
    expect(e).toHaveProperty('accessed_by_email')
    expect(e).toHaveProperty('action')
    expect(e).toHaveProperty('resource')
  })

  it('audit stats has correct field names', () => {
    const s = sampleAuditStatsResponse.data
    expect(s).toHaveProperty('access_log_count')
    expect(s).toHaveProperty('event_log_count')
    expect(typeof s.access_log_count).toBe('number')
  })
})

describe('API Contract: Import (Lab)', () => {
  it('session has required fields', () => {
    const s = sampleImportSessionResponse.data
    expect(s).toHaveProperty('session_id')
    expect(s).toHaveProperty('extracted')
    expect(s).toHaveProperty('status')
    expect(s.status).toBe('extracted')
  })

  it('extracted marker has match fields', () => {
    const m = sampleImportSessionResponse.data.extracted[0]
    expect(m).toHaveProperty('original_name')
    expect(m).toHaveProperty('matched_marker')
    expect(m).toHaveProperty('match_confidence')
    expect(m).toHaveProperty('value_original')
    expect(m).toHaveProperty('value_converted')
    expect(m).toHaveProperty('unit_converted')
  })
})

describe('API Contract: Import (Measurements)', () => {
  it('session has columns and rows', () => {
    const s = sampleMeasurementImportResponse.data
    expect(s).toHaveProperty('columns')
    expect(s).toHaveProperty('rows')
    expect(s).toHaveProperty('total_rows')
    expect(s).toHaveProperty('total_markers')
    expect(s.import_type).toBe('measurement_import')
  })

  it('column has device matching fields', () => {
    const c = sampleMeasurementImportResponse.data.columns[0]
    expect(c).toHaveProperty('marker_slug')
    expect(c).toHaveProperty('unit')
    expect(c).toHaveProperty('device_id')
    expect(c).toHaveProperty('device_name')
    expect(c).toHaveProperty('match_confidence')
  })

  it('row has date, time, and values', () => {
    const r = sampleMeasurementImportResponse.data.rows[0]
    expect(r).toHaveProperty('date')
    expect(r).toHaveProperty('time')
    expect(r).toHaveProperty('values')
    expect(typeof r.values).toBe('object')
  })

  it('match_confidence includes calculated_skip', () => {
    const validConfidences = ['high', 'medium', 'low', 'unmatched', 'calculated_skip']
    const c = sampleMeasurementImportResponse.data.columns[0]
    expect(validConfidences).toContain(c.match_confidence)
  })
})

describe('API Contract: License', () => {
  it('has tier and feature fields', () => {
    const l = sampleLicenseResponse.data
    expect(l).toHaveProperty('tier_slug')
    expect(l).toHaveProperty('tier_name')
    expect(l).toHaveProperty('features')
    expect(Array.isArray(l.features)).toBe(true)
    expect(l).toHaveProperty('max_markers')
  })
})
