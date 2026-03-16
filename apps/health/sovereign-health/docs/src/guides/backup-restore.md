# Backup & Restore

Regular backups protect your health data against hardware failure, corruption, or accidental deletion. This guide covers PostgreSQL backup and restore procedures for Sovereign Health.

## Quick Backup

Create a SQL dump of the entire database:

```bash
docker compose exec db pg_dump -U sovereign sovereign_health > backup.sql
```

## Quick Restore

Restore from a SQL dump:

```bash
cat backup.sql | docker compose exec -T db psql -U sovereign sovereign_health
```

If restoring to a fresh database, create it first:

```bash
docker compose exec db createdb -U sovereign sovereign_health
cat backup.sql | docker compose exec -T db psql -U sovereign sovereign_health
```

## Compressed Backups

For smaller backup files, pipe through gzip:

```bash
docker compose exec -T db pg_dump -U sovereign sovereign_health | gzip > backup-$(date +%Y%m%d).sql.gz
```

Restore a compressed backup:

```bash
gunzip -c backup-20260310.sql.gz | docker compose exec -T db psql -U sovereign sovereign_health
```

## Automated Daily Backups

Add a cron job to create daily backups at 3 AM:

```bash
crontab -e
```

Add this line:

```
0 3 * * * cd /path/to/core-backend && docker compose exec -T db pg_dump -U sovereign sovereign_health | gzip > /backups/sh-$(date +\%Y\%m\%d).sql.gz
```

## Backup Retention

Keep a rolling window of backups to manage disk space. This script removes backups older than 30 days:

```bash
find /backups -name "sh-*.sql.gz" -mtime +30 -delete
```

Add it to cron to run daily after the backup:

```
15 3 * * * find /backups -name "sh-*.sql.gz" -mtime +30 -delete
```

## Off-Server Backups

Store backups on a separate server or cloud storage for disaster recovery. Example using rsync:

```bash
rsync -avz /backups/ user@backup-server:/backups/sovereign-health/
```

Or upload to S3-compatible storage:

```bash
aws s3 cp /backups/sh-$(date +%Y%m%d).sql.gz s3://your-bucket/sovereign-health/
```

## What Gets Backed Up

A `pg_dump` captures the entire database:

- User accounts and credentials
- All measurements (encrypted values remain encrypted in the dump)
- Marker definitions and reference ranges
- Knowledge content (foods, supplements, references)
- Medication catalog and user medication records
- Dr. Alex conversation history
- User settings and preferences
- License tier definitions

## What Does NOT Get Backed Up

- The `ENCRYPTION_KEY` (stored in `.env`, not in the database)
- The `.env` file itself
- Docker volumes other than the database

Back up your `.env` file separately. Without the `ENCRYPTION_KEY`, encrypted measurement values cannot be decrypted even if the database is restored.

## Testing Your Backups

Periodically verify that your backups are valid by restoring to a test database:

```bash
docker compose exec db createdb -U sovereign sovereign_health_test
gunzip -c /backups/sh-20260310.sql.gz | docker compose exec -T db psql -U sovereign sovereign_health_test
docker compose exec db dropdb -U sovereign sovereign_health_test
```

## Before Upgrading

Always create a backup before updating Sovereign Health:

```bash
docker compose exec -T db pg_dump -U sovereign sovereign_health | gzip > pre-upgrade-$(date +%Y%m%d).sql.gz
git pull && docker compose pull && docker compose up -d
```
