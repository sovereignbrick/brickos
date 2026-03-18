# VPS Prompt — Website Bug Fixes (2026-03-15)

Run this on the VPS via SSH (`ssh root@72.61.154.115`).

---

## Task 1: Fix "Try the App" localhost links

The website at `https://sovereignhealth.io/` has CTA buttons linking to `localhost:3000` instead of `https://app.sovereignhealth.io`.

```bash
# Find all localhost references in the website files
cd /opt/sovereign-health/homepage
grep -rn "localhost" . --include="*.html" --include="*.js" --include="*.json"

# Replace all localhost:3000 with the production app URL
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.json" \) \
  -exec sed -i 's|http://localhost:3000|https://app.sovereignhealth.io|g' {} +
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.json" \) \
  -exec sed -i 's|localhost:3000|app.sovereignhealth.io|g' {} +

# Verify no localhost references remain
grep -rn "localhost" . --include="*.html" --include="*.js" --include="*.json"
```

## Task 2: Fix missing favicon

Check if favicon files exist in the website root:

```bash
ls -la /opt/sovereign-health/homepage/favicon*
ls -la /opt/sovereign-health/homepage/apple-touch-icon*
ls -la /opt/sovereign-health/homepage/site.webmanifest
```

If missing, copy from the app's public folder:

```bash
# Check if the app container has them
docker exec openclaw-pgrt-frontend-1 ls /app/public/favicon.ico 2>/dev/null
# Or check the prod frontend
docker exec sovereign-health-frontend-1 ls /app/public/favicon.ico 2>/dev/null

# Copy favicon files from app container to website root
docker cp sovereign-health-frontend-1:/app/public/favicon.ico /opt/sovereign-health/homepage/
docker cp sovereign-health-frontend-1:/app/public/favicon-16x16.png /opt/sovereign-health/homepage/ 2>/dev/null
docker cp sovereign-health-frontend-1:/app/public/favicon-32x32.png /opt/sovereign-health/homepage/ 2>/dev/null
docker cp sovereign-health-frontend-1:/app/public/apple-touch-icon.png /opt/sovereign-health/homepage/ 2>/dev/null
```

Then check the HTML `<head>` in `index.html`:

```bash
head -30 /opt/sovereign-health/homepage/index.html
```

If favicon `<link>` tags are missing, add them. The tags should be:
```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

## Task 3: Purge Cloudflare cache

After fixes, purge Cloudflare cache so changes take effect immediately:
- Go to Cloudflare dashboard → sovereignhealth.io → Caching → Purge Everything

## Task 4: Verify

```bash
curl -s https://sovereignhealth.io/ | grep -i "localhost"
curl -s https://sovereignhealth.io/favicon.ico -o /dev/null -w "%{http_code}"
```

---

**⚠️ NOTE:** These are hotfixes on the deployed website files. The SOURCE of these bugs is in the website repo on Helmut's laptop (`~/projects/sovereign-health/saas/website`). The laptop Claude Code prompt below also fixes the source so the next build doesn't reintroduce these bugs.
