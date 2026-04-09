---
number: 448
title: "feat: CRM background capture processing queue (tokio worker)"
milestone: "Sovereign CRM MVP"
labels: [feature, backend]
created: 2026-04-09
priority: P2
---

Tokio background task that polls crm_captures for status='pending', processes sequentially via brickos-ai, updates status. Retry logic (max 3 attempts). Spawned in main.rs.
