---
number: 415
github_number: 537
title: "feat: CRM settings page (profile, security/MFA, account, data & privacy)"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, feature]
created: 2026-04-09
sprint: 036
points: 5
blocked_by: [404, 391]
---

Implement the user settings page for Sovereign CRM, porting SHI's settings architecture.

## Tab Structure

### 1. Profile Tab
- Display name (editable)
- Email (read-only, from platform pool)
- Country (editable, dropdown)
- Save status indicator (idle/saving/saved/error)

### 2. Security Tab (SHI parity)
- **MFA Setup:**
  - Generate TOTP secret + QR code
  - Manual entry of secret key
  - Verify with 6-digit code to enable
  - Show 8 recovery codes in 2-column grid
  - Copy to clipboard + download as text file
- **MFA Disable:** requires current TOTP code
- **Recovery Code Regeneration:** requires TOTP code
- **Password Change:**
  - Old password (required)
  - New password with strength indicator (weak/fair/good/strong/very strong)
  - Confirm new password
  - Optional MFA code if MFA enabled

### 3. Account Tab
- Current subscription tier (read from platform pool via brickos-billing)
- License key display
- License events history

### 4. Data & Privacy Tab
- GDPR data export button (JSON download of all user's CRM data)
- Anonymous data sharing toggle
- Data access log (last 10 entries from platform audit_log)

## API Endpoints

- `GET    /api/v1/settings/profile`
- `PUT    /api/v1/settings/profile`
- `POST   /api/v1/settings/mfa/setup` -- generate secret + QR
- `POST   /api/v1/settings/mfa/verify` -- enable MFA, return recovery codes
- `DELETE /api/v1/settings/mfa` -- disable (requires code)
- `POST   /api/v1/settings/mfa/recovery-codes` -- regenerate
- `PUT    /api/v1/settings/password` -- change password
- `GET    /api/v1/settings/license` -- tier info
- `POST   /api/v1/settings/data-export` -- GDPR JSON export

## Platform DB Writes (via PlatformPool)

- UPDATE users: display_name, country
- INSERT/UPDATE/DELETE user_mfa: TOTP setup/disable
- UPDATE users: password_hash
- SELECT user_licenses, license_events: tier info
- SELECT data_access_log: audit entries

## Frontend

- Tab bar with active indicator
- Fixed header with breadcrumb + save status
- Scrollable content area
- Footer with version info
- Dark theme, useContent() for all strings

## Acceptance Criteria

- Profile tab: edit name + country, save persists
- Security: full MFA setup/disable cycle works
- Security: password change works (with MFA verification if enabled)
- Account: shows correct tier from platform DB
- Data & Privacy: JSON export downloads with all user's CRM contacts/companies/projects
- All writes go to platform pool (user_mfa, users tables)
- All text in EN + DE
