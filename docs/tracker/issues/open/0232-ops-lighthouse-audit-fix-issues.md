---
number: 232
title: "ops: run Lighthouse audit on production + fix issues"
labels: [testing, performance, pwa, accessibility]
milestone: release-workflow
---

## Description

Run Google Lighthouse audit against production (app.sovereignhealth.io) and fix all issues to achieve:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: Pass (installable, offline-capable)

## Steps

1. Install Lighthouse CLI: `npm install -g lighthouse`
2. Run audit: `lighthouse https://app.sovereignhealth.io --output html --output-path ./lighthouse-report.html`
3. Review report — categorize issues by severity
4. Fix all critical/serious issues
5. Re-run to verify scores
6. Add Lighthouse CI to GitHub Actions (fail on score regression)

## Common Issues to Expect

- Missing alt text on images
- Color contrast ratios (dark theme)
- Render-blocking resources
- Image optimization (favicon.ico is 278KB — oversized)
- Missing meta description on sub-pages
- CLS (cumulative layout shift) from loading states

## Deliverables

- [ ] Lighthouse report saved to `docs/project-files/releases/v0.27.0/`
- [ ] All critical issues fixed
- [ ] All scores > 90
- [ ] Lighthouse CI added to GitHub Actions (optional)
