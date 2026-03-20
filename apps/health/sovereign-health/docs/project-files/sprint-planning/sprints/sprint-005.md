<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Sprint 005 — Production Stability
 Started: 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Sprint 005 — Production Stability

**Started:** 2026-03-21
**Completed:** ongoing
**Goal:** Fix production issues from v0.22.0, implement Dr. Alex tabular data import (Design 015), harden production environment, and improve developer workflow. Multi-day sprint.

## Context

v0.22.0 shipped with 12 bugs found during RC testing. Sprint 004 retro identified gaps in testing, content completeness, and admin panel reliability. This sprint addresses those gaps before any new feature work.

**Pre-sprint checklist:**
- [x] `cargo fmt` as separate commit
- [ ] Verify v0.22.0 on production (health check, login, measurements)
- [ ] Review production logs for errors

---

## Phase 0 — Production Hotfixes (? pts)

Issues found during v0.22.0 production testing. These take priority over everything else.

_To be collected by founder during production use. Add items here as they are found._

---

## Phase 1 — Developer Workflow (4 pts)

Quick improvements to prevent recurring issues.

### P1-1: Preflight script (1 pt)

**Problem:** No single command runs all checks before deploy. Developers must remember to run fmt, clippy, tests, and pnpm build separately.
**Fix:** Create `ops/preflight.sh` that runs: cargo fmt --check, cargo clippy -D warnings, cargo test (smoke + integration + property), pnpm test, pnpm build. Fail on first error.
**Files:** `ops/preflight.sh`

---

### P1-2: Replace native date picker with react-datepicker (#152) (2 pts)

**Problem:** Native `<input type="date">` popup ignores CSS color-scheme on Chrome Linux — always renders dark in light theme. Multiple fix attempts failed.
**Fix:** Replace with `react-datepicker` component (already used on measurements pages). Apply existing dark/light theme CSS overrides from globals.css.
**Files:** `frontend/src/components/settings/medications-tab.tsx`

---

### P1-3: Merge post-release compose fixes into main (1 pt)

**Problem:** 3 commits on develop since v0.22.0 (ntfy config, compose env vars, retro) not yet on main.
**Fix:** Merge develop → main, push.
**Files:** `ops/docker-compose.*.yml`

---

## Phase 2 — Content Completeness (6 pts)

### P2-1: Generate why_it_matters for all 92 markers (3 pts)

**Problem:** Only 20 of 92 markers have `why_it_matters` in EN, only 3 in DE. The admin panel shows empty fields. Users see no "Why It Matters" section on marker detail pages.
**Fix:** Migration to populate `why_it_matters` for remaining 72 EN markers and 89 DE markers. Content should be concise (1-2 sentences) and medically accurate.
**Files:** New migration

---

### P2-2: Generate when_to_worry for all 92 markers (3 pts)

**Problem:** Only 20 of 92 markers have `when_to_worry` in EN, only 3 in DE. Same gap as why_it_matters.
**Fix:** Migration to populate `when_to_worry` for remaining markers. Focus on actionable guidance ("See your doctor if...").
**Files:** New migration

---

## Phase 3 — Admin Panel Audit (5 pts)

Address Sprint 004 retro action item #4: "Audit all admin panel tabs against backend endpoints."

### P3-1: Admin panel E2E verification (3 pts)

**Problem:** Sprint 004 found audit logs completely broken (wrong endpoint, wrong auth, wrong field names). Other admin tabs may have similar issues.
**Fix:** Systematically test every admin tab against its backend endpoint:
- Dashboard stats
- Users list/detail
- Admin Settings (get/save)
- Payments/invoices
- Promotions CRUD
- Affiliate list
- App Content (zones, markers, tiers, UI strings) — CRUD
- Web Content — CRUD + publish
- Content Strings — CRUD
- Newsletter
- AI Usage
- Audit Logs (already fixed)
- Website publish

Document any mismatches and fix them.
**Files:** Multiple admin components

---

### P3-2: Admin panel error handling — show errors instead of empty state (2 pts)

