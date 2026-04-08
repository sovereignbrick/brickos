# v0.41.0 RC Test Checklist -- Sprint 033 Data Scoping

**Date:** 2026-04-08
**Environment:** staging (demo.brickos.io / demo.sovereignhealth.io)
**Tester:** manual + E2E automated

---

## Layer 0: Pre-flight

- [ ] Backend starts cleanly, migrations 20260408000004 + 20260408000005 applied
- [ ] Frontend loads at demo.brickos.io and demo.sovereignhealth.io
- [ ] Login works with admin credentials
- [ ] Platform page loads at /platform
- [ ] API /health returns 200 with correct version

---

## Layer 1: Filter Dropdowns (Phase 1)

- [ ] App filter dropdown visible in platform header (desktop)
- [ ] Org filter dropdown visible in platform header (desktop)
- [ ] App filter has options: All Apps, Sovereign Health, Sovereign Link, Sovereign Voice
- [ ] Org filter shows organizations loaded from API (non-personal orgs)
- [ ] Changing app filter does not cause page crash
- [ ] Changing org filter does not cause page crash
- [ ] Filters persist while navigating between platform pages
- [ ] Filters hidden on mobile (< 640px) to save space

---

## Layer 2: Links Page Scoping

- [ ] Navigate to /platform/links
- [ ] Page shows all links when filters are "All"
- [ ] Change App filter to "Sovereign Health" -- links filtered by app_key=shi
- [ ] Change App filter to "Sovereign Link" -- links filtered by app_key=sovereign-link
- [ ] Change App filter back to "All" -- all links shown again
- [ ] Select a specific org -- links filtered by org_id
- [ ] Combine app + org filters -- both applied simultaneously
- [ ] Summary section updates with filtered data
- [ ] Creating a new campaign link still works with filters active

---

## Layer 3: Audit Logs Scoping

- [ ] Navigate to /platform/audit
- [ ] Access logs tab shows all entries with "All" filters
- [ ] Change App filter -- access logs filtered (or empty if no matching app_key)
- [ ] Events tab shows all events with "All" filters
- [ ] Change App filter -- events filtered
- [ ] Change Org filter -- events filtered by org_id
- [ ] Pagination still works with filters active
- [ ] Search still works in combination with filters
- [ ] Date range filter works alongside app/org filters

---

## Layer 4: AI Usage Scoping

- [ ] Navigate to /platform/ai/usage
- [ ] AI usage shows totals for all apps when filter is "All"
- [ ] Change App filter to "Sovereign Health" -- costs/calls filtered
- [ ] By-user breakdown updates with filter
- [ ] By-model breakdown updates with filter
- [ ] By-type breakdown updates with filter
- [ ] Period navigation (day/week/month/year) still works with filter
- [ ] Date navigation arrows still work

---

## Layer 5: Newsletter Scoping

- [ ] Navigate to /platform/newsletter
- [ ] Newsletter shows all subscribers with "All" filter
- [ ] Change App filter -- subscribers filtered by source
- [ ] Meta counts (total, subscribed, unsubscribed, pending) update with filter
- [ ] Pagination works with filter active
- [ ] Sync to Mailgun still works (not scoped, platform-wide)
- [ ] Export CSV still works

---

## Layer 6: Users Page Scoping

- [ ] Navigate to /platform/users
- [ ] Users shows all platform users with "All" org filter
- [ ] Select a specific org -- users filtered to org members only
- [ ] User count updates in header
- [ ] Search still works alongside org filter
- [ ] Pagination works with org filter
- [ ] User actions (tier override, refund) still work with filter active

---

## Layer 7: Analytics Page Scoping

- [ ] Navigate to /platform/analytics
- [ ] Analytics shows all links from admin endpoint (not user links)
- [ ] Summary cards show aggregate stats
- [ ] Change App filter -- only links with matching app_key shown
- [ ] Link selector updates with filtered list
- [ ] Click chart loads for selected link
- [ ] Top links and top referrers update

---

## Layer 8: Members Page

- [ ] Navigate to /platform/members
- [ ] Org selector auto-picks org from platform filter context (if set)
- [ ] Changing org filter in header updates selected org on members page
- [ ] Adding a member works
- [ ] Changing member role works
- [ ] Removing a member works
- [ ] Members visible for platform admin (not just org admin)

---

## Layer 9: Branding Page

- [ ] Navigate to /platform/branding
- [ ] Shows guidance text when no org selected
- [ ] Select an org via header filter -- shows org name in guidance
- [ ] Theme presets selectable
- [ ] Color overrides work
- [ ] Preview updates with color changes
- [ ] Branding visible for platform admin

---

## Layer 10: Org Admin Auto-Scoping (Phase 4)

NOTE: Requires org admin account (non-platform admin with org membership).
If no org admin exists yet, skip these tests.

- [ ] Log in as org admin
- [ ] Org filter shows static label (not a dropdown)
- [ ] Org filter locked to user's organization
- [ ] App filter still functional (can switch apps)
- [ ] All pages show data scoped to user's org automatically
- [ ] Cannot see other organizations' data
- [ ] Members page locked to own org

---

## Layer 11: Regression

- [ ] Login/logout works normally
- [ ] Dashboard loads without errors
- [ ] Measurements page works
- [ ] Dr. Alex chat works
- [ ] Settings page accessible
- [ ] Language switching (EN/DE) works
- [ ] Dark theme applied everywhere
- [ ] No console errors on platform pages
- [ ] API endpoints without filters still return all data (backward compatible)

---

## Layer 12: Database Migrations

- [ ] Migration 20260408000004: audit_log has app_key + org_id columns
- [ ] Migration 20260408000004: data_access_log has app_key + org_id columns
- [ ] Migration 20260408000005: ai_usage_log has app_key column
- [ ] Indexes created on new columns
- [ ] Existing data not corrupted by migrations
- [ ] New audit entries written with default app_key='shi'

---

## Layer 13: E2E Automated (Suite 14)

- [ ] 14.1 Admin links with app_key filter -- PASS
- [ ] 14.1b Admin links with org_id filter -- PASS
- [ ] 14.2 Audit access logs with app_key filter -- PASS
- [ ] 14.2b Audit events with app_key filter -- PASS
- [ ] 14.3 AI usage with app_key filter -- PASS
- [ ] 14.3b AI usage unfiltered >= filtered -- PASS
- [ ] 14.4 Newsletter subscribers with app_key filter -- PASS
- [ ] 14.5 Users list with org_id filter -- PASS
- [ ] 14.6 Organizations list and members (regression) -- PASS
- [ ] 14.7 Invalid filter params do not crash -- PASS
- [ ] 14.8 Platform UI loads with filter dropdowns -- PASS
- [ ] 14.9 Combined app_key + org_id filter on links -- PASS

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
