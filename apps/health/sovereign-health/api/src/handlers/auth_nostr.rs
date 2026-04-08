// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// NIP-98 NOSTR authentication for Sovereign Health.
// Ported from Sovereign Link (apps/technology/sovereign-link/src/auth/nostr.rs).

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    config::Config,
    services::auth::{create_jwt, generate_refresh_token, hash_refresh_token},
    PlatformPool,
};

// ---------------------------------------------------------------------------
// NIP-98 types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct Nip98AuthRequest {
    pub event: Nip98Event,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Nip98Event {
    pub id: String,
    pub pubkey: String,
    pub created_at: i64,
    pub kind: u32,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,
}

// ---------------------------------------------------------------------------
// NIP-98 verification (same logic as Sovereign Link)
// ---------------------------------------------------------------------------

/// Verify a NIP-98 HTTP Auth event.
///
/// Checks:
/// 1. Kind == 27235
/// 2. Timestamp within 60s of now
/// 3. URL tag matches expected endpoint
/// 4. Event ID == SHA-256 of canonical serialization
/// 5. Schnorr signature valid against pubkey
fn verify_nip98_event(event: &Nip98Event, expected_url: &str) -> Result<(), String> {
    // 1. Kind must be 27235
    if event.kind != 27235 {
        return Err("Invalid event kind, expected 27235".into());
    }

    // 2. Check created_at is within 60 seconds of now
    let now = Utc::now().timestamp();
    if (now - event.created_at).unsigned_abs() > 60 {
        return Err("Event timestamp too old or too far in future".into());
    }

    // 3. Check URL tag matches our endpoint
    let url_tag = event.tags.iter().find(|t| t.len() >= 2 && t[0] == "u");
    match url_tag {
        Some(tag) if tag[1] == expected_url => {}
        _ => return Err("URL tag missing or does not match".into()),
    }

    // 4. Verify event ID = SHA-256 of [0, pubkey, created_at, kind, tags, content]
    let canonical = serde_json::json!([
        0,
        event.pubkey,
        event.created_at,
        event.kind,
        event.tags,
        event.content,
    ]);
    let canonical_bytes = canonical.to_string();
    let mut hasher = Sha256::new();
    hasher.update(canonical_bytes.as_bytes());
    let computed_id = hex::encode(hasher.finalize());

    if computed_id != event.id {
        return Err(format!(
            "Event ID mismatch: expected {}, got {}",
            computed_id, event.id
        ));
    }

    // 5. Verify schnorr signature against pubkey using secp256k1
    verify_schnorr_signature(&event.id, &event.pubkey, &event.sig)?;

    Ok(())
}

/// Verify a BIP-340 schnorr signature.
fn verify_schnorr_signature(msg_hex: &str, pubkey_hex: &str, sig_hex: &str) -> Result<(), String> {
    use secp256k1::XOnlyPublicKey;

    let msg_bytes = hex::decode(msg_hex).map_err(|e| format!("Invalid event ID hex: {}", e))?;
    let pubkey_bytes = hex::decode(pubkey_hex).map_err(|e| format!("Invalid pubkey hex: {}", e))?;
    let sig_bytes = hex::decode(sig_hex).map_err(|e| format!("Invalid signature hex: {}", e))?;

    if msg_bytes.len() != 32 {
        return Err("Event ID must be 32 bytes".into());
    }
    if pubkey_bytes.len() != 32 {
        return Err("Public key must be 32 bytes".into());
    }
    if sig_bytes.len() != 64 {
        return Err("Signature must be 64 bytes".into());
    }

    let pubkey = XOnlyPublicKey::from_slice(&pubkey_bytes)
        .map_err(|e| format!("Invalid public key: {}", e))?;
    let sig = secp256k1::schnorr::Signature::from_slice(&sig_bytes)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    let secp = secp256k1::Secp256k1::verification_only();
    secp.verify_schnorr(&sig, &msg_bytes, &pubkey)
        .map_err(|_| "Signature verification failed".to_string())?;

    Ok(())
}

