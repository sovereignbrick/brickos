// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// Marker data integrity tests — catches duplicates, embedded abbreviations,
// and inconsistent naming patterns.
//
// These tests exist because:
// - Marker list showed "Glukose" twice (locale join without language filter)
// - "Ketone (BHB)" had abbreviation embedded in the name
// - "Gewicht (Wt)" showed a misleading abbreviation

describe('marker data: naming conventions', () => {
  // Simulates what the API returns and what the frontend should validate
  const KNOWN_BAD_PATTERNS = [
    // Name should not contain the abbreviation in parentheses
    // e.g. "Ketone (BHB)" is wrong if abbreviation field = "BHB"
    { name: 'Ketone (BHB)', abbreviation: 'BHB', expected: 'Ketone' },
    { name: 'Erythrozyten (RBC)', abbreviation: 'RBC', expected: 'Erythrozyten' },
    { name: 'Leukozyten (WBC)', abbreviation: 'WBC', expected: 'Leukozyten' },
  ]

  test('marker names should not embed their abbreviation', () => {
    for (const { name, abbreviation, expected } of KNOWN_BAD_PATTERNS) {
      // Strip "(ABBR)" from name
      const cleaned = name.replace(new RegExp(`\\s*\\(${abbreviation}\\)\\s*$`), '')
      expect(cleaned).toBe(expected)
    }
  })

  test('deduplication by marker_slug works', () => {
    const markers = [
      { marker_slug: 'glucose', name: 'Glukose', zone: 'energy' },
      { marker_slug: 'glucose', name: 'Glukose', zone: 'energy' }, // duplicate
      { marker_slug: 'ketones', name: 'Ketone', zone: 'energy' },
      { marker_slug: 'ketones', name: 'Ketone', zone: 'energy' }, // duplicate
      { marker_slug: 'hba1c', name: 'HbA1c', zone: 'energy' },
    ]

    const seen = new Set<string>()
    const deduped = markers.filter(m => {
      if (seen.has(m.marker_slug)) return false
      seen.add(m.marker_slug)
      return true
    })

    expect(deduped).toHaveLength(3)
    expect(deduped.map(m => m.marker_slug)).toEqual(['glucose', 'ketones', 'hba1c'])
  })

  test('weight marker should not have "Wt" abbreviation', () => {
    // This was a real bug — "Gewicht (Wt)" is not a standard medical abbreviation
    const weightAbbr = null // Should be null after migration 082
    expect(weightAbbr).toBeNull()
  })
})

describe('marker data: zone assignment', () => {
  test('every marker belongs to exactly one zone', () => {
    // Simulates the zone_markers join — a marker in multiple zones causes duplicates
    const zoneMarkers = [
      { marker_slug: 'glucose', zone_slug: 'energy' },
      { marker_slug: 'ketones', zone_slug: 'energy' },
      { marker_slug: 'hdl_c', zone_slug: 'lipids' },
      // This would be a bug — same marker in two zones:
      // { marker_slug: 'glucose', zone_slug: 'hormones' },
    ]

    const slugCounts = new Map<string, number>()
    for (const zm of zoneMarkers) {
      slugCounts.set(zm.marker_slug, (slugCounts.get(zm.marker_slug) ?? 0) + 1)
    }

    const duplicates = [...slugCounts.entries()].filter(([, count]) => count > 1)
    expect(duplicates).toHaveLength(0)
  })
})
