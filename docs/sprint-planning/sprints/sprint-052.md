# Sprint 052 -- Self-Hosted Sovereign Health (Standalone Installer)

**Start:** 2026-04-24 (morning after v0.49.0 ship) -- 2026-05-01 (est. close)
**Goal:** A user with a Pop!_OS / Ubuntu / Debian laptop can clone the repo, run one script, and get a working local Sovereign Health stack that looks and feels like `app.sovereignhealth.io`. No cloud billing, no email verification wall, no mandatory AI key -- just the core biomarker + Dr. Alex app running on localhost for the user's own data.
**Previous:** Sprint 051 (v0.49.0 -- Carry-over Burn-down + UX Polish -- shipped 2026-04-23)
**Estimated duration:** 5-7 working days
**Previous sprint close:** `project_sprint051_completed.md`

## Sprint goal (one sentence)

Ship a self-hosted installer for Sovereign Health that puts the core biomarker-tracking + Dr. Alex experience on any Linux laptop in under 15 minutes with one command, degrading gracefully where cloud services (email, Stripe, Mailgun) aren't configured.

## Why this sprint matters

- **Closes issue #0250** (Pop!_OS deployment test, open since platform's early days). Blocking factor for every "can I try this at home?" inquiry.
- **De-risks the Start9 + Flatpak packaging push** (#0249, #0343, #0344). Both presume a working standalone compose profile; this sprint is the substrate.
- **Proof of sovereignty.** The BrickOS tagline is "building sovereignty, brick by brick." Shipping a platform you cannot self-host undermines the whole thesis. One-command install is the basic ante.
- **Opens the OSS / local-first user segment.** Developers, health-conscious technical users, Start9 operators, Umbrel users -- they want to run this on their own hardware. Cloud-only forces them to another vendor.

## Non-goals

- **Not a production-grade deployment.** Self-hosted means local dev-grade: HTTPS via self-signed or mkcert, no CDN, no HA, no multi-node. Production use is still the managed `app.sovereignhealth.io` offering.
- **Not multi-org / multi-tenant.** Self-hosted assumes one household or one operator-owner. No org admin surface needed. BrickOS platform admin UI is hidden.
- **Not white-label.** Branding stays "Sovereign Health Intelligence". Customization is a future sprint (Sprint 044 white-label exists on the hosted side but doesn't propagate here yet).
- **Not Windows or macOS.** Linux only (Pop!_OS, Ubuntu, Debian, Fedora). Windows WSL2 support is a stretch; native Mac is deferred.
- **Not an AppImage / Flatpak / Snap / Start9 package.** Those are #0249 / #0343 / #0344 scope. This sprint is pure Docker Compose.

---

## Phase A -- config baseline + OSS-mode defaults (~0.75d)

Before any installer exists, the runtime has to behave sensibly when cloud services are absent. Phase A pins that behavior.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-01 | P1 | Create `apps/health/sovereign-health/ops/.env.example` with every variable documented (DB_PASSWORD, JWT_SECRET, ANTHROPIC_API_KEY, MAILGUN_*, STRIPE_*, SHI_MODE). Each var has: purpose, whether optional, what happens if absent. | 0.25d |
| 052-02 | P1 | `SHI_MODE=oss` auto-verify signup path (backend): skip email verification, skip Stripe billing checks, skip Mailgun send attempts. The env var exists today but isn't wired uniformly -- audit + tighten. | 0.25d |
| 052-03 | P1 | Graceful degradation when ANTHROPIC_API_KEY is missing: Dr. Alex UI shows "Configure AI provider to enable chat" instead of 500 error. Chat button disabled with helpful tooltip. | 0.25d |
| 052-04 | P2 | OSS-mode suppresses the refresh/eval-conversion banners (they only make sense on hosted). | 0.1d |

**Phase A exit:** `SHI_MODE=oss SHI_OSS=true cargo run` + `pnpm dev` produces a browsable app with no cloud dependencies; signup works; Dr. Alex chat gracefully disabled.

---

## Phase B -- Docker Hub image publishing (~0.75d)

Users must not have to build from source. Build once, publish to registry, `docker pull`.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-10 | P1 | **#0344** Docker Hub CI: publish `sovereignbrick/shi-backend:X.Y.Z` + `sovereignbrick/shi-frontend:X.Y.Z` + `sovereignbrick/shi-postgres:X.Y.Z` on every tagged release. Builds run in GitHub Actions or on the deploy host; push via CLI login. | 0.5d |
| 052-11 | P2 | Verify images are `linux/amd64` + `linux/arm64` multiarch (Apple Silicon + Raspberry Pi compatibility). Use `docker buildx build --platform linux/amd64,linux/arm64`. | 0.25d |

**Phase B exit:** `docker pull sovereignbrick/shi-backend:latest` works from a fresh Pop!_OS box, no repo clone required.

---

## Phase C -- one-shot installer script (~1.25d)

The user's first 15 minutes. Must feel magical.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-20 | P1 | `sh-install.sh` in repo root: single-file bash script. (a) Detect Docker + Docker Compose, install via `apt`/`dnf`/`pacman` if missing + prompt user to re-run. (b) Generate `/etc/sovereign-health/.env` with a random DB_PASSWORD + JWT_SECRET (OpenSSL or `/dev/urandom`). (c) `docker compose -f docker-compose.selfhosted.yml up -d`. (d) Poll backend /health until green, timeout 120s. (e) Print "Open http://localhost:3000 to create your admin account." | 0.5d |
| 052-21 | P1 | `docker-compose.selfhosted.yml` hardening: set `SHI_MODE=oss` as default, bind all ports to `127.0.0.1` only (no remote exposure), volume-persist `pg_data` + `uploads/` + `reports/`. Publish image tags use `:latest` (not `:staging` or SHA-pinned). | 0.25d |
| 052-22 | P1 | First-run admin bootstrap endpoint (backend): if the DB has zero admin users AND SHI_MODE=oss, the first signup elevates that user to admin role automatically. Second signup onward, normal role. Includes a "this promotes you to admin" checkbox on the signup form in OSS mode. | 0.5d |

**Phase C exit:** `./sh-install.sh` on a fresh Pop!_OS box takes the user from `git clone` to a running http://localhost:3000 in under 15 minutes.

---

## Phase D -- optional local AI fallback (~1d)

Dr. Alex without an Anthropic key today = no AI. Offer a local alternative.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-30 | P2 | **#0239** AI-agnostic provider selection: `AI_PROVIDER=anthropic\|ollama\|none` env var. Anthropic = existing behavior. Ollama = HTTP POST to a user-configured Ollama endpoint (default `http://localhost:11434`). None = Dr. Alex chat disabled (matches 052-03). | 0.5d |
| 052-31 | P2 | Ollama system-prompt adapter: port the existing Anthropic system prompt to work with Llama 3.1 / Mistral Nemo prompt formatting. Behavior may be lower quality but "it works" is the bar. | 0.25d |
| 052-32 | P2 | Optional bundled Ollama container in `docker-compose.selfhosted-ai.yml` (separate compose file; not started by default). User opts in with `./sh-install.sh --with-ai`. | 0.25d |

**Phase D exit:** User can choose Anthropic (cloud key), Ollama (local, free), or None. All three paths work end-to-end.

---

## Phase E -- docs + SELFHOSTED.md install guide (~1d)

The second 15 minutes of a user's experience: configuring, importing, their first measurement.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-40 | P1 | `SELFHOSTED.md` at repo root: prereqs (Docker, Docker Compose, 4GB RAM, 10GB disk), one-line install command, first-login walkthrough, where to get an Anthropic key OR how to enable Ollama, how to back up / restore the DB volume, how to upgrade when a new version ships. | 0.5d |
| 052-41 | P1 | Troubleshooting section in SELFHOSTED.md: common Pop!_OS / Ubuntu / Fedora / Debian quirks (Docker daemon not running, port 3000 conflict, SELinux on Fedora, etc.). | 0.25d |
| 052-42 | P2 | README.md update: add a prominent "Try it local" section above the existing marketing blurbs. Single-line `./sh-install.sh` preview + link to SELFHOSTED.md. | 0.15d |
| 052-43 | P2 | Architecture diagram for self-hosted mode (single-node Docker compose). Markdown/mermaid is fine. | 0.1d |

**Phase E exit:** A non-developer-but-technical user (think "Linux hobbyist") can follow SELFHOSTED.md and have a working install in 20 minutes without any chat support.

---

## Phase F -- verification + #0250 close (~0.75d)

Close the open issue by actually running the install on Pop!_OS.

| # | P | Title | Est |
|---|---|-------|-----|
| 052-50 | P1 | Run `sh-install.sh` on the user's Pop!_OS laptop (or a fresh Pop!_OS VM). Document any friction. | 0.25d |
| 052-51 | P1 | End-to-end smoke: signup -> first measurement -> marker detail -> PDF export. Fix anything red. | 0.25d |
| 052-52 | P1 | Playwright spec `sprint-052-selfhosted-smoke.spec.ts`: smoke against `http://localhost:3000` that a fresh OSS-mode install can be logged into + the dashboard renders. Run locally only (not staging). | 0.25d |
| 052-53 | P1 | Close **#0250** with the verification log + any Pop!_OS-specific notes. | -- |

**Phase F exit:** #0250 closed. Install works on Pop!_OS, documented.

---

## Phase G -- release cut (~0.5d)

| # | P | Title | Est |
|---|---|-------|-----|
| 052-90 | P1 | Tag `selfhosted/v1.0.0` in git (separate semver track from the hosted `v0.X.Y` versions). Annotated tag with a short release note. | 0.1d |
| 052-91 | P2 | Publish to GitHub Releases with the install script attached. | 0.1d |
| 052-92 | P2 | Announce on brickos.io (status page or blog, whatever exists). Sprint 052 RETRO.md + memory update. | 0.3d |

**Phase G exit:** `selfhosted/v1.0.0` tagged, README points at it, download link works.

---

## Summary by priority

| Priority | Items | Estimate |
|---|---|---|
| **P1 (must ship)** | 052-01, 052-02, 052-03, 052-10, 052-20, 052-21, 052-22, 052-40, 052-41, 052-50, 052-51, 052-52, 052-53, 052-90 | 4.5d |
| **P2 (should ship)** | 052-04, 052-11, 052-30, 052-31, 052-32, 052-42, 052-43, 052-91, 052-92 | 1.7d |

**Total target: ~6.2 days.** One-week sprint comfortably.

## What's NOT in this sprint (and why)

- **Windows / macOS native installers.** Docker Desktop on those OSes should work but isn't tested. Deferred.
- **Start9 / Flatpak / AppImage packages.** #0249 / #0343 tracks those; they presume this sprint's compose file as input.
- **Multi-user / household mode.** Self-hosted assumes one operator-owner per install. Family support (separate accounts) could be added but isn't day-1 essential -- the admin can manually create additional user rows.
- **Automatic upgrade tooling.** Manual `docker compose pull && docker compose up -d` is sufficient for v1. Future: `sh-upgrade.sh` that reads current version + pulls next.
- **Backup encryption / off-site backup.** User's responsibility for now; we document `pg_dump` export. Phase I improvements deferred.
- **Mobile PWA optimization for local install.** PWA install from `http://localhost` has browser-specific quirks; document "for PWA install, use mkcert to enable HTTPS on localhost" but don't ship mkcert automation.
- **Sovereign Link standalone bundling.** Separate sprint, same philosophy, different entry point (#0151 / #0249).

---

## Entry criteria

- [x] v0.49.0 live in production (current state as of sprint start)
- [x] develop tree clean except pre-existing website autogen files
- [ ] User confirms sprint scope (this doc)
- [ ] `docker-compose.selfhosted.yml` present in repo (it is, un-tested end-to-end)
- [ ] Sovereign Health OSS license (AGPL-3.0) visible in repo root (already there)

## Exit criteria

- [ ] `selfhosted/v1.0.0` tagged + published
- [ ] `./sh-install.sh` works on Pop!_OS 22.04+ in one command
- [ ] SELFHOSTED.md complete with troubleshooting
- [ ] #0250 closed
- [ ] Docker Hub publishing pipeline green (#0344 closed)
- [ ] OSS-mode signup works without any cloud service configured
- [ ] Dr. Alex degrades gracefully without ANTHROPIC_API_KEY; works with ollama
- [ ] Sprint retro + memory entries

---

## Risk notes

- **Docker Hub publish setup** can take longer than 0.5d if the Sovereignbrick account doesn't exist yet or has 2FA issues. Budget an extra 0.25d for account setup.
- **Ollama prompt adapter** is the most novel piece. Existing Anthropic prompt may not transfer cleanly to a 7B local model; quality downgrade is acceptable but compile/run errors are not. Fallback: ship Phase D as "disabled by default, experimental" if quality is too low.
- **First-run admin bootstrap** needs to be idempotent (re-running installer must not create a second admin). Be careful about the detection logic.
- **SELinux** on Fedora / CentOS may reject Docker volume binds without `:z` labels. Document this or skip Fedora support in v1.

## Related memory

- `feedback_docker_compose_orphans.md` -- never `docker compose up` manually; we'll need the script to use --force-recreate or similar
- `feedback_pgaudit_postgres_image.md` -- don't replace the postgres image; pgaudit required even on self-host
- `feedback_docker_workspace_packages.md` -- workspace:* deps need sed rewrite for Docker
- `feedback_local_preview_before_deploy.md` -- apply same discipline; verify locally before any publishing
- `project_staging_setup.md` -- useful reference for what secrets matter in prod

## Stretch / if time allows

- **`sh-install.sh --upgrade`** subcommand: pull latest images + run migrations + restart.
- **Health check dashboard** at `http://localhost:3000/healthz` that shows which optional services are configured vs unconfigured (traffic-light style). Helps users diagnose "Dr. Alex is disabled because..."
- **Export installer as a `.deb` package** (dh-make) so `apt install sovereign-health` works on Debian-based distros. Deferred to Sprint 053+.
