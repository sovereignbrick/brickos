# Admin Panel Specification
## Sovereign Health MVP — Content Management & User Administration

---

## Overview

**Admin Panel is a separate Next.js application** (different port/domain) that provides:
1. **User Management** — View users, manage licenses, issue/revoke keys
2. **Content Management** — Edit KB articles, manage food database, update thresholds
3. **Analytics Dashboard** — User growth, revenue, feature usage
4. **Settings & Configuration** — Ampel-Logik thresholds, notification rules, reference ranges
5. **Payment Management** — Stripe subscriptions, refunds, revenue reports

**Access Control:** Admin role required (set in JWT token)

---

## Architecture

### Deployment
```
┌─────────────────────────────────────────┐
│ Admin Panel (Next.js)                   │
├─────────────────────────────────────────┤
│ Deployment: admin.sovereignhealth.io     │
│ Port: 3001 (internal)                   │
│ Auth: Two-factor required (Email + 2FA) │
│ Database: Same PostgreSQL (read/write)   │
│ API: Separate /api/admin/* endpoints    │
└─────────────────────────────────────────┘
```

### Authentication
- Users table: `role` field (`user`, `editor`, `admin`)
- Only users with `role = 'admin'` can access admin panel
- JWT includes role: `{ sub: user_id, role: "admin" }`
- Two-factor authentication required for admin access
- Audit log: Every admin action logged (user, timestamp, action, data changed)

---

## Admin Screens

### 1. Dashboard (Home)

**Purpose:** Quick view of system health + recent activity

**Layout:**
```
┌─────────────────────────────────────────┐
│ Sovereign Health Admin Dashboard          │
├─────────────────────────────────────────┤
│                                         │
│ ╔════════════════════════════════════╗ │
│ ║ Key Metrics                        ║ │
│ ╠════════════════════════════════════╣ │
│ ║ • Active Users: 247                ║ │
│ ║ • Premium Subscribers: 89          ║ │
│ ║ • Monthly Revenue: €441.11         ║ │
│ ║ • Churn Rate: 2.1%                 ║ │
│ ║ • avg. Measurements/User: 42       ║ │
│ ╚════════════════════════════════════╝ │
│                                         │
│ ╔════════════════════════════════════╗ │
│ ║ Recent Signups (last 7 days)       ║ │
│ ╠════════════════════════════════════╣ │
│ ║ • jane@example.com (2 hrs ago)     ║ │
│ ║ • mark@example.com (1 day ago)     ║ │
│ ║ • alex@example.com (3 days ago)    ║ │
│ ╚════════════════════════════════════╝ │
│                                         │
│ ╔════════════════════════════════════╗ │
│ ║ Recent Premium Signups             ║ │
│ ╠════════════════════════════════════╣ │
│ ║ • nina@example.com → Premium       ║ │
│ ║ • tom@example.com → Premium        ║ │
│ ╚════════════════════════════════════╝ │
│                                         │
└─────────────────────────────────────────┘
```

**Data:**
- Total users, active users, premium users, churn rate
- Monthly recurring revenue (MRR)
- Average measurements per user
- Feature usage (OCR uploads, PDF exports, etc.)

**APIs:**
```
GET /api/admin/dashboard
  → { users, premium_users, mrr, churn_rate, feature_usage, recent_signups }
```

---

### 2. Users & Licenses

**Purpose:** Manage user accounts and issue/revoke licenses

