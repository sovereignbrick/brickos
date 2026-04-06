---
number: 323
title: "ops: Security update notification for self-hosted users"
labels: [ops, compliance, cra]
milestone: post-launch
---

## Description
CRA requires vulnerability handling including notifying users of security updates. Self-hosted users need a mechanism to learn about security patches.

## Action
- [ ] Add version check on startup (call brickos.io/api/version)
- [ ] Display notification in admin panel if outdated
- [ ] Publish security advisories on GitHub
- [ ] Add update instructions to self-hosted docs
