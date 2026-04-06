# Business Continuity and Disaster Recovery Strategy

**Issue:** #363
**Last updated:** 2026-04-07
**Owner:** Platform team

## RPO/RTO Targets

| Service | RPO (max data loss) | RTO (max downtime) | Notes |
|---------|--------------------|--------------------|-------|
| Platform DB (brickos schema) | 1 hour | 30 minutes | Core auth, orgs, licensing |
| SHI App DB (public schema) | 1 hour | 30 minutes | Health data, encrypted at rest |
| Sovereign Voice (NOSTR scheduler) | 24 hours | 5 minutes | Stateless, config in git. systemd restart. |
| Sovereign Link standalone | Per-instance | Per-instance | User's responsibility |
| Website (static) | 0 (in git) | 5 minutes | rsync from repo |

## Backup Schedule

### Database Backups

| Scope | Frequency | Retention |
|-------|-----------|-----------|
| Platform DB (brickos schema) | Hourly automated pg_dump | 24 hourly, 7 daily, 4 weekly |
| Full DB (all schemas) | Daily automated pg_dump | 30 days |

### Other Assets

| Asset | Method | Frequency |
|-------|--------|-----------|
| Git repos | Mirrored to GitHub + GitLab | Real-time push |
| VPS config | Documented in deployment docs | Reproducible from scratch |
| Encryption keys | Offline backup (USB, paper) | On rotation |

## Backup Implementation

### Current State

- Manual `pg_dump` before each deploy
- No automated schedule
- Backups stored on same VPS (not ideal)

### Target State

- Cron-based automated backup script (`/opt/brickos/scripts/backup-db.sh`)
- Hourly platform schema dump, daily full dump
- Retention cleanup via `find -mtime` in the backup script
- Storage: local VPS `/var/backups/brickos/` + off-site (to be determined)
- Encryption: backup files encrypted at rest with `age` (or `gpg`)
- Backup script logs to `/var/log/brickos/backup.log`

### Backup Script Outline

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/brickos"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="brickos"

# Hourly: platform schema only
pg_dump -Fc --schema=brickos "$DB_NAME" \
  | age -r "$BACKUP_PUBLIC_KEY" \
  > "$BACKUP_DIR/hourly/brickos_schema_${TIMESTAMP}.dump.age"

# Daily (runs at 02:00): full database
if [ "$(date +%H)" = "02" ]; then
  pg_dump -Fc "$DB_NAME" \
    | age -r "$BACKUP_PUBLIC_KEY" \
    > "$BACKUP_DIR/daily/full_${TIMESTAMP}.dump.age"
fi

# Retention cleanup
find "$BACKUP_DIR/hourly" -mtime +1 -delete   # keep 24h
find "$BACKUP_DIR/daily"  -mtime +30 -delete   # keep 30d
# Weekly copies promoted separately
```

## Disaster Recovery Runbook

### Scenario 1: VPS Total Loss

**Symptoms:** VPS unreachable, provider confirms hardware failure or data loss.

**Steps:**

1. Provision new VPS (same provider or alternative)
2. Run base setup: OS hardening, firewall, Docker, PostgreSQL
3. Restore DNS to point to new VPS IP
4. Clone deployment repo: `git clone <deploy-repo>`
5. Restore latest database backup:
   ```bash
   age -d -i /path/to/private-key backup.dump.age > backup.dump
   pg_restore -d brickos backup.dump
   ```
6. Set environment variables (`ENCRYPTION_KEY`, `DATABASE_URL`, etc.)
7. Start services: `docker compose up -d`
8. Verify: health check endpoints, test login, spot-check data
9. Re-enable cron jobs (backups, NOSTR scheduler)

**Estimated time:** 30-60 minutes (assuming backup is accessible off-site)

### Scenario 2: Database Corruption

**Symptoms:** Query errors, data inconsistencies, PostgreSQL crash loop.

**Steps:**

1. Stop application services: `docker compose stop`
2. Assess damage: check PostgreSQL logs, try `pg_dump` of uncorrupted tables
3. If partial: restore only affected schemas from backup
4. If full corruption:
   ```bash
   dropdb brickos
   createdb brickos
   age -d -i /path/to/private-key latest_backup.dump.age > latest.dump
   pg_restore -d brickos latest.dump
   ```
5. Restart services: `docker compose up -d`
6. Verify data integrity, check row counts against known baselines
7. Notify affected users if data loss exceeds RPO

### Scenario 3: Container Failure

**Symptoms:** Service returns 502/503, container exited or restart-looping.

**Steps:**

1. Check logs: `docker compose logs <service> --tail 100`
2. Restart the failed container: `docker compose restart <service>`
3. If restart fails, rebuild: `docker compose up -d --build <service>`
4. If image is corrupted, pull fresh: `docker compose pull && docker compose up -d`
5. Check dependent services (database connectivity, env vars)

**Estimated time:** 5-15 minutes

### Scenario 4: DNS/CDN Failure

**Symptoms:** Domain does not resolve, HTTPS certificate errors.

**Steps:**

1. Verify DNS propagation: `dig brickos.io` from multiple locations
2. If DNS provider is down: switch to backup provider, update NS records at registrar
3. Direct IP access: share VPS IP with critical users as temporary workaround
4. Tor .onion fallback: if configured, share .onion address for emergency access
5. Once DNS is restored, verify HTTPS certificate (may need `certbot renew`)

### Scenario 5: Key Compromise

**Symptoms:** Suspected unauthorized access, leaked credentials.

**Steps:**

1. **Immediate:** Rotate the compromised key
   - `ENCRYPTION_KEY`: generate new key, re-encrypt all data (requires app-level migration)
   - Database password: `ALTER USER ... PASSWORD ...`, update env vars, restart services
   - API keys/tokens: revoke and regenerate
   - SSH keys: remove compromised key from `authorized_keys`, add new key
2. Review access logs for unauthorized activity
3. If `ENCRYPTION_KEY` is compromised:
   - Data must be re-encrypted with new key (application-level process)
   - Old backups remain encrypted with old key, store old key securely for restore purposes
4. Notify affected users per incident response plan (see `docs/security/incident-response.md`)
5. Post-incident review within 48 hours

## Testing Schedule

| Test | Frequency | Description |
|------|-----------|-------------|
| Backup restore | Monthly | Restore latest backup to a test database, verify row counts and spot-check data |
| DR simulation | Quarterly | Simulate VPS loss: provision fresh VPS, restore from backup, verify services |
| Failover test | Before major releases | Verify container restart, database failover, DNS fallback |
| Key rotation drill | Annually | Practice key rotation procedure end-to-end |

### Test Checklist

- [ ] Backup file is accessible from off-site storage
- [ ] Backup file decrypts successfully
- [ ] `pg_restore` completes without errors
- [ ] Application starts and passes health checks
- [ ] Sample user can log in and view their data
- [ ] Encrypted fields decrypt correctly with current key
