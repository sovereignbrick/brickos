# Sprint 004 — Polish & Precision

**Started:** 2026-03-20
**Completed:** ongoing
**Goal:** Fix all UX issues found during v0.20.0 production testing. Every issue below was reported by the founder after hands-on use of the live product.

## Context

Sprint 003 hardened the deploy pipeline, resolved all 6 Dependabot PRs, and shipped v0.21.0 to staging. Phase 3 (Analysis tab, E2E tests, release notes — 19 pts) carried over. During production testing of v0.20.0, 16 issues were identified covering UX polish, locale handling, search quality, layout consistency, and Dr. Alex AI improvements. This sprint prioritizes those user-facing fixes.

**Pre-sprint checklist:**
- [ ] `cargo fmt` as separate commit (per retro feedback)
- [ ] Verify v0.21.0 on staging before starting
- [ ] Close 6 Dependabot PRs on GitHub (carried from Sprint 003)

---

## Phase 1 — Quick Wins (6 pts)

Small, isolated fixes that can be done rapidly. Each is 1 point.

### P1-1: MFA TOTP issuer name (1 pt)

**Problem:** When scanning the MFA QR code, the authenticator app shows a generic or incorrect issuer name.
**Fix:** Change TOTP issuer to `"BrickOS - Sovereign Health Intelligence"` in the backend MFA setup handler.
**Files:** `api/src/handlers/auth.rs` (TOTP configuration)

---

### P1-2: Exercise dropdown — add more disciplines (1 pt)

**Problem:** Exercise type dropdown is missing common activities like Yoga, Pilates, Swimming, Cycling, etc.
**Fix:** Add missing exercise types to the dropdown options. Both backend enum/validation and frontend i18n.
**Files:** Frontend i18n (`en.json`, `de.json`), possibly backend enum

---

### P1-3: Light theme tooltip styling fix (1 pt)

**Problem:** In light theme, the device manufacturer tooltip shows black-on-black hover state, making text unreadable.
**Fix:** Ensure tooltip hover states respect the current theme. Check all tooltip components for theme-awareness.
**Files:** Frontend tooltip/popover CSS

---

### P1-4: Remove blue Dr. Alex banner from influence factors tab (1 pt)

**Problem:** A blue promotional banner for Dr. Alex appears on the influence factors tab. It should be removed — the feature is already discoverable from the sidebar.
**Fix:** Remove the banner component from the influence factors page.
**Files:** Frontend influence factors page component

---

### P1-5: Dosage form — add "Pulver/Powder" option (1 pt)

**Problem:** The dosage form dropdown for supplements/medications is missing "Pulver" (DE) / "Powder" (EN).
**Fix:** Add the option to the dosage form list. Backend + frontend i18n.
**Files:** Dosage form enum/options, i18n files

---

### P1-6: Supplement import toast — add "View in Settings" link (1 pt)

**Problem:** When importing supplements, the success toast has no navigation link. The medication import toast already has a "View in Settings" link — supplements should match.
**Fix:** Add the same "View in Settings" navigation link to the supplement import success toast, matching the medication import pattern.
**Files:** Frontend supplement import handler/toast

---

## Phase 2 — UX Improvements (12 pts)

Medium-effort fixes that improve layout, input handling, and notification behavior.

### P2-1: Weight/sleeping hours — locale-aware decimal separator (2 pts)

**Problem:** Number inputs for weight and sleeping hours use `.` (period) as decimal separator regardless of locale. German users expect `,` (comma). Input should accept both but display according to the active locale.
**Fix:** Update number input components to:
1. Accept both `.` and `,` as decimal input
2. Display with locale-appropriate separator (`.` for EN, `,` for DE)
3. Store as standard float internally
**Files:** Frontend number input components, settings/measurement forms

---

### P2-2: Toast messages consistency + inline notification cleanup (2 pts)

**Problem:** Toast messages are inconsistent across the app. Additionally, inline notifications (info bars, alerts) persist when navigating between pages — they should clear on route change.
**Fix:**
1. Audit all toast messages for consistent tone and format
2. Add route-change listener that clears inline notifications
3. Ensure toasts auto-dismiss consistently (same timing across app)
**Files:** Frontend toast/notification system, route change handler

---

