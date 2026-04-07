---
github_number: 343
title: "feat: Start9 .s9pk end-to-end build verification"
milestone: infrastructure
labels: [feat, P3]
---

## Problem

The Start9 build script and Dockerfile exist but haven't been tested end-to-end with the actual start9-sdk tooling. Need to verify the .s9pk package builds correctly and installs on a Start9 server.

## Requirements

1. Install start9-sdk locally
2. Run `start9-sdk build` against the Sovereign Link standalone package
3. Verify the .s9pk installs on a test Start9 instance
4. Verify Tor auto-discovery works (finds sibling .onion services)
5. Document the build + publish process

## Blocked By

None
