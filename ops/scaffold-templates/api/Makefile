.PHONY: ci lint fmt test test-smoke test-integration test-property bench run audit clean help

ci: lint test  ## Run full CI pipeline

lint:  ## Check formatting + clippy
	cargo fmt --check
	cargo clippy --all-targets -- -D warnings

fmt:  ## Auto-format code
	cargo fmt

test: test-smoke test-integration  ## Run all tests

test-smoke:  ## Fast sanity checks
	cargo test --test smoke -- --nocapture

test-integration:  ## Full route tests with snapshots
	INSTA_UPDATE=no cargo test --test integration -- --nocapture

test-property:  ## Property-based tests (1000 cases)
	PROPTEST_CASES=1000 cargo test --test integration prop -- --nocapture

bench:  ## Run benchmarks
	cargo bench

run:  ## Run dev server
	cargo run

audit:  ## Security advisory check
	cargo audit

clean:  ## Remove build artifacts
	cargo clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
