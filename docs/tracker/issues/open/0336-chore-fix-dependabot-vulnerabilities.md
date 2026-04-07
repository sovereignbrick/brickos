---
github_number: 336
title: "chore: resolve 6 Dependabot security vulnerabilities"
milestone: infrastructure
labels: [chore, security, P2]
---

## Problem

GitHub reports 6 vulnerabilities on the default branch (4 high, 2 moderate):

```
GitHub found 6 vulnerabilities on sovereignbrick/brickos's default branch
(4 high, 2 moderate)
```

Visible on every `git push`.

## Action

1. Review alerts at https://github.com/sovereignbrick/brickos/security/dependabot
2. Check for orphan lockfiles (package-lock.json, yarn.lock) inflating alerts
3. Update affected dependencies in Cargo.lock and pnpm-lock.yaml
4. Run `cargo audit` and `pnpm audit` locally
5. Verify no breaking changes after updates
