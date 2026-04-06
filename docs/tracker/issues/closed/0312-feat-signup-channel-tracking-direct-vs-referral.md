# Issue #312: Clarify signup channel tracking -- "Direct" label and referral attribution

**Type:** improvement
**Priority:** low
**Component:** backend / user signup + notifications
**Found during:** ntfy notification review (2026-04-02)

## Description

When a new user signs up, the ntfy notification shows the signup channel. "Direct" means the user signed up without a referral code (organic / direct visit). If a referral code was used, it shows `(referred by: <code>)`.

## Current Behavior

- Works correctly: "Direct" = no referral, "(referred by: X)" = referral used
- No issue with the logic itself

## Improvement Ideas

- Add more granularity to signup source: direct, referral, social link, QR code, campaign UTM
- Show signup source in admin panel user list
- Track UTM parameters from landing page → signup for marketing attribution
- Consider adding the signup source to the admin user detail view

## Priority

Low — this is an enhancement, not a bug. Current referral tracking works as designed.
