# Issue #313: BrickOS Nostr relay + client for self-hosted social and app infrastructure

**Type:** feature
**Priority:** low
**Component:** platform / new crate
**Found during:** feature planning (2026-04-02)

## Description

Build a Nostr relay and client as a BrickOS platform service, deployable on Start9 or VPS. This serves two purposes:

### A) Platform infrastructure — Nostr relay as a baseline for apps
A self-hosted Nostr relay that other BrickOS apps can use as a communication/event backbone:
- **Voting app:** Nostr events as tamper-proof, signed votes (NIP-01 events)
- **Messaging:** encrypted direct messages between users (NIP-04/NIP-44)
- **Activity feeds:** app events published as Nostr notes
- **Authentication:** NIP-98 HTTP auth (ties into existing issue #0070)

### B) Personal Nostr client — user-facing post storage
Users can run their own Nostr relay to:
- Store their own posts/notes on their own hardware (Start9 / VPS)
- Full data sovereignty — no dependence on public relays
- Backup and export all social activity
- Optionally federate with public relays

## Implementation Ideas

### Nostr relay (Rust crate)
- New crate: `crates/brickos-nostr-relay/` or `apps/technology/brickos-nostr-relay/`
- WebSocket server implementing NIP-01 (basic protocol)
- PostgreSQL event storage (encrypted at rest)
- NIPs to support:
  - NIP-01: Basic protocol (event kinds, subscriptions, filters)
  - NIP-02: Contact list
  - NIP-04/NIP-44: Encrypted DMs
  - NIP-11: Relay information document
  - NIP-42: Authentication
  - NIP-98: HTTP auth (integrates with BrickOS auth)

### Nostr client (frontend)
- Simple web UI for composing/reading notes
- Key management (generate, import, backup nsec)
- Relay management (add/remove relays, set read/write)
- Integrates into BrickOS dashboard

### Deployment
- Docker container alongside other BrickOS services
- Start9 package (`.s9pk`) for sovereign deployment
- VPS deploy via existing `ops/deploy.sh` pattern

## Relationship to Existing Issues

- #0070 (Nostr NIP-98 auth) — relay enables NIP-98 as an auth method for all BrickOS apps
- #0092 (data sovereignty) — self-hosted relay is a core sovereignty feature
- #0249 (Start9 deployment) — relay would be a Start9 package
- Sovereign Link (#0151) — could use Nostr for link metadata/analytics events

## Scope

This is a larger platform initiative, likely multi-sprint. Could start with a minimal NIP-01 relay crate as a foundation.

## Location

- New crate: `crates/brickos-nostr-relay/` or `apps/technology/brickos-nostr-relay/`
- Existing Nostr reference: `apps/technology/sovereign-link/` (dual-mode pattern)
