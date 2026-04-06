```
// ============================================================================
//                          SOVEREIGN VOICE
//
//                    PUBLISH . SCHEDULE . OWN
//
//   Your words should live on your terms.
//   No algorithm decides who sees them.
//   No platform can delete them.
//
//   NOSTR is the protocol. Relays are the network.
//   This tool is the scheduler.
//
//   Write your notes. Set the time. Walk away.
//   Your content publishes itself to the relays
//   you choose, on the schedule you define.
//
//   No accounts. No dashboards. No middlemen.
//   Just your nsec, your words, and cron.
//
//   Your content. Your relays. Your schedule.
//   No platform needed.
//
//   https://brickos.io/
// ============================================================================
```

# NOSTR Scheduler (BrickOS)

*"Can I publish on my own terms, on my own schedule?"*

A Node.js/TypeScript CLI tool that schedules and publishes NOSTR notes (kind 1 short notes and kind 30023 NIP-23 long-form articles) on a cron schedule.

## Features

- **Immediate publishing** - push a note to relays right now
- **Scheduled publishing** - define publish times in a JSON config, run as a daemon
- **Long-form support** - NIP-23 articles with title, summary, d-tag, hashtags
- **Companion notes** - auto-publish a kind 1 teaser alongside long-form articles
- **Retry logic** - relay connections fail; the scheduler retries
- **Publish log** - every publish logged with timestamp, event ID, relay results
- **Idempotent** - already-published notes are skipped on restart

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Copy and edit config
cp .env.example .env
cp schedule.example.json schedule.json

# Publish a note immediately
nostr-schedule publish notes/my_note.txt

# Run the scheduler daemon
nostr-schedule schedule schedule.json

# List scheduled notes and their status
nostr-schedule list schedule.json

# Publish a test note (and delete it)
nostr-schedule test
```

## Configuration

### Environment Variables (.env)

| Variable | Required | Description |
|---|---|---|
| `NOSTR_NSEC` | Yes | Your NOSTR secret key (nsec1...) |
| `NOSTR_RELAYS` | No | Comma-separated relay URLs (overrides schedule.json) |
| `LOG_FILE` | No | Path to publish log (default: `./publish.log`) |

### Schedule Config (schedule.json)

See `schedule.example.json` for a full example. Each note entry supports:

| Field | Kind | Description |
|---|---|---|
| `id` | 1, 30023 | Unique identifier (used to track publish state) |
| `publishAt` | 1, 30023 | ISO 8601 timestamp or cron expression |
| `kind` | 1, 30023 | NOSTR event kind |
| `content` | 1 | Inline note content |
| `contentFile` | 1, 30023 | Path to content file (relative to project root) |
| `title` | 30023 | Article title (NIP-23) |
| `slug` | 30023 | Article d-tag / URL slug (NIP-23) |
| `summary` | 30023 | Article summary (NIP-23) |
| `hashtags` | 1, 30023 | Array of hashtag strings |
| `companion` | 30023 | Optional kind 1 note published alongside the article |

## Deployment

### As a systemd service

```ini
[Unit]
Description=NOSTR Scheduler
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nostr-scheduler
ExecStart=/usr/bin/node dist/index.js schedule schedule.json
Restart=on-failure
RestartSec=30
EnvironmentFile=/opt/nostr-scheduler/.env

[Install]
WantedBy=multi-user.target
```

### With pm2

```bash
pm2 start dist/index.js --name nostr-scheduler -- schedule schedule.json
pm2 save
```

### One-shot via system cron

```bash
# Run every minute, the scheduler checks if any notes are due
* * * * * cd /opt/nostr-scheduler && node dist/index.js schedule schedule.json --once
```

## Cross-Pillar Integration

- **Community** - Publish community announcements and governance proposals to NOSTR
- **Attention** - Schedule content drops for maximum reach
- **Health** - Publish "Proof of Blood" article series on a defined cadence

See [docs/design/001-sovereign-stack-vision.md](../../../docs/design/001-sovereign-stack-vision.md) for the full design.
