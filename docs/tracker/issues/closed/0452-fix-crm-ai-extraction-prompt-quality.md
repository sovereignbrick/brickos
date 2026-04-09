---
number: 452
title: "fix: AI extraction prompt should extract all contacts (sender, recipients, CC)"
milestone: "Sovereign CRM MVP"
labels: [bug, ai]
created: 2026-04-09
priority: P2
---

Current AI extraction prompt only extracts the subject person from emails. Should extract all people: sender (From), recipients (To), CC, and any mentioned contacts with their roles, companies, and email addresses.

Example: Email photo shows "From: Andreas Grigull <andreas.grigull@ovhcloud.com>, Sales Director Corporate" but AI only extracted "Mirko" from the subject line.

Fix: improve the extraction prompt in captures.rs EXTRACTION_PROMPT to explicitly request sender, all recipients, and signature block parsing.
