# Business Logic Acceptance Tests

Extracted from `api/src/handlers/` and `api/src/services/` -- 2026-04-05.

---

## 1. Measurements

### 1.1 Create measurement
- [ ] UNTESTED -- Given: authenticated user with valid marker slug
- When: POST /measurements with value, measured_at, marker_slug
- Then: measurement stored with encrypted value_canonical, status computed from reference ranges, 201 returned

### 1.2 Protocol tag validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /measurements with protocol_tag not in {standard, fasting}
- Then: 400 validation error

### 1.3 Stress level validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /measurements with stress_level outside 1-10
- Then: 400 validation error

### 1.4 Lifestyle note length validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /measurements with lifestyle_note > 300 chars
- Then: 400 validation error

### 1.5 Marker value physiological range validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /measurements with glucose value outside 1.0-30.0 mmol/L
- Then: 400 validation error (each marker has specific allowed range)

### 1.6 Unknown marker slug rejected
- [ ] UNTESTED -- Given: authenticated user
- When: POST /measurements with marker_slug not in markers table
- Then: 400 "Unknown marker slug"

### 1.7 Tier measurement cap enforcement
- [ ] UNTESTED -- Given: Glimpse-tier user at measurement limit (excluding demo data)
- When: POST /measurements
- Then: upgrade_required error returned

### 1.8 Idempotency key prevents duplicates
- [ ] UNTESTED -- Given: authenticated user submits measurement with idempotency_key
- When: same POST repeated with same idempotency_key
- Then: ON CONFLICT DO NOTHING, existing row returned (no duplicate)

### 1.9 Calculated markers auto-computed on create
- [ ] UNTESTED -- Given: user has glucose measurement and submits ketones
- When: POST /measurements with ketones value
- Then: GKI and Dr. Boz ratio auto-calculated and stored in calculated_marker_values

### 1.10 Enrichment with historical values for calculated markers
- [ ] UNTESTED -- Given: user entered glucose yesterday, ketones today (separate submissions)
- When: POST /measurements with ketones
- Then: system fetches latest glucose via enrich_with_latest_values, GKI still computes

### 1.11 Fasting hours auto-computed
- [ ] UNTESTED -- Given: user provides fast_start_datetime
- When: POST /measurements with measured_at after fast_start
- Then: fasting_hours computed as (measured_at - fast_start).hours()

### 1.12 Soft delete measurement
- [ ] UNTESTED -- Given: authenticated user owns measurement
- When: DELETE /measurements/{id}
- Then: is_deleted=true, deleted_at set (no hard delete)

### 1.13 Measurement not found for other user
- [ ] UNTESTED -- Given: user A owns measurement
- When: user B tries GET/PUT/DELETE /measurements/{id}
- Then: 404 Not Found

### 1.14 History limit enforcement (Glimpse tier)
- [ ] UNTESTED -- Given: Glimpse-tier user with max_history_days limit
- When: GET /measurements with from date older than limit
- Then: from date clamped to cutoff; older data hidden

### 1.15 Pagination defaults and limits
- [ ] UNTESTED -- Given: authenticated user
- When: GET /measurements with per_page=500
- Then: per_page clamped to 200

### 1.16 Update recalculates status
- [ ] UNTESTED -- Given: authenticated user updates measurement value
- When: PUT /measurements/{id} with new value
- Then: status recalculated from reference ranges with new value

### 1.17 Lifestyle note encrypted at rest
- [ ] UNTESTED -- Given: authenticated user creates measurement with lifestyle_note
- When: stored in database
- Then: lifestyle_note is AES-encrypted; decrypted on read

---

## 2. Calculated Markers

### 2.1 GKI formula
- [ ] UNTESTED -- Given: glucose and ketones values available
- When: calculated markers computed
- Then: GKI = glucose / ketones (ketones must be > 0)

### 2.2 Dr. Boz Ratio formula
- [ ] UNTESTED -- Given: glucose and ketones values available
- When: calculated markers computed
- Then: Dr. Boz = (glucose * 18) / ketones (ketones must be > 0)

