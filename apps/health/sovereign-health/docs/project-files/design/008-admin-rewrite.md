# Design: Admin Frontend Rewrite

**Issue:** [#96](https://github.com/sovereignbrick/brickos/issues/96)
**Milestone:** [Infrastructure & Chores](https://github.com/sovereignbrick/brickos/milestone/20)
**Status:** Draft
**Date:** 2026-03-18

## Problem
The admin panel has 12 tabs but gaps remain: no invoice browser, no detailed subscription history per user, no contact form viewer, no mailing list segment editor, no revenue dashboard. Some tables are only accessible via direct DB queries.

## Current Admin State

| Tab | Status | Gaps |
|-----|--------|------|
| Dashboard | Good | Missing: revenue metrics (MRR, churn, ARPU) |
| Users | Partial | Missing: full subscription history, login activity, payment methods |
| Content App | Good | — |
| Content Web | Good | — |
| Content Strings | Good | — |
| Promotions | Good | — |
| Affiliates | Good | — |
| Payments | Good | — |
| Settings | Good | — |
| AI Usage | Good | — |
| Newsletter | Partial | Missing: segment editor, delivery stats, campaign analytics |
| Website | Good | — |
| **Invoices** | **Missing** | No invoice browser at all |
| **Contact Forms** | **Missing** | Submissions in DB only (`contact_submissions` table) |
| **Markers** | **Missing** | Add/edit markers requires SQL migrations |
| **Audit Log** | **Missing** | No admin action log viewer |

## Approach

### Phase 1: Fill Gaps (extend current admin)
Priority: add missing views to existing tab structure. No rewrite needed.

1. **Users tab extensions:**
   - Subscription history timeline per user (plan changes, cancellations)
   - Payment methods (cached from Stripe, see [design-002](002-data-sovereignty.md))
   - Login activity log (last_login, login_count)

2. **New tab: Invoices**
   - List all invoices (search by user, date range, status)
   - Invoice detail: line items, amounts, PDF link
   - Depends on data sovereignty work (#92) for local invoice storage

3. **New tab: Contact Forms**
   - List `contact_submissions` with status filter (new/processed)
   - Mark as processed, add notes

4. **Newsletter extensions:**
   - Segment editor (create/edit segments with filter criteria)
   - Campaign analytics (delivery/open/bounce rates per campaign)
   - Depends on Mailgun event ingestion (#92)

### Phase 2: Revenue Dashboard
- MRR calculation (sum of active subscriptions)
- Churn rate (cancellations / active subscribers)
- ARPU (average revenue per user)
- Tier conversion funnel
- Revenue by period chart

### Phase 3: Marker Management UI
- Add new markers without SQL migrations
- Edit reference ranges
- Manage calculated marker formulas
- This is the biggest change — replaces the migration-based workflow

### Phase 4: Reusable Table Component
If the admin grows beyond 15+ tabs, consider:
- Generic data table component (sort, filter, search, paginate, export CSV)
- Role-based tab visibility (super-admin vs support-admin)
- Could evaluate admin frameworks (refine.dev, react-admin) but custom may be simpler given existing code

## API Changes (Admin Endpoints)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/users/:id/subscription-history` | Full subscription timeline |
| GET | `/admin/invoices` | List invoices (paginated, filterable) |
| GET | `/admin/invoices/:id` | Invoice detail with line items |
| GET | `/admin/contact-submissions` | List contact form submissions |
| PATCH | `/admin/contact-submissions/:id` | Update status/notes |
| GET | `/admin/revenue/summary` | MRR, churn, ARPU stats |
| GET | `/admin/revenue/chart?period=month` | Revenue time series |
| POST | `/admin/markers` | Create marker (no migration needed) |
| PATCH | `/admin/markers/:slug` | Edit marker/ranges |

## Open Questions
- [ ] Full rewrite or incremental extension? Current admin works — extend it vs start fresh?
- [ ] Admin framework or custom? refine.dev has nice data grids but adds a dependency.
- [ ] Role-based access: do we need support-admin (limited) vs super-admin (full)?
- [ ] Real-time updates (WebSocket) for revenue dashboard? Or polling is fine?

## References
- Current admin page: `frontend/src/app/admin/page.tsx`
- Admin components: `frontend/src/components/admin/`
- Contact submissions table: `migrations/20260312000054_contact_submissions.sql`
- Revenue data: subscriptions + payment_events tables
