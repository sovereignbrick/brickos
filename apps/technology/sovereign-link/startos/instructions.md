# Sovereign Link

## Getting Started

1. Open Sovereign Link from your Start9 dashboard
2. Create an admin account (email + password)
3. Start creating short links!

## NOSTR Login

If you have a NOSTR browser extension (nos2x, Alby):
1. Click "NOSTR" on the login page
2. Click "Login with NOSTR"
3. Approve the signing request in your extension
4. You're logged in -- no email needed!

## API Access

Generate an API key in Settings for script/automation access:

```
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://your-sovereign-link.local/api/v1/links
```

## Backup

Your data (links, users, clicks) is stored in a SQLite database.
Start9 handles backups automatically via the backup system.

## Tor Access

Your Sovereign Link is accessible via Tor at your .onion address.
Share short links as: `your-onion-address.onion/r/CODE`
