---
number: 583
title: "feat: multi-language email templates per org"
milestone: "Sprint 047 -- Multi-App URL Routing + Stability"
labels: [feat, backend, frontend, i18n, p2]
created: 2026-04-20
priority: P2
estimate: 1.5d
---

User question during Sprint 046 RC #7 on 2026-04-20:

> "how to deal with multi language in [email templates]?"

Today the per-org email templates at
`/platform/org/apps/shi/email` are single-language. An org with
English + German members needs separate template content for each.

## Scope

1. Extend the email-templates schema: `org_email_templates` gets a
   `locale` column (default 'en'); UNIQUE(org_id, template_key, locale)
2. Frontend editor adds a locale switcher above the template text area
3. Backend emailer picks the locale based on the recipient's
   `users.locale` (fallback to `en` if no org-specific template in
   the requested locale)
4. Templates list: show locale tags inline ("Welcome · en" / "Welcome · de")

## Acceptance

- Org owner can edit templates in EN and DE independently
- A DE user receives the DE template; an EN user receives EN
- Missing locale falls back to EN cleanly
- No schema migration breakage for orgs with existing EN templates
