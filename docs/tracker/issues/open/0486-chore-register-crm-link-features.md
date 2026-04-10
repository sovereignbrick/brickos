---
number: 486
github_number: 467
title: "chore: register CRM + Link features in feature_registry namespaces"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-e, chore]
created: 2026-04-10
priority: P2
sprint: 040
phase: E
design: 022
estimate: 0.5d
blocked_by: [460]
---

Register Sovereign CRM and Sovereign Link feature flags so a brickos admin can build cross-app license bundles from day 1.

## Scope -- CRM features (`crm.*`)

- [ ] `crm.lead_capture`
- [ ] `crm.email_sequences`
- [ ] `crm.audio_recording` (per #447)
- [ ] `crm.audio_transcription` (Whisper)
- [ ] `crm.advanced_search`
- [ ] `crm.api_access`
- [ ] `crm.csv_export`
- [ ] `crm.custom_pipelines`
- [ ] (full list TBD by CRM team; insert what exists today)

## Scope -- Link features (`link.*`)

- [ ] `link.api_access`
- [ ] `link.custom_domains`
- [ ] `link.affiliate_tracking`
- [ ] `link.click_analytics`
- [ ] `link.bulk_create`
- [ ] (full list TBD)

## Scope -- application

- [ ] Each feature includes EN + DE name + description
- [ ] Each feature has a category (`data_export`, `ai`, `branding`, `support`, etc.)
- [ ] CRM and Link binaries import `brickos-licensing` crate (client mode) and call `has_feature("crm.lead_capture")` etc. -- but the **enforcement code itself is out of scope** for this issue (deferred to next sprint per app)
- [ ] Migration adds the feature_registry rows
- [ ] Tier_features rows added: which tiers include which CRM/Link features (initially: all features available on Horizon and Core, none on lower tiers)

## Verification

- [ ] `SELECT COUNT(*) FROM feature_registry WHERE app_slug='sovereign-crm'` > 0
- [ ] `SELECT COUNT(*) FROM feature_registry WHERE app_slug='sovereign-link'` > 0
- [ ] Multi-app feature picker (#479) shows CRM and Link features

## References

- design 022 §4.5
