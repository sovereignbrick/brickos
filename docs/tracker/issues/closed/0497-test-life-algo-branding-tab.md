---
number: 497
title: "test: [manual] Life Algorithm -- Branding tab: logo, colors, role labels"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-c, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: C
estimate: 0.25d
blocked_by: [496]
---

Configure the Life Algorithm brand via the admin GUI Branding tab.

## Prerequisites

- Life Algorithm org exists (#496)
- User has a logo ready (PNG or SVG, <= 200 KB)

## Steps

1. Navigate to `/platform/orgs/{life-algorithm-id}`
2. Click the **Branding** tab
3. Upload logo:
   - Click the file input
   - Select the Life Algorithm logo file (<= 200 KB)
   - Verify the preview renders in the white box
4. Set **Primary color** to `#10b981` (emerald) -- use either the color picker or paste the hex
5. Set **Accent color** to `#6366f1` (indigo) -- same
6. Optionally set **Footer text** to `Life Algorithm -- powered by Sovereign Health`
7. In the **Role labels** card:
   - **Owner label:** leave blank (falls back to canonical `org_owner`)
   - **Practitioner label:** `Coach`
   - **Member label:** `Client`
8. Click **Save changes**
9. Verify the success toast
10. Reload the page and verify all fields persisted

## Expected result

- Logo preview renders on both the Branding tab and the sample preview pane
- Preview pane shows `Welcome to Life Algorithm` in the primary color
- Primary/accent buttons in the preview pane use the two colors
- Save succeeds; reload shows the saved values
- Switching to the **Members** tab: the role filter dropdown shows "Coach" and "Client" instead of "practitioner" / "member"
- Switching to the **Overview** tab: the seat bars are labeled "Coach" and "Client"

## Who

User (manual).

## Verification

Report green/bug. Any bug -> new P0/P1 issue.
