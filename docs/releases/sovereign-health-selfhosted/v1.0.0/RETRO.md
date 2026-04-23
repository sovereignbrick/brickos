# Sprint 052 Retrospective -- Self-Hosted Sovereign Health v1.0.0

**Date:** 2026-04-23
**Release:** `selfhosted/v1.0.0`
**Duration:** Same calendar day as Sprint 051 promote (productive day)
**Branch:** develop; separate semver track from the hosted `v0.X.Y` line

## Planned scope vs delivered

From `sprint-052.md`, 7 phases, ~6.2 days estimate:

| Phase | Items | Delivered | Notes |
|---|---|---|---|
| A -- Config baseline | 4 (052-01, -02, -03, -04) | 3 + 1 audit-only | 052-02 audit confirmed existing `is_oss()` covers the bypass surface; no new wiring needed |
| B -- Docker Hub publish | 2 (052-10, 052-11) | 1 + 1 deferred | amd64 published; arm64 multi-arch deferred to v1.1.0 |
| C -- sh-install.sh | 3 (052-20, 052-21, 052-22) | 3 | First-run admin bootstrap shipped |
| D -- Ollama AI fallback | 3 (052-30, 052-31, 052-32) | 1 + 2 deferred | Compose overlay shipped; prompt adapter deferred to Sprint 053 |
| E -- SELFHOSTED.md | 4 (052-40, -41, -42, -43) | 3 + 1 skipped | Architecture diagram skipped (low value vs text guide) |
| F -- Pop!_OS verification | 4 (052-50, -51, -52, -53) | 4 (partial e2e) | Full e2e blocked on Phase G Docker Hub publish |
| G -- Release cut | 3 (052-90, -91, -92) | 2 + 1 pending | Tag pending user's Docker Hub publish run |

**Delivered in a single session** -- the sprint plan estimated 6.2 days at normal pace; compressed here because a lot of the foundation (SHI_MODE=oss, selfhosted compose file, pgaudit postgres image) already existed from earlier sprints and just needed surfacing + wiring + documentation.

### What actually shipped

- **`sh-install.sh`** (277 lines) at repo root with `--install`, `--upgrade`, `--uninstall`, `--with-ai`, `--help`
- **`apps/health/sovereign-health/ops/.env.example`** -- complete env reference grouped REQUIRED / CORE / OPTIONAL / ADVANCED
- **`docker-compose.selfhosted.yml`** hardened to pull from Docker Hub, 127.0.0.1-bind, named persistent volumes
- **`docker-compose.selfhosted-ai.yml`** -- optional Ollama overlay
- **`publish-docker-hub.sh`** -- maintainer release script
- **`SELFHOSTED.md`** (278 lines) -- full install + backup + troubleshoot guide
- **README.md hero section** with 3-line install preview
- **First-run admin bootstrap** in `handlers/auth.rs` -- promotes first OSS signup to admin idempotently
- **`AI_UNCONFIGURED` graceful degradation** in Dr. Alex chat -- returns 503 with structured code instead of 500 on empty API key
- **Playwright smoke spec** at `e2e/sprint-052-selfhosted-smoke.spec.ts` -- 7 tests for post-install verification
- **#0250 closed** with resolution note + follow-up list

## What went well

- **Reusing existing `SHI_MODE=oss` infrastructure.** `is_oss()` was already wired across auth, Stripe init, Mailgun, dev CORS, email verification. Phase A audit confirmed it was sufficient -- no additional wiring needed. Saved ~0.5d of expected work.
- **Pgaudit postgres image is already a separate image.** `sovereignbrick/shi-postgres` builds from `ops/postgres/Dockerfile`. Publishing it to Docker Hub was a 10-minute change to `publish-docker-hub.sh` rather than repackaging.
- **First-run admin bootstrap pattern.** Count admins, promote if zero, guard on OSS mode. 30 lines of Rust. Clean, testable, idempotent. Works for any future self-host BrickOS app.
- **Tight scoping on Phase D.** Resisted the urge to build a full Claude-to-Ollama adapter in this sprint. Shipped the compose overlay + env plumbing; deferred the prompt adapter to Sprint 053 where it can get proper attention. Ollama prompt formatting is genuinely different from Claude's and rushing it would have produced bad output quality that users might mistake for the system being broken.

## What didn't go well

