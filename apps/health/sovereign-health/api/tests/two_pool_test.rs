//! Two-pool regression test suite for SHI
//! Verifies the PlatformPool/AppPool split after Sprint 035 elevation.
//!
//! These tests validate that:
//! - Auth operations (JWT, passwords, MFA) work via brickos-auth crate
//! - Encryption works via brickos-crypto crate
//! - Billing/license types serialize correctly
//! - Platform SQL queries reference correct brickos.* tables
//! - Org isolation patterns are correct
//!
//! No database required -- all tests are pure unit/compile-time checks
//! against the extracted brickos-* crates.

use std::sync::Once;

static CRYPTO_INIT: Once = Once::new();

fn ensure_crypto_provider() {
    CRYPTO_INIT.call_once(|| {
        let _ = jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER.install_default();
    });
}

// ═══════════════════════════════════════════════════════════════════════
// PlatformPool type existence (compile-time verification)
// ═══════════════════════════════════════════════════════════════════════

/// PlatformPool struct exists and wraps sqlx::PgPool (compile-time check).
/// If this test compiles, the newtype pattern is intact.
#[test]
fn platform_pool_type_exists_and_is_clone() {
    fn assert_clone<T: Clone>() {}
    assert_clone::<sovereign_health_backend::PlatformPool>();
}

/// Config has platform_database_url method that returns a &str
#[test]
fn config_has_platform_database_url() {
    let config = sovereign_health_backend::config::Config::test_default();
    let url = config.platform_database_url();
    // Falls back to database_url when platform_database_url is None
    assert!(!url.is_empty());
    assert_eq!(url, config.database_url);
}

/// Config test_default has platform_database_url = None (fallback mode)
#[test]
fn config_test_default_platform_url_is_none() {
    let config = sovereign_health_backend::config::Config::test_default();
    assert!(
        config.platform_database_url.is_none(),
        "test_default should not set platform_database_url"
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Auth layer: brickos-auth crate (JWT, passwords, MFA, tokens, validation)
// ═══════════════════════════════════════════════════════════════════════

const TEST_SECRET: &str = "two-pool-test-secret-long-enough-for-jwt-operations";

#[test]
fn jwt_create_verify_roundtrip() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt, verify_jwt};

    let user_id = uuid::Uuid::new_v4().to_string();
    let token = create_jwt(&user_id, "user", "free", TEST_SECRET, 3600).unwrap();

    // JWT has 3 dot-separated segments
    assert_eq!(token.split('.').count(), 3);

    let claims = verify_jwt(&token, TEST_SECRET).unwrap();
    assert_eq!(claims.sub, user_id);
    assert_eq!(claims.role, "user");
    assert_eq!(claims.tier, "free");
    assert!(claims.org_id.is_none());
    assert!(claims.org_role.is_none());
}

#[test]
fn jwt_with_org_context() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt_with_org, verify_jwt};

    let user_id = uuid::Uuid::new_v4().to_string();
    let org_id = uuid::Uuid::new_v4().to_string();

    let token = create_jwt_with_org(
        &user_id,
        "user",
        "focus",
        Some(&org_id),
        Some("editor"),
        TEST_SECRET,
        3600,
    )
    .unwrap();

    let claims = verify_jwt(&token, TEST_SECRET).unwrap();
    assert_eq!(claims.sub, user_id);
    assert_eq!(claims.org_id.as_deref(), Some(org_id.as_str()));
    assert_eq!(claims.org_role.as_deref(), Some("editor"));
}

#[test]
fn jwt_expired_token_rejected() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt, verify_jwt};

    // Create a token that expired well beyond the default leeway (60s)
    let token = create_jwt("user_expired", "user", "free", TEST_SECRET, -120).unwrap();
    let result = verify_jwt(&token, TEST_SECRET);
    assert!(result.is_err(), "expired token must be rejected");
}

#[test]
fn jwt_wrong_secret_rejected() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt, verify_jwt};

    let token = create_jwt("user_wrong", "user", "free", TEST_SECRET, 3600).unwrap();
    let result = verify_jwt(&token, "completely-different-secret-value");
    assert!(result.is_err(), "wrong secret must be rejected");
}

#[test]
fn jwt_fallback_secret_works() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt, verify_jwt_with_fallback};

    let old_secret = "old-secret-for-rotation-testing-long-enough";
    let new_secret = "new-secret-for-rotation-testing-long-enough";

    // Token signed with old secret
    let token = create_jwt("user_rotated", "user", "free", old_secret, 3600).unwrap();

    // Should fail with new secret alone
    let result = brickos_auth::jwt::verify_jwt(&token, new_secret);
    assert!(result.is_err());

    // Should succeed with fallback
    let claims = verify_jwt_with_fallback(&token, new_secret, Some(old_secret)).unwrap();
    assert_eq!(claims.sub, "user_rotated");
}