**Problem:** When admin API calls fail (auth, network, 500), the catch blocks show "No entries found" instead of an error message. This masks real issues.
**Fix:** Add error state to admin tabs — show a red error banner with the actual error message when API calls fail, instead of the empty state.
**Files:** `frontend/src/components/admin/*.tsx`

---

## Phase 4 — Production Hardening (5 pts)

### P4-1: Production notification verification (1 pt)

**Problem:** Production backend has ntfy + Telegram env vars but we haven't verified a real notification flows through.
**Fix:** Trigger a test event (e.g., login on production) and verify notification arrives in Telegram + ntfy.
**Files:** None (verification only)

---

### P4-2: Gatus monitoring — add production checks (2 pts)

**Problem:** Gatus currently monitors staging and infrastructure only. Production endpoints (api.sovereignhealth.io, app.sovereignhealth.io) should be monitored too.
**Fix:** Add production endpoint checks to gatus-config.yaml. Alert on downtime via ntfy + Telegram.
**Files:** `ops/gatus-config.yaml`

---

### P4-3: Backup verification — test staging DB restore (2 pts)

**Problem:** Staging DB backups run automatically before every deploy, but we've never tested restoring one. A backup you can't restore is not a backup.
**Fix:** Download a staging backup, restore it to a local Docker Postgres, verify data integrity (user count, measurement count, migration version).
**Files:** Document restore procedure in deployment docs

---

## Phase 5 — Test Coverage (5 pts, stretch)

### P5-1: Frontend API contract tests (3 pts)

**Problem:** Sprint 004 retro item #2 — frontend fetch functions assume API response shapes that can drift from actual backend responses.
**Fix:** Add vitest tests that validate the response types against sample API responses. Mock the API calls but verify the parsing/mapping logic.
**Files:** `frontend/src/lib/__tests__/api-contracts.test.ts`

---

### P5-2: Admin audit log integration test (2 pts)

**Problem:** The audit log frontend was completely broken for weeks without anyone noticing.
**Fix:** Add a vitest test that mounts the AuditLogsTab component with mocked API responses matching the actual backend format, verifying data renders correctly.
**Files:** `frontend/src/components/admin/__tests__/audit-logs-tab.test.tsx`

---

## Phase 6 — Dr. Alex: Smart Import — Tabular Data (13 pts)

See full design: `docs/project-files/design/015-smart-import-tabular-data.md`

### P6-A: Backend — upload + AI extraction + confirm (5 pts)

**Problem:** Users have historical measurement data in spreadsheets (ODS/XLSX/CSV) and photos of tables. No way to bulk import.
**Fix:**
1. `POST /import/upload-measurements` — accepts spreadsheet files + images
2. LibreOffice headless conversion for ODS/XLSX → CSV
3. Claude AI prompt to extract column mapping + data rows
4. Marker + device matching against user's existing data
5. `POST /import/confirm-measurements` — bulk create measurements
6. `import_sessions` table for rollback tracking
7. `DELETE /import/sessions/{id}/rollback` — undo an import
**Files:** `api/src/handlers/import.rs`, new migration

---

### P6-B: Frontend — Review Screen (5 pts)

