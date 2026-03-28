---
number: 288
github: 269
title: "fix: ZAP security scan findings -- CSP, HSTS, X-Content-Type-Options"
labels: [fix, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

ZAP (Checkmarx) security scan from 2026-03-27 against sovereignhealth.io found 7 alert types. No High severity findings. Focus is on HTTP security headers that are missing on certain responses.

## Findings Summary

| Severity | Alert | Count | Site |
|----------|-------|-------|------|
| **Medium** | Content Security Policy (CSP) Header Not Set | 6 | http://sovereignhealth.io |
| **Low** | Strict-Transport-Security Header Not Set | 5 | https://sovereignhealth.io (static assets) |
| **Low** | X-Content-Type-Options Header Missing | 6 | http://sovereignhealth.io |
| Info | Re-examine Cache-control Directives | 5 | -- |
| Info | Retrieved from Cache | 5 | -- |
| Info | User Agent Fuzzer | 5 | -- |
| Info | User Controllable HTML Element Attribute (Potential XSS) | 1 | -- |

## Analysis

### 1. CSP Header Not Set (Medium, High Confidence)
**Issue:** `http://sovereignhealth.io` (plain HTTP) responses lack Content-Security-Policy header.
**Root cause:** The website (sovereignhealth.io) is served via Cloudflare + nginx. CSP headers are set on the app (app.sovereignhealth.io) via Actix-web middleware but not on the marketing website.
**Fix:** Add CSP header to nginx config for the website, or use Cloudflare Transform Rules to inject CSP on all responses.

### 2. HSTS Not Set on Static Assets (Low, High Confidence)
**Issue:** `/_next/static/chunks/*.css` and `*.js` responses from https://sovereignhealth.io lack `strict-transport-security` header.
**Root cause:** HSTS is set on HTML responses via Actix-web but Cloudflare-served static assets (via CDN) may not include it.
**Note:** The main HTML response DOES include `strict-transport-security: max-age=31536000; includeSubDomains` -- this is only missing on CDN-cached static files.
**Fix:** Enable HSTS in Cloudflare dashboard (SSL/TLS > Edge Certificates > HSTS) which applies to all responses including static assets.

### 3. X-Content-Type-Options Missing (Low, Medium Confidence)
**Issue:** `http://sovereignhealth.io/robots.txt` response lacks `x-content-type-options: nosniff`.
**Root cause:** robots.txt is served by Cloudflare (managed robots.txt) without the nosniff header.
**Note:** The main HTML response DOES include this header. Only the Cloudflare-managed robots.txt is missing it.
**Fix:** Can be addressed via Cloudflare Transform Rules to add the header to all responses.

### 4. Informational Findings (No Action Needed)
- **Cache-control directives:** Static assets use `public, max-age=31536000, immutable` which is correct for hashed Next.js chunks.
- **Retrieved from Cache:** Cloudflare CDN caching is working as intended.
- **User Agent Fuzzer:** No vulnerabilities found through fuzzing.
- **User Controllable HTML Element:** Informational only, no actual XSS found.

## Performance Insight

- **app.sovereignhealth.io:** 52% slow responses -- needs investigation (likely cold starts or API latency)
- **https://sovereignhealth.io:** 26% slow responses -- acceptable for SSR pages
- **api.sovereignhealth.io:** 7% slow responses -- good

## Remediation Plan

### Priority 1: CSP Header (Medium severity)
- [ ] Define CSP policy for website: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';`
- [ ] Add via Cloudflare Transform Rules or nginx config
- [ ] Test that website still renders correctly with CSP

### Priority 2: HSTS on All Responses
- [ ] Enable HSTS in Cloudflare dashboard (SSL/TLS > Edge Certificates > HSTS)
- [ ] Set: max-age=31536000, includeSubDomains, preload
- [ ] Consider submitting to HSTS preload list (hstspreload.org)

### Priority 3: X-Content-Type-Options on All Responses
- [ ] Add `x-content-type-options: nosniff` via Cloudflare Transform Rules
- [ ] Applies to all responses including managed robots.txt

### Priority 4: Performance Investigation
- [ ] Investigate 52% slow responses on app.sovereignhealth.io
- [ ] Check if container resource limits (1 vCPU, 3.8GB) are the bottleneck

## References

- ZAP Scan Report: 2026-03-27 (emailed)
- OWASP A05:2021 Security Misconfiguration
- CWE-693: Protection Mechanism Failure
