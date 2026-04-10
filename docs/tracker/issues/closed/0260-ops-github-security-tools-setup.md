---
number: 260
github_number: 479
title: "ops: set up GitHub security tools — Advanced Security, GitGuardian, Semgrep, Snyk, Trivy"
labels: [ops, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

Enable and configure security scanning tools across the BrickOS repository for continuous vulnerability detection.

## Tools to Evaluate and Set Up

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub Advanced Security** | Code scanning, secret scanning, Dependabot | Free for public repos |
| **GitGuardian** | Secret detection in commits | Free tier available |
| **Semgrep** | SAST — static analysis for Rust, TS, OWASP | Free (OSS) |
| **Snyk** | Dependency vulnerability scanning | Free tier |
| **Trivy** | Container image CVE scanning | Free (OSS) |

## Requirements

- [ ] Enable GitHub Dependabot alerts + security updates
- [ ] Enable GitHub secret scanning
- [ ] Set up Semgrep in GitHub Actions (Rust + TypeScript rules + OWASP)
- [ ] Set up GitGuardian pre-commit hook or GitHub integration
- [ ] Set up Snyk for `Cargo.toml` + `package.json` dependency scanning
- [ ] Set up Trivy for Docker image scanning in CI
- [ ] Configure alert routing (GitHub → ntfy or email)
- [ ] Document which tools cover which attack surface

## Notes

- Cross-reference with #245 (security hardening framework)
- Cross-reference with #252 (EU regulatory compliance)
- Prefer free/OSS tools aligned with sovereign philosophy
