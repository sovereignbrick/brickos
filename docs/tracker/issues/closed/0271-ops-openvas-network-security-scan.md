---
number: 271
github_number: 485
title: "ops: OSI Layer 3-4 network security scan with OpenVAS"
labels: [ops, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

We need to validate our network-level security (OSI Layer 3 - Network, Layer 4 - Transport) by running vulnerability scans against our staging and production infrastructure. This complements our existing application-level security (Layer 7) with lower-level network hardening.

## Why

- Our current security controls focus on application layer (AES-256-GCM, RLS, JWT, CORS, rate limiting)
- We have no visibility into network-level vulnerabilities (open ports, weak TLS configs, SSH exposure, firewall gaps)
- Compliance frameworks (NIS2, DORA, Cyber Resilience Act) require documented network security assessments
- Needed for potential penetration test preparation

## Tool: OpenVAS (Greenbone Vulnerability Management)

OpenVAS is the open-source industry standard for network vulnerability scanning:
- Scans TCP/UDP ports, identifies services, checks for known CVEs
- Tests TLS configuration (cipher suites, protocol versions, certificate chain)
- Detects misconfigured firewalls, exposed services, default credentials
- Generates PDF/HTML reports suitable for compliance documentation
- Free (Community Edition) or paid (Greenbone Enterprise)

## Scope

### Layer 3 (Network)
- [ ] IP range scan of VPS (72.61.154.115)
- [ ] Firewall rule audit (what ports are exposed?)
- [ ] ICMP/ping response policy
- [ ] DNS configuration security (DNSSEC, zone transfer protection)

### Layer 4 (Transport)
- [ ] Full TCP port scan (identify all listening services)
- [ ] UDP service discovery
- [ ] TLS/SSL configuration audit (cipher suites, protocol versions, HSTS)
- [ ] SSH configuration audit (key exchange, MAC algorithms, password auth disabled?)
- [ ] Certificate chain validation

### Expected Findings to Verify
- [ ] Only ports 80, 443 exposed to public (HTTP/HTTPS via nginx)
- [ ] SSH on non-standard port or restricted by IP
- [ ] PostgreSQL NOT exposed to public (Docker internal network only)
- [ ] Redis NOT exposed to public
- [ ] TLS 1.3 enforced, TLS 1.0/1.1 disabled
- [ ] Strong cipher suites only (no RC4, DES, 3DES)
- [ ] HSTS header with includeSubDomains
- [ ] No unnecessary services running

## Implementation Steps

1. [ ] Install OpenVAS on a separate machine (not on the VPS itself)
   ```bash
   docker run -d -p 9392:9392 greenbone/openvas-scanner
   ```
2. [ ] Run initial scan against staging VPS
3. [ ] Review findings, classify by severity (Critical/High/Medium/Low)
4. [ ] Fix Critical and High findings
5. [ ] Re-scan to verify fixes
6. [ ] Run scan against production VPS
7. [ ] Generate compliance report (PDF)
8. [ ] Schedule recurring monthly scan

## Deliverables

- [ ] OpenVAS scan report (staging) - PDF
- [ ] OpenVAS scan report (production) - PDF
- [ ] Remediation log (findings + fixes applied)
- [ ] Network security baseline document
- [ ] Monthly scan schedule (cron or manual)

## References

- Issue #245: Security hardening framework (Layer 1-6)
- Issue #252: EU regulatory compliance audit
- Design 032: Reference ranges protocol impact (for MD, shows compliance posture)
- OpenVAS: https://www.openvas.org/
