---
github_number: 344
title: "chore: Docker Hub CI automation for Sovereign Link"
milestone: release-workflow
labels: [chore, P3]
---

## Problem

Sovereign Link Docker image builds locally but there's no automated push to Docker Hub. Currently requires manual `docker push`.

## Requirements

1. Set up Docker Hub PAT credentials in CI (or deploy script)
2. Auto-push `brickos/sovereign-link:latest` and `brickos/sovereign-link:{version}` on release
3. Multi-arch build (amd64 + arm64) for Raspberry Pi / Start9 compatibility
4. Image size optimization (current: 164MB)

## Blocked By

None
