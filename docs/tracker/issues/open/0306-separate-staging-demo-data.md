---
github_number: 306
title: "chore: Separate staging demo data from website demo profiles"
milestone: infrastructure
labels: [enhancement, app:health, ops]
points: 3
---

## Description
Staging/demo environment shares demo user data with website risk profiles. Testing destructive features (Reset All Data, account deletion) risks deleting website demo data.

## Sub-tasks
- [ ] Create dedicated staging test user separate from demo user
- [ ] Or: seed demo data from migration (not shared with website)
- [ ] Guard demo user UUID in reset-data endpoint
- [ ] Document which user is for website vs staging QA
