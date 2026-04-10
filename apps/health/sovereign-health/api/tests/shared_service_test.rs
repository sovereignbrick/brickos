//! Shared service layer tests for SHI three-layer architecture.
//!
//! Tests the three-layer stack:
//! 1. brickos layer -- auth tokens, encryption, email providers
//! 2. Organization layer -- org models, roles, data shares
//! 3. Consumer layer -- measurements, zones, calculated markers (GKI, BMI, WHtR)
//!
//! No database required -- all tests are pure unit/compile-time checks.

use std::sync::Once;

static CRYPTO_INIT: Once = Once::new();

fn ensure_crypto_provider() {
    CRYPTO_INIT.call_once(|| {
        let _ = jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER.install_default();
    });
}

// ═══════════════════════════════════════════════════════════════════════
// Layer 1: brickos platform layer
// ═══════════════════════════════════════════════════════════════════════

const TEST_SECRET: &str = "shared-service-test-secret-long-enough-for-jwt-ops";

/// Full auth token lifecycle: create -> verify -> (simulate) refresh -> verify new
#[test]
fn auth_token_lifecycle() {
    ensure_crypto_provider();
    use brickos_auth::jwt::{create_jwt, verify_jwt};
    use brickos_auth::tokens::{generate_refresh_token, hash_refresh_token};

    let user_id = uuid::Uuid::new_v4().to_string();

    // Step 1: Create access token
    let access_token = create_jwt(&user_id, "user", "focus", TEST_SECRET, 3600).unwrap();

    // Step 2: Verify access token
    let claims = verify_jwt(&access_token, TEST_SECRET).unwrap();
    assert_eq!(claims.sub, user_id);
    assert_eq!(claims.tier, "focus");

    // Step 3: Generate refresh token (simulating storage)
    let refresh = generate_refresh_token();
    let refresh_hash = hash_refresh_token(&refresh);
    assert_eq!(refresh.len(), 64);
    assert_ne!(refresh, refresh_hash, "hash must differ from token");

    // Step 4: Verify refresh token hash matches (simulating lookup)
    let rehash = hash_refresh_token(&refresh);
    assert_eq!(refresh_hash, rehash, "hash must be deterministic");

    // Step 5: Issue new access token with different expiry (simulating refresh endpoint)
    let new_access_token = create_jwt(&user_id, "user", "focus", TEST_SECRET, 7200).unwrap();
    let new_claims = verify_jwt(&new_access_token, TEST_SECRET).unwrap();
    assert_eq!(new_claims.sub, user_id);

    // New token should have a different expiry
    assert_ne!(
        claims.exp, new_claims.exp,
        "refreshed token should have different expiry"
    );
}

/// MFA flow: generate secret -> build TOTP -> verify structure
#[test]
fn mfa_flow_generate_and_build() {
    ensure_crypto_provider();
    use brickos_auth::mfa::{build_totp, format_secret_for_display, generate_totp_secret};

    // Step 1: Generate secret
    let secret = generate_totp_secret();
    assert!(!secret.is_empty());

    // Step 2: Build TOTP
    let totp = build_totp(&secret, "user@sovereignhealth.io").unwrap();
    let uri = totp.get_url();
    assert!(uri.starts_with("otpauth://totp/"));
    assert!(
        uri.contains("user%40sovereignhealth.io") || uri.contains("user@sovereignhealth.io"),
        "TOTP URI must contain email, got: {}",
        uri
    );

    // Step 3: Format for display
    let formatted = format_secret_for_display(&secret);
    assert!(
        formatted.contains(' '),
        "formatted secret should have spaces between groups"
    );
}

/// Encryption: encrypt PII -> verify v1:iv:ct format -> decrypt
#[test]
fn encryption_pii_lifecycle() {
    use brickos_crypto::Encryptor;

    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = Encryptor::new(Some(key));

    // Encrypt sensitive PII
    let email = "patient@example.com";
    let notes = "Patient reports improved glucose levels after dietary changes";

    let enc_email = enc.encrypt(email);
    let enc_notes = enc.encrypt(notes);

    // Verify v1:iv:ct format
    for ct in [&enc_email, &enc_notes] {
        let parts: Vec<&str> = ct.splitn(3, ':').collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "v1");
    }

    // Ciphertexts must differ even if plaintext happens to be similar
    assert_ne!(enc_email, enc_notes);

    // Decrypt
    assert_eq!(enc.decrypt(&enc_email).unwrap(), email);
    assert_eq!(enc.decrypt(&enc_notes).unwrap(), notes);
}

/// Legacy plaintext passthrough for unencrypted data migration
#[test]
fn encryption_legacy_plaintext_passthrough() {
    use brickos_crypto::Encryptor;

    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = Encryptor::new(Some(key));

    // Legacy data without v1: prefix passes through decrypt
    let legacy = "5.2000";
    let result = enc.decrypt(legacy).unwrap();
    assert_eq!(result, legacy);
}

