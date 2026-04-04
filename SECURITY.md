# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in BrickOS, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **GitHub:** Use [private vulnerability reporting](https://github.com/sovereignbrick/brickos/security/advisories/new)
2. **Email:** security@brickos.io

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Action | Timeline |
|--------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix development | Depends on severity |
| Public disclosure | After fix is deployed |

### Severity Classification

| Severity | Examples |
|----------|----------|
| **Critical** | Authentication bypass, data exfiltration, RCE |
| **High** | SQL injection, XSS with data access, privilege escalation |
| **Medium** | CSRF, information disclosure, denial of service |
| **Low** | Minor information leak, missing security headers |

## Security Measures

BrickOS implements defense-in-depth:

- **Encryption at rest:** AES-256-GCM for health measurements
- **Row-Level Security:** PostgreSQL RLS on all user data tables
- **Audit logging:** pgAudit + application-level audit trail
- **DSGVO/GDPR compliance:** Data export, deletion cascade, consent management
- **IP pseudonymization:** SHA-256 hashing in audit logs
- **Dependency scanning:** Dependabot + Cargo audit
- **Secret scanning:** GitHub secret scanning enabled

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Previous release | Security fixes only |
| Older | No |

## Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities. Contributors will be credited here (with permission).