// ---------------------------------------------------------------------------
// POST /auth/nostr -- NOSTR NIP-98 login
// ---------------------------------------------------------------------------

/// Authenticate with a NIP-98 signed event.
/// - If user with this pubkey exists: issue JWT
/// - If not: create user (email=placeholder, nostr_pubkey=pubkey) and issue JWT
pub async fn nostr_login(
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    body: web::Json<Nip98AuthRequest>,
) -> HttpResponse {
    let expected_url = format!("{}/auth/nostr", config.api_base_url);
    if let Err(e) = verify_nip98_event(&body.event, &expected_url) {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_NIP98", "message": e }
        }));
    }

    let pubkey = &body.event.pubkey;

    // Look up user by nostr_pubkey
    let existing = sqlx::query_as::<_, (Uuid, String, String, String)>(
        "SELECT id, role, tier, COALESCE(display_name, '') FROM users WHERE nostr_pubkey = $1 AND is_deleted = false",
    )
    .bind(pubkey)
    .fetch_optional(&platform_pool.0)
    .await;

    let (user_id, role, tier, created) = match existing {
        Ok(Some((id, role, tier, _))) => (id, role, tier, false),
        Ok(None) => {
            // Auto-create user on first NOSTR login
            let new_id = Uuid::new_v4();
            let display_name = format!("nostr:{}", &pubkey[..8.min(pubkey.len())]);
            // Use a placeholder password hash (user cannot log in via email without linking)
            let placeholder_hash = "nostr_only_no_password";

            let result = sqlx::query(
                "INSERT INTO users (id, email, password_hash, display_name, role, tier, nostr_pubkey, email_verified, is_deleted, created_at)
                 VALUES ($1, $2, $3, $4, 'user', 'free', $5, true, false, NOW())
                 ON CONFLICT (nostr_pubkey) DO NOTHING
                 RETURNING id",
            )
            .bind(new_id)
            .bind(format!("nostr_{}@nostr.local", &pubkey[..16.min(pubkey.len())]))
            .bind(placeholder_hash)
            .bind(&display_name)
            .bind(pubkey)
            .execute(&platform_pool.0)
            .await;

            match result {
                Ok(r) if r.rows_affected() > 0 => {
                    (new_id, "user".to_string(), "free".to_string(), true)
                }
                Ok(_) => {
                    // Race condition: another request created the user. Fetch it.
                    match sqlx::query_as::<_, (Uuid, String, String)>(
                        "SELECT id, role, tier FROM users WHERE nostr_pubkey = $1 AND is_deleted = false",
                    )
                    .bind(pubkey)
                    .fetch_optional(&platform_pool.0)
                    .await
                    {
                        Ok(Some((id, role, tier))) => (id, role, tier, false),
                        _ => {
                            return HttpResponse::InternalServerError().json(json!({
                                "data": null,
                                "error": { "code": "INTERNAL", "message": "Failed to create or find user" }
                            }));
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to create NOSTR user: {}", e);
                    return HttpResponse::InternalServerError().json(json!({
                        "data": null,
                        "error": { "code": "INTERNAL", "message": "Internal error" }
                    }));
                }
            }
        }
        Err(e) => {
            tracing::error!("DB error during NOSTR login: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Internal error" }
            }));
        }
    };

    // Generate JWT
    let token = match create_jwt(
        &user_id.to_string(),
        &role,
        &tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    ) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to create JWT: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Internal error" }
            }));
        }
    };

    // Generate refresh token
    let refresh_token = generate_refresh_token();
    let token_hash = hash_refresh_token(&refresh_token);
    let expires_at = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

    // Store refresh token
    let _ = sqlx::query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user_id)
    .bind(&token_hash)
    .bind(expires_at)
    .execute(&platform_pool.0)
    .await;

    HttpResponse::Ok().json(json!({
        "data": {
            "token": token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "nostr_pubkey": pubkey,
                "created": created,
            }
        },
        "error": null
    }))
}
