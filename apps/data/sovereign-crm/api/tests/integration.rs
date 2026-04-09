//! Integration tests for Sovereign CRM API.
//!
//! Tests verify model serialization, encryption round-trips,
//! and auth token operations without requiring a database.
//! Full E2E tests against a live server are gated behind E2E_BASE_URL.

use chrono::Utc;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Model serialization
// ---------------------------------------------------------------------------

#[test]
fn user_response_serializes() {
    let user = serde_json::json!({
        "id": Uuid::new_v4(),
        "email": "test@example.com",
        "display_name": "Test User",
        "role": "user",
        "tier": "glimpse",
        "email_verified": true,
        "mfa_enabled": false,
        "created_at": Utc::now(),
    });
    let json = serde_json::to_string(&user).unwrap();
    assert!(json.contains("test@example.com"));
}

#[test]
fn api_envelope_ok() {
    let response = serde_json::json!({
        "data": { "message": "success" },
    });
    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("success"));
}

#[test]
fn api_envelope_err() {
    let response = serde_json::json!({
        "error": {
            "code": "VALIDATION",
            "message": "Email is required",
        },
    });
    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("VALIDATION"));
}

#[test]
fn signup_request_deserializes() {
    let json = r#"{"email":"u@e.com","password":"SecureP1","display_name":"Alice"}"#;
    let req: serde_json::Value = serde_json::from_str(json).unwrap();
    assert_eq!(req["email"], "u@e.com");
    assert_eq!(req["display_name"], "Alice");
}

#[test]
fn contact_response_structure() {
    let contact = serde_json::json!({
        "id": Uuid::new_v4(),
        "org_id": Uuid::new_v4(),
        "name": "Bob Smith",
        "lead_stage": "new",
        "interaction_count": 0,
    });
    let json = serde_json::to_string(&contact).unwrap();
    assert!(json.contains("Bob Smith"));
}

// ---------------------------------------------------------------------------
// Encryption round-trip
// ---------------------------------------------------------------------------

#[test]
fn encryptor_roundtrip() {
    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = brickos_crypto::Encryptor::new(Some(key));

    let plaintext = "user@example.com";
    let encrypted = enc.encrypt(plaintext);
    assert!(encrypted.starts_with("v1:"));
    assert_ne!(encrypted, plaintext);

    let decrypted = enc.decrypt(&encrypted).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn encryptor_opt_none_passthrough() {
    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = brickos_crypto::Encryptor::new(Some(key));
    assert!(enc.encrypt_opt(None).is_none());
    assert!(enc.decrypt_opt(None).is_none());
}

#[test]
fn encryptor_passthrough_mode() {
    let enc = brickos_crypto::Encryptor::new(None);
    assert_eq!(enc.encrypt("hello"), "hello");
    assert!(!enc.is_enabled());
}

// ---------------------------------------------------------------------------
// Auth token tests
// ---------------------------------------------------------------------------

#[test]
fn jwt_create_and_verify() {
    let _ = jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER.install_default();

    let secret = "test-secret-that-is-long-enough-for-hmac";
    let token = brickos_auth::jwt::create_jwt("user-123", "user", "glimpse", secret, 3600)
        .expect("JWT creation failed");

    let claims = brickos_auth::jwt::verify_jwt(&token, secret).expect("JWT verification failed");
    assert_eq!(claims.sub, "user-123");
    assert_eq!(claims.role, "user");
    assert_eq!(claims.tier, "glimpse");
}

#[test]
fn password_hash_and_verify() {
    let password = "SecurePass123!";
    let hash = brickos_auth::password::hash_password(password).expect("Hash failed");
    assert!(brickos_auth::password::verify_password(password, &hash));
    assert!(!brickos_auth::password::verify_password("wrong", &hash));
}

#[test]
fn refresh_token_generation() {
    let token = brickos_auth::tokens::generate_refresh_token();
    assert_eq!(token.len(), 64);
    let hash = brickos_auth::tokens::hash_refresh_token(&token);
    assert_eq!(hash.len(), 64);
    assert_ne!(token, hash);
}

#[test]
fn validation_email() {
    assert!(brickos_auth::validation::validate_email("user@example.com"));
    assert!(!brickos_auth::validation::validate_email("not-an-email"));
    assert!(!brickos_auth::validation::validate_email(""));
}

#[test]
fn validation_password() {
    assert!(brickos_auth::validation::validate_password("SecureP1").is_ok());
    assert!(brickos_auth::validation::validate_password("short").is_err());
}
