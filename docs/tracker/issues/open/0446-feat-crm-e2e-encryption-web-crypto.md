---
number: 446
title: "feat: CRM client-side E2E encryption for photo captures (Web Crypto API)"
milestone: "Sovereign CRM MVP"
labels: [feature, security]
created: 2026-04-09
priority: P1
---

Encrypt photos client-side before upload using Web Crypto API (AES-256-GCM). Key derived from user session via HKDF. Server never sees plaintext image. Decrypt in-memory for AI processing only.
