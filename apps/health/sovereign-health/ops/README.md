<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Privacy-first platform for collecting, analyzing, and understanding
 blood markers and laboratory data.

 Own your data. Understand your biology. Build health sovereignty.

 https://sovereignhealth.io/
 AGPL-3.0 -- https://gitlab.com/sovereign-health
============================================================================
-->


# Sovereign Health — Ops

Private infrastructure repository.

## Contents

- CI/CD pipeline definitions
- Docker Compose configurations (canonical dev/staging/prod)
- Infrastructure-as-code (Terraform, Ansible, etc.)
- Secrets management configuration
- Monitoring and alerting setup

## Dev environment

```bash
docker compose -f docker-compose.dev.yml up
```

This starts the full stack: PostgreSQL, Redis, backend, and frontend.
