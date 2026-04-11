---
number: 521
title: "chore: [automated] triage 6 Dependabot high-severity vulnerabilities"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [chore, sprint-041, phase-h, automated, security]
created: 2026-04-11
priority: P1
sprint: 041
phase: H
estimate: 0.5d
---

GitHub flagged 6 high-severity Dependabot vulnerabilities on `origin/main` when Sprint 040 close-out was pushed. Triage and resolve.

## Scope

- [ ] `gh api repos/sovereignbrick/brickos/dependabot/alerts --jq '.[] | select(.state=="open") | {number, advisory: .security_advisory.summary, severity: .security_advisory.severity, pkg: .dependency.package.name}'`
- [ ] For each alert:
  - Check if a Dependabot PR was auto-opened (`git branch -a | grep dependabot`)
  - If yes: review the diff, ensure the upgrade doesn't break the build, merge via PR (ADR-048 flow)
  - If no: manually bump the version in Cargo.toml / package.json
- [ ] After each fix: `cargo build && cargo test --lib` or `pnpm build`
- [ ] Document which vulns were in which packages (SHI direct deps vs transitive) in lessons doc
- [ ] Run `cargo audit` as a final gate
- [ ] Zero open high-severity advisories at end

## Known Dependabot branches (from post-push output)

- `dependabot/cargo/actix-governor-0.10.0`
- `dependabot/cargo/criterion-0.8.2`
- `dependabot/cargo/rand-0.9.2`
- `dependabot/cargo/thiserror-2` (forced update)
- `dependabot/npm_and_yarn/.../base-ui/react-1.3.0`
- `dependabot/npm_and_yarn/.../npm-minor-patch-...`
- `dependabot/npm_and_yarn/.../types/node-25.5.0`

(Not all 7 may be high-severity -- some may be regular updates.)

## Who

Claude (automated for research + mechanical upgrades). User approves merges.

## Verification

- GitHub shows zero open high-severity Dependabot alerts
- CI still green after all upgrades (`cargo test --lib`, `pnpm build`)

Memory relevant: `feedback_dep_upgrade_runtime_test.md` -- dep upgrades can compile but panic at runtime, always test login + measurement add after auth/crypto changes.