**Layout:**
```
┌─────────────────────────────────────────┐
│ Users & Licenses                        │
├─────────────────────────────────────────┤
│ Search: [________________] Filter: [v]  │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Email           Tier    Expires    ║ │
│ ╠═════════════════════════════════════╣ │
│ ║ john@ex.com     Free    -          ║ │
│ ║ jane@ex.com     Premium 2026-12-31 ║ │
│ ║ mark@ex.com     Premium 2026-03-31 ║ │
│ ║ ...                                 ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ [Selected: jane@ex.com]                 │
│ ┌─────────────────────────────────────┐ │
│ │ User Details                        │ │
│ ├─────────────────────────────────────┤ │
│ │ Email: jane@example.com             │ │
│ │ Joined: 2025-06-24                  │ │
│ │ Measurements: 127                   │ │
│ │ License: HTK-U1234-4FA9C-20261231   │ │
│ │ Tier: Premium                       │ │
│ │ Expires: 2026-12-31                 │ │
│ │ Status: Active                      │ │
│ │                                     │ │
│ │ [Copy License] [Revoke] [Resend]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Actions:**
- List all users with pagination/search
- Click user → view detailed info
- Issue new license key (generate + send email)
- Revoke license (immediately disable premium features)
- Resend license email
- Reset password (admin-initiated)
- Export user list (CSV)

**APIs:**
```
GET /api/admin/users?page=1&limit=50&search=jane
  → { users: [...], total, page }

GET /api/admin/users/:user_id
  → { user, license_status, measurements_count, created_at }

POST /api/admin/users/:user_id/license/issue
  → { license_key, expires }

POST /api/admin/users/:user_id/license/revoke
  Params: { reason: "expired" | "fraud" | "manual" }
  → { revoked: true }

POST /api/admin/users/:user_id/license/resend
  → { email_sent: true }
```

---

### 3. Content Management

**Purpose:** Edit Knowledge Base and Food Database without app redeployment

**Sub-screens:**

#### 3a. Knowledge Base Editor

```
┌─────────────────────────────────────────┐
│ Knowledge Base Editor                   │
├─────────────────────────────────────────┤
│ Select Zone: [Energy ▼]                 │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Biomarkers in "Energy"              ║ │
│ ╠═════════════════════════════════════╣ │
│ ║ ✓ Glucose                           ║ │
│ ║ ✓ Insulin                           ║ │
│ ║ ✓ HbA1c                             ║ │
│ ║ ○ TSH                               ║ │
│ ║ ○ fT4                               ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ [Selected: Glucose]                     │
│ ┌─────────────────────────────────────┐ │
│ │ What Is It?                         │ │
│ │ [________________________...]       │ │
│ │ [Rich Text Editor]                  │ │
│ │                                     │ │
│ │ Why It Matters                      │ │
│ │ [________________________...]       │ │
│ │ [Rich Text Editor]                  │ │
│ │                                     │ │
│ │ Foods to Improve (High → Low)       │ │
│ │ 1. Cinnamon: +15% insulin sens.     │ │
│ │ 2. Berries: Slow glucose rise       │ │
│ │ [+ Add Food]                        │ │
│ │                                     │ │
│ │ Foods to Avoid                      │ │
│ │ 1. Sugary drinks: BG spike          │ │
│ │ 2. Refined carbs: Energy crash      │ │
│ │ [+ Add Food]                        │ │
│ │                                     │ │
│ │ Lifestyle Changes                   │ │
│ │ • Fasting: Improves insulin sens.   │ │
│ │ • Sleep: 7-9h for stable glucose    │ │
│ │ [+ Add Change]                      │ │
│ │                                     │ │
│ │ Red Flags (when to see doctor)      │ │
│ │ • FG > 7.0 mmol/L consistently      │ │
│ │ • Post-meal > 8.5 mmol/L            │ │
│ │ [+ Add Flag]                        │ │
│ │                                     │ │
│ │ [Save] [Preview] [History]          │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Rich text editor (bold, italic, links)
- Save drafts (not published until confirmed)
- Preview in light/dark mode, EN/DE
- Version history (see what changed, by whom, when)
- Schedule publication (publish at specific time)
- Approve/reject changes from editors (if delegated)

