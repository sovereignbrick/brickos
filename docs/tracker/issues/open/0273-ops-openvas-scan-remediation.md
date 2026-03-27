---
number: 273
title: "ops: OpenVAS vulnerability scan + compliance audit + remediation"
labels: [ops, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

Run full OpenVAS vulnerability scan and compliance audit against production VPS.
Analyze findings, remediate critical/high issues, and document results.

## Scope

### 1. Vulnerability Scan
- [ ] Run "Full and fast" scan against 72.61.154.115
- [ ] Download PDF + CSV reports
- [ ] Classify findings: Critical / High / Medium / Low / Log
- [ ] Document all High+ findings with remediation plan

### 2. Compliance Audit
- [ ] Run CIS Ubuntu benchmark audit
- [ ] Run IT-Grundschutz audit (if available)
- [ ] Download compliance reports
- [ ] Document pass/fail per control category

### 3. Known Remediation Items (from network scan report)
- [ ] Fix port 8080 external exposure (Docker iptables bypass)
  - Add UFW rule: `ufw deny 8080/tcp`
  - Or: `iptables -I DOCKER-USER -p tcp --dport 8080 -j DROP`
- [ ] Harden SSH configuration
  - PermitRootLogin: yes -> prohibit-password
  - PasswordAuthentication: no (key-only)
  - Consider fail2ban

### 4. Log Analysis
- [ ] Review pgAudit logs for anomalies: `docker logs sh-prod-db 2>&1 | grep AUDIT`
- [ ] Review application error logs: `docker logs sovereign-health-backend-1 2>&1 | grep ERROR`
- [ ] Review Gatus alert history
- [ ] Check Sentry for unresolved errors

### 5. Reporting
- [ ] OpenVAS vulnerability scan PDF -> `docs/releases/v0.29.1/`
- [ ] OpenVAS compliance audit PDF -> `docs/releases/v0.29.1/`
- [ ] Remediation log (findings + actions taken)
- [ ] Updated network scan report

## OpenVAS Access
- URL: http://localhost:9392
- Data: /data/openvas/data/ (6TB drive)
- CLI: `docker exec -u gvm openvas gvm-cli --gmp-username admin --gmp-password [pwd] tls --hostname 127.0.0.1 --port 9390`