### 2.3 BMI formula
- [ ] UNTESTED -- Given: weight value and user height_cm in profile
- When: calculated markers computed
- Then: BMI = weight / (height_m^2); requires height > 0

### 2.4 WHtR formula
- [ ] UNTESTED -- Given: waist_circumference and user height_cm
- When: calculated markers computed
- Then: WHtR = waist / height; requires height > 0

### 2.5 HOMA-IR formula
- [ ] UNTESTED -- Given: glucose and insulin values
- When: calculated markers computed
- Then: HOMA-IR = (glucose * 18.018 * insulin) / 405

### 2.6 TG/HDL Ratio formula
- [ ] UNTESTED -- Given: triglycerides and HDL values
- When: calculated markers computed
- Then: TG/HDL = triglycerides / HDL (HDL must be > 0)

### 2.7 Status thresholds: red/orange/green
- [ ] UNTESTED -- Given: calculated marker value and threshold config
- When: status computed
- Then: value < orange_min = red, value > orange_max = red, in green range = green, otherwise = orange

### 2.8 Protocol-specific threshold overrides
- [ ] UNTESTED -- Given: user on fasting protocol with protocol_overrides defined
- When: calculated markers computed
- Then: protocol_overrides thresholds used instead of default_thresholds

### 2.9 Protocol context resolution
- [ ] UNTESTED -- Given: protocol_tag="fasting", fasting_protocol="omad"
- When: protocol context resolved
- Then: returns "fasting_16_8" (omad maps to 16_8 bucket)

### 2.10 Missing inputs skip calculation
- [ ] UNTESTED -- Given: only glucose available (no ketones)
- When: calculated markers computed
- Then: GKI and Dr. Boz not computed (skipped, not errored)

### 2.11 Historical enrichment uses point-in-time values
- [ ] UNTESTED -- Given: recalculating historical calculated markers
- When: enrich_with_values_at_date called
- Then: only values at or before the target date are used

---

## 3. Import Pipeline

### 3.1 File size limit per file
- [ ] UNTESTED -- Given: authenticated user uploads file
- When: POST /import/upload with file > 10MB
- Then: 400 "File too large. Maximum size is 10MB per file."

### 3.2 Total upload size limit
- [ ] UNTESTED -- Given: authenticated user uploads multiple files
- When: total size exceeds 30MB
- Then: 400 "Total upload size exceeds 30MB."

### 3.3 Maximum 3 files per upload
- [ ] UNTESTED -- Given: authenticated user
- When: POST /import/upload with 4+ files
- Then: 400 "Maximum 3 files per upload"

### 3.4 File type validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /import/upload with .txt file
- Then: 400 "unsupported type. Accepted: JPEG, PNG, WebP, PDF."

### 3.5 At least one file required
- [ ] UNTESTED -- Given: authenticated user
- When: POST /import/upload with empty payload
- Then: 400 "At least one file is required"

### 3.6 AI credit check before extraction
- [ ] UNTESTED -- Given: user with exhausted lab_import credits
- When: POST /import/upload
- Then: quota exceeded error before any AI call

### 3.7 Confirm requires extracted status
- [ ] UNTESTED -- Given: import session in status "confirmed" or "failed"
- When: POST /import/confirm
- Then: 400 "already been confirmed or failed"

### 3.8 Confirm creates measurements from matched markers
- [ ] UNTESTED -- Given: import session with extracted markers
- When: POST /import/confirm with selected markers
- Then: measurements created, calculated markers computed, session status set to "confirmed"

### 3.9 Lab auto-created on confirm
- [ ] UNTESTED -- Given: import extracted lab_provider name
- When: POST /import/confirm with lab_name
- Then: lab upserted (ON CONFLICT by user_id + name), lab device created

### 3.10 Rollback deletes imported measurements
- [ ] UNTESTED -- Given: confirmed import session with measurement_ids
- When: POST /import/rollback/{session_id}
- Then: all measurements hard-deleted, calculated_marker_values at same timestamps deleted

### 3.11 Rollback only works on confirmed sessions
- [ ] UNTESTED -- Given: import session in status "extracted"
- When: POST /import/rollback/{session_id}
- Then: 400 "Only confirmed imports can be rolled back"

