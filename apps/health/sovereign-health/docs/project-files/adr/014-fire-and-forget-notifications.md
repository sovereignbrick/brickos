# ADR-014: Fire-and-Forget Async Notifications

**Status:** Accepted
**Date:** 2026-03-20

## Context
The API sends emails (welcome, password reset, subscription), admin notifications (ntfy + Telegram), and audit log entries on many request paths. These side effects must never degrade user-facing response times or cause request failures.

## Decision
All notification and email sends use **fire-and-forget** pattern via `tokio::spawn()`. The API handler returns immediately; the notification is sent asynchronously in the background. Failures are logged at `debug`/`warn` level but never propagate to the caller.

```rust
// Example: notification never blocks the HTTP response
notifier.send(Channel::Users, Priority::Default, "New signup", &body);
// Returns immediately — tokio::spawn handles delivery
```

**Applied to:**
- Transactional emails (Mailgun)
- Admin notifications (ntfy + Telegram dual-dispatch)
- Audit log entries
- Mailgun list sync
- Engagement segment updates

## Alternatives Considered
- **Synchronous send:** Simpler but adds 200-500ms to every request that triggers a notification. Unacceptable for login/signup flows.
- **Message queue (RabbitMQ, Redis Streams):** Guaranteed delivery but adds infrastructure complexity for a single-VPS deployment.
- **Outbox pattern:** Write to DB outbox table, process in background worker. More reliable but heavier.

## Consequences
- **Easier:** Fast API responses, simple implementation, no extra infrastructure.
- **Harder:** No delivery guarantee — if the process crashes between `tokio::spawn` and send completion, the notification is lost. No retry logic.
- **Trade-off:** Acceptable for notifications and non-critical emails. Critical flows (e.g., password reset email) have the user-facing "check your email" message as fallback — they can request a resend.
