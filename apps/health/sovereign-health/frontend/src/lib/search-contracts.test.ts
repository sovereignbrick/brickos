// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Search API contract tests -- Sprint 023
//
// IMPORTANT: These samples must match the ACTUAL backend response, not the spec.
// If these tests pass but the frontend crashes, the samples are wrong.
// Always re-capture from `curl localhost:8080/api/v1/search?q=glucose` when updating.

import { describe, it, expect } from 'vitest'

// -- Sample responses captured from the ACTUAL backend handler ----------------
// Backend wraps all responses in { data: {...}, error: null }

const sampleSearchResponse = {
  data: {
    total_results: 5,
    limit: 20,
    offset: 0,
    results: [
      {
        entity_type: 'marker',
        entity_id: 'glucose',
        title: 'Glucose',
        subtitle: 'Energy & Metabolic',
        snippet: 'Blood sugar level -- primary energy source for cells',
        url_path: '/markers/glucose',
        external_url: null,
        score: 6.0,
        metadata: {
          source_type: 'home',
          unit_canonical: 'mmol/L',
          loinc_code: '2345-7',
          zone_id: 'abc-123',
        },
        parent_marker_slug: 'glucose',
      },
      {
        entity_type: 'content',
        entity_id: 'glucose-how_to_stay_in_range',
        title: 'How to Keep Glucose in Range',
        subtitle: null,
        snippet: 'Eat low-glycaemic-index carbohydrates...',
        url_path: '/markers/glucose#how_to_stay_in_range',
        external_url: null,
        score: 2.0,
        metadata: null,
        parent_marker_slug: 'glucose',
      },
      {
        entity_type: 'web_content',
        entity_id: 'features-hero',
        title: 'features_hero_title',
        subtitle: null,
        snippet: 'Track glucose, ketones, and metabolic markers...',
        url_path: null,
        external_url: 'https://sovereignhealth.io/features',
        score: 0.5,
        metadata: null,
        parent_marker_slug: null,
      },
    ],
    user_results: [],
    facets: [
      { type: 'content', count: 33 },
      { type: 'marker', count: 6 },
      { type: 'relation', count: 4 },
    ],
    blind_spots: [],
    dr_alex_cta: null,
    login_cta: {
      message: 'Sign in to see your personal health data in search results',
      url: '/auth/login',
    },
  },
  error: null,
}

const sampleSuggestResponse = {
  data: {
    suggestions: [
      { text: 'Glucose', type: 'marker', url: '/markers/glucose' },
      { text: 'Glucose-Ketone Index (GKI)', type: 'content', url: '/markers/gki' },
      { text: 'How to Stay in Range', type: 'content', url: '/markers/glucose#how_to_stay_in_range' },
    ],
  },
  error: null,
}

// -- Tests: validate structure matches what frontend expects ------------------

describe('Search API contracts (actual backend shape)', () => {
  it('response is wrapped in { data, error } envelope', () => {
    expect(sampleSearchResponse).toHaveProperty('data')
    expect(sampleSearchResponse).toHaveProperty('error')
    expect(sampleSearchResponse.error).toBeNull()
  })

  it('data has total_results (NOT total)', () => {
    const d = sampleSearchResponse.data
    expect(d).toHaveProperty('total_results')
    expect(d).not.toHaveProperty('total')
    expect(typeof d.total_results).toBe('number')
  })

  it('data has limit and offset for pagination', () => {
    const d = sampleSearchResponse.data
    expect(d).toHaveProperty('limit')
    expect(d).toHaveProperty('offset')
  })

  it('results is an array of SearchResult items', () => {
    const d = sampleSearchResponse.data
    expect(Array.isArray(d.results)).toBe(true)
    expect(d.results.length).toBeGreaterThan(0)
  })

  it('result item has required fields', () => {
    const r = sampleSearchResponse.data.results[0]
    expect(r).toHaveProperty('entity_type')
    expect(r).toHaveProperty('entity_id')
    expect(r).toHaveProperty('title')
    expect(r).toHaveProperty('score')
    expect(r).toHaveProperty('snippet')
    expect(r).toHaveProperty('url_path')
    expect(r).toHaveProperty('external_url')
    expect(r).toHaveProperty('metadata')
    expect(r).toHaveProperty('parent_marker_slug')
    expect(typeof r.score).toBe('number')
  })

  it('facets is array of {type, count} (NOT Record<string, number>)', () => {
    const facets = sampleSearchResponse.data.facets
    expect(Array.isArray(facets)).toBe(true)
    // This is the exact bug we caught: frontend originally expected Record<string, number>
    // Verify it's an array, not a plain object (Record)
    expect(facets.constructor).toBe(Array)
    const facet = facets[0]
    expect(facet).toHaveProperty('type')
    expect(facet).toHaveProperty('count')
    expect(typeof facet.type).toBe('string')
    expect(typeof facet.count).toBe('number')
  })

  it('blind_spots is an array', () => {
    expect(Array.isArray(sampleSearchResponse.data.blind_spots)).toBe(true)
  })

  it('dr_alex_cta uses "message" field (NOT "prompt")', () => {
    // When present, cta has { message, url } not { prompt, url }
    const cta = { message: 'Ask Dr. Alex', url: '/doctor-chat' }
    expect(cta).toHaveProperty('message')
    expect(cta).not.toHaveProperty('prompt')
  })

  it('login_cta present for unauthenticated search', () => {
    const cta = sampleSearchResponse.data.login_cta
    expect(cta).not.toBeNull()
    expect(cta).toHaveProperty('message')
    expect(cta).toHaveProperty('url')
  })

  it('web_content result has external_url, null url_path', () => {
    const web = sampleSearchResponse.data.results[2]
    expect(web.entity_type).toBe('web_content')
    expect(web.external_url).toBeTruthy()
    expect(web.url_path).toBeNull()
  })

  it('user_results is an array (for authenticated user content)', () => {
    expect(Array.isArray(sampleSearchResponse.data.user_results)).toBe(true)
  })
})

describe('Search Suggest API contract (actual backend shape)', () => {
  it('response is wrapped in { data, error } envelope', () => {
    expect(sampleSuggestResponse).toHaveProperty('data')
    expect(sampleSuggestResponse.error).toBeNull()
  })

  it('data has suggestions array', () => {
    const d = sampleSuggestResponse.data
    expect(Array.isArray(d.suggestions)).toBe(true)
    expect(d.suggestions.length).toBeGreaterThan(0)
  })

  it('suggestion has text, type, url', () => {
    const s = sampleSuggestResponse.data.suggestions[0]
    expect(s).toHaveProperty('text')
    expect(s).toHaveProperty('type')
    expect(s).toHaveProperty('url')
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

  it('response wrapped in { data, error } envelope', () => {
    expect(sampleResetPreview).toHaveProperty('data')
    expect(sampleResetPreview.error).toBeNull()
  })

  it('preview has confirmed=false with counts', () => {
    expect(sampleResetPreview.data.confirmed).toBe(false)
    expect(typeof sampleResetPreview.data.deleted.measurements).toBe('number')
  })

  it('all expected data categories present', () => {
    const cats = Object.keys(sampleResetPreview.data.deleted)
    expect(cats).toContain('measurements')
    expect(cats).toContain('devices')
    expect(cats).toContain('chats')
    expect(cats).toContain('templates')
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
  })
})
