---
number: 540
title: "ops: deploy.sh -- chunked scp transfer for Docker images"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [ops, deploy, p1]
created: 2026-04-18
priority: P1
estimate: 0.25d
blocked_by: []
---

Replace `docker save | ssh docker load` with file-based chunked transfer.
The SSH pipe breaks on images above ~100MB due to connection instability.

## Implementation

1. `docker save image:tag | gzip > /tmp/image.tar.gz`
2. Split into 50MB chunks if > 100MB
3. `scp` each chunk with ServerAliveInterval=10
4. Reassemble on VPS: `cat chunks > image.tar.gz`
5. `gunzip -c image.tar.gz | docker load`
6. Clean up temp files on both sides

## Acceptance

- 300MB image transfers without SSH pipe break
- Transfer shows progress
- Rollback tag mechanism still works
- Temp files cleaned up
