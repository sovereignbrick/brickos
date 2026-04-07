---
github_number: 356
title: "feat: elevate newsletter to platform with app interest tracking"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Move newsletter management to platform level with org scoping and auto-detected app interests.

## Requirements

- Org filter: BrickOS admin sees all subscribers, org admin sees own org
- App interest: auto-detect from usage (has SHI measurements -> SHI interest, has short links -> Link interest)
- Filter campaigns by interest to avoid irrelevant emails
- Export with interest column
- Mailgun sync per org (or platform-wide)

## Blocked By

- #0346 (admin layout)