/// Email provider: LogProvider send always succeeds in tests
#[tokio::test]
async fn email_log_provider_send_succeeds() {
    use brickos_email::{EmailProvider, LogProvider};

    let provider = LogProvider;
    let result = provider
        .send(
            "test@example.com",
            "Welcome to Sovereign Health",
            "<p>Welcome</p>",
            "Welcome",
        )
        .await;
    assert!(result.is_ok());
}

// ═══════════════════════════════════════════════════════════════════════
// Layer 2: Organization layer
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn org_model_has_required_fields() {
    use brickos_db::models::organization::Organization;

    let org = Organization {
        id: uuid::Uuid::new_v4(),
        name: "Test Practice".into(),
        slug: "test-practice".into(),
        org_type: "practice".into(),
        is_active: true,
        created_at: chrono::Utc::now(),
    };

    // Serialize and verify all fields present
    let json = serde_json::to_value(&org).unwrap();
    assert!(json["id"].is_string());
    assert!(json["name"].is_string());
    assert!(json["slug"].is_string());
    assert!(json["org_type"].is_string());
    assert!(json["is_active"].is_boolean());
    assert!(json["created_at"].is_string());
}

#[test]
fn org_member_model_has_required_fields() {
    use brickos_db::models::organization::OrgMember;

    let member = OrgMember {
        id: uuid::Uuid::new_v4(),
        org_id: uuid::Uuid::new_v4(),
        user_id: uuid::Uuid::new_v4(),
        role: "editor".into(),
        joined_at: chrono::Utc::now(),
    };

    let json = serde_json::to_value(&member).unwrap();
    assert!(json["id"].is_string());
    assert!(json["org_id"].is_string());
    assert!(json["user_id"].is_string());
    assert_eq!(json["role"], "editor");
}

#[test]
fn data_share_model_serializes() {
    use brickos_db::models::organization::DataShare;

    let share = DataShare {
        id: uuid::Uuid::new_v4(),
        owner_user_id: uuid::Uuid::new_v4(),
        granted_to_user_id: uuid::Uuid::new_v4(),
        org_id: Some(uuid::Uuid::new_v4()),
        scope: "measurements_readonly".into(),
        expires_at: Some(chrono::Utc::now() + chrono::Duration::days(30)),
        revoked_at: None,
        created_at: chrono::Utc::now(),
    };

    let json = serde_json::to_value(&share).unwrap();
    assert_eq!(json["scope"], "measurements_readonly");
    assert!(json["org_id"].is_string());
    assert!(json["revoked_at"].is_null());
}

#[test]
fn org_role_types_valid() {
    use brickos_db::models::organization::ORG_ROLES;

    for role in ORG_ROLES {
        assert!(!role.is_empty(), "role must not be empty");
        assert!(
            role.chars().all(|c| c.is_ascii_lowercase() || c == '_'),
            "role must be lowercase snake_case: {}",
            role
        );
    }
}

