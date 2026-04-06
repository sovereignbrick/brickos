# Incident Response Procedure

## Severity Levels
- **P1 Critical**: Data breach, unauthorized access to health data, complete service outage
- **P2 High**: Partial data exposure, authentication bypass, significant degradation
- **P3 Medium**: Minor vulnerability, non-sensitive data exposure, recoverable outage
- **P4 Low**: Configuration issue, cosmetic security concern

## Response Steps

### 1. Detection
- Sentry error alerts
- Gatus uptime monitoring
- ntfy/Telegram notifications
- User reports
- Audit log anomalies

### 2. Triage (within 15 minutes)
- Assess severity (P1-P4)
- Identify affected systems
- Determine scope of impact

### 3. Containment (within 1 hour for P1-P2)
- Isolate affected service if needed
- Revoke compromised credentials (JWT rotation: set JWT_SECRET_PREVIOUS, rotate JWT_SECRET)
- Block malicious IPs via Cloudflare
- Disable affected features if necessary

### 4. Investigation
- Review audit_log table for anomalous access patterns
- Check Sentry for error traces
- Review pgAudit logs for unauthorized DB queries
- Check access_log for data export events
- Review AI usage for unusual patterns

### 5. Remediation
- Patch the vulnerability
- Deploy fix (staging first, then production)
- Restore from backup if needed (DB backups in /root/backups/ on VPS)

### 6. Notification (GDPR Art. 33 + 34)
- **Within 72 hours**: Notify supervisory authority (DPA) if personal data breach
- **Without undue delay**: Notify affected users if high risk to their rights
- Document: what happened, what data was affected, what we did, what we're doing to prevent recurrence

### 7. Post-mortem
- Document root cause
- Preventive measures
- Update security controls
- File in docs/project-files/security/incidents/

## Contact
- Platform admin: [your email]
- VPS provider: [provider support]
- Cloudflare: dashboard.cloudflare.com