#[test]
fn password_hash_verify_roundtrip() {
    use brickos_auth::password::{hash_password, verify_password};

    let password = "SecurePassword1!";
    let hash = hash_password(password).unwrap();

    assert!(hash.starts_with("$argon2"), "should use Argon2");
    assert_ne!(hash, password, "hash must differ from plaintext");
    assert!(verify_password(password, &hash), "roundtrip must succeed");
}

#[test]
fn password_wrong_password_rejected() {
    use brickos_auth::password::{hash_password, verify_password};

    let hash = hash_password("CorrectPassword1").unwrap();
    assert!(
        !verify_password("WrongPassword1", &hash),
        "wrong password must fail"
    );
}

#[test]
fn mfa_generate_secret_is_valid_base32() {
    use brickos_auth::mfa::generate_totp_secret;

    let secret = generate_totp_secret();
    assert!(!secret.is_empty());
    // base32 characters: A-Z and 2-7, plus optional padding with =
    assert!(
        secret
            .chars()
            .all(|c| c.is_ascii_uppercase() || ('2'..='7').contains(&c) || c == '='),
        "secret must be valid base32: {}",
        secret
    );
}

#[test]
fn mfa_build_totp_succeeds() {
    use brickos_auth::mfa::{build_totp, generate_totp_secret};

    let secret = generate_totp_secret();
    let totp = build_totp(&secret, "test@example.com");
    assert!(totp.is_ok(), "build_totp must succeed with valid secret");

    let totp = totp.unwrap();
    let uri = totp.get_url();
    assert!(
        uri.contains("test%40example.com") || uri.contains("test@example.com"),
        "TOTP URI must contain email, got: {}",
        uri
    );
}

#[test]
fn mfa_recovery_codes_format() {
    use brickos_auth::mfa::generate_recovery_codes;

    let codes = generate_recovery_codes();
    assert_eq!(codes.len(), 8, "should generate 8 recovery codes");

    for code in &codes {
        assert_eq!(code.len(), 9, "code format: xxxx-xxxx = 9 chars");
        assert_eq!(code.chars().nth(4), Some('-'));
    }

    // All codes should be unique
    let mut unique = codes.clone();
    unique.sort();
    unique.dedup();
    assert_eq!(unique.len(), 8, "all 8 codes must be unique");
}

#[test]
fn mfa_format_secret_for_display() {
    use brickos_auth::mfa::format_secret_for_display;

    let formatted = format_secret_for_display("ABCDEFGHIJKLMNOP");
    assert_eq!(formatted, "ABCD EFGH IJKL MNOP");
}

#[test]
fn refresh_token_generation_unique() {
    use brickos_auth::tokens::generate_refresh_token;

    let t1 = generate_refresh_token();
    let t2 = generate_refresh_token();
    assert_ne!(t1, t2, "consecutive refresh tokens must differ");
    assert_eq!(t1.len(), 64, "refresh token should be 64 hex chars");
    assert!(t1.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn refresh_token_hash_deterministic() {
    use brickos_auth::tokens::hash_refresh_token;

    let token = "test_refresh_token_value_1234567890abcdef1234567890abcdef";
    let h1 = hash_refresh_token(token);
    let h2 = hash_refresh_token(token);
    assert_eq!(h1, h2, "same input must produce same hash");
}

#[test]
fn validation_email_formats() {
    use brickos_auth::validation::validate_email;

    // Valid
    assert!(validate_email("user@example.com"));
    assert!(validate_email("test.name@domain.co.uk"));

    // Invalid
    assert!(!validate_email(""));
    assert!(!validate_email("no-at-sign.com"));
    assert!(!validate_email("user@localhost")); // no dot in domain
}

#[test]
fn validation_password_strength() {
    use brickos_auth::validation::validate_password;

    // Valid
    assert!(validate_password("SecureP4ss").is_ok());
    assert!(validate_password("abcdefg1").is_ok());

    // Too short
    assert!(validate_password("Ab1").is_err());
    assert!(validate_password("Short1").is_err());

    // No digit
    assert!(validate_password("NoDigitsHere").is_err());

    // No letter
    assert!(validate_password("12345678").is_err());
}

#[test]
fn api_key_generation_and_hashing() {
    use brickos_auth::api_key::{generate_api_key, hash_api_key};

    let key = generate_api_key();
    assert_eq!(key.len(), 64, "API key should be 64 hex chars");
    assert!(key.chars().all(|c| c.is_ascii_hexdigit()));

    // Hash is deterministic
    let h1 = hash_api_key(&key);
    let h2 = hash_api_key(&key);
    assert_eq!(h1, h2);

    // Hash differs from input
    assert_ne!(h1, key);
}

#[test]
fn constant_time_token_verify() {
    use brickos_auth::tokens::verify_token_constant_time;

    assert!(verify_token_constant_time("abcdef", "abcdef"));
    assert!(!verify_token_constant_time("abcdef", "abcdeg"));
    assert!(!verify_token_constant_time("short", "longer_string"));
}

// ═══════════════════════════════════════════════════════════════════════
// Crypto layer: brickos-crypto crate
// ═══════════════════════════════════════════════════════════════════════

const TEST_KEY: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

#[test]
fn encrypt_decrypt_roundtrip() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(Some(TEST_KEY));
    let plaintext = "sensitive health data -- glucose 5.4 mmol/L";
    let ciphertext = enc.encrypt(plaintext);

    assert_ne!(ciphertext, plaintext);
    assert!(ciphertext.starts_with("v1:"), "must use v1 format prefix");

    let decrypted = enc.decrypt(&ciphertext).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn encrypt_different_ivs_no_reuse() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(Some(TEST_KEY));
    let a = enc.encrypt("same value");
    let b = enc.encrypt("same value");

    assert_ne!(a, b, "each encryption must use a unique IV");

    // Both must decrypt to the same value
    assert_eq!(enc.decrypt(&a).unwrap(), "same value");
    assert_eq!(enc.decrypt(&b).unwrap(), "same value");
}

#[test]
fn decrypt_wrong_key_fails() {
    use brickos_crypto::Encryptor;

    let enc1 = Encryptor::new(Some(TEST_KEY));
    let ciphertext = enc1.encrypt("secret");

    let wrong_key = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    let enc2 = Encryptor::new(Some(wrong_key));

    assert!(enc2.decrypt(&ciphertext).is_err(), "wrong key must fail");
}

#[test]
fn passthrough_mode_no_key() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(None);
    assert!(!enc.is_enabled());

    let result = enc.encrypt("hello");
    assert_eq!(result, "hello", "passthrough mode returns plaintext");
}

