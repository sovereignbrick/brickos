---
number: 283
github_number: 437
github: 265
title: "ops: build provenance attestation with GitHub Actions"
labels: [ops, security, infrastructure]
milestone: privacy-and-security
---

## Description

Investigate and implement build provenance attestation using GitHub's `actions/attest-build-provenance` action. This generates signed SLSA provenance statements for build artifacts, proving they were built in a specific GitHub Actions workflow from a specific commit.

## Why

- Supply chain security: proves Docker images and artifacts were built from verified source code
- SLSA (Supply chain Levels for Software Artifacts) compliance
- EU Cyber Resilience Act may require software bill of materials and provenance
- Builds trust with users that binaries match the published source code

## What It Does

- Generates a signed attestation (SLSA provenance) for build artifacts
- Links artifacts to the exact Git commit, workflow, and runner that produced them
- Attestations are stored in GitHub's attestation store and can be verified with `gh attestation verify`
- Works with Docker images, binaries, and other build outputs

## Implementation Steps

- [ ] Research `actions/attest-build-provenance` requirements and limitations
- [ ] Add attestation step to `ci-health.yml` for backend Docker image
- [ ] Add attestation step to `deploy-staging.yml` for staging images
- [ ] Test verification with `gh attestation verify`
- [ ] Document attestation workflow in deployment docs
- [ ] Consider attestation for frontend Docker images

## References

- https://github.com/actions/attest-build-provenance
- https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations
- SLSA framework: https://slsa.dev/