### 3.12 AI suggestions for unmatched markers
- [ ] UNTESTED -- Given: extraction yields markers not in catalog
- When: upload completes
- Then: AI suggests closest marker_slug matches with confidence scores

### 3.13 GDPR audit logged on import
- [ ] UNTESTED -- Given: authenticated user uploads lab report
- When: POST /import/upload
- Then: access_log entry created for "import_lab_pdf"

---

## 4. Dr. Alex Chat

### 4.1 Empty question rejected
- [ ] UNTESTED -- Given: authenticated user
- When: POST /doctor-chat with empty question
- Then: 400 "question is required"

### 4.2 Question length limit
- [ ] UNTESTED -- Given: authenticated user
- When: POST /doctor-chat with question > 2000 chars
- Then: 400 "question must be 2000 characters or fewer"

### 4.3 AI credits checked before call
- [ ] UNTESTED -- Given: user with exhausted chat credits for agent_type
- When: POST /doctor-chat
- Then: quota exceeded error

### 4.4 AI credits consumed after response
- [ ] UNTESTED -- Given: user with available credits
- When: POST /doctor-chat completes successfully
- Then: AI credit consumed, remaining count decremented

### 4.5 Conversation ownership verified
- [ ] UNTESTED -- Given: user A's conversation
- When: user B sends POST /doctor-chat with user A's conversation_id
- Then: 404 Not Found

### 4.6 New conversation auto-created
- [ ] UNTESTED -- Given: authenticated user
- When: POST /doctor-chat without conversation_id
- Then: new conversation created with title = first 80 chars of question

### 4.7 Conversation history limited to 20 messages
- [ ] UNTESTED -- Given: conversation with 50 messages
- When: POST /doctor-chat
- Then: only last 20 messages sent to Claude as context

### 4.8 Messages encrypted at rest
- [ ] UNTESTED -- Given: chat message saved
- When: stored in database
- Then: both user question and assistant response AES-encrypted

### 4.9 Health context injected
- [ ] UNTESTED -- Given: user with measurements
- When: POST /doctor-chat
- Then: health context (recent measurements, profile) sent as system prompt to Claude

### 4.10 Rename conversation validation
- [ ] UNTESTED -- Given: authenticated user
- When: PUT /doctor-chat/conversations/{id} with title > 200 chars or empty
- Then: 400 validation error

### 4.11 Delete conversation is soft delete
- [ ] UNTESTED -- Given: authenticated user owns conversation
- When: DELETE /doctor-chat/conversations/{id}
- Then: is_deleted=true (not hard delete)

### 4.12 Rate message validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /doctor-chat/conversations/{id}/rate with rating not in {helpful, not_helpful}
- Then: 400 validation error

### 4.13 Message rating upsert
- [ ] UNTESTED -- Given: user rates same message twice
- When: second POST /rate
- Then: rating updated (ON CONFLICT DO UPDATE), no duplicate

---

## 5. AI Credits & Tier Enforcement

### 5.1 OSS mode bypasses all tiers
- [ ] UNTESTED -- Given: SHI_MODE=oss environment variable set
- When: any tier check runs
- Then: unlimited tier returned

### 5.2 No license defaults to Glimpse
- [ ] UNTESTED -- Given: user with no user_licenses row
- When: tier checked
- Then: default Glimpse tier limits applied

### 5.3 Grace period uses previous tier
- [ ] UNTESTED -- Given: user downgraded with status=downgrade_grace, grace_period_ends in future
- When: tier checked
- Then: previous tier's limits applied

### 5.4 Grace period expired reverts to new tier
- [ ] UNTESTED -- Given: grace_period_ends in the past
- When: tier checked
- Then: current (lower) tier limits applied

### 5.5 BTC prepaid expiry check
- [ ] UNTESTED -- Given: user with payment_method=strike_btc, no active btc_payments
- When: tier checked
- Then: falls back to Glimpse tier

### 5.6 Glimpse marker restriction
- [ ] UNTESTED -- Given: Glimpse-tier user
- When: accessing marker not in GLIMPSE_MARKERS (8 allowed markers)
- Then: upgrade_required error