**APIs:**
```
GET /api/admin/kb/:marker_id
  → { marker, content, versions, last_edited_by, last_edited_at }

PUT /api/admin/kb/:marker_id
  Body: { what_is_it, why_it_matters, foods_to_improve, [...] }
  → { updated: true, version: 42 }

GET /api/admin/kb/:marker_id/history
  → { versions: [ { version, editor, timestamp, changes } ] }

POST /api/admin/kb/:marker_id/publish
  Params: { version, scheduled_time? }
  → { published: true }
```

#### 3b. Food Database Editor

```
┌─────────────────────────────────────────┐
│ Food Database Management                │
├─────────────────────────────────────────┤
│ [+ Add Food] [Import CSV] [Export CSV]  │
│ Search: [________________]               │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Food Name      Category   Updated   ║ │
│ ╠═════════════════════════════════════╣ │
│ ║ Cinnamon       Spice    2026-02-28  ║ │
│ ║ Berries        Fruit    2026-02-15  ║ │
│ ║ Broccoli       Vegetable 2026-01-30 ║ │
│ ║ Eggs           Protein  2026-02-01  ║ │
│ ║ ...                                 ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ [Selected: Cinnamon]                    │
│ ┌─────────────────────────────────────┐ │
│ │ Nutrient Content (per 100g)         │ │
│ │ • Carbs: 81g                        │ │
│ │ • Fiber: 12g                        │ │
│ │ • Protein: 4g                       │ │
│ │ • Fat: 3g                           │ │
│ │ • Purines: 15mg                     │ │
│ │                                     │ │
│ │ Impact on Markers:                  │ │
│ │ ☑ Glucose (↓ 15%) [Mechanism]       │ │
│ │ ☑ Insulin Sensitivity (↑ 10%)       │ │
│ │ ○ Inflammation (↓ 5%)               │ │
│ │ [+ Add Impact]                      │ │
│ │                                     │ │
│ │ Serving Size: 1 tsp (2.6g)          │ │
│ │ Frequency: Daily safe               │ │
│ │ Notes: [Rich text editor]           │ │
│ │                                     │ │
│ │ [Save] [Delete] [History]           │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Add/edit foods with nutrient breakdown
- Link foods to biomarker impacts
- Bulk import (CSV: name, carbs, protein, fat, etc.)
- Track usage (how many users have this food in their data)
- Version history

**APIs:**
```
GET /api/admin/foods?search=cinnamon
  → { foods: [...], total }

GET /api/admin/foods/:food_id
  → { food, nutrients, marker_impacts, usage_count }

PUT /api/admin/foods/:food_id
  Body: { name, nutrients, marker_impacts, serving_size }
  → { updated: true }

POST /api/admin/foods/bulk-import
  Body: CSV file
  → { imported: 45, errors: [] }
```

---

### 4. Settings & Configuration

**Purpose:** Update system-wide settings without code changes

```
┌─────────────────────────────────────────┐
│ Settings & Configuration                │
├─────────────────────────────────────────┤
│                                         │
│ ╔═ Ampel-Logik (Traffic Light) Thresholds ╗
│ ║                                       ║
│ ║ [Select Zone: Blood Glucose ▼]       ║
│ ║                                       ║
│ ║ Fasting Glucose (mmol/L):            ║
│ ║ 🟢 Normal: 5.0 - 5.8                 ║
│ ║ 🟡 Caution: 5.9 - 6.5                ║
│ ║ 🔴 Warning: > 6.6                    ║
│ ║                                       ║
│ ║ Post-Meal Glucose (mmol/L):          ║
│ ║ 🟢 Normal: ≤ 6.5                     ║
│ ║ 🟡 Caution: 6.6 - 7.5                ║
│ ║ 🔴 Warning: > 7.6                    ║
│ ║                                       ║
│ ║ [Save Changes]                       ║
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═ Reference Ranges (Lab Values) ═════╗ │
│ ║ Adjust default ranges for markers   ║ │
│ ║ [Select Marker: HbA1c ▼]            ║
│ ║                                     ║
│ ║ Normal Range: 4.0 - 5.8 %           ║
│ ║ Lab Unit: % (mmol/mol alternative)  ║
│ ║ Age Group Adjustments: (optional)   ║
│ ║                                     ║
│ ║ [Save Changes]                      ║
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═ Notification Rules ═════════════════╗ │
│ ║ Alert when measurements fall out    ║
│ ║ of 🟢 range:                        ║
│ ║                                     ║
│ ║ ☑ Email alert to user               ║
│ ║ ☑ In-app notification               ║
│ ║ ○ SMS (optional integration)        ║
│ ║                                     ║
│ ║ Frequency: Send 1 alert per day max ║
│ ║                                     ║
│ ║ [Save Changes]                      ║
│ ╚═════════════════════════════════════╝ │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Update Ampel-Logik (🟢🟡🔴) thresholds for each zone
- Adjust reference ranges for biomarkers
- Configure notification rules
- Test notifications
- Audit log (see what changed, when, by whom)

