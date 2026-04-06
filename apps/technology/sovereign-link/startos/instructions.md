# Sovereign Link

**Part of the [brickos.io](https://brickos.io) platform**

A self-hosted URL shortener with NOSTR login. Privacy-first, open source.

## Getting Started

1. Open Sovereign Link from your Start9 dashboard
2. Register an account (first user becomes admin)
3. Or login with your NOSTR key (NIP-98, no email required)
4. Start creating short links

## NOSTR Login

If you have a NOSTR browser extension (nos2x, Alby):
1. Click "NOSTR" on the login page
2. Click "Login with NOSTR"
3. Approve the signing request in your extension
4. You are logged in, no email needed

## Shorten Your .onion Services

Sovereign Link is ideal for shortening Tor hidden service addresses:

```
your-sovereign-link.onion/r/btcpay  ->  your-btcpay.onion
your-sovereign-link.onion/r/cloud   ->  your-nextcloud.onion
your-sovereign-link.onion/r/chat    ->  your-matrix.onion
```

Share clean, memorable links instead of 56-character .onion addresses.

## API Access

Generate an API key in Settings for script/automation access:

```
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://your-sovereign-link.onion/api/v1/links
```

## Backup

Your data (links, users, clicks) is stored in a SQLite database.
Start9 handles backups automatically via the backup system.

## Tor Access

Your Sovereign Link is accessible via Tor at your .onion address.
Share short links as: `your-onion-address.onion/r/CODE`

## Support

- GitHub: https://github.com/sovereignbrick/brickos
- Platform: https://brickos.io
