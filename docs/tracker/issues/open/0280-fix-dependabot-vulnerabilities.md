---
number: 280
title: "fix: address 38 Dependabot vulnerabilities (5 high, 28 moderate, 5 low)"
labels: [fix, security, dependencies, priority-high]
milestone: privacy-and-security
---

## Description

GitHub Dependabot (enabled in Sprint 015) detected 38 vulnerabilities on the default branch:
- 5 high severity
- 28 moderate severity
- 5 low severity

Dashboard: https://github.com/sovereignbrick/brickos/security/dependabot

## Requirements

- [ ] Review all 38 findings on GitHub Dependabot dashboard
- [ ] Triage: which are actionable vs false positives?
- [ ] Fix high severity first (5 items)
- [ ] Fix moderate severity (28 items) -- batch where possible
- [ ] Assess low severity (5 items) -- fix or accept risk
- [ ] Run full test suite after each batch of updates
- [ ] Document any accepted risks with reasoning

## Notes

- Some may be transitive dependencies (not directly upgradeable)
- Rust: use `cargo audit` + `cargo deny` for detailed advisory info
- npm: use `pnpm audit --fix` for auto-fixable issues
- GitHub Actions: check for action version bumps
