# Manual Test Checklist

Complete this checklist before each release. Test in both SaaS and OSS modes.

## Authentication

- [ ] Signup: create new account with email and password
- [ ] Login: sign in with valid credentials
- [ ] Login: reject invalid credentials with error message
- [ ] Session: redirect to login when token expires
- [ ] Logout: clear session and redirect to login
- [ ] Refresh: token refreshes silently before expiry

## Dashboard

- [ ] Shows all 8 health zones with status indicators
- [ ] Zone cards show latest marker values
- [ ] Zone cards link to zone detail pages
- [ ] Calculated markers display correctly (GKI, BMI, WHtR, etc.)
- [ ] Empty state shown for new users with no data

## Zones

- [ ] Zone list page shows all 8 zones
- [ ] Zone detail page shows markers in that zone
- [ ] Each marker links to marker detail page
- [ ] Status badges (green/yellow/red) display correctly

## Marker Detail

- [ ] Marker info section shows description and unit
- [ ] Trend chart renders with date range selector
- [ ] Reference ranges shown with protocol adjustments
- [ ] Foods tab shows related foods
- [ ] Supplements tab shows related supplements
- [ ] References tab shows scientific references
- [ ] Educational content renders correctly
- [ ] Related markers section links work

## Measurements

### List
- [ ] Paginated list of all measurements
- [ ] Filter by marker, zone, date range
- [ ] Status badges display correctly
- [ ] Click measurement opens detail/edit

### Add New
- [ ] Marker selector shows all available markers
- [ ] Auto-measurement from settings pre-selects markers
- [ ] Date/time picker works correctly
- [ ] Protocol tag selector works (standard, fasting variants)
- [ ] Notes field accepts text
- [ ] Submit creates measurement and shows confirmation
- [ ] Validation rejects out-of-range values
- [ ] Encrypted values stored when ENCRYPTION_KEY set

### Edit
- [ ] Pre-fills existing values
- [ ] Save updates measurement
- [ ] Delete removes measurement (soft delete)

## Settings

### Profile Tab
- [ ] Display name editable
- [ ] Email shown (read-only)
- [ ] Date of birth editable
- [ ] Gender/sex selector works

### Units Tab
- [ ] Toggle between metric and imperial
- [ ] Unit preferences saved and applied globally

### Lifestyle Tab
- [ ] Default protocol selector works
- [ ] Auto-measurement markers configurable
- [ ] Anonymous data participation toggle
- [ ] Reference range customization works
- [ ] Bulk reference range reset works

### Account
- [ ] Data export (CSV) downloads file
- [ ] Data export (JSON) downloads file
- [ ] Account deletion with confirmation
- [ ] Account deletion soft-deletes data

## Doctor Chat

- [ ] Agent grid shows 6 specialist modes
- [ ] Selecting agent opens chat
- [ ] Messages send and receive responses
- [ ] Conversation list shows history
- [ ] Conversations can be renamed
- [ ] Messages can be rated (thumbs up/down)
- [ ] Suggested questions shown for new conversations
- [ ] Typing indicator during AI response
- [ ] Quota badge shows remaining sessions
- [ ] Quota enforcement works (blocks when exhausted)

## Medications

- [ ] Medication catalog loads with categories
- [ ] Search filters catalog
- [ ] Add medication from catalog
- [ ] View user medication list
- [ ] Edit medication (dosage, frequency, start/end dates)
- [ ] Delete medication
- [ ] Interaction warnings display when conflicts detected
- [ ] Marker effects shown per medication

## Trends

- [ ] Trend page loads for each marker
- [ ] Chart renders with data points
- [ ] Date range selector works (7d, 30d, 90d, 1y, all)
- [ ] Reference range bands shown on chart
- [ ] Protocol tag filter works
- [ ] Rolling average line shown

## Knowledge Engine

- [ ] Marker knowledge page loads descriptions
- [ ] Related markers section shows connections
- [ ] Protocol effects explained per marker
- [ ] Knowledge search returns results
- [ ] Search handles empty/partial queries

## Pricing Page (SaaS only)

- [ ] Tier cards display with pricing
- [ ] Monthly/annual toggle works
- [ ] Feature comparison table complete
- [ ] FAQ section expandable
- [ ] Self-host CTA links to docs

## OSS Mode

- [ ] Title shows "Sovereign Health" (not "Intelligence")
- [ ] No pricing page link in navigation
- [ ] No tier badges or upgrade prompts
- [ ] No demo banner or profile selector
- [ ] Doctor Chat hidden if no OPENAI_API_KEY
- [ ] Doctor Chat visible with OPENAI_API_KEY (no quota limits)
- [ ] All features unlocked (no tier restrictions)
- [ ] Footer shows "Sovereign Health" + GitLab link
- [ ] GET /health returns "mode": "oss"

## Demo Mode (demo.sovereignhealth.io)

- [ ] No login required
- [ ] Demo banner displayed
- [ ] Demo profile selector works (3 profiles)
- [ ] Read-only: no add/edit/delete buttons
- [ ] Doctor Chat shows signup prompt
- [ ] All zones and markers browsable
- [ ] Trends render with demo data

## Mobile Responsive

- [ ] Bottom navigation bar on mobile
- [ ] All pages readable at 375px width
- [ ] Charts resize correctly
- [ ] Forms usable on mobile
- [ ] Dropdown menus positioned correctly

## Footer

- [ ] Copyright year correct
- [ ] Terms of Service link works
- [ ] Privacy Policy link works
- [ ] Version number displayed
- [ ] GitLab link opens in new tab

## SEO

- [ ] Sitemap at /sitemap.xml includes all public routes
- [ ] Meta descriptions on all pages
- [ ] Open Graph tags present
- [ ] Canonical URLs correct
- [ ] noai, noimageai robots tag present

## API Smoke Tests

- [ ] GET /health returns 200 with status "ok"
- [ ] POST /auth/signup creates user
- [ ] POST /auth/login returns JWT
- [ ] GET /zones returns 8 zones
- [ ] GET /markers returns marker list
- [ ] POST /measurements creates measurement
- [ ] GET /measurements returns paginated list
- [ ] GET /license returns user tier info
- [ ] POST /doctor-chat returns AI response
