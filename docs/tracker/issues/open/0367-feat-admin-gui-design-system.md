---
github_number: 367
title: "feat: admin GUI design system (website baseline + SHI accent colors)"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Establish the visual design system for the BrickOS Platform admin GUI, using the marketing website as the baseline aesthetic with SHI dashboard accent colors for data visualization.

## Design Tokens

```
Background:     #09090b (zinc-950)
Surface:        #18181b (zinc-900)
Surface hover:  #27272a (zinc-800)
Border:         #27272a (zinc-800)
Text primary:   #fafafa (zinc-50)
Text secondary: #a1a1aa (zinc-400)

Brand:          #f97316 (orange-500) -- BrickOS cube, primary actions
Success:        #4ade80 (green-400) -- healthy, compliant, active
Warning:        #fbbf24 (amber-400) -- degraded, partial, attention
Error:          #ef4444 (red-400) -- down, failed, critical
Info:           #60a5fa (blue-400) -- links, info, neutral actions

Font heading:   Geist
Font body:      Geist
Font mono:      Geist Mono
Border radius:  0.75rem (rounded-xl)
Card:           rounded-2xl border border-zinc-800 p-5
Sidebar:        240px (expanded) / 64px (collapsed)
```

## Components

- Stat card (number + label + trend indicator)
- Status badge (green/yellow/red circle + label)
- Uptime bar (colored segments over time)
- Data table with sort/filter/pagination
- Sidebar nav with sections + icons + collapse
- Breadcrumb trail
- Alert rule card (condition + channel + toggle)

## Requirements

- Dark theme only (enforced, no light mode)
- BrickOS cube logo in sidebar header
- Consistent with SHI dashboard patterns (same component library: shadcn/ui)
- All charts: Recharts with dark theme colors
- Responsive: sidebar collapses to icons on < 1024px

## Blocked By

None (design foundation)
