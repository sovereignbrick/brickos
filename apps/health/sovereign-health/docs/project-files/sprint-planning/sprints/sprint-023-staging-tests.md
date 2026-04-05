# Sprint 023 -- Staging Test Plan

## Automated Tests (run after deploy)

These tests run automatically via curl against staging API:

```bash
API=https://api.sovereignhealth.io

# 1. Health check
curl -s "$API/health" | jq '.status, .version'

# 2. Search: English
curl -s "$API/api/v1/search?q=glucose&locale=en&limit=5" | jq '.data.total_results, [.data.results[]?.title]'

# 3. Search: German  
curl -s "$API/api/v1/search?q=Glukose&locale=de&limit=3" | jq '.data.total_results, [.data.results[]?.title]'

# 4. Suggest
curl -s "$API/api/v1/search/suggest?q=glu&locale=en" | jq '[.data.suggestions[]?.text]'

# 5. Search index count
curl -s "$API/api/v1/search?q=a&locale=en&limit=1" | jq '.data.facets'

# 6. Public search (no auth) -- should have login_cta
curl -s "$API/api/v1/search?q=glucose&locale=en" | jq '.data.login_cta'

# 7. Registration status (public)
curl -s "$API/auth/registration-status" | jq '.data.registration_enabled'

# 8. Content endpoints
curl -s "$API/v1/content/zones?locale=en" | jq '.total'
curl -s "$API/v1/content/markers?locale=en" | jq '.total'
```

## Manual Testing (requires browser + login)

### Search (Priority: HIGH)
- [ ] Open app, press Ctrl+K -- search overlay opens
- [ ] Type "glucose" -- suggestions appear within 300ms
- [ ] Press Enter -- navigates to /search?q=glucose
- [ ] Results page shows tab bar: All | Markers | Food | etc.
- [ ] Click a marker result -- navigates to /markers/glucose
- [ ] Click a content tile result -- navigates to marker page with anchor
- [ ] Search for "Glukose" (switch to DE locale first) -- German results appear
- [ ] Search with no results (e.g., "xyznonexistent") -- empty state with Dr. Alex CTA
- [ ] Mobile: verify tab bar scrolls horizontally
- [ ] Verify search icon visible in navbar

### Reset All Data (Priority: HIGH -- test with demo account only!)
- [ ] Go to Settings > Privacy tab
- [ ] "Reset All Data" card visible above "Delete Account"
- [ ] Click "Reset All Data" -- shows record counts
- [ ] Type "RESET" in confirmation field
- [ ] **DO NOT confirm on real account** -- verify button enables only when input matches
- [ ] Cancel and verify nothing happened

### Admin: Signup Tracking (Priority: MEDIUM)
- [ ] Login as admin
- [ ] Go to Admin > Users tab
- [ ] Verify "Source" column visible (Direct or Affiliate)
- [ ] Verify acquisition summary cards above table (Direct, Affiliate, Affiliates, Conv. Rate)
- [ ] Search for a known affiliate-referred user -- verify "Affiliate" badge with referrer hint

### Admin: AI Cost Tracking (Priority: LOW)
- [ ] Go to Admin > AI Usage tab
- [ ] Verify 4 stat cards (Total Cost, Total Calls, Avg Cost/User, Total Tokens)
- [ ] If any user has high usage: verify "HIGH" badge appears

### Lighthouse (Priority: LOW)
- [ ] Zone card description text is readable (contrast fix)

### E2E Tests (Priority: LOW)
- [ ] Run: `E2E_BASE_URL=https://app.sovereignhealth.io E2E_API_URL=https://api.sovereignhealth.io pnpm test:e2e`
- [ ] Verify public page tests pass
- [ ] Auth tests require E2E_USER_EMAIL/PASSWORD env vars
