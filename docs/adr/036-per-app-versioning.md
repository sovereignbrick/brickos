# ADR-036: Per-App Independent Versioning and Tagging

**Status:** Accepted
**Date:** 2026-04-06

## Context

BrickOS is a monorepo with multiple apps (SHI, Sovereign Link, Sovereign Voice). Previously, only SHI had a version (v0.37.0). As new apps ship independently, we need a versioning strategy that allows each app to release on its own schedule without forcing all apps to version-bump together.

## Decision

Each app maintains its own version in its own Cargo.toml or package.json. Git tags use app-prefixed format: `sovereign-link/v0.2.0`, `brickos-platform/v0.1.0`, `sovereign-health/v0.38.0`.

Platform DB migrations use sequential numbering (001, 002, ...) with no version number.

Apps release independently. A Sovereign Link release does not require a SHI version bump (unless SHI code changed).

## Alternatives Considered

- **Monorepo single version:** All apps share one version (e.g., v0.38.0). Forces unnecessary bumps when only one app changed. Misleading for users of unchanged apps.
- **Calendar versioning (CalVer):** 2026.04.06. Doesn't communicate compatibility or feature scope.
- **No tags, only branches:** Loses the ability to reference specific releases.

## Consequences

**Easier:**
- Each app releases on its own cadence
- Version number reflects actual changes in that app
- Tags are searchable per app: `git tag -l "sovereign-link/*"`

**Harder:**
- Must track which app versions are compatible with which platform DB migration level
- Release notes must be per-app (not one global changelog)
- CI/CD must detect which apps changed and only build/test those
