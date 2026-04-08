---
github_number: 345
title: "fix: website animation not working on Brave, Chrome, Firefox"
milestone: ux-and-onboarding
labels: [fix, P2]
---

## Problem

The BrickOS website (sovereignhealth.io / brickos.io) has animations that do not work consistently across browsers: Brave, Chrome, Firefox. Specific animations affected need investigation.

## Investigation

Website uses standard Tailwind animations:
- `transition-colors`, `transition-transform`, `transition-opacity` (hover effects)
- `hover:scale-[1.02]` (card zoom on hover)
- `animate-bounce` (health coach chat typing indicator)
- `group-hover:opacity-80` (screenshot overlay)

No custom `@keyframes`, no framer-motion, no GSAP. All are standard CSS transitions
which should work cross-browser. Need to identify the specific failing animation.

## Requirements

1. Identify which specific animations fail on Brave/Chrome/Firefox
2. Check if Brave shields or content blockers interfere with CSS transitions
3. Test `hover:scale` transform on all browsers (known issue with some GPU acceleration settings)
4. Verify `animate-bounce` timing on Firefox (animation-delay may render differently)
5. Ensure no animation causes layout shift (CLS impact)

## Testing

- Visual test on Brave, Chrome, Firefox
- Record screen of each browser for comparison
- Lighthouse performance check (no CLS regression)

## Blocked By

None -- needs user to identify the specific failing animation