### 5.7 Feature boolean gating
- [ ] UNTESTED -- Given: Glimpse-tier user
- When: accessing csv_export, custom_thresholds, or mfa_totp
- Then: upgrade_required with current/required tier info

### 5.8 Per-agent chat quota enforcement
- [ ] UNTESTED -- Given: user with 0 remaining chats for "trends" agent
- When: POST /doctor-chat with agent_type=trends
- Then: quota exceeded error

### 5.9 Chat quota monthly reset
- [ ] UNTESTED -- Given: user used all credits in March
- When: April 1st, user sends chat
- Then: new month_year key, quota resets to 0 used

### 5.10 Agent disabled for tier (limit=0)
- [ ] UNTESTED -- Given: Glimpse-tier user, chat_trends_monthly=0
- When: POST /doctor-chat with agent_type=trends
- Then: upgrade_required error (not quota_exceeded)

### 5.11 Admin role does NOT bypass tier enforcement
- [ ] UNTESTED -- Given: user with admin role but Glimpse license
- When: accessing Focus-tier feature
- Then: upgrade_required (admin is for panel access, not license bypass)

---

## 6. Authentication

### 6.1 Signup rate limiting
- [ ] UNTESTED -- Given: many signup attempts from same IP
- When: rate limit exceeded
- Then: 429 with Retry-After header

### 6.2 Login rate limiting
- [ ] UNTESTED -- Given: many login attempts from same IP
- When: rate limit exceeded
- Then: 429 with Retry-After header

### 6.3 Email validation on signup
- [ ] UNTESTED -- Given: invalid email format
- When: POST /auth/signup
- Then: 400 "Invalid email address"

### 6.4 Password validation on signup
- [ ] UNTESTED -- Given: weak password
- When: POST /auth/signup
- Then: 400 with password requirements message

### 6.5 TOS acceptance required
- [ ] UNTESTED -- Given: tos_accepted=false or missing
- When: POST /auth/signup
- Then: 400 "You must accept the Terms of Service"

### 6.6 Display name length limit
- [ ] UNTESTED -- Given: display_name > 100 chars
- When: POST /auth/signup
- Then: 400 validation error

### 6.7 Duplicate email rejected
- [ ] UNTESTED -- Given: email already registered
- When: POST /auth/signup with same email
- Then: email conflict error

### 6.8 Registration gate (closed + whitelist)
- [ ] UNTESTED -- Given: registration_enabled=false, IP not whitelisted
- When: POST /auth/signup
- Then: 403 REGISTRATION_CLOSED

### 6.9 Registration gate bypassed by IP whitelist
- [ ] UNTESTED -- Given: registration_enabled=false, IP in admin_whitelist_ips
- When: POST /auth/signup
- Then: signup proceeds normally

### 6.10 OSS mode skips email verification
- [ ] UNTESTED -- Given: SHI_MODE=oss
- When: POST /auth/signup
- Then: user created with email_verified=true, JWT issued immediately

### 6.11 SaaS mode requires email verification
- [ ] UNTESTED -- Given: SaaS mode (not OSS)
- When: POST /auth/signup, then POST /auth/login before verifying
- Then: 403 EMAIL_NOT_VERIFIED

### 6.12 Verification token expiry
- [ ] UNTESTED -- Given: verification token past expires_at
- When: GET /auth/verify?token=...
- Then: 410 TOKEN_EXPIRED

### 6.13 Verification token reuse
- [ ] UNTESTED -- Given: already-used verification token
- When: GET /auth/verify?token=...
- Then: 200 with already_verified=true

### 6.14 Login with wrong password
- [ ] UNTESTED -- Given: valid email, wrong password
- When: POST /auth/login
- Then: InvalidCredentials error (no info leak about email existence)

### 6.15 Login with deleted account
- [ ] UNTESTED -- Given: user with is_deleted=true
- When: POST /auth/login
- Then: InvalidCredentials (query filters is_deleted=false)

### 6.16 MFA challenge on login
- [ ] UNTESTED -- Given: user with MFA enabled
- When: POST /auth/login with correct credentials
- Then: 200 with mfa_required=true and short-lived mfa_token

