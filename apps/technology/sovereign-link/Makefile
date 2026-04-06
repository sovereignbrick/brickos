# Sovereign Link - Build Targets
# Part of the brickos.io platform

VERSION := $(shell grep '^version' Cargo.toml | head -1 | sed 's/.*"\(.*\)"/\1/')
BINARY := sovereign-link
RELEASE_DIR := release

.PHONY: build build-standalone build-platform build-musl build-docker clean release

# Development builds
build: build-standalone

build-standalone:
	cargo build --features standalone

build-platform:
	cargo build --features platform

# Release builds
build-release:
	cargo build --features standalone --release

# Static binary (musl - no runtime dependencies)
build-musl:
	@echo "Building static binary for x86_64-unknown-linux-musl..."
	rustup target add x86_64-unknown-linux-musl 2>/dev/null || true
	cargo build --target x86_64-unknown-linux-musl --features standalone --release
	@echo ""
	@echo "Binary: target/x86_64-unknown-linux-musl/release/$(BINARY)"
	@ls -lh target/x86_64-unknown-linux-musl/release/$(BINARY)
	@echo ""
	@file target/x86_64-unknown-linux-musl/release/$(BINARY)

build-musl-arm64:
	@echo "Building static binary for aarch64-unknown-linux-musl..."
	rustup target add aarch64-unknown-linux-musl 2>/dev/null || true
	cargo build --target aarch64-unknown-linux-musl --features standalone --release
	@echo ""
	@echo "Binary: target/aarch64-unknown-linux-musl/release/$(BINARY)"
	@ls -lh target/aarch64-unknown-linux-musl/release/$(BINARY)

# Docker
build-docker:
	docker build -t brickos/sovereign-link:$(VERSION) -t brickos/sovereign-link:latest .

# Package release artifacts
release: build-musl build-docker
	mkdir -p $(RELEASE_DIR)
	cp target/x86_64-unknown-linux-musl/release/$(BINARY) $(RELEASE_DIR)/$(BINARY)-$(VERSION)-linux-amd64
	cp config.example.toml $(RELEASE_DIR)/
	cp -r startos/ $(RELEASE_DIR)/startos/
	@echo ""
	@echo "Release artifacts in $(RELEASE_DIR)/:"
	@ls -lh $(RELEASE_DIR)/

# Dockerfile for musl build (alternative to local musl-tools)
build-musl-docker:
	docker run --rm -v "$(shell pwd)/../../../:/workspace" -w /workspace \
		rust:1.86-alpine \
		sh -c "apk add musl-dev && cargo build -p sovereign-link --features standalone --release --target x86_64-unknown-linux-musl"

clean:
	cargo clean
	rm -rf $(RELEASE_DIR)

test:
	cargo test --features standalone