**Problem:** Need a review step between AI extraction and import, matching the Lab PDF review UX.
**Fix:**
1. Column-to-marker mapping table (editable dropdowns)
2. Device assignment per marker column (auto-detected from user's devices)
3. Protocol mapping (fasting, postprandial, etc.)
4. Row preview with selection checkboxes
5. Duplicate detection toggle
6. Progress bar during bulk upload
7. Success toast with "View in History" link
**Files:** `frontend/src/components/doctor-chat/measurement-import-review.tsx`

---

### P6-C: Frontend — Entry Points + i18n (3 pts)

**Problem:** Need entry points for the new import type.
**Fix:**
1. Agent Grid: add "Tabellarische Messwerte importieren" card to Smart Import section
2. Chat input: paperclip submenu with 3 options (Lab, Medication, Measurements)
3. i18n: EN + DE for all new strings
4. File type detection: route to correct import pipeline based on file extension
**Files:** `frontend/src/components/doctor-chat/agent-grid.tsx`, `chat-input.tsx`, `chat-layout.tsx`, i18n files

---

## Backlog (not this sprint)

- #151: Branded affiliate URL shortener (brickos.io/r/{code}) — needs domain working first
- Phase 4 from Sprint 004: Thresholds redesign (5 pts)
- CO-1: Analysis tab richer visualizations (8 pts)
- CO-2: E2E Playwright tests (8 pts)
- CO-3: Release notes auto-generation (3 pts)
- features_summary field: populate or remove from admin panel
- Deprecate marker_content table in favor of marker_translations

---

## Velocity

| Metric | Value |
|---|---|
| Phase 0 (production hotfixes) | ~7 pts |
| Phase 1 (workflow) | 4 pts |
| Phase 2 (content) | 6 pts |
| Phase 3 (admin audit) | 5 pts |
| Phase 4 (hardening) | 5 pts |
| Phase 5 (tests, stretch) | 5 pts |
| Phase 6 (smart import) | 13 pts |
| **Total planned** | **~45 pts** |

**Note:** Multi-day sprint. Phase 0 + 1 + 6 are priority. Phase 5 is stretch.

---

## Execution Order

```
Day 1 (2026-03-21):
  Pre-sprint:
    cargo fmt separate commit              → 5 min
    Verify v0.22.0 production              → 10 min
    Merge post-release fixes to main (P1-3)→ 5 min

  Phase 0: Production Hotfixes (~7 pts, ~3 hrs)
    P0-1 History date filter default       → 30 min
    P0-2 Trends 7D/30D empty chart         → 45 min
    P0-5 History sort newest first         → 15 min
    P0-7 Edit form loses device_id         → 30 min
    P0-4 US date format in DE locale       → 20 min
    P0-6 History table layout              → 45 min
    P0-3 Missing measurement investigation → 15 min

  Phase 1: Developer Workflow (4 pts, ~1 hr)
    P1-1 Preflight script                  → 20 min
    P1-2 Replace native date picker        → 30 min

Day 2:
  Phase 6: Smart Import (13 pts, ~6 hrs)
    P6-A Backend: upload + AI extraction   → 3 hrs
    P6-B Review screen                     → 2 hrs
    P6-C Entry points + i18n              → 1 hr

Day 3 (if needed):
  Phase 2: Content Completeness (6 pts, ~2 hrs)
    P2-1 why_it_matters for 92 markers     → 1 hr
    P2-2 when_to_worry for 92 markers      → 1 hr

  Phase 3: Admin Panel Audit (5 pts, ~2 hrs)
    P3-1 E2E verification of all tabs      → 1.5 hrs
    P3-2 Error handling improvement         → 30 min

  Phase 4: Production Hardening (5 pts, ~1 hr)
    P4-1 Notification verification          → 15 min
    P4-2 Gatus production checks            → 30 min
    P4-3 Backup restore test                → 30 min

  Stretch:
    Phase 5: Test Coverage (5 pts)
```

---

## Definition of Done

### Phase 0 — Production Hotfixes
- [ ] All reported production issues resolved and deployed

### Phase 1 — Developer Workflow
- [ ] `bash ops/preflight.sh` runs all checks and fails on first error
- [ ] Medications tab date picker matches theme in light mode
- [ ] Post-release fixes merged to main and pushed

### Phase 2 — Content Completeness
- [ ] All 92 markers have `why_it_matters` in EN and DE
- [ ] All 92 markers have `when_to_worry` in EN and DE
- [ ] Admin panel shows no empty fields for any marker (spot-check 10)

### Phase 3 — Admin Panel Audit
- [ ] Every admin tab loads data correctly (documented)
- [ ] API call failures show error message, not empty state

### Phase 4 — Production Hardening
- [ ] Production notification verified (login → Telegram alert)
- [ ] Gatus monitors production API + app + website
- [ ] Staging backup restored and verified locally

### Phase 5 — Test Coverage (stretch)
- [ ] API contract tests cover content, audit, and auth response shapes
- [ ] Audit log tab has integration test with mocked API responses