### 6.17 Refresh token rotation
- [ ] UNTESTED -- Given: valid refresh token
- When: POST /auth/refresh
- Then: old refresh token revoked, new JWT + new refresh token issued

### 6.18 Expired/revoked refresh token rejected
- [ ] UNTESTED -- Given: revoked or expired refresh token
- When: POST /auth/refresh
- Then: 401 Unauthorized

### 6.19 Tier assigned on signup
- [ ] UNTESTED -- Given: SaaS signup
- When: user created
- Then: Glimpse tier assigned; OSS signup gets Core tier

### 6.20 Affiliate code generated on signup
- [ ] UNTESTED -- Given: new user signup
- When: user created
- Then: unique affiliate_code auto-generated and stored

### 6.21 Referral chain stored
- [ ] UNTESTED -- Given: signup with referred_by code
- When: referrer was themselves referred
- Then: parent_referrer_id (grandparent) stored for multi-level tracking

### 6.22 Locale validation
- [ ] UNTESTED -- Given: signup with locale not in {en, de}
- When: POST /auth/signup
- Then: locale defaults to "en"

---

## 7. Reference Ranges

### 7.1 Custom range upsert
- [ ] UNTESTED -- Given: authenticated user sets custom range for marker + protocol
- When: PUT /settings/reference-ranges
- Then: user-specific reference_ranges row created/updated; requires custom_thresholds tier feature

### 7.2 Delete single custom range
- [ ] UNTESTED -- Given: user has custom range for glucose/standard
- When: DELETE /settings/reference-ranges/glucose?protocol_context=standard
- Then: only that specific range deleted

### 7.3 Delete all custom ranges
- [ ] UNTESTED -- Given: user has multiple custom ranges
- When: DELETE /settings/reference-ranges
- Then: all user's custom ranges deleted; system defaults remain

### 7.4 Status uses user ranges first
- [ ] UNTESTED -- Given: user has custom range for glucose, system default also exists
- When: measurement status calculated
- Then: user's custom range takes precedence

---

## 8. Devices & Labs

### 8.1 Device type validation
- [ ] UNTESTED -- Given: authenticated user
- When: POST /devices with device_type not in {home, lab, wearable, scale, other}
- Then: 400 validation error

### 8.2 Device name required
- [ ] UNTESTED -- Given: authenticated user
- When: POST /devices with empty name
- Then: 400 "Device name is required"

### 8.3 Setting default device unsets previous
- [ ] UNTESTED -- Given: user has device A as default
- When: POST /devices with is_default=true for device B
- Then: device A's is_default set to false, device B is new default

### 8.4 Lab name required
- [ ] UNTESTED -- Given: authenticated user
- When: POST /labs with empty name
- Then: 400 "Lab name is required"

### 8.5 Lab upsert on duplicate name
- [ ] UNTESTED -- Given: user already has lab "LabCorp"
- When: POST /labs with name="LabCorp" and new address
- Then: existing lab updated (ON CONFLICT DO UPDATE), not duplicated

### 8.6 Lab delete unlinks measurements
- [ ] UNTESTED -- Given: lab with linked measurements
- When: DELETE /labs/{id}
- Then: measurements.lab_id set to NULL, then lab hard-deleted

### 8.7 Device list shows measurement count
- [ ] UNTESTED -- Given: device with 5 measurements
- When: GET /devices
- Then: measurement_count=5 and last_used timestamp returned

---

## 9. GDPR & Data Management

### 9.1 Account deletion is soft delete with 30-day grace
- [ ] UNTESTED -- Given: authenticated user
- When: DELETE /settings/account
- Then: is_deleted=true, deleted_at=now, all refresh tokens revoked, admin notified

### 9.2 Protected accounts cannot be deleted (production only)
- [ ] UNTESTED -- Given: user with is_protected=true on production
- When: DELETE /settings/account
- Then: 400 "This account is protected"

### 9.3 Hard purge after 30-day grace period
- [ ] UNTESTED -- Given: user soft-deleted 31+ days ago
- When: cron_hard_purge runs
- Then: all data permanently deleted in transaction (NO ACTION FK tables first, then CASCADE)

