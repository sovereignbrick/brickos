# Issue #300: Dr. Alex chat mobile -- smart import buttons overflow on small screens

**Type:** bug
**Priority:** medium
**Component:** frontend / Dr. Alex chat
**Found during:** manual mobile testing (2026-04-02)

## Description

When the Dr. Alex chat is opened on a mobile browser, the smart import action buttons (e.g. "Import Lab PDF", "Import CSV") are displayed in a single row and overflow or get cut off on narrow screens. The buttons should wrap to two lines so they remain fully visible and tappable on mobile viewports.

## Steps to Reproduce

1. Open the app on a mobile browser (or use responsive mode ≤ 430 px)
2. Navigate to Dr. Alex chat
3. Observe the smart import action buttons

## Expected Behavior

Smart import buttons should stack into a two-line (or wrapped) layout on mobile so all buttons are fully visible and easy to tap.

## Current Behavior

Buttons render in a single row, causing horizontal overflow or cramped touch targets.

## Location

- Frontend: `apps/health/sovereign-health/frontend/src/app/dr-alex/` (chat component with action buttons)
