---
github_number: 390
title: "fix: sidebar collapsed state - add expand chevron + replace squares with cube icons + tooltips"
milestone: platform-admin-gui
labels: [fix, P2]
---

## Problems

1. Clicking cube to expand is not obvious - need visible expand chevron
2. Square icons (◻) look strange without text in collapsed state
3. No tooltip showing item name when collapsed

## Fix

- Add expand chevron (>>) button visible when collapsed
- Replace all ◻ icons with small BrickOS cube or meaningful icons per section
- Add tooltip (title attribute) with item label when collapsed - already exists but icon needs to be more recognizable
