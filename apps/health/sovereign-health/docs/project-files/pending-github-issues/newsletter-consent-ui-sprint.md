---
title: "feat: Newsletter consent toggle in Settings (Sprint 007 candidate)"
milestone: "UI: Privacy & Security Features"
milestone_number: 13
status: pending
issue_number: null
---

## Context

The newsletter consent toggle is missing from the Settings UI. Backend endpoints exist (`GET/PUT /settings/consent` supporting newsletter + partner_offers), but no frontend toggle is rendered. Currently the only way to manage newsletter consent is during signup.

Related: Issue #177 (consent management UI), Design-018 (settings tab restructure).

## Requirements

- Add newsletter consent toggle to Settings (Data & Privacy tab, or restructured Privacy tab per design-018)
- Wire to existing `PUT /settings/consent` endpoint
- Show current state via `GET /settings/consent`
- i18n for EN + DE

## Sprint 007 Candidate

This is a small, self-contained task (~3 pts) that unblocks GDPR compliance testing.
