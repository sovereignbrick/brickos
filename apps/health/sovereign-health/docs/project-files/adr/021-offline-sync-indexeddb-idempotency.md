# ADR 021: Offline sync via IndexedDB + idempotency keys

**Date:** 2026-03-24
**Status:** Accepted
**Context:** Sprint 011 — PWA Phase 3 (Offline Write + Sync)

## Decision

Use `idb` library for IndexedDB storage with a push-then-pull sync engine. Offline writes use `idempotency_key` for replay safety.

## Context

PWA needs offline measurement creation. Options:
1. LocalStorage — too small (5MB), no indexing
2. IndexedDB via raw API — complex, verbose
3. IndexedDB via `idb` — lightweight (1.5KB), typed, Promise-based
4. Dexie.js — heavier (30KB+), more features than needed

## Design

- 3 IndexedDB stores: `sync_queue`, `sync_state`, `measurements_cache`
- Each offline write gets a UUID `idempotency_key`
- Backend: `ON CONFLICT (idempotency_key) DO NOTHING` prevents duplicates
- Sync engine: push queue → pull changes → update `lastSyncVersion`
- Auto-sync on `online` event + 60s interval

## Consequences

- Schema prep (migration 068) columns now actively used: `client_id`, `idempotency_key`, `sync_version`, `deleted_at`
- `GET /sync/changes?since_version=N` endpoint added for delta sync
- IndexedDB not available in incognito mode on some browsers
