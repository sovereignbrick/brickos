---
number: 289
github_number: 441
title: "ops: OpenVAS recurring monthly scans + automatic feed updates"
labels: [ops, security, infrastructure]
milestone: privacy-and-security
---

## Description

After the initial OpenVAS scan completes, set up recurring monthly vulnerability scans and automatic feed updates so the NVT/SCAP/CERT databases stay current with the latest CVEs.

## Current State

- OpenVAS container runs with `SKIPSYNC=false` -- feeds sync on container start only
- No scheduled recurring scans
- auto-scan.sh is a one-shot script (removes itself from cron after first scan)
- First scan took ~4 hours for feed initialization (1.6M CPEs, 16GB SCAP data)

## Feed Update Strategy

### Option A: Container restart (simple)
```bash
# Monthly cron: restart container to trigger feed sync
0 2 1 * * docker restart openvas
```
- Pro: Simple, uses built-in sync
- Con: Downtime during sync (2-4 hours), entire feed reprocessed

### Option B: In-container feed update (recommended)
```bash
# Weekly cron: update feeds inside running container
0 3 * * 0 docker exec openvas greenbone-feed-sync
```
- Pro: No restart needed, incremental updates
- Con: May still lock gvmd during SCAP processing

### Option C: Greenbone feed sync script
```bash
# Use the official sync commands
docker exec openvas greenbone-feed-sync --type nasl
docker exec openvas greenbone-feed-sync --type scap
docker exec openvas greenbone-feed-sync --type cert
docker exec openvas greenbone-feed-sync --type gvmd-data
```

## Recurring Scan Schedule

- [ ] Create a persistent scan task (not one-shot)
- [ ] Schedule monthly scan via GVM CLI or cron
- [ ] Auto-generate PDF report after each scan
- [ ] Compare findings with previous scan (delta report)
- [ ] Alert via ntfy if new High/Critical findings

## Implementation

- [ ] Choose feed update strategy (A, B, or C)
- [ ] Create `/data/openvas/monthly-scan.sh` script
- [ ] Install cron job for feed updates (weekly)
- [ ] Install cron job for scans (monthly, 1st of month)
- [ ] Test incremental feed update duration
- [ ] Document in ops runbook

## References

- Issue #271: OpenVAS network security scan (initial setup)
- Issue #273: OpenVAS scan remediation
- Greenbone feed sync docs: https://greenbone.github.io/docs/latest/
