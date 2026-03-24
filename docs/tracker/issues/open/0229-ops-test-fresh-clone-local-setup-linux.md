---
number: 229
title: "ops: test fresh clone + local setup on clean Linux profile"
labels: [ops, testing, documentation]
milestone: release-workflow
---

## Description

Verify that a new developer (or the same developer on a different machine/user profile) can clone the repo from GitHub and get the full stack running locally by following the README and CLAUDE.md instructions alone.

This tests the "new laptop" scenario — fresh Linux install, no pre-existing config, no tribal knowledge.

## Why

- Validates that all setup steps are documented
- Catches missing dependencies, undocumented env vars, or hard-coded paths
- Required before onboarding contributors (AGPL open-source)
- Required before setting up cloud dev VPS (#227)
- Ensures Docker-only development works as documented

## Test Procedure

### Prerequisites (document what's needed)
- [ ] Linux (Ubuntu 22.04+ or Pop!_OS)
- [ ] Git installed
- [ ] Docker + Docker Compose installed
- [ ] Rust toolchain (rustup + stable)
- [ ] Node.js (v20+) + pnpm
- [ ] Any other system dependencies?

### Steps to Test

```bash
# 1. Create a new Linux user profile (or use a VM/container)
sudo adduser testdev
su - testdev

# 2. Clone from GitHub
git clone https://github.com/sovereignbrick/brickos.git
cd brickos

# 3. Follow README setup instructions
#    Document every step that fails or is missing

# 4. Backend
cd apps/health/sovereign-health/api
cp .env.example .env  # Does .env.example exist?
cargo build           # Does it compile without errors?
cargo test --test smoke --test integration  # Do tests pass?

# 5. Frontend
cd ../frontend
pnpm install          # Does it resolve all deps including workspace packages?
pnpm build            # Does it build? (--webpack for SW)
pnpm test             # Do all 223 tests pass?

# 6. Docker (full stack)
cd ../ops
docker compose up -d  # Does the full stack start?
# Wait for migrations
curl http://localhost:8080/health  # Backend healthy?
# Open http://localhost:3000       # Frontend loads?

# 7. Create test user + verify basic flow
# Can you sign up, log in, add a measurement?
```

### Expected Outcome

- [ ] Clone → build → run works with only documented steps
- [ ] No undocumented env vars required
- [ ] No hard-coded paths to /home/dev-comp or similar
- [ ] Docker Compose starts all services (backend, frontend, postgres)
- [ ] Migrations apply automatically on first startup
- [ ] Smoke tests pass without a running database
- [ ] Integration tests pass
- [ ] Frontend builds and tests pass
- [ ] .env.example exists with all required vars (placeholder values)

### Issues to Document

Record every friction point:
- Missing .env.example files
- Undocumented system dependencies (libssl-dev? — should NOT be needed)
- Workspace resolution errors
- Hard-coded secrets or paths
- Missing Docker Compose files
- Port conflicts
- Migration failures on fresh DB

## Deliverables

1. Fix any setup issues found
2. Update README.md with complete "Getting Started" section
3. Create/update `.env.example` files for api and frontend
4. Verify Docker Compose stack definition is complete
5. Add `make setup` or `ops/setup.sh` one-liner if needed

## References

- CLAUDE.md (project conventions)
- apps/health/sovereign-health/api/CLAUDE.md (backend setup)
- apps/health/sovereign-health/frontend/CLAUDE.md (frontend setup)
- Issue #227 (cloud dev VPS — needs same setup steps)