**APIs:**
```
GET /api/admin/settings/ampel/:zone_id
  → { thresholds: { green: [...], yellow: [...], red: [...] } }

PUT /api/admin/settings/ampel/:zone_id
  Body: { thresholds }
  → { updated: true }

GET /api/admin/settings/reference-ranges
  → { ranges: [ { marker_id, min, max, unit, age_groups? } ] }

PUT /api/admin/settings/reference-ranges/:marker_id
  Body: { min, max, unit, age_groups? }
  → { updated: true }
```

---

### 5. Analytics Dashboard

**Purpose:** Understand user behavior and product metrics

```
┌─────────────────────────────────────────┐
│ Analytics Dashboard                     │
├─────────────────────────────────────────┤
│ Time Range: [Last 30 Days ▼]            │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ User Growth                         ║ │
│ ║ [Line Graph: Signups over time]     ║ │
│ ║ New Users: +23 (this period)        ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Premium Conversion                  ║ │
│ ║ [Bar Graph: Conversion rate]        ║ │
│ ║ Free → Premium: 8.5%                ║ │
│ ║ Avg. Days to Convert: 14            ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Feature Usage                       ║ │
│ ║ OCR Uploads: 342 (78% of premium)   ║ │
│ ║ PDF Exports: 156 (35% of premium)   ║ │
│ ║ Doctor Sharing: 89 (20% of premium) ║ │
│ ║ Cloud Sync: 234 (53% of premium)    ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Churn & Retention                   ║ │
│ ║ Churn Rate: 2.1% (good)             ║ │
│ ║ Retention (30d): 94.2%              ║ │
│ ║ Retention (90d): 87.5%              ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Revenue Metrics                     ║ │
│ ║ MRR: €2,450                         ║ │
│ ║ Annual Run Rate: €29,400            ║ │
│ ║ Avg. Customer Lifetime Value: €180  ║ │
│ ║ CAC (Customer Acq. Cost): ~€0       ║ │
│ ║ LTV/CAC Ratio: ∞ (organic)          ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ [Export to CSV] [Share Report]          │
│                                         │
└─────────────────────────────────────────┘
```

**Metrics:**
- User growth (new signups, DAU, MAU)
- Premium conversion rate + funnel
- Feature usage (OCR, PDF, sharing, sync)
- Churn rate + retention by cohort
- Revenue (MRR, ARR, LTV, CAC)
- Most common zones/markers users track

**Privacy:** All analytics are aggregated/anonymized (no user PII)

**APIs:**
```
GET /api/admin/analytics?period=30d
  → { user_growth, conversions, feature_usage, churn, revenue }

GET /api/admin/analytics/cohorts
  → { signups_by_date, retention_by_cohort, churn_by_month }
```

---

### 6. Audit Log

**Purpose:** Track all admin actions for security/compliance

