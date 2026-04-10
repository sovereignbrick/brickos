---
number: 258
github_number: 478
title: "fix: admin panel — data access log empty, mobile menu missing, user card default, pgAudit"
labels: [fix, frontend, backend, admin, priority-high]
milestone: health-intelligence
---

## Description

Multiple issues with the admin panel that need to be addressed:

### 1. Data Access Log shows no data
- The admin settings data access log page is empty
- Verify the `access_log` table is being populated
- Check if the API endpoint returns data
- Confirm RLS policies allow admin to read access logs

### 2. Admin menu not visible on mobile
- The admin navigation menu does not render in mobile browser
- Likely a responsive design issue — menu may be hidden or off-screen
- Ensure admin nav is accessible on all viewports

### 3. User list shows "card" for registration-only users
- Users who only registered (no purchase) display as "card" in the user list
- Should show appropriate status (e.g., "registered", "free", "no subscription")
- The label should reflect the actual user state

### 4. Enable pgAudit
- pgAudit needs to be properly enabled and configured
- Ensure it logs DDL + DML on sensitive tables
- Verify logs are accessible for audit review

## Requirements

- [ ] Debug data access log — API → DB → frontend pipeline
- [ ] Fix mobile responsive layout for admin menu
- [ ] Fix user list status label logic for non-paying users
- [ ] Enable and configure pgAudit in Docker PostgreSQL
- [ ] Verify pgAudit logs appear in container logs
- [ ] Test all fixes on staging
