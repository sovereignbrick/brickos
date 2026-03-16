.PHONY: ci test test-smoke test-integration test-property test-e2e test-all \
        test-db test-auth test-measurements test-tiers test-doctor-chat \
        snapshot-review bench audit lint fmt clean run hooks help

# ---------------------------------------------------------------------------
# CI — Run before every push. Mirrors the GitLab pipeline.
# ---------------------------------------------------------------------------

## Full local CI: fmt + clippy + smoke + integration (no DB needed)
ci: lint test
	@echo ""
	@echo "=== CI pipeline passed ==="
	@echo ""

# ---------------------------------------------------------------------------
# Git hooks
# ---------------------------------------------------------------------------

## Install pre-push hook (runs 'make ci' before every push)
hooks:
	git config core.hooksPath .githooks
	@echo "Pre-push hook installed. Runs before every 'git push'."

# ---------------------------------------------------------------------------
# Running
# ---------------------------------------------------------------------------
run:
	cargo run

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

## Run smoke → integration → property (standard dev loop)
test: test-smoke test-integration test-property

## All tests including DB + E2E (requires DATABASE_URL + running server)
test-all: lint test test-property test-db

## Fast smoke check — run this first
test-smoke:
	cargo test --test smoke -- --nocapture

## Integration + snapshot + routing tests
test-integration:
	INSTA_UPDATE=no cargo test --test integration -- --nocapture

## Property-based tests with more cases in CI (default: 256)
test-property:
	PROPTEST_CASES=1000 cargo test --test integration prop -- --nocapture

## E2E against a live server — set E2E_BASE_URL or defaults to localhost:8080
test-e2e:
	E2E_BASE_URL=$${E2E_BASE_URL:-http://localhost:8080} cargo test --test e2e -- --nocapture

# ---------------------------------------------------------------------------
# DB tests (need DATABASE_URL + JWT_SECRET from .env)
# ---------------------------------------------------------------------------

## Run all DB-dependent test suites
test-db: test-auth test-measurements test-tiers test-doctor-chat
	@echo "--- All DB tests passed ---"

test-auth:
	cargo test --test auth_test -- --nocapture

test-measurements:
	cargo test --test measurement_test -- --nocapture

test-tiers:
	cargo test --test tier_test -- --nocapture

test-doctor-chat:
	cargo test --test doctor_chat_test -- --nocapture

# ---------------------------------------------------------------------------
# Snapshot management (insta)
# Run after changing response shapes, then commit the updated .snap files.
# ---------------------------------------------------------------------------
snapshot-review:
	cargo install cargo-insta --quiet && cargo insta review

snapshot-accept-all:
	cargo install cargo-insta --quiet && cargo insta accept

# First-time: create snapshots then accept them
snapshot-init:
	INSTA_UPDATE=new cargo test --test integration; \
	for f in tests/snapshots/*.snap.new; do mv "$$f" "$${f%.new}"; done

# ---------------------------------------------------------------------------
# Performance
# ---------------------------------------------------------------------------
bench:
	cargo bench

bench-open:
	cargo bench && open target/criterion/report/index.html

# ---------------------------------------------------------------------------
# Load testing (requires k6: https://k6.io)
# ---------------------------------------------------------------------------
load-smoke:
	k6 run load-tests/health.js

load-test:
	k6 run --vus 50 --duration 2m load-tests/health.js

load-stress:
	k6 run --stage 30s:50,1m:200,30s:0 load-tests/health.js

# ---------------------------------------------------------------------------
# Quality
# ---------------------------------------------------------------------------
lint:
	cargo fmt --check && cargo clippy --all-targets -- -D warnings

fmt:
	cargo fmt

audit:
	cargo audit

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
clean:
	cargo clean

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  ci              Full local CI (fmt + clippy + smoke + integration)"
	@echo "  hooks           Install pre-push git hook"
	@echo "  lint            fmt check + clippy"
	@echo "  fmt             Auto-format code"
	@echo "  test            smoke + integration (no DB)"
	@echo "  test-db         auth + measurements + tiers + doctor-chat (needs DB)"
	@echo "  test-all        Everything (lint + test + property + DB tests)"
	@echo "  audit           Security audit (cargo audit)"
