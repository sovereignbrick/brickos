# Release v0.26.0

**Date:** 2026-03-23
**Sprints:** 008 (Import Reliability & Marker Coverage) + 009 (Build Optimization & GDPR Compliance)
**Previous:** v0.25.0
**Velocity:** 62 pts (37 + 25)

---

## Highlights

- **24 marker alias fixes + 5 new markers** -- lab imports now recognize European naming (ALAT, ASAT, Crea, Fe), common abbreviations (UA, TF, MG), and 5 new markers (Amylase, Lipase, BUN/Urea, IgG, VLDL-C).
- **Unmatched marker feedback** -- toast warning when markers can't be matched during import; structured logging for ongoing coverage analysis.
- **Tier-gated Smart Import** -- import buttons greyed out with lock icon for tiers below Insight, both on welcome screen and upload menu.
- **Notification coverage** -- wired up sh-errors (migration failures) and sh-info (contact form, newsletter signups). Deploy script now verifies ntfy token before deploying.
- **OG meta for social previews** -- LinkedIn/Twitter previews now show logo image and proper card type (app + website).
- **GDPR compliance** (Sprint 009) -- consent management UI (newsletter + partner offers toggles), data access log viewer (Art. 15), email unsubscribe link in all marketing emails (CAN-SPAM).
- **cargo-chef build optimization** (Sprint 009) -- Docker dependency caching cuts code-only rebuilds from 3-4 min to ~1 min. Component-level deploy detection auto-skips unchanged services.
- **Settings page refactor** (Sprint 009) -- 3599-line monolith split into 7 component files (~200-800 lines each). Zero behavior change.
- **FSH + Total Fatty Acids** (Sprint 009) -- added "follicle stimulating hormone" alias (no hyphen) and total_fatty_acids marker (LOINC 2571-8).

---

## Features

### Marker Matching (#202 -- 10pts)
- **19 alias-only fixes** -- calcium, magnesium, potassium, sodium, eGFR, LDH, free testosterone, progesterone, prolactin, FSH, LH, DHA, EPA, omega-3 index, transferrin, transferrin saturation, non-HDL cholesterol, vitamin B2, vitamin B6.
- **European naming** -- AST→ASAT, ALT→ALAT, creatinine→Crea/Krea, iron→Fe, bilirubin remapped to bilirubin_total, free androgen index→FTI.
- **5 new markers** -- amylase (U/L, detoxification), lipase (U/L, detoxification), BUN/urea (mmol/L, detoxification), IgG (g/L, immune), VLDL-C (mmol/L, cardiovascular). Migration: `20260323000001_add_missing_lab_markers.sql`.
- **Extra aliases from testing** -- UA→uric_acid, TF→transferrin, MG→magnesium.

### Import UX (#203 -- 3pts)
- **Toast warning** for unmatched markers shown immediately after upload (lab + measurement import flows).
- **Upload menu labels** -- "Laborergebnis (PDF/Foto)" simplified to "Laborergebnis"; file extensions shown in tooltips for all 3 import types.

### Tier Gating
- **Smart Import buttons** on welcome screen disabled with lock icon + muted styling for tiers below Insight.
- **Upload menu** in chat input also tier-gated with same visual treatment.

### Notifications
- **Contact form** → sh-info channel (Default priority).
- **Newsletter signup** → sh-info channel (Default priority).
- **Migration failure** → sh-errors channel (Urgent priority).
- **Deploy pre-flight** ntfy connectivity check -- blocks deploy on stale token (HTTP 302/401/unreachable).

### Social Previews (#199 -- 2pts)
- **OG image** added to app and website metadata (logo.png 1024x1024).
- **Twitter card** upgraded from `summary` to `summary_large_image`.

---

## Fixes

### Import
- **Unmatched marker logging** (#205) -- `tracing::warn!` at 3 points: per-marker in lab import, summary in lab import, per-column in measurement import. Includes original name, unit, and user_id for coverage analysis.

### Ops
- **docker-compose.dev.yml** -- frontend build context fixed to monorepo root (was `../frontend`, needed `../../../..`).
- **ntfy token** -- stale token in `.env.staging` and `.env.monitoring` updated on VPS.
- **ntfy DNS** -- `ntfy.brickos.io` switched from Cloudflare proxied to DNS-only (was blocking API calls via Cloudflare Access).
- **Deploy script** -- version check simplified to exact match (no build number stripping).
- **Website TS fix** -- feature-comparison-table.tsx cast through unknown for stale static data.

### Audit
- **Migration checksums** (#200) -- all 118 applied migrations verified (SHA-384 match). No modified migrations.
- **Hydration suppressWarning** (#185) -- confirmed intentional on html/body (browser extensions). No change needed.

---

## Migration

```sql
-- 20260323000001_add_missing_lab_markers.sql
-- Adds: amylase, lipase, bun, igg, vldl_c
-- Patches LOINC codes for: transferrin_sat, dha, epa, omega3_index, vitamin_b2, vitamin_b6
-- Safe: ON CONFLICT DO NOTHING
```

---

## Issues

| # | Title | Status |
|---|-------|--------|
| #202 | Missing markers: aliases + new markers | Closed |
| #203 | Toast error for unmatched markers | Closed |
| #204 | PDF quality failure | Closed (resolved by #202) |
| #205 | Log unmatched marker names | Closed |
| #199 | LinkedIn preview / OG meta | Closed |
| #200 | Migration checksum audit | Closed (verified clean) |
| #185 | Hydration suppressWarning | Closed (intentional) |
| #198 | Staging notification verification | Closed |
| #207 | FSH alias + Total Fatty Acids | Closed |
| #208 | cargo-chef + component-level deploy | Closed |
| #176 | GDPR privacy tab — access log UI | Closed |
| #177 | GDPR consent management UI | Closed |
| #178 | GDPR email unsubscribe | Closed |
| #209 | Access log missing PDF + GDPR export entries | Open (sprint 010) |

---

## Known Issues

- **Bench test** -- `benches/endpoints.rs` outdated (health handler signature changed). Non-blocking, not in CI.
- **Access log gaps** -- PDF report generation and full GDPR export not logged (#209).
