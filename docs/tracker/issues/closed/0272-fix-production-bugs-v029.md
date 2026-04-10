---
number: 272
github_number: 486
title: "fix: production bug hunt and fixes for v0.29.x"
labels: [fix, priority-high, production]
milestone: release-workflow
---

## Description

Dedicated production testing session for v0.29.1. Login to production (app.sovereignhealth.io), walk through all user flows, identify and fix any bugs.

## Test Checklist

### Auth
- [ ] Register new user
- [ ] Login / logout
- [ ] Password reset flow
- [ ] MFA setup and login

### Dashboard
- [ ] Zone cards load with correct status colors
- [ ] Demo mode: 3 profiles switch correctly with colored subtitle
- [ ] Calculated markers display values

### Measurements
- [ ] Add new measurement (all fields)
- [ ] Measurement templates work
- [ ] History page loads, filters work
- [ ] Trend charts render

### Dr. Alex
- [ ] Chat loads, quota displays correctly
- [ ] Send a message, receive response
- [ ] Quota decrements
- [ ] Chat scroll works (long responses)
- [ ] Sidebar aligned with navbar

### Import
- [ ] Lab PDF import
- [ ] Medication import
- [ ] Measurement table import

### Settings
- [ ] Health Profile tab: gender, body measurements, lifestyle defaults
- [ ] Account tab: email, name, language, date/time format
- [ ] License tab: current plan, billing
- [ ] Security tab: password change, MFA
- [ ] Privacy tab: consent toggles, data export, account deletion

### Admin
- [ ] Data access log shows entries
- [ ] User list shows correct tier and payment labels
- [ ] Mobile menu toggle works

### Website
- [ ] Pricing page shows correct AI credits (5/15/50/unlimited)
- [ ] Feature comparison table loads from API
- [ ] EN + DE language switch

### PWA
- [ ] Install PWA on desktop
- [ ] Splash screen shows logo
- [ ] Offline banner appears when disconnected

## Found Bugs

(Document bugs here during testing, then fix)