### P2-3: Security tab — two-column layout (2 pts)

**Problem:** The Security settings tab uses a single-column layout that doesn't match the updated License tab pattern (plan left, details right).
**Fix:** Redesign Security tab with two-column layout:
- Left column: MFA settings, password change
- Right column: Active sessions, security log
**Files:** Frontend Security tab component

---

### P2-4: Privacy tab — two-column layout (2 pts)

**Problem:** Same as Security tab — single-column layout inconsistent with License tab.
**Fix:** Redesign Privacy tab with two-column layout:
- Left column: Data visibility, consent settings
- Right column: Data export, account deletion
**Files:** Frontend Privacy tab component

---

### P2-5: Influence factors — better explanation text (2 pts)

**Problem:** The influence factors page doesn't clearly distinguish between medications and supplements. Users need guidance on what to enter and why. The page also lacks explanation of how influence factors affect marker interpretation.
**Fix:**
1. Add clear section headers/descriptions differentiating medications vs supplements
2. Add explanation text about how factors influence reference range interpretation
3. Update i18n for both EN and DE
**Files:** Frontend influence factors page, i18n files

---

### P2-6: Ingredient/medication edit — column labels and layout (2 pts)

**Problem:** The ingredient/medication edit view is hard to read:
- Missing column labels (name, dosage, form, frequency)
- Columns are too narrow for content
- Consider using a modal for editing instead of inline
**Fix:**
1. Add column header labels
2. Adjust column widths for readability
3. Evaluate modal vs inline edit — implement whichever is cleaner
**Files:** Frontend medication/supplement edit component

---

## Phase 3 — Search & AI Quality (8 pts)

### P3-1: Measurement search — improve "muscle" query relevance (3 pts)

**Problem:** Searching for "muscle" in the measurement/marker search returns too many irrelevant results. The search algorithm matches partial strings too aggressively, returning markers that have "mus" or "cle" substrings.
**Fix:** Improve search ranking:
1. Prioritize exact word matches over substring matches
2. Weight marker name matches higher than description/category matches
3. Consider adding marker tags/aliases for common search terms (e.g., "muscle" → CK, Myoglobin, Creatinine)
**Files:** Frontend search component, possibly backend search endpoint

---

### P3-2: Dr. Alex photo validation — show >3 photos error before analysis (2 pts)

**Problem:** When uploading more than 3 photos for Dr. Alex analysis, the error only appears AFTER the analysis starts (wasting an API call). The validation should happen immediately on the frontend before sending.
**Fix:** Add client-side validation that checks photo count and shows an error message before the upload/analysis begins.
**Files:** Frontend Dr. Alex photo upload component

---

### P3-3: Dr. Alex analysis results — mg values, inline editing, brand display (3 pts)

**Problem:** Three issues with Dr. Alex analysis results:
1. **mg values incorrect** — extracted dosage values in milligrams don't match the photo content
2. **No inline editing** — users can't correct AI-extracted values before saving
3. **Missing brand** — supplement brand name from the photo isn't displayed in results
**Fix:**
1. Review and improve the AI prompt for value extraction accuracy
2. Add inline editable fields for each extracted value (name, dosage, form, brand)
3. Add brand field to the extraction result display
**Files:** Backend Dr. Alex handler (AI prompt), frontend analysis results component

---

## Phase 4 — Thresholds Redesign (5 pts)

### P4-1: Thresholds tab — support multiple reference schemes + diet protocol (5 pts)

**Problem:** The Thresholds tab currently shows a single set of reference ranges. It needs to support:
1. **Multiple reference schemes** (e.g., LOINC standard ranges, lab-specific ranges, custom user ranges)
2. **Diet protocol influence** — thresholds should adjust based on the user's diet protocol (e.g., carnivore, vegan, keto diets have different optimal ranges for some markers)
3. Better visual design showing which scheme is active and how ranges compare

**Fix:**
1. Add reference scheme selector (dropdown or tabs)
2. Show scheme source (LOINC, lab, custom) per marker
3. Add diet protocol overlay showing how the active diet shifts optimal ranges
4. Update i18n for new UI elements
**Files:** Frontend Thresholds tab, backend reference ranges endpoint, i18n files

---

## Phase 5 — Hygiene (4 pts)

