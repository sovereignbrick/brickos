---
number: 469
github_number: 410
title: "feat: seat enforcement on org members + admin override enforced + audit log writes"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 0.75d
blocked_by: [466, 465]
---

Three small but critical wire-up tasks that close the gap between "license generated" and "license enforced."

## Scope -- seat enforcement

- [ ] `add_org_member` (in `handlers/admin_orgs.rs`): load active org_license, validate JWT, count current members of the requested role, reject with `SeatLimitExceeded` if cap reached
- [ ] `update_member_role`: same check (changing a `member` to `practitioner` needs to fit the practitioner cap)
- [ ] Error response: structured JSON `{ error: "seat_limit_exceeded", role, current, max }`
- [ ] Tests: 11th admin/practitioner/member rejected; 10th allowed

## Scope -- admin override

- [ ] `effective_tier_resolver` honors `admin_override = true` AND `admin_override_tier_slug IS NOT NULL` AND (`admin_override_expires_at IS NULL` OR `admin_override_expires_at > NOW()`)
- [ ] Returns the override tier instead of the Stripe-driven tier
- [ ] Tests: override active, override expired, override null

## Scope -- audit log

- [ ] Write to `admin_audit_log` on every admin tier mutation (admin override set/cleared, license issued, license revoked, role changed)
- [ ] Action types: `tier.admin_override.set`, `tier.admin_override.clear`, `org.license.issue`, `org.license.revoke`, `org.member.add`, `org.member.role_change`, `org.member.remove`
- [ ] Payload includes actor, target, before/after state

## Verification

- [ ] Test fixture creates org with `max_practitioners=2`, adds 3 -> third rejected
- [ ] Admin override expired -> resolver returns Stripe tier
- [ ] Audit log row created on every admin mutation

## References

- design 022 §3.6, §2.6