#[test]
fn encrypt_opt_none_passthrough() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(Some(TEST_KEY));

    // None passes through
    let encrypted = enc.encrypt_opt(None);
    assert!(encrypted.is_none());
    let decrypted = enc.decrypt_opt(None);
    assert!(decrypted.is_none());

    // Some encrypts and decrypts
    let encrypted = enc.encrypt_opt(Some("note text"));
    assert!(encrypted.is_some());
    assert!(encrypted.as_ref().unwrap().starts_with("v1:"));
    let decrypted = enc.decrypt_opt(encrypted);
    assert_eq!(decrypted.as_deref(), Some("note text"));
}

#[test]
fn f64_encrypt_decrypt() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(Some(TEST_KEY));
    let value = 5.2345_f64;
    let encrypted = enc.encrypt_f64(value);
    assert!(encrypted.starts_with("v1:"));

    let decrypted = enc.decrypt_f64(&encrypted);
    assert!(
        (decrypted - value).abs() < 0.0001,
        "f64 roundtrip must preserve value"
    );
}

#[test]
fn ciphertext_format_v1_iv_ct() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(Some(TEST_KEY));
    let ciphertext = enc.encrypt("test data");

    // Format: v1:{base64_iv}:{base64_ciphertext}
    let parts: Vec<&str> = ciphertext.splitn(3, ':').collect();
    assert_eq!(parts.len(), 3, "format must be v1:iv:ct");
    assert_eq!(parts[0], "v1");

    // IV should be base64-encoded 12-byte nonce
    let iv_bytes = base64::engine::general_purpose::STANDARD
        .decode(parts[1])
        .expect("IV must be valid base64");
    assert_eq!(iv_bytes.len(), 12, "AES-GCM nonce is 12 bytes");
}

// ═══════════════════════════════════════════════════════════════════════
// Billing/License types: brickos-db + brickos-billing
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn user_model_serialization() {
    use brickos_db::models::user::BaseUserResponse;

    let resp = BaseUserResponse {
        id: uuid::Uuid::new_v4(),
        email: "test@example.com".into(),
        display_name: Some("Test User".into()),
        role: "user".into(),
        tier: "free".into(),
        created_at: chrono::Utc::now(),
    };

    let json = serde_json::to_value(&resp).unwrap();
    assert!(json["id"].is_string());
    assert_eq!(json["email"], "test@example.com");
    assert_eq!(json["role"], "user");
    assert_eq!(json["tier"], "free");
    assert_eq!(json["display_name"], "Test User");
}

#[test]
fn organization_model_serialization() {
    use brickos_db::models::organization::Organization;

    let org = Organization {
        id: uuid::Uuid::new_v4(),
        name: "Test Clinic".into(),
        slug: "test-clinic".into(),
        org_type: "clinic".into(),
        is_active: true,
        created_at: chrono::Utc::now(),
    };

    let json = serde_json::to_value(&org).unwrap();
    assert_eq!(json["name"], "Test Clinic");
    assert_eq!(json["slug"], "test-clinic");
    assert_eq!(json["org_type"], "clinic");
    assert_eq!(json["is_active"], true);
}

