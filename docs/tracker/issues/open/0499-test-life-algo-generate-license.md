---
number: 499
title: "test: [manual] Life Algorithm -- generate Horizon license JWT"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-c, manual]
created: 2026-04-11
priority: P0
sprint: 041
phase: C
estimate: 0.3d
blocked_by: [496]
---

The most critical manual test of the sprint. Walk the Generate form on the License tab for Life Algorithm and issue the Horizon license JWT.

## Prerequisites

- Life Algorithm org exists (#496)
- Dev license signing key is at `crates/brickos-licensing/keys/dev_signing_key.pem` (verify `ls -la`)
- Feature registry has all ~41 features from Sprint 040 migration 011 + 012 (verify via `/admin/licensing/feature-registry` endpoint)

## Steps

1. `/platform/orgs/{life-algorithm-id}` -> **License** tab
2. Click **Generate new license**
3. **Tier** dropdown: select `horizon`
4. **Feature picker** (grouped by app):
   - `sovereign-health`: check `shi.csv_export`, `shi.json_export`, `shi.pdf_reports`, `shi.ai_dashboard_insights`, `shi.smart_import`, `shi.api_access`, `shi.body_composition`, `shi.supplement_marker_impact`, `shi.cohort_comparison` (9 features)
   - `_platform` branding: check `branding.custom_logo`, `branding.custom_colors`, `branding.custom_domain`, `branding.role_labels` (4 features)
   - `_platform` support: check `support.priority` (1 feature)
   - leave `crm.*` and `link.*` unchecked (Life Algorithm is SHI-only)
5. **Seat caps:**
   - Max owners: `1`
   - Max practitioners: `3`
   - Max members: `50`
6. **Expires in days:** click the `12 months` preset (365)
7. **Notes:** `Sprint 041 test customer -- Life Algorithm Horizon contract test`
8. Review the **JSON preview** -- verify it shows all 14 features + the seat caps + 365d
9. Click **Generate JWT**
10. Verify the success toast
11. In the result panel:
    - Copy the JWT
    - Click **Download .jwt** -- verify file downloads
    - Click **Email to customer** -- expect it to call the manual-send flow (Note: no Mailgun locally, so it will log-only; verify no error toast)

## Expected result

- License row appears in the collapsible **License history** section
- History row shows: tier=`horizon`, issued=now, expires=now+365d, issued_by=admin email
- Current license card on the License tab updates to show the new license
- Seat bars on the Overview tab now show `0/1`, `0/3`, `0/50` for owners/coaches/clients

## Who

User (manual).

## Verification

Green/bug. If the "Generate JWT" button fails, check the backend logs for the actual error. Most common: missing `LICENSE_SIGNING_KEY_PATH` or the dev key file has wrong permissions.

Any bug here is P0 -- blocks all of Phase D.
