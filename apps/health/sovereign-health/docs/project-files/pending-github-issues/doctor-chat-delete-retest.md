---
title: "fix: Doctor chat delete — soft-delete filter missing on list/fetch queries"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

Deleting Doctor Chat conversations failed because:
1. `doctor_chat_conversations` was missing `is_deleted` and `deleted_at` columns (migration added: `20260322000002`)
2. The list query (`GET /doctor-chat/conversations`) didn't filter `is_deleted = false` — deleted chats still showed in sidebar
3. Individual fetch queries also didn't exclude deleted conversations
4. Delete handler didn't set `deleted_at`

## Fix Applied (in code, needs staging deploy)

- Migration: `20260322000002_doctor_chat_soft_delete.sql`
- `handlers/doctor_chat.rs`: All 4 SELECT queries now filter `is_deleted = false`
- Delete handler now sets `deleted_at = now()`

## Retest After Deploy

- [ ] Delete a conversation -> removed from sidebar immediately
- [ ] Deleted conversation not accessible via direct URL
- [ ] Deleting already-deleted conversation returns proper error (not 500)
- [ ] New conversations still work normally after delete
