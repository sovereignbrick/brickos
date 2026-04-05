// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Search API contract tests -- Sprint 023
// Validates that search response shapes match frontend expectations.

import { describe, it, expect } from 'vitest'

// -- Sample responses matching the backend search handler -------------------

const sampleSearchResponse = {
  query: 'glucose',
  total: 15,
  authenticated: true,
  results: [
    {
      entity_type: 'marker',
      entity_id: 'glucose',
      title: 'Glucose',
      subtitle: 'Energy & Metabolic',
      snippet: 'Blood sugar level -- primary energy source for cells',
      url_path: '/markers/glucose',
      external_url: null,
      score: 4.82,
      metadata: {
        source_type: 'home',
        unit_canonical: 'mmol/L',
        loinc_code: '2345-7',
        zone_id: 'abc-123',
      },
      user_context: {
        status: 'green',
        last_measured: '2026-04-01T08:30:00Z',
        is_stale: false,
      },
      related_calculated: ['gki', 'homa_ir', 'tyg_index'],
    },
    {
      entity_type: 'content',
      entity_id: 'glucose-how_to_stay_in_range',
      title: 'How to Keep Glucose in Range',
      subtitle: null,
      snippet: 'Eat low-glycaemic-index carbohydrates...',
      url_path: '/markers/glucose#how_to_stay_in_range',
      external_url: null,
      score: 2.15,
      metadata: { content_type: 'how_to_stay_in_range', parent_marker: 'glucose' },
      user_context: null,
      related_calculated: null,
    },
    {
      entity_type: 'web_content',
      entity_id: 'features-hero',
      title: 'features_hero_title',
      subtitle: null,
      snippet: 'Track glucose, ketones, and metabolic markers...',
      url_path: null,
      external_url: 'https://sovereignhealth.io/features',
      score: 0.72,
      metadata: null,
      user_context: null,
      related_calculated: null,
    },
  ],
  facets: {
    marker: 3,
    content: 5,
    food: 4,
    supplement: 2,
    web_content: 1,
  },
  blind_spots: [
    {
      type: 'missing_base_marker',
      message: 'GKI requires ketones -- you have not measured ketones yet',
      action_url: '/markers/ketones',
    },
  ],
  dr_alex_cta: {
    prompt: 'Want personalized advice about glucose?',
    url: '/doctor-chat?context=glucose',
  },
  login_cta: null,
}

const sampleSuggestResponse = {
  suggestions: [
    { text: 'Glucose', type: 'marker', url: '/markers/glucose' },
    { text: 'Glucose-Ketone Index (GKI)', type: 'calculated_marker', url: '/markers/gki' },
    { text: 'How to Keep Glucose in Range', type: 'content', url: '/markers/glucose#how_to_stay_in_range' },
  ],
}

const samplePublicSearchResponse = {
  query: 'glucose',
  total: 10,
  authenticated: false,
  results: [
    {
      entity_type: 'marker',
      entity_id: 'glucose',
      title: 'Glucose',
      subtitle: 'Energy & Metabolic',
      snippet: 'Blood sugar level',
      url_path: '/markers/glucose',
      external_url: null,
      score: 4.82,
      metadata: { source_type: 'home' },
      user_context: null,
      related_calculated: null,
    },
  ],
  facets: { marker: 3, content: 5, food: 2 },
  blind_spots: [],
  dr_alex_cta: null,
  login_cta: {
    message: 'Log in to search your personal health data',
    url: '/login?redirect=/search?q=glucose',
  },
}

// -- Tests ------------------------------------------------------------------

