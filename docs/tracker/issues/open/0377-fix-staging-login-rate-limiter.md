---
github_number: 377
title: "fix: staging login rate limiter too aggressive for testing"
milestone: infrastructure
labels: [fix, P1]
---

## Problem

The login rate limiter on staging blocks the demo account after a few failed attempts. It's in-memory (not Redis), so only a backend container restart clears it. This blocks both manual testing and E2E tests.

## Fix Options

1. Higher rate limit for staging environment (e.g., 50 attempts/15min vs 5)
2. Whitelist demo accounts from rate limiting
3. Add a test-mode env var that disables rate limiting on staging
