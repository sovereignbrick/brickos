# Issue #325: Import quality metrics tracking

**Type:** feature
**Priority:** medium
**Component:** backend / import pipeline
**Sprint:** 020

## Description

We have no visibility into import quality. Add counters and tracking to measure match rate, correction rate, rollback rate, and extraction confidence over time.

## Proposed Schema Changes

```sql
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS user_corrections INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS fuzzy_matches INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS ai_suggested_matches INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS validation_warnings INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS avg_extraction_confidence REAL;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS detected_format TEXT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS detected_language TEXT;
```

## Metrics Dashboard (Admin Panel)

| Metric | Query | Target |
|--------|-------|--------|
| Match rate | matched / total extracted | > 95% |
| User correction rate | corrections / confirmed markers | < 5% |
| Rollback rate | rolled_back sessions / confirmed sessions | < 2% |
| Fuzzy match rate | fuzzy_matches / total matched | < 10% |
| AI suggestion acceptance rate | accepted / suggested | > 50% |
| Avg extraction confidence | avg across all sessions | > 0.85 |
| Extraction failure rate | failed sessions / total uploads | < 3% |

## Acceptance Criteria

- [ ] Import sessions track correction count, fuzzy matches, AI suggestions
- [ ] Detected format and language stored per session
- [ ] Average extraction confidence calculated and stored
- [ ] Admin panel shows aggregate metrics
- [ ] Metrics queryable via admin API endpoint

## Tests

- [ ] test_correction_count_incremented: user changes marker → count increases
- [ ] test_metrics_endpoint: admin GET /admin/import-metrics returns aggregated stats

## Location

- Migration: ALTER import_sessions
- Backend: import handlers (increment counters during confirm)
- Admin: new metrics endpoint + dashboard widget