### 9.4 Hard purge anonymizes audit/payment records
- [ ] UNTESTED -- Given: user being hard purged
- When: purge_user executes
- Then: audit_log.user_id set to NULL, email_sends.email set to "[purged]", payment_events.user_id nulled

### 9.5 Contact submissions purged after 90 days
- [ ] UNTESTED -- Given: contact submission older than 90 days
- When: cron_purge_contacts runs
- Then: submission hard-deleted (GDPR storage limitation)

### 9.6 Full JSON data export
- [ ] UNTESTED -- Given: authenticated user
- When: POST /settings/export-all
- Then: complete JSON export of all user data (measurements, chats, profile, etc.)

### 9.7 CSV export requires tier feature
- [ ] UNTESTED -- Given: Glimpse-tier user
- When: GET /export/csv
- Then: upgrade_required error (csv_export is Focus+)

### 9.8 Consent change audited
- [ ] UNTESTED -- Given: user toggles share_anonymous_data
- When: PUT /settings/anonymous-data
- Then: audit log entry created with "consent.update"

---

## 10. Reset Data

### 10.1 Reset requires confirmation string
- [ ] UNTESTED -- Given: authenticated user
- When: POST /settings/reset without confirm="RESET"
- Then: returns counts preview only, no deletion

### 10.2 Reset with confirmation deletes health data
- [ ] UNTESTED -- Given: authenticated user sends confirm="RESET"
- When: POST /settings/reset
- Then: measurements, calculated values, imports, devices, labs, medications, chats, templates, custom ranges, AI quotas all deleted in transaction

### 10.3 Reset preserves account and profile
- [ ] UNTESTED -- Given: user resets data
- When: POST /settings/reset
- Then: users row, user_profile, user_preferences, user_licenses all preserved

### 10.4 Protected accounts cannot be reset (production)
- [ ] UNTESTED -- Given: user with is_protected=true on production
- When: POST /settings/reset
- Then: 400 "This account is protected and cannot be reset"

---

## 11. Admin

### 11.1 Admin endpoints require AdminUser middleware
- [ ] UNTESTED -- Given: non-admin user
- When: GET /admin/dashboard
- Then: 403 Forbidden

### 11.2 Dashboard aggregates
- [ ] UNTESTED -- Given: admin user
- When: GET /admin/dashboard
- Then: returns total_users, verified_users, total_measurements, active_7d, active_30d, tier_distribution

### 11.3 User list search
- [ ] UNTESTED -- Given: admin user
- When: GET /admin/users?search=john
- Then: users filtered by email or display_name ILIKE

### 11.4 User list pagination
- [ ] UNTESTED -- Given: admin user
- When: GET /admin/users?per_page=200
- Then: per_page clamped to 100

### 11.5 Sort column whitelist (SQL injection prevention)
- [ ] UNTESTED -- Given: admin user
- When: GET /admin/users?sort=malicious_column
- Then: falls back to u.created_at (only whitelisted columns allowed)

---

## 12. Notifications

### 12.1 Dual dispatch (ntfy + Telegram)
- [ ] UNTESTED -- Given: notification sent
- When: Notifier.send() called
- Then: dispatched to both ntfy topic and Telegram forum thread (fire-and-forget)

### 12.2 Notification failure never breaks API
- [ ] UNTESTED -- Given: ntfy/Telegram unreachable
- When: Notifier.send() called
- Then: error logged, API request completes normally

### 12.3 Notification channels
- [ ] UNTESTED -- Given: various events
- When: signup, deletion, reset, billing events occur
- Then: routed to correct channel (Critical, Errors, Billing, Users, Info)

---

## 13. Search

### 13.1 Minimum query length
- [ ] UNTESTED -- Given: any user (public or authenticated)
- When: GET /search?q=a (single char)
- Then: 400 "Search query must be at least 2 characters"

### 13.2 Bilingual search
- [ ] UNTESTED -- Given: user searches in English
- When: GET /search?q=blood+sugar&locale=en
- Then: results from both English and German index, deduplicated, user's locale preferred