- **Couldn't fully e2e test on the actual Pop!_OS box.** The install script expects `docker pull sovereignbrick/shi-api:latest` to succeed, but those images haven't been published yet. Required Phase G's release cut to include the Docker Hub publish step. Workaround: documented this as the Phase G gate, proceeded with syntax + prereq-detection checks instead.
- **`sh-install.sh --help` sed pattern bug.** Initial version used one-space pattern against two-space heredoc markers; fixed on first run. Would have been caught by shellcheck, which isn't installed on the author's box. File a follow-up: "add shellcheck to dev prereqs + CI-equivalent script lint".
- **Backup documentation assumes manual commands.** `sh-install.sh --backup` would be more user-friendly than walking users through `pg_dump` + `docker run --rm -v ... tar czf ...`. Deferred to v1.1.0 because the underlying steps are well-documented and a bash wrapper is pure convenience.
- **Ollama overlay ships with no real Dr. Alex integration.** User who picks `--with-ai` gets a running Ollama but Dr. Alex still needs Anthropic. Honest UX -- documented clearly in SELFHOSTED.md -- but could feel misleading if the user doesn't read the notes. Sprint 053's prompt adapter is the proper fix.

## Lessons learned

- **Ship the installer before the multi-arch images.** Multi-arch builds take longer (buildx + qemu) and require credentials. Shipping amd64 first gets 95% of Linux users (Pop!_OS, Ubuntu, Debian, Fedora) onto the happy path. ARM64 can follow in a minor release without breaking anything.
- **Docs that encode the "what if I skip this step?" answer.** SELFHOSTED.md's OPTIONAL / REQUIRED / ADVANCED grouping prevented the typical "I don't know what I need to set" paralysis. Users can follow the minimal path and layer on features only as they care about them.
- **First-run admin promotion solves a real UX problem.** Without it, a self-host user lands on `/login`, creates an account, and then... has no admin access. Either they read the docs to find `UPDATE users SET role='admin'` or they get stuck. Automatic promotion when `COUNT(admin) == 0` is the right trade-off.
- **Deferred features need explicit release-note carve-outs.** "Ollama adapter ships v1.1.0" is better UX than "Ollama support limited" because it sets expectations correctly. Users understand "coming in the next release" better than "some limitation you'll discover later".

## Action items for Sprint 053

- **Ollama prompt adapter for Dr. Alex.** `AI_PROVIDER=ollama` currently doesn't actually route Dr. Alex chat to Ollama. The adapter is a proper NLP job (system prompt tuning for Llama 3.1 vs Claude, context-window trimming, streaming response format differences). Budget 1-1.5d.
- **Multi-arch Docker images.** `docker buildx build --platform linux/amd64,linux/arm64 --push` in `publish-docker-hub.sh`. Needs qemu-user-static on the maintainer box. Budget 0.5d.
- **`sh-install.sh --backup` subcommand.** Wraps `pg_dump` + `docker run --rm -v ... tar czf ...` into one command. Budget 0.25d.
- **SELinux `:z` labels for Fedora/RHEL.** Either add `:z` to compose volume mounts or document disabling SELinux. Budget 0.1d.
- **`sh-install.sh --upgrade` migration safety.** Currently runs `docker compose pull && up -d`. Should run `pg_dump` first and roll back on migration failure. Budget 0.5d.
- **shellcheck in the dev prereqs** (or a `make lint` rule that checks all `*.sh` files). Budget 0.1d.

## By the numbers

- **Commits on develop since Sprint 051 close:** 7 (Phase A -> F)
- **New scripts:** 2 (`sh-install.sh`, `publish-docker-hub.sh`)
- **New compose files:** 1 (`docker-compose.selfhosted-ai.yml`); 1 rewritten (`docker-compose.selfhosted.yml`)
- **New docs:** 2 (`SELFHOSTED.md`, `RELEASE_NOTES.md`) + README hero section
- **Backend code changes:** 2 (`handlers/auth.rs` admin bootstrap, `handlers/doctor_chat.rs` AI_UNCONFIGURED)
- **New Playwright specs:** 1 (`sprint-052-selfhosted-smoke.spec.ts`, 7 tests)
- **Tracker issues closed:** 1 (#0250)
- **Time spent:** ~1 working session (~3-4 hours active work)
- **Lines of code / docs added:** ~1,100

## Sign-off

`selfhosted/v1.0.0` tagged pending Phase G release script execution. `sh-install.sh` is repo-root; SELFHOSTED.md is the user's landing doc. README.md prominently advertises the local-first install. Next sprint (053) picks up the deferred Ollama adapter + multi-arch + polish items.