Small cleanup items from Sprint 003 backlog and retro actions.

### P5-1: Clean up crash-report files + .gitignore (1 pt)

**Problem:** Two untracked files at repo root (`crash-report-2026-03-17.md`, `crash-report-2026-03-18.md`) pollute `git status` and block deploy script checks that use `git status --porcelain`.
**Fix:**
1. Review contents, archive to `docs/incidents/` if useful, otherwise delete
2. Add `crash-report-*.md` to `.gitignore`
**Files:** Repo root, `.gitignore`

---

### P5-2: Drop unused tables (1 pt)

**Problem:** Three tables are genuinely unused — `health_check` (0 rows, vestigial), `content_audit_log` (5 rows, overlaps with `audit_log`), `ui_strings`/`ui_string_translations` (34 rows, not used by any handler — i18n is in frontend JSON files).
**Fix:** Migration to drop all three tables (with IF EXISTS guard).
**Files:** New migration file

---

### P5-3: Evaluate `doctor_chat_quota` vs `chat_agent_quota` overlap (1 pt)

**Problem:** Two quota tables exist for Dr. Alex chat: `doctor_chat_quota` (4 rows) and `chat_agent_quota`. Unclear if both are needed or if one supersedes the other.
**Fix:**
1. Check which table is actually referenced by handlers
2. If `doctor_chat_quota` is unused, drop it in the same migration as P5-2
3. If both are used, document the distinction
**Files:** Backend handlers, migration file

---

### P5-4: Pre-commit lockfile sync check (1 pt)

**Problem:** Frontend has a standalone `pnpm-lock.yaml` used by Docker. When `package.json` changes but the lockfile isn't regenerated, Docker builds fail with `ERR_PNPM_OUTDATED_LOCKFILE` (happened in Sprint 003).
**Fix:** Add a check to `deploy.sh` pre-flight (or a git pre-commit hook) that runs `pnpm install --frozen-lockfile` in the frontend dir and fails if the lockfile is stale.
**Files:** `ops/deploy.sh` or `.husky/pre-commit`

---

## Sprint 003 Carry-over (19 pts — stretch goals)

These items carried from Sprint 003. Only attempt if Phases 1-4 complete early.

### CO-1: Analysis tab — richer visualizations (8 pts)
Correlation heatmap, zone timeline, lifestyle overlay on marker trends.

### CO-2: E2E browser tests — Playwright (8 pts)
Auth flow, measurement flow, settings flow, billing flow.

### CO-3: Release notes auto-generation (3 pts)
Script to generate release notes from conventional commits.

---

## Backlog

### P-BL: SSO / Enterprise sign-in research (0 pts — research only)

**Problem:** Enterprise customers will need SSO (SAML, OIDC) for team accounts. This is a research task only — no implementation this sprint.
**Deliverable:** Document in a short ADR:
1. Which SSO protocols to support (SAML 2.0, OIDC, both?)
2. Rust crate options (openidconnect, saml-rs, etc.)
3. Impact on current auth flow
4. Estimated effort for MVP implementation

---

## Velocity

| Metric | Value |
|---|---|
| Phase 1 (quick wins) | 6 pts |
| Phase 2 (UX improvements) | 12 pts |
| Phase 3 (search & AI) | 8 pts |
| Phase 4 (thresholds redesign) | 5 pts |
| Phase 5 (hygiene) | 4 pts |
| **Total planned** | **35 pts** |
| Carry-over (stretch) | 19 pts |
| Sprint 003 actual | ~27 pts (1 day) |
| Sprint 003 planned | 46 pts |

**Note:** Scoped to ~35 pts. Phase 5 hygiene items are small and can be parallelized with Phase 1. If single-day, Phase 4 + carry-over are stretch goals.

---

## Execution Order