### 13.3 Auth-gated results
- [ ] UNTESTED -- Given: unauthenticated user
- When: GET /search?q=glucose
- Then: only results with requires_auth=false returned

### 13.4 Authenticated user sees all results
- [ ] UNTESTED -- Given: authenticated user
- When: GET /search?q=glucose
- Then: both public and auth-required results returned

### 13.5 Result limit clamped
- [ ] UNTESTED -- Given: any user
- When: GET /search?limit=100
- Then: limit clamped to 50

### 13.6 Type filter
- [ ] UNTESTED -- Given: any user
- When: GET /search?q=glucose&type_filter=marker
- Then: only marker entity_type results returned

---

## 14. Affiliates

### 14.1 Click rate limiting (1/hour/IP/code)
- [ ] UNTESTED -- Given: click already recorded for IP+code within last hour
- When: POST /affiliate/click
- Then: 200 OK silently (no duplicate click recorded)

### 14.2 Invalid affiliate code silent 200
- [ ] UNTESTED -- Given: non-existent affiliate code
- When: POST /affiliate/click
- Then: 200 OK (no information leak about code existence)

### 14.3 Auto-generate affiliate code on first access
- [ ] UNTESTED -- Given: user without affiliate_code
- When: GET /affiliate/me
- Then: affiliate code auto-generated and stored

### 14.4 Self-referral prevented
- [ ] UNTESTED -- Given: user with affiliate_code "ABC"
- When: signup with referred_by="ABC" (own code)
- Then: referral not recorded (WHERE id != $2)

### 14.5 Commission split by payout method
- [ ] UNTESTED -- Given: affiliate with EUR and BTC conversions
- When: GET /affiliate/me
- Then: separate pending/approved/paid totals for EUR (cents) and BTC (sats)

---

## 15. Medications

### 15.1 Medication name required
- [ ] UNTESTED -- Given: authenticated user
- When: POST /user-medications with empty name
- Then: 400 "name is required"

### 15.2 Medication name length limit
- [ ] UNTESTED -- Given: authenticated user
- When: POST /user-medications with name > 200 chars
- Then: 400 "name must be 200 characters or fewer"

### 15.3 Tier limit on medication count
- [ ] UNTESTED -- Given: user at medication limit for their tier
- When: POST /user-medications
- Then: upgrade_required error

### 15.4 Active filter default
- [ ] UNTESTED -- Given: authenticated user
- When: GET /user-medications (no active param)
- Then: only active medications returned (is_active=true)

### 15.5 Medication ownership
- [ ] UNTESTED -- Given: user A's medication
- When: user B tries GET /user-medications/{id}
- Then: 404 Not Found

---

## 16. Profile & Settings

### 16.1 Gender validation
- [ ] UNTESTED -- Given: authenticated user
- When: PUT /settings/profile with gender not in {male, female, other}
- Then: 400 validation error

### 16.2 Profile data encrypted at rest
- [ ] UNTESTED -- Given: user updates height_cm, weight, waist
- When: stored in database
- Then: values AES-encrypted; decrypted on read

### 16.3 Tier source of truth is user_licenses
- [ ] UNTESTED -- Given: user with user_licenses.tier_id and users.tier both set
- When: GET /settings
- Then: tier read from user_licenses join (not users.tier column)

### 16.4 Country code validation
- [ ] UNTESTED -- Given: signup with country="USA" (3 chars)
- When: POST /auth/signup
- Then: country_code set to None (must be 2-letter ISO 3166-1 alpha-2)

---

## Summary

| Area | Scenarios |
|------|-----------|
| Measurements | 17 |
| Calculated Markers | 11 |
| Import Pipeline | 13 |
| Dr. Alex Chat | 13 |
| AI Credits & Tier | 11 |
| Authentication | 22 |
| Reference Ranges | 4 |
| Devices & Labs | 7 |
| GDPR & Data | 8 |
| Reset Data | 4 |
| Admin | 5 |
| Notifications | 3 |
| Search | 6 |
| Affiliates | 5 |
| Medications | 5 |
| Profile & Settings | 4 |
| **Total** | **138** |
