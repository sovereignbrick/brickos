---
number: 529
title: "feat: [P1] Dr. Alex should pull AI provider config from brickos system defaults"
milestone: "Sprint 043 -- SHI Production Push"
labels: [feature, p1, platform-admin-gui, ai, architecture]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [527, 528]
---

## Summary

Dr. Alex (the SHI in-app health AI assistant) currently has its own
hard-coded AI provider configuration. The brickos platform admin has a
**system-wide AI settings panel** at `/platform/ai-settings` (or wherever
it lives) where the operator chooses the default model + provider for
all BrickOS apps. Dr. Alex should consume that default instead of having
its own.

This came up while testing the Sprint 041 staging deploy: Dr. Alex chat
was broken (separately, see #527 -- feature gating bug). Fixing #527 will
make the chat functional again, but it'll still be running on whatever
provider the SHI handler hard-coded. The platform admin's AI choice
should be the source of truth.

## Why this matters

1. **One AI key, one bill, one audit log.** Today every BrickOS app that
   wants AI has to be configured separately with its own API key, its
   own model selection, and its own cost tracking. As the app pillar grows
   (sovereign-vote needs an AI moderator, sovereign-signal needs an AI
   summarizer, etc.) this becomes N×M configuration.
2. **EU AI Act compliance.** The brickos platform AI settings panel is
   the **single place** where the operator declares which model is used,
   for what purpose, with what data scope. Dr. Alex bypassing this means
   the AI Act conformity assessment for SHI doesn't reflect what the
   software actually does.
3. **Provider switching.** When Anthropic releases a new model or pricing
   changes, the operator should be able to switch provider once at the
   brickos level and have every app inherit the change. Today they have
   to dig into Dr. Alex code separately.
4. **Per-app override is still possible** -- the brickos default is the
   *fallback*. An app or even a user can override (memory
   `feedback_no_hardcoded_values.md` -- system defaults from
   `app_settings`, never hardcoded).

## Proposed model

```
brickos system AI defaults  (set in /platform/ai-settings)
 |- default_provider: "anthropic"
 |- default_model: "claude-sonnet-4-6"
 |- default_max_tokens: 4096
 |- default_temperature: 0.3
 |- api_key_secret_ref: "anthropic_api_key"   // pulled from secrets
 |- declared_purpose_per_app: {
 |    "sovereign-health.dr-alex": "Health data analysis and personalized insights",
 |    "sovereign-vote.moderator": "...",
 |  }
 |- data_scope_per_app: { ... }
 |- ai_act_classification_per_app: { ... }
```

Each app reads from `app_settings` at startup AND on every chat request
(short-cached, so a config flip propagates within seconds).

For Dr. Alex specifically:

1. On Dr. Alex chat request, the handler reads:
   - `system.ai.default_provider`
   - `system.ai.default_model`
   - `system.ai.dr_alex.max_tokens` (override or fallback to default)
   - `system.ai.dr_alex.declared_purpose`
2. If the org has its own override (e.g. white-label customer with their
   own model preference), the org override wins
3. If the user has their own override (advanced setting on the SHI AI
   assistant tab from #528), the user override wins
4. The /health endpoint already declares the AI system in its response
   (we saw the field today). That declaration should be **read** from
   the same `system.ai.*` keys, not hardcoded.

## Acceptance criteria

- [ ] `system.ai.*` keys defined in `app_settings` with sane defaults
- [ ] Platform admin GUI page at `/platform/ai-settings` to view and edit
- [ ] Dr. Alex handler refactored to read from `system.ai.*` (with org/user override)
- [ ] `/health` endpoint reads from the same source of truth
- [ ] Per-app declared purpose and data scope live in DB, not in `lib.rs`
- [ ] EU AI Act conformity assessment doc references the DB-driven settings, not hardcoded constants
- [ ] e2e: change `system.ai.default_model` from the platform admin GUI, then call Dr. Alex, verify the new model is used
- [ ] Audit log entry on every change to `system.ai.*`

## Out of scope

- Actually implementing the AI provider abstraction layer (Anthropic vs OpenAI vs Mistral vs local). This issue is about the *config plane*, not the *provider plane*.
- Per-conversation model selection. That's a Dr. Alex feature, not a platform feature.

## Related

- #527 (Dr. Alex chat broken via feature gating -- separate bug, fix that first so we can test this)
- #528 (settings page architecture -- the user-level AI override lives there as a tab on the SHI extension)
- design 014 BrickOS Platform GUI
- compliance: EU AI Act conformity assessment for Dr. Alex
- memory `feedback_no_hardcoded_values.md` (the rule this enforces)
- memory `feedback_compliance_assessment_approach.md` (the AI Act lens)