```
Day 1 (2026-03-21):
  Pre-sprint:
    cargo fmt separate commit            → 5 min (retro action)
    Verify v0.21.0 on staging            → 10 min
    Close Dependabot PRs on GitHub       → 5 min (gh api)

  Phase 1 + 5: Quick wins + Hygiene (10 pts, ~2 hrs)
    P1-1 MFA TOTP issuer name           → 10 min, backend string
    P1-2 Exercise dropdown disciplines   → 20 min, enum + i18n
    P1-3 Light theme tooltip fix         → 15 min, CSS
    P1-4 Remove Dr. Alex banner          → 10 min, delete component
    P1-5 Dosage form "Pulver/Powder"     → 15 min, enum + i18n
    P1-6 Supplement import toast link    → 15 min, match medication pattern
    P5-1 Crash-report cleanup + gitignore→ 10 min, repo hygiene
    P5-2 Drop unused tables              → 10 min, migration
    P5-3 Chat quota table evaluation     → 10 min, investigate + drop/document
    P5-4 Lockfile sync pre-flight check  → 15 min, deploy.sh

  Phase 2: UX improvements (12 pts, ~3 hrs)
    P2-1 Locale-aware decimal separator  → 30 min, input handling
    P2-2 Toast/notification consistency  → 30 min, route change cleanup
    P2-3 Security tab two-column         → 30 min, layout
    P2-4 Privacy tab two-column          → 30 min, layout
    P2-5 Influence factors text          → 20 min, i18n + copy
    P2-6 Medication edit layout          → 30 min, columns + labels

  Phase 3: Search & AI (8 pts, ~2 hrs)
    P3-1 Measurement search ranking      → 45 min, search algorithm
    P3-2 Dr. Alex photo count validation → 30 min, frontend validation
    P3-3 Dr. Alex results improvements   → 45 min, prompt + inline edit

Day 2+ (if multi-day):
  Phase 4: Thresholds redesign (5 pts)
    P4-1 Reference schemes + diet proto  → 2-3 hrs

  Carry-over (stretch):
    CO-1 Analysis tab visualizations     → 4-6 hrs
    CO-2 E2E Playwright tests            → 4-6 hrs
    CO-3 Release notes script            → 1-2 hrs
```

---

## Definition of Done for Sprint 004

### Phase 1 — Quick Wins
- [ ] MFA QR code shows "BrickOS - Sovereign Health Intelligence" as issuer
- [ ] Exercise dropdown includes Yoga, Pilates, Swimming, Cycling, and other common activities
- [ ] Light theme tooltips are readable (no black-on-black)
- [ ] Blue Dr. Alex banner removed from influence factors tab
- [ ] "Pulver/Powder" available in dosage form dropdown
- [ ] Supplement import toast has "View in Settings" link

### Phase 2 — UX Improvements
- [ ] Weight/sleeping hours inputs accept both `.` and `,`, display per locale
- [ ] Inline notifications clear on page navigation
- [ ] Security tab uses two-column layout
- [ ] Privacy tab uses two-column layout
- [ ] Influence factors page clearly explains medication vs supplement distinction
- [ ] Medication/supplement edit has column labels and readable widths

### Phase 3 — Search & AI
- [ ] "muscle" search returns CK, Myoglobin, Creatinine as top results (not noise)
- [ ] Dr. Alex shows photo count error before analysis starts
- [ ] Dr. Alex results show brand, allow inline editing of extracted values

### Phase 4 — Thresholds (stretch for Day 1)
- [ ] Thresholds tab shows reference scheme source per marker
- [ ] Diet protocol influence visible on threshold ranges

### Phase 5 — Hygiene
- [ ] `crash-report-*.md` files cleaned up and pattern added to `.gitignore`
- [ ] Unused tables dropped (`health_check`, `content_audit_log`, `ui_strings`, `ui_string_translations`)
- [ ] `doctor_chat_quota` vs `chat_agent_quota` resolved (dropped or documented)
- [ ] `deploy.sh` pre-flight checks frontend lockfile sync

---

## Notes / Decisions

- All 16 issues from v0.20.0 production testing by the founder. User-facing quality is the priority.
- Sprint scope at ~35 pts (31 from user issues + 4 hygiene from backlog). Hygiene items are small and parallelizable with Phase 1.
- Phase 4 (thresholds redesign) is the heaviest single item. If the sprint is single-day, it may carry over.
- Carry-over items from Sprint 003 are explicitly stretch goals — do not start unless Phases 1-3 are complete.
- All i18n changes require both EN and DE translations.
- Dr. Alex AI prompt changes (P3-3) should be tested with real supplement photos before deploying.
- SSO research (backlog) is documentation-only — no code this sprint.
