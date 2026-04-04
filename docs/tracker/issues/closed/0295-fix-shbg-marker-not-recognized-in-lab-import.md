# Issue #295: Lab import does not recognize "Sex Hormone Binding Globulin" marker

**Type:** bug
**Priority:** medium
**Component:** backend / import / marker-matcher
**Found during:** v0.30.0-rc1 manual testing (2026-03-28)

## Description

When importing a lab PDF, the marker "Sex Hormone Binding Globulin" (SHBG) is listed under "Unmatched (2) - these markers could not be mapped" with value 84.1 nmol/l.

The marker matcher does not recognize "Sex Hormone Binding Globulin" as a known marker. This needs an alias added to the marker matcher or the markers seed data.

## Expected Behavior

SHBG should be recognized and mapped to the correct marker during lab PDF import.

## Steps to Reproduce

1. Upload a lab PDF containing "Sex Hormone Binding Globulin" result
2. Observe it appears in the "Unmatched" section

## Fix

Add "Sex Hormone Binding Globulin" and common aliases (SHBG) to the marker aliases table / matcher configuration.
