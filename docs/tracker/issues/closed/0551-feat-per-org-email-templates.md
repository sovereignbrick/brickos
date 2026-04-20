---
number: 551
title: "feat: per-org email templates"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, p1, white-label]
created: 2026-04-18
priority: P1
estimate: 0.75d
blocked_by: [545]
---

Email templates hardcoded to "Sovereign Health Intelligence" branding.
Must render org's logo + name for white-label customers.

## Implementation

- Add {{org_logo_url}}, {{org_name}}, {{org_website}} template vars
- Helper: org_email_vars(branding: Option<Value>) -> HashMap
- Modify verification, reset, lifecycle emails to accept org branding
- Billing emails stay BrickOS branded (design 022 section 1.3)
- Both EN and DE wrappers

## Acceptance

- Verification emails from testclinic.brickos.io show clinic branding
- Password reset shows org branding
- Billing emails unchanged (BrickOS)
- Fallback to SHI when no org context
