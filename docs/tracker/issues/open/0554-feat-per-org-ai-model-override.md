---
number: 554
title: "feat: per-org AI model override"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, p3, white-label]
created: 2026-04-18
priority: P3
estimate: 0.5d
blocked_by: [545]
---

Org owner can override the system default AI model for their org
via org settings. The AI handler checks org settings first, then
falls back to system default from app_settings.

## Acceptance

- Org admin sets model override in org settings
- AI chat from that org uses overridden model
- Default used when no override
- Invalid model IDs rejected at save time
