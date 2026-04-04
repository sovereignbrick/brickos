# Issue #301: Health profile page -- input fields too close together on mobile

**Type:** bug
**Priority:** medium
**Component:** frontend / health profile
**Found during:** manual mobile testing (2026-04-02)

## Description

On the health profile page, the input fields for age, weight, and other personal metrics are spaced too closely together on mobile browsers. This makes it difficult to tap the correct field and triggers accidental input on adjacent fields.

## Steps to Reproduce

1. Open the app on a mobile browser (or use responsive mode ≤ 430 px)
2. Navigate to the health profile page
3. Try to edit the age or weight fields

## Expected Behavior

Input fields should have sufficient vertical spacing and touch target size (minimum 44 px per WCAG) on mobile viewports so users can comfortably select and edit each field.

## Current Behavior

Fields are cramped, making accurate tapping difficult. Editing the profile on mobile is effectively broken.

## Location

- Frontend: `apps/health/sovereign-health/frontend/src/app/profile/` (health profile form)
