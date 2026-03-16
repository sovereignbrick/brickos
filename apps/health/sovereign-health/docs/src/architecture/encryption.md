# Encryption

Sovereign Health encrypts health measurement values at rest using AES-256-GCM. This ensures that even if the database is compromised, measurement data remains unreadable without the encryption key.

## How It Works

When `ENCRYPTION_KEY` is set in the environment, the backend encrypts measurement values before writing them to the database and decrypts them when reading.

**Write path:**
1. User submits a measurement (e.g., glucose = 95 mg/dL)
2. Backend generates a random 12-byte nonce
3. Backend encrypts the value using AES-256-GCM with the key and nonce
4. The nonce and ciphertext are base64-encoded and stored together in the `value` column
5. The measurement is written to PostgreSQL

**Read path:**
1. Backend reads the encrypted value from the database
2. Backend extracts the nonce and ciphertext
3. Backend decrypts using AES-256-GCM with the same key
4. The plaintext value is returned in the API response

## Encryption Key

The `ENCRYPTION_KEY` must be a 64-character hexadecimal string (representing 32 bytes for AES-256).

Generate one:

```bash
openssl rand -hex 32
```

Store it in your `.env` file:

```bash
ENCRYPTION_KEY=a1b2c3d4e5f6...  # 64 hex characters
```

## What Gets Encrypted

- **Encrypted:** measurement values (the numeric health data)
- **Not encrypted:** marker slugs, timestamps, protocol tags, user IDs, and other metadata

This design allows the backend to query, filter, and sort by metadata (dates, markers, protocols) without decrypting every row, while keeping the sensitive health data protected.

## Admin Cannot See User Data

This is a core privacy principle. Because measurement values are encrypted with a server-level key:

- Database administrators who access PostgreSQL directly see only ciphertext
- There is no admin panel that displays user health data
- The backend only decrypts data when responding to authenticated API requests from the owning user

An administrator with access to both the database and the `ENCRYPTION_KEY` could theoretically decrypt the data. For maximum security, restrict access to the `.env` file and consider separating key management from database administration.

## Key Rotation

Key rotation is not yet automated. To rotate the encryption key:

1. Export all data using the data export feature
2. Update `ENCRYPTION_KEY` in `.env`
3. Restart the backend
4. Re-import the data (values will be re-encrypted with the new key)

A built-in key rotation mechanism is planned for a future release.

## Without Encryption

If `ENCRYPTION_KEY` is not set, measurement values are stored in plaintext. The application functions normally but without at-rest encryption. This may be acceptable for single-user self-hosted deployments where the database is only accessible locally.

## Algorithm Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key size | 256 bits (32 bytes) |
| Nonce size | 96 bits (12 bytes) |
| Authentication tag | 128 bits (16 bytes) |
| Nonce generation | Random per encryption operation |

The Rust implementation uses the `aes-gcm` crate.
