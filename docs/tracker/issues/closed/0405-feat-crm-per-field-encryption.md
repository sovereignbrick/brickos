---
number: 405
title: "feat: CRM per-field encryption via brickos-crypto"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, security]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [402]
---

Set up per-field AES-256-GCM encryption for PII fields using `brickos-crypto`.

## Encrypted Fields

| Table | Fields |
|-------|--------|
| crm_contacts | email, phone, notes |
| crm_companies | notes |
| crm_projects | notes |

## Implementation

- Init `brickos_crypto::Encryptor` from `SCR_ENCRYPTION_KEY` env var
- Register as `web::Data<Encryptor>` in app state
- On write: `encryptor.encrypt(plaintext)?` -> store `"v1:{iv}:{ciphertext}"`
- On read: `encryptor.decrypt(ciphertext)?` -> return plaintext in API response
- Admin endpoints must also decrypt before returning (per feedback)
- NULL values remain NULL (don't encrypt empty fields)

## Acceptance Criteria

- Contact email stored as `v1:...` in database, returned as plaintext in API
- Direct DB query shows encrypted values, not plaintext
- Missing encryption key prevents API startup (fail fast)
