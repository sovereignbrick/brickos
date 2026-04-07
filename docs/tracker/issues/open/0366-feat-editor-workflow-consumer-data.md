---
github_number: 366
title: "feat: editor workflow for consumer data access with consent"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Editors (practitioners, assistants) can view and import consumer health data within the app, governed by the `data_shares` consent table.

## Requirements

### Consumer Grants Access

- In-app: consumer selects editor from org member list, chooses scope
- Scopes: all, measurements, measurements_readonly, trends, summary, doctor_chat
- Revocable at any time by consumer

### Editor View (in SHI app)

- "My Consumers" list showing shared consumers + status
- Click consumer to view their dashboard/history/trends (scoped by granted permissions)
- Import lab results on behalf of consumer
- Add measurements on behalf
- Use Dr. Alex for consumer data analysis
- Generate PDF report for consumer
- Cannot edit consumer settings or delete data

## Testing

- Consent grant/revoke flow tests
- Scope enforcement tests (editor with trends scope cannot access measurements)
- Audit log: every editor data access logged

## Blocked By

- #0351 (org roles -- editor role definition)
