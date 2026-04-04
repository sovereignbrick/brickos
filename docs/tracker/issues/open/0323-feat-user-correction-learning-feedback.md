# Issue #323: Learning from user corrections — global feedback loop

**Type:** feature
**Priority:** high
**Component:** backend / import pipeline + marker matcher
**Sprint:** 020

## Description

When a user manually corrects a marker match in the review screen, that correction is lost. The same unmatched marker will fail again for every user. Build a global learning feedback loop where user corrections improve matching for ALL users.

## Architecture

### Phase 1: Capture corrections

Track every user correction during import review:

```sql
CREATE TABLE marker_correction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    ai_extracted_name TEXT NOT NULL,     -- what AI extracted (e.g., "GFR (MDRD-kurz)")
    original_match TEXT,                 -- what the matcher suggested (or NULL if unmatched)
    corrected_slug TEXT NOT NULL,        -- what the user selected
    import_session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_correction_log_name ON marker_correction_log(lower(ai_extracted_name));
```

### Phase 2: Aggregate into candidate aliases

A scheduled job (or on-demand admin action) aggregates corrections:

```sql
-- Find corrections made by 3+ different users for the same extracted name → same slug
SELECT
    lower(ai_extracted_name) AS proposed_alias,
    corrected_slug,
    COUNT(DISTINCT user_id) AS user_count,
    COUNT(*) AS total_corrections
FROM marker_correction_log
WHERE original_match IS DISTINCT FROM corrected_slug  -- actual correction, not confirmation
GROUP BY lower(ai_extracted_name), corrected_slug
HAVING COUNT(DISTINCT user_id) >= 3
ORDER BY user_count DESC;
```

### Phase 3: Promote to global aliases

Two promotion paths:

**Auto-promote (safe):** If 5+ distinct users corrected the same extraction → same slug, AND no conflicting corrections exist (all users agree), automatically add to `marker_aliases` table:

```sql
CREATE TABLE marker_aliases_learned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_text TEXT NOT NULL,
    marker_slug TEXT NOT NULL,
    source TEXT DEFAULT 'user_corrections',
    user_count INT NOT NULL,
    promoted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alias_text, marker_slug)
);
```

**Admin review (conflicts):** If users disagree (3 say "egfr", 2 say "creatinine"), flag for admin review in the admin panel.

### Phase 4: Use learned aliases in matching

Update `match_marker()` to check learned aliases AFTER the static map but BEFORE fuzzy matching:

```
1. Exact match (static alias map)
2. Learned aliases (from marker_aliases_learned)
3. Contains match
4. Reverse contains
5. Fuzzy match (#320)
```

Load learned aliases at startup (or cache with TTL):

```rust
fn learned_alias_map(pool: &PgPool) -> HashMap<String, String> {
    // SELECT alias_text, marker_slug FROM marker_aliases_learned
}
```

## Frontend Changes

In the import review, when a marker is unmatched or the user changes the match:
- Dropdown shows all available markers
- On confirm, the correction is logged (transparent to user)
- No extra UI needed — learning happens automatically

## Privacy

- Corrections are anonymized in aggregation (only counts, not user identities)
- Individual user_id stored in correction_log for audit but not exposed
- Promoted aliases have no user attribution

## Acceptance Criteria

- [ ] User corrections during import review are logged to `marker_correction_log`
- [ ] Aggregation query identifies candidate aliases with 3+ user agreement
- [ ] Auto-promotion when 5+ users agree (no conflicts)
- [ ] Learned aliases used in `match_marker()` after static map
- [ ] Admin panel shows pending corrections for review (when conflicts exist)
- [ ] Existing static alias map unchanged (learned aliases are additive)

## Tests

- [ ] test_correction_logged: user changes match → row in correction_log
- [ ] test_no_log_on_confirm: user confirms AI suggestion unchanged → no correction log
- [ ] test_aggregation: 5 corrections from 5 users → candidate promoted
- [ ] test_conflict_not_promoted: 3 users say "egfr", 2 say "creatinine" → flagged, not promoted
- [ ] test_learned_alias_used: after promotion, same extraction auto-matches

## Location

- Migration: new tables `marker_correction_log`, `marker_aliases_learned`
- Backend: `apps/health/sovereign-health/api/src/handlers/import.rs` (log corrections)
- Backend: `apps/health/sovereign-health/api/src/services/marker_matcher.rs` (use learned aliases)
- Admin: correction review UI
