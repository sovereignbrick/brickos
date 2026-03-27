---
number: 265
title: "fix: consent toggles on settings/privacy page cannot be selected"
labels: [fix, frontend, gdpr, priority-high]
milestone: privacy-and-security
---

## Description

On the Settings > Data & Privacy tab, the consent toggles (Newsletter, Partner Offers) cannot be interacted with. Clicking them does nothing. Error toast: "At least one consent field required".

URL: https://demo.sovereignhealth.io/settings?tab=privacy

## Expected Behavior

User should be able to toggle individual consent preferences on/off.

## Likely Cause

The form validation requires at least one consent to be enabled, but the toggle handler may be trying to submit the form on each toggle change, failing validation before the state updates.
