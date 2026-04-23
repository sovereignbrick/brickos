# BrickOS Platform Documentation

Public documentation for the BrickOS platform: user-facing design, operator runbooks, security policy, deployment guides.

## Structure

```
docs/
├── design/         Numbered design docs (001-...). Public architecture.
├── deployment/     Deploy playbooks, environment setup, release flow.
├── ops/            Operator-facing guides (config, scaling, observability).
├── security/       Security policy, CVE disclosure, threat model.
└── README.md       This file.
```

## What's not here

Internal planning artifacts (sprint plans, tracker issues, ADRs, weekly reports, retros, strategy notes, compliance workpapers, hotfix runbooks, per-app project files) live in a separate private companion repo: **`sovereignbrick/brickos-internal`**. Split on 2026-04-23 (Sprint 053 Phase A) to keep the public AGPL repo focused on code + user docs. Commit history for moved files is preserved in the private repo.

If you're a contributor and need access to planning docs, ask a maintainer.

## Per-app docs

App-specific docs remain in their respective `apps/<pillar>/<app>/docs/` directories:

- `apps/health/sovereign-health/docs/src/` — Sovereign Health mdBook source
- `apps/health/sovereign-health/docs/testing/` — acceptance test specs
- `apps/technology/sovereign-link/docs/` — Sovereign Link design + self-hosting guide

## Top-level docs

- [`README.md`](../README.md) — project overview, quick start
- [`SELFHOSTED.md`](../SELFHOSTED.md) — self-hosted install guide (the user landing doc)
- [`CLAUDE.md`](../CLAUDE.md) — project conventions for Claude Code sessions
- [`CHANGELOG.md`](../CHANGELOG.md) — release log (when present)
- [`LICENSE`](../LICENSE) — AGPL-3.0
