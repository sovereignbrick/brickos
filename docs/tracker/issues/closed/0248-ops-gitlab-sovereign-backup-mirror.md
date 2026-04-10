---
number: 248
github_number: 472
title: "ops: GitLab sovereign backup mirror — manual push on critical releases"
labels: [ops, infrastructure, data-sovereignty]
milestone: infrastructure
---

## Description

Set up GitLab as a sovereign backup mirror on a separate vendor platform. Push manually only for critical releases, not every commit — GitLab compute time is expensive.

## Setup

1. GitLab account: `gitlab.com/sovereignbrick/brickos` (same naming as GitHub)
2. Add GitLab as a separate remote:
   ```bash
   git remote add gitlab git@gitlab.com:sovereignbrick/brickos.git
   ```
3. Integrate into deploy.sh as an optional step:
   - After production deploy, prompt: "Push to GitLab backup? (y/N)"
   - On confirm: `git push gitlab --all && git push gitlab --tags`

## Requirements

- [ ] GitLab account created (sovereignbrick org)
- [ ] SSH key or deploy token configured
- [ ] `git remote add gitlab` in local setup docs
- [ ] deploy.sh: add optional GitLab push prompt after production deploy
- [ ] Document in deployment README which releases warrant a GitLab push

## Notes

- GitLab is a backup, not a primary — no CI/CD, no issues, no PRs
- Push decision is per-release, not automatic
- Critical releases = major versions, security patches, compliance milestones