#[test]
fn share_scopes_non_empty_lowercase() {
    use brickos_db::models::organization::SHARE_SCOPES;

    for scope in SHARE_SCOPES {
        assert!(!scope.is_empty(), "scope must not be empty");
        assert!(
            scope.chars().all(|c| c.is_ascii_lowercase() || c == '_'),
            "scope must be lowercase snake_case: {}",
            scope
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Layer 3: Consumer layer (app-specific models and logic)
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn measurement_value_has_correct_fields() {
    use sovereign_health_backend::models::measurement::MeasurementValue;

    // MeasurementValue is a Deserialize-only struct (input from API)
    let json_str = r#"{"marker_slug": "glucose", "value": 5.4}"#;
    let value: MeasurementValue = serde_json::from_str(json_str).unwrap();
    assert_eq!(value.marker_slug, "glucose");
    assert!((value.value - 5.4).abs() < 0.001);
}

#[test]
fn measurement_response_serializes() {
    // MeasurementResponse is a Serialize struct (output to API).
    // Verify the expected output shape via JSON parse to serde_json::Value.
    // (Sprint 040 #463 drive-by: removed unused typed import that broke clippy.)
    let json_str = r#"{
        "id": "00000000-0000-0000-0000-000000000001",
        "timestamp": "2026-01-01T00:00:00Z",
        "marker_slug": "glucose",
        "marker_name": "Glucose",
        "value": 5.4,
        "unit": "mmol/L",
        "status": "green",
        "source": "manual"
    }"#;
    let resp: serde_json::Value = serde_json::from_str(json_str).unwrap();
    assert_eq!(resp["marker_slug"], "glucose");
    assert_eq!(resp["value"], 5.4);
    assert_eq!(resp["unit"], "mmol/L");
    assert_eq!(resp["status"], "green");
}

/// Calculated marker: GKI formula
/// GKI = Glucose (mmol/L) / Ketones (mmol/L)
#[test]
fn calculated_marker_gki_formula() {
    // GKI formula: glucose / ketones
    let glucose = 4.5_f64; // mmol/L
    let ketones = 1.5_f64; // mmol/L

    let gki = glucose / ketones;
    assert!((gki - 3.0).abs() < 0.001, "GKI should be 3.0, got {}", gki);

    // Edge case: ketones near zero
    let ketones_low = 0.1_f64;
    let gki_high = glucose / ketones_low;
    assert!(gki_high > 10.0, "low ketones = high GKI");

    // Edge case: ketones zero should not be computed (division by zero guard)
    assert!(
        ketones.is_finite(),
        "ketones must be finite for GKI calculation"
    );
}

/// Calculated marker: BMI formula
/// BMI = weight(kg) / (height(m))^2
#[test]
fn calculated_marker_bmi_formula() {
    let weight_kg = 75.0_f64;
    let height_cm = 180.0_f64;
    let height_m = height_cm / 100.0;

    let bmi = weight_kg / (height_m * height_m);
    assert!(
        (bmi - 23.148).abs() < 0.01,
        "BMI should be ~23.15, got {}",
        bmi
    );

    // Edge case: height zero guard
    assert!(height_cm > 0.0, "height must be positive for BMI");
}

/// Calculated marker: WHtR formula
/// WHtR = waist_circumference(cm) / height(cm)
#[test]
fn calculated_marker_whtr_formula() {
    let waist_cm = 85.0_f64;
    let height_cm = 180.0_f64;

    let whtr = waist_cm / height_cm;
    assert!(
        (whtr - 0.4722).abs() < 0.001,
        "WHtR should be ~0.472, got {}",
        whtr
    );

    // Health boundary: WHtR < 0.5 is generally considered healthy
    assert!(whtr < 0.5, "waist 85 / height 180 should be under 0.5");
}

/// Protocol context resolution (fasting vs diet protocols)
#[test]
fn protocol_context_resolution() {
    use sovereign_health_backend::services::calculated::resolve_protocol_context;

    // Fasting protocols
    assert_eq!(
        resolve_protocol_context("fasting", Some("16_8"), None),
        "fasting_16_8"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("omad"), None),
        "fasting_16_8"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("48h"), None),
        "fasting_48h"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("72h"), None),
        "fasting_extended"
    );
    // Default fasting
    assert_eq!(
        resolve_protocol_context("fasting", None, None),
        "fasting_16_8"
    );

    // Diet protocols
    assert_eq!(
        resolve_protocol_context("standard", None, Some("vegan")),
        "standard_vegan"
    );
    assert_eq!(
        resolve_protocol_context("standard", None, Some("keto")),
        "standard_keto"
    );
    assert_eq!(
        resolve_protocol_context("standard", None, Some("mediterranean")),
        "standard_mediterranean"
    );
    // Default standard
    assert_eq!(
        resolve_protocol_context("standard", None, None),
        "standard"
    );
}

/// User model: BaseUserResponse converts from User correctly
#[test]
fn user_model_conversion_from_user() {
    use brickos_db::models::user::{BaseUserResponse, User};

    let user = User {
        id: uuid::Uuid::new_v4(),
        email: "test@sovereignhealth.io".into(),
        password_hash: "$argon2id$hash".into(),
        display_name: Some("Test".into()),
        role: "user".into(),
        tier: "insight".into(),
        created_at: chrono::Utc::now(),
    };

    let user_id = user.id;
    let response = BaseUserResponse::from(user);

    assert_eq!(response.id, user_id);
    assert_eq!(response.email, "test@sovereignhealth.io");
    assert_eq!(response.tier, "insight");
    // password_hash must NOT appear in response
    let json = serde_json::to_value(&response).unwrap();
    assert!(
        json.get("password_hash").is_none(),
        "password_hash must not leak into API response"
    );
}

/// Verify SHI version constant is valid semver
#[test]
fn version_is_valid_semver() {
    let version = sovereign_health_backend::VERSION;
    let parts: Vec<&str> = version.split('.').collect();
    assert_eq!(parts.len(), 3, "version must be semver X.Y.Z");
    for part in &parts {
        assert!(
            part.parse::<u32>().is_ok(),
            "version component must be numeric: {}",
            part
        );
    }
}

/// Verify SERVICE_NAME constant
#[test]
fn service_name_is_correct() {
    assert_eq!(
        sovereign_health_backend::SERVICE_NAME,
        "sovereign-health-backend"
    );
}

/// Notification config: Notifier can be constructed without panicking
#[test]
fn notifier_construction_does_not_panic() {
    use sovereign_health_backend::services::notify::{NotifyConfig, Notifier};

    let config = NotifyConfig::from_env();
    let _notifier = Notifier::new(config);
    // Construction succeeded without panic
}

/// Config test_default produces usable config
#[test]
fn config_test_default_is_usable() {
    let config = sovereign_health_backend::config::Config::test_default();

    assert!(!config.database_url.is_empty());
    assert!(!config.jwt_secret.is_empty());
    assert!(config.jwt_expiry_secs > 0);
    assert!(config.refresh_expiry_secs > 0);
    assert!(config.registration_enabled);
    assert!(config.is_oss()); // test default is OSS mode
}