```
┌─────────────────────────────────────────┐
│ Audit Log                               │
├─────────────────────────────────────────┤
│ Filter: [All Actions ▼] [Date Range]    │
│                                         │
│ ╔═════════════════════════════════════╗ │
│ ║ Timestamp    Admin      Action      ║ │
│ ╠═════════════════════════════════════╣ │
│ ║ 10:45 today  helmut@... Revoked L.  ║ │
│ ║ 09:30 today  helmut@... Updated KB  ║ │
│ ║ 08:15 today  helmut@... Issued L.   ║ │
│ ║ 2026-02-28   helmut@... Config.     ║ │
│ ║ ...                                 ║ │
│ ╚═════════════════════════════════════╝ │
│                                         │
│ [Selected: Revoked License for jane@]  │
│ ┌─────────────────────────────────────┐ │
│ │ Details:                            │ │
│ │ Action: License Revocation          │ │
│ │ User: jane@example.com (ID: U1234)  │ │
│ │ Admin: helmut@sovereignhealth.io     │ │
│ │ Reason: fraud                       │ │
│ │ Timestamp: 2026-03-01 10:45:32      │ │
│ │ Before: Premium (expires 2026-12)   │ │
│ │ After: Free (license revoked)       │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Data Logged:**
- Who made the change (admin email)
- What changed (entity, field, old value, new value)
- When (ISO timestamp)
- Why (reason code)
- IP address (for security)

**Retention:** 2 years minimum (GDPR compliance)

**APIs:**
```
GET /api/admin/audit-log?limit=50&offset=0
  → { events: [ { admin, action, entity, timestamp, changes } ] }

GET /api/admin/audit-log/:event_id
  → { full details of single event }
```

---

## Admin Panel Development Checklist

### UI/UX
- [ ] Responsive design (desktop-first, but mobile-friendly)
- [ ] Dark mode (Admin panel is dark by default)
- [ ] Keyboard shortcuts (power users: j/k to navigate, s to save, etc.)
- [ ] Loading states + error handling
- [ ] Confirmation dialogs for destructive actions
- [ ] Toast notifications for success/error feedback

### Security
- [ ] Two-factor authentication (email-based 2FA)
- [ ] Session timeout (30 min inactivity → re-login)
- [ ] Rate limiting on sensitive endpoints
- [ ] CSRF protection (same-origin form submissions)
- [ ] Input validation (prevent XSS, SQL injection)
- [ ] Audit logging (every action logged)

### Performance
- [ ] Admin panel loads in < 2s
- [ ] Data tables paginate (500 users max per page)
- [ ] Search/filtering is fast (indexed queries)
- [ ] Bulk operations don't block UI (async processing)
- [ ] Analytics queries cache results (1h TTL)

### Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows (user management, content editing)
- [ ] Security tests (authentication, authorization)

---

## Integration with Main App

**Admin Panel is separate from main user app, but shares:**
- PostgreSQL database (same schema)
- Authentication system (same JWT validation)
- API server (different port/domain)

**Separation ensures:**
- User app is lightweight (no admin code in production frontend)
- Admin panel can be deployed independently
- Permissions are enforced server-side (JWT role claim)
- If user app is compromised, admin panel remains secure

---

## Implementation Timeline

**Phase 1 (MVP, Weeks 2–3):**
- [ ] Basic user management (list, view, license issue/revoke)
- [ ] Simple KB editor (edit text, save)
- [ ] Dashboard with basic metrics

**Phase 2 (Weeks 4–5):**
- [ ] Food database editor
- [ ] Settings/Ampel-Logik configuration
- [ ] Analytics dashboard
- [ ] Audit logging

**Phase 3 (Weeks 6+):**
- [ ] Advanced content management (versioning, scheduling)
- [ ] Custom reports (export, share)
- [ ] Delegated admin roles (editors, support team)
- [ ] Webhooks (integrate with Slack, email, etc.)