describe('Search API contracts', () => {
  it('search response has required top-level fields', () => {
    expect(sampleSearchResponse).toHaveProperty('query')
    expect(sampleSearchResponse).toHaveProperty('total')
    expect(sampleSearchResponse).toHaveProperty('authenticated')
    expect(sampleSearchResponse).toHaveProperty('results')
    expect(sampleSearchResponse).toHaveProperty('facets')
    expect(sampleSearchResponse).toHaveProperty('blind_spots')
    expect(typeof sampleSearchResponse.total).toBe('number')
    expect(typeof sampleSearchResponse.authenticated).toBe('boolean')
    expect(Array.isArray(sampleSearchResponse.results)).toBe(true)
    expect(Array.isArray(sampleSearchResponse.blind_spots)).toBe(true)
  })

  it('search result has required fields', () => {
    const result = sampleSearchResponse.results[0]
    expect(result).toHaveProperty('entity_type')
    expect(result).toHaveProperty('entity_id')
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('score')
    expect(typeof result.score).toBe('number')
    expect(result.score).toBeGreaterThan(0)
  })

  it('marker result has user_context when authenticated', () => {
    const marker = sampleSearchResponse.results[0]
    expect(marker.entity_type).toBe('marker')
    expect(marker.user_context).not.toBeNull()
    expect(marker.user_context).toHaveProperty('status')
    expect(marker.user_context).toHaveProperty('last_measured')
    expect(marker.user_context).toHaveProperty('is_stale')
  })

  it('web_content result has external_url', () => {
    const web = sampleSearchResponse.results[2]
    expect(web.entity_type).toBe('web_content')
    expect(web.external_url).toBeTruthy()
    expect(web.url_path).toBeNull()
  })

  it('public search has no user_context and includes login_cta', () => {
    expect(samplePublicSearchResponse.authenticated).toBe(false)
    expect(samplePublicSearchResponse.results[0].user_context).toBeNull()
    expect(samplePublicSearchResponse.login_cta).not.toBeNull()
    expect(samplePublicSearchResponse.login_cta?.url).toContain('/login')
  })

  it('facets are record of entity_type to count', () => {
    const facets = sampleSearchResponse.facets
    for (const [key, value] of Object.entries(facets)) {
      expect(typeof key).toBe('string')
      expect(typeof value).toBe('number')
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  it('blind spots have type, message, and action_url', () => {
    const spot = sampleSearchResponse.blind_spots[0]
    expect(spot).toHaveProperty('type')
    expect(spot).toHaveProperty('message')
    expect(spot).toHaveProperty('action_url')
    expect(spot.action_url).toMatch(/^\//)
  })

  it('suggest response has suggestions array', () => {
    expect(Array.isArray(sampleSuggestResponse.suggestions)).toBe(true)
    const s = sampleSuggestResponse.suggestions[0]
    expect(s).toHaveProperty('text')
    expect(s).toHaveProperty('type')
    expect(s).toHaveProperty('url')
  })

  it('dr_alex_cta has prompt and url when authenticated', () => {
    expect(sampleSearchResponse.dr_alex_cta).not.toBeNull()
    expect(sampleSearchResponse.dr_alex_cta?.prompt).toBeTruthy()
    expect(sampleSearchResponse.dr_alex_cta?.url).toContain('/doctor-chat')
  })

  it('all entity types are recognized', () => {
    const knownTypes = [
      'marker', 'calculated_marker', 'zone', 'content', 'food', 'supplement',
      'lab_test', 'reference', 'relation', 'protocol_effect', 'web_content',
      'diet_protocol', 'eating_pattern', 'chat_conversation', 'chat_message',
      'medication', 'device', 'lab', 'measurement_template',
    ]
    for (const result of sampleSearchResponse.results) {
      expect(knownTypes).toContain(result.entity_type)
    }
  })
})

describe('Reset Data API contract', () => {
  const sampleResetPreview = {
    data: {
      confirmed: false,
      deleted: {
        measurements: 142,
        calculated: 56,
        imports: 3,
        devices: 2,
        labs: 1,
        medications: 4,
        chats: 8,
        templates: 2,
        custom_ranges: 0,
      },
    },
    error: null,
  }

  const sampleResetConfirmed = {
    data: {
      confirmed: true,
      deleted: {
        measurements: 142,
        calculated: 56,
        imports: 3,
        devices: 2,
        labs: 1,
        medications: 4,
        chats: 8,
        templates: 2,
        custom_ranges: 0,
      },
    },
    error: null,
  }

  it('preview response has confirmed=false with counts', () => {
    expect(sampleResetPreview.data.confirmed).toBe(false)
    expect(sampleResetPreview.data.deleted).toHaveProperty('measurements')
    expect(sampleResetPreview.data.deleted).toHaveProperty('chats')
    expect(typeof sampleResetPreview.data.deleted.measurements).toBe('number')
  })

  it('confirmed response has confirmed=true with deleted counts', () => {
    expect(sampleResetConfirmed.data.confirmed).toBe(true)
    expect(sampleResetConfirmed.data.deleted.measurements).toBe(142)
  })

  it('all expected data categories are present', () => {
    const categories = Object.keys(sampleResetPreview.data.deleted)
    expect(categories).toContain('measurements')
    expect(categories).toContain('calculated')
    expect(categories).toContain('devices')
    expect(categories).toContain('labs')
    expect(categories).toContain('medications')
    expect(categories).toContain('chats')
    expect(categories).toContain('templates')
    expect(categories).toContain('custom_ranges')
    expect(categories).toContain('imports')
  })
})

describe('Admin Affiliate Summary contract', () => {
  const sampleSummary = {
    data: {
      total_users: 150,
      affiliate_users: 42,
      direct_users: 108,
      total_affiliates: 15,
      total_conversions: 38,
      conversion_rate: 0.28,
      top_affiliates: [
        {
          affiliate_code: 'abc12345',
          email: 'partner@example.com',
          display_name: 'Partner One',
          referral_count: 12,
          org_name: null,
          org_type: null,
        },
      ],
    },
  }

  it('summary has user acquisition breakdown', () => {
    const d = sampleSummary.data
    expect(d.affiliate_users + d.direct_users).toBe(d.total_users)
    expect(d.conversion_rate).toBeGreaterThanOrEqual(0)
    expect(d.conversion_rate).toBeLessThanOrEqual(1)
  })

  it('top affiliates have required fields', () => {
    const aff = sampleSummary.data.top_affiliates[0]
    expect(aff).toHaveProperty('affiliate_code')
    expect(aff).toHaveProperty('email')
    expect(aff).toHaveProperty('referral_count')
    expect(aff.referral_count).toBeGreaterThan(0)
  })
})