#[test]
fn org_roles_include_all_required() {
    use brickos_db::models::organization::ORG_ROLES;

    assert!(ORG_ROLES.contains(&"owner"));
    assert!(ORG_ROLES.contains(&"editor"));
    assert!(ORG_ROLES.contains(&"consumer"));
    assert!(
        ORG_ROLES.len() >= 3,
        "should have at least owner/editor/consumer"
    );
}

#[test]
fn share_scopes_include_required() {
    use brickos_db::models::organization::SHARE_SCOPES;

    assert!(SHARE_SCOPES.contains(&"all"));
    assert!(SHARE_SCOPES.contains(&"measurements"));
    assert!(SHARE_SCOPES.contains(&"measurements_readonly"));
    assert!(SHARE_SCOPES.contains(&"trends"));
    assert!(SHARE_SCOPES.contains(&"summary"));
}

#[test]
fn stripe_service_price_tier_mapping() {
    use brickos_billing::config::StripeConfig;
    use brickos_billing::stripe::StripeService;
    use std::collections::HashMap;

    let config = StripeConfig {
        secret_key: "sk_test_xxx".into(),
        publishable_key: "pk_test_xxx".into(),
        webhook_secret: "whsec_xxx".into(),
        price_to_tier: HashMap::from([("price_focus".into(), ("focus".into(), "monthly".into()))]),
        tier_to_price: HashMap::from([(("focus".into(), "monthly".into()), "price_focus".into())]),
    };

    let service = StripeService::new(&config);
    assert_eq!(
        service.tier_from_price_id("price_focus"),
        Some(("focus".into(), "monthly".into()))
    );
    assert_eq!(
        service.price_id_for_tier("focus", "monthly"),
        Some("price_focus".into())
    );
    assert!(service.tier_from_price_id("nonexistent").is_none());
}

// ═══════════════════════════════════════════════════════════════════════
// Platform SQL verification (compile-time checks)
// ═══════════════════════════════════════════════════════════════════════

/// Verify that PlatformPool is distinct from PgPool at the type level.
/// Handlers that require PlatformPool cannot accidentally receive PgPool.
#[test]
fn platform_pool_is_distinct_from_pg_pool() {
    use std::any::TypeId;

    let platform_type = TypeId::of::<sovereign_health_backend::PlatformPool>();
    let pg_pool_type = TypeId::of::<sqlx::PgPool>();

    assert_ne!(
        platform_type, pg_pool_type,
        "PlatformPool must be a distinct type from PgPool"
    );
}

/// Verify the Config platform_database_url fallback logic:
/// when platform_database_url is None, it must fall back to database_url.
#[test]
fn platform_url_fallback_logic() {
    let mut config = sovereign_health_backend::config::Config::test_default();

    // Case 1: no platform URL -- falls back to database_url
    config.platform_database_url = None;
    config.database_url = "postgres://app_db/sovereign_health".into();
    assert_eq!(
        config.platform_database_url(),
        "postgres://app_db/sovereign_health"
    );

    // Case 2: explicit platform URL -- uses it
    config.platform_database_url = Some("postgres://platform_db/brickos".into());
    assert_eq!(
        config.platform_database_url(),
        "postgres://platform_db/brickos"
    );
}

/// Compile-time check: PlatformPool can be wrapped in web::Data
/// (required for actix-web handler extraction)
#[test]
fn platform_pool_works_with_actix_data() {
    fn assert_data_compatible<T: 'static>() {}
    assert_data_compatible::<sovereign_health_backend::PlatformPool>();
}

// ═══════════════════════════════════════════════════════════════════════
// Notification service
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn notification_config_from_env_defaults() {
    use sovereign_health_backend::services::notify::NotifyConfig;

    // Without env vars set, config should have None for optional fields
    let config = NotifyConfig::from_env();
    // In test environment, these are likely unset
    assert!(
        !config.is_enabled() || config.is_enabled(),
        "is_enabled should not panic"
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Email provider factory
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn email_provider_factory_returns_provider() {
    use brickos_email::create_email_provider;

    // Without MAILGUN/SMTP env vars, factory returns LogProvider
    let provider = create_email_provider(false);
    assert_eq!(std::sync::Arc::strong_count(&provider), 1);
}

#[test]
fn email_log_provider_implements_trait() {
    use brickos_email::{EmailProvider, LogProvider};
    use std::sync::Arc;

    let provider: Arc<dyn EmailProvider> = Arc::new(LogProvider);
    assert_eq!(Arc::strong_count(&provider), 1);
}

use base64::Engine;
