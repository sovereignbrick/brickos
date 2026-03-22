---
title: "feat: Admin-configurable announcement bar (enable/disable + custom content)"
milestone: "User Experience & Onboarding"
milestone_number: 17
status: pending
issue_number: null
---

## Context

The top announcement bar (`DemoBanner` in `src/components/demo-banner.tsx`) is currently hardcoded to show only for demo users with a fixed early-access signup CTA. The content, visibility, and behavior are all baked into the frontend code.

**Current behavior:**
- Only visible when `isDemo` is true
- Hardcoded text: demo profile label + "Fruehen Zugang erhalten?" + email input
- No admin control over visibility or content

## Requirements

### Admin Panel Controls (Settings tab)
- **Enable/disable toggle** for the announcement bar (global on/off)
- **Target audience selector**: all users, demo only, logged-in only, logged-out only
- **Content fields**:
  - Message text (i18n: EN + DE)
  - CTA button label (i18n: EN + DE)
  - CTA button action: link URL, early-access signup, or none
  - Background color / style preset (info, warning, promo)
- **Dismissible toggle**: whether users can close the bar
- **Schedule** (optional): start date / end date for time-limited promotions

### Backend
- Store config in `app_settings` (or new `announcement_bar` table)
- `GET /settings/announcement-bar` (public, no auth required)
- `PUT /admin/settings/announcement-bar` (admin only)

### Frontend
- Fetch bar config on layout mount
- Render dynamically based on admin config instead of hardcoded content
- Preserve current dark-mode styling and dismiss behavior
- Cache config to avoid re-fetch on every navigation

## Current Files
- Component: `apps/health/sovereign-health/frontend/src/components/demo-banner.tsx`
- Layout mount: `apps/health/sovereign-health/frontend/src/app/layout.tsx`
- i18n keys: `demo.*` in `en.json` / `de.json`

## Acceptance Criteria
- [ ] Admin can enable/disable the bar without a deploy
- [ ] Admin can change the message text (EN + DE) without a deploy
- [ ] Admin can choose CTA type (link, early-access, none)
- [ ] Bar respects target audience setting
- [ ] Existing dismiss behavior preserved
