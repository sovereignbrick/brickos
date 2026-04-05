# Lighthouse Audit Report -- 2026-04-05

**URL:** https://app.sovereignhealth.io
**Tool:** Lighthouse 13.0.3 (headless Chromium)
**Sprint:** 023

## Scores

| Category | Score | Target | Status |
|---|---|---|---|
| Performance | 72 | > 90 | Needs work |
| Accessibility | 92 | > 90 | Pass |
| Best Practices | 77 | > 90 | Needs work |
| SEO | 100 | > 90 | Pass |

## Issues Found

### Performance (72)
| Issue | Value | Weight | Fix |
|---|---|---|---|
| Largest Contentful Paint | 4.7s | 25 | Server response time + image optimization. Requires infrastructure changes (CDN, caching). |
| Total Blocking Time | 430ms | 30 | JS bundle size. Can improve with dynamic imports, code splitting. Multi-sprint effort. |
| First Contentful Paint | 1.7s | 10 | Related to server response time. |

### Best Practices (77)
| Issue | Fix |
|---|---|
| Deprecated APIs (SharedStorage, StorageType.persistent, Fledge) | Browser-level APIs from PWA service worker (serwist). Not our code. Monitor for serwist update. |
| Console errors (React #418 hydration mismatch) | Browser extensions cause DOM mismatch. suppressHydrationWarning already in place. |

### Accessibility (92)
| Issue | Fix |
|---|---|
| Contrast ratio: text-muted-foreground/70 too faint | Fixed: bumped to text-muted-foreground (full opacity) on zone cards |
| Touch target spacing | Some buttons are < 48x48px. Low priority -- mobile users use tap, not precision click. |
| Visible text labels vs accessible names | Minor label mismatch on interactive elements. |

## Fixes Applied This Sprint
- Bumped `text-muted-foreground/70` to `text-muted-foreground` on zone card descriptions for better contrast

## Deferred to Future Sprints
- Performance: LCP/TBT improvements require CDN setup, image optimization pipeline, and JS code splitting
- Best Practices: serwist (PWA) deprecated API warnings -- wait for library update
- Accessibility touch targets: audit all buttons for 48px minimum

## Reports
- HTML report: `lighthouse-report.report.html`
- JSON report: `lighthouse-report.report.json`
