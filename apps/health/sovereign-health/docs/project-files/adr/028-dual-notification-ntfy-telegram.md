# ADR 028: Dual-dispatch notifications via ntfy + Telegram

**Status:** Accepted
**Date:** 2026-03-15 (documented 2026-04-05)
**Context:** Sprint 015 -- notification infrastructure

## Context
The platform needs real-time notifications for: deploy status, new signups, billing events, errors, and monitoring alerts. Notifications must work for a solo developer/founder workflow -- visible on mobile without opening a dashboard.

## Decision
Fire-and-forget dual dispatch to both ntfy (self-hosted, sovereign) and Telegram (admin convenience):

- **ntfy** (`ntfy.brickos.io`): Self-hosted notification server. 5 topic channels (critical, errors, billing, users, info). Bearer token auth. DNS-only in Cloudflare (not proxied -- Cloudflare Access interferes with ntfy auth).
- **Telegram**: Bot API posting to a forum group with topic threads per channel. Provides mobile push without a separate app.
- **Notifier service** (`services/notify.rs`): Spawns background tokio task, never blocks the caller. Sends to both targets concurrently. Failure in either target doesn't affect the other or the API request.
- **Deploy script** (`ops/deploy.sh`): Uses `curl` for ntfy + Telegram. Pre-flight connectivity check before deploying.

## Alternatives Considered
- **Email notifications**: Rejected -- too slow for deploy/error alerts, easy to miss
- **Slack/Discord**: Rejected -- third-party dependency, not sovereign
- **ntfy only**: Initially chosen, but Telegram added for mobile convenience (ntfy app is less polished)
- **Webhook to monitoring service**: Rejected -- adds complexity, Gatus already monitors endpoints

## Consequences
- Two notification paths provide redundancy -- if ntfy is down, Telegram still works
- ntfy is sovereign (self-hosted) -- no third-party dependency for critical alerts
- Fire-and-forget means notification failures are silent. Trade-off: API latency is never affected by notification issues
- Sprint 023 bug: `.env.staging` had unquoted angle brackets in MAILGUN_FROM, causing `source` to fail silently and ntfy tokens to not load. Fixed by using `grep` instead of `source` for env var extraction.
- DNS must be DNS-only for ntfy.brickos.io -- Cloudflare proxy breaks ntfy auth
