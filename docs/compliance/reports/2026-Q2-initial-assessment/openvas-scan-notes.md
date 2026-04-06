# OpenVAS Network Security Scan

**Date:** 2026-04-06
**Target:** 72.61.154.115 (VPS)
**Scanner:** Not yet installed

## Scope
- All open ports on VPS
- Service detection
- Known vulnerability checks

## How to Run

OpenVAS is not currently running on the VPS. To set up:

1. Deploy the Greenbone Community Edition container on the VPS:
```bash
ssh root@72.61.154.115
docker run -d --name openvas \
  -p 9392:9392 \
  greenbone/openvas-scanner:latest
```

2. Alternatively, use the full Greenbone Community Edition stack:
```bash
# On VPS, create a dedicated compose file
mkdir -p /opt/openvas && cd /opt/openvas
# Download the official docker-compose.yml from Greenbone
curl -fsSL https://greenbone.github.io/docs/latest/_static/docker-compose-22.4.yml \
  -o docker-compose.yml
docker compose up -d
```

3. Access the web UI at `https://72.61.154.115:9392`
4. Default credentials: admin / admin (change immediately)
5. Create a scan target for localhost (127.0.0.1) to scan all VPS services
6. Run a "Full and fast" scan

### Running a scan via CLI (once installed):
```bash
ssh root@72.61.154.115 'docker exec openvas greenbone-nvt-sync && \
  docker exec openvas gvm-cli socket --xml "<create_target><name>VPS Self-Scan</name><hosts>127.0.0.1</hosts></create_target>"'
```

## Findings
TBD -- to be populated after scan

## Status
Pending -- OpenVAS not yet deployed on VPS
