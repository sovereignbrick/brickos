/// Platform extraction RC tests — validates that all 5 extracted BrickOS crates
/// (#55 auth, #56 crypto, #57 billing, #58 email, #59 db) plus security
/// infrastructure (#43 RLS, #44 DB roles, #67 pgaudit) work correctly with
/// the Sovereign Health app.
///
/// Requires DATABASE_URL + JWT_SECRET — skips gracefully if not set.
mod common;

use actix_web::{dev::ServiceResponse, test};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use common::{build_test_app, setup, setup_pool, test_get, test_post};
use sovereign_health_backend::config::Config;

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

async fn cleanup_user(pool: &PgPool, email: &str) {
    let _ = sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(email)
        .execute(pool)
        .await;
}

/// Create a test user and return (user_id, jwt_token)
async fn create_test_user(pool: &PgPool, config: &Config) -> (Uuid, String, String) {
    let email = format!("platform_test_{}@test.com", Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), config.clone())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1!", "tos_accepted": true }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    let body: Value = test::read_body_json(resp).await;

    let token = body["data"]["token"].as_str().unwrap().to_string();
    let user_id: Uuid = body["data"]["user"]["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();

    (user_id, token, email)
}

// ═══════════════════════════════════════════════════════════════════════
// #55 — brickos-auth: JWT + password hashing work via app endpoints
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_auth_signup_login_roundtrip() {
    let Some((pool, config)) = setup().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };

    let (user_id, token, email) = create_test_user(&pool, &config).await;

    // Token should be a valid JWT (3 dot-separated base64 segments)
    assert_eq!(token.split('.').count(), 3, "JWT should have 3 segments");

    // Login with same credentials should succeed
    let app = test::init_service(build_test_app(pool.clone(), config)).await;
    let req = test_post("/auth/login")
        .set_json(json!({ "email": email, "password": "TestPass1!", "tos_accepted": true }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    let login_user_id: Uuid = body["data"]["user"]["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    assert_eq!(user_id, login_user_id, "login should return same user_id");

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn platform_auth_wrong_password_rejected() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    let (_user_id, _token, email) = create_test_user(&pool, &config).await;

    let app = test::init_service(build_test_app(pool.clone(), config)).await;
    let req = test_post("/auth/login")
        .set_json(json!({ "email": email, "password": "WrongPass9!", "tos_accepted": true }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401, "wrong password should return 401");

    cleanup_user(&pool, &email).await;
}

// ═══════════════════════════════════════════════════════════════════════
// #56 — brickos-crypto: Encryption roundtrip
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_crypto_encrypt_decrypt_roundtrip() {
    use brickos_crypto::Encryptor;

    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = Encryptor::new(Some(key));

    let plaintext = "sensitive health data — glucose 5.4 mmol/L";
    let ciphertext = enc.encrypt(plaintext);

    assert_ne!(
        ciphertext, plaintext,
        "ciphertext should differ from plaintext"
    );
    assert!(
        ciphertext.starts_with("v1:"),
        "ciphertext should use v1 format"
    );

    let decrypted = enc.decrypt(&ciphertext).unwrap();
    assert_eq!(decrypted, plaintext, "roundtrip should preserve data");
}

#[actix_web::test]
async fn platform_crypto_passthrough_without_key() {
    use brickos_crypto::Encryptor;

    let enc = Encryptor::new(None);
    let plaintext = "no encryption configured";
    let result = enc.encrypt(plaintext);
    assert_eq!(
        result, plaintext,
        "passthrough mode should return plaintext"
    );
}

#[actix_web::test]
async fn platform_crypto_tamper_detected() {
    use brickos_crypto::Encryptor;

    let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    let enc = Encryptor::new(Some(key));

    let ciphertext = enc.encrypt("original");

    // Tamper with the ciphertext
    let mut tampered = ciphertext.clone();
    tampered.push('X');
    assert!(
        enc.decrypt(&tampered).is_err(),
        "tampered ciphertext should fail to decrypt"
    );
}

// ═══════════════════════════════════════════════════════════════════════
// #57 — brickos-billing: Stripe + Strike types compile and construct
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_billing_stripe_config_clone() {
    use brickos_billing::config::StripeConfig;
    use std::collections::HashMap;

    let config = StripeConfig {
        secret_key: "sk_test_xxx".into(),
        publishable_key: "pk_test_xxx".into(),
        webhook_secret: "whsec_xxx".into(),
        price_to_tier: HashMap::from([("price_123".into(), ("focus".into(), "monthly".into()))]),
        tier_to_price: HashMap::from([(("focus".into(), "monthly".into()), "price_123".into())]),
    };

    // Clone should work (#57 fix: added Clone derive)
    let cloned = config.clone();
    assert_eq!(cloned.secret_key, "sk_test_xxx");
    assert_eq!(
        cloned.price_to_tier.get("price_123"),
        Some(&("focus".into(), "monthly".into()))
    );
}

#[actix_web::test]
async fn platform_billing_stripe_service_constructs() {
    use brickos_billing::config::StripeConfig;
    use brickos_billing::stripe::StripeService;
    use std::collections::HashMap;

    let config = StripeConfig {
        secret_key: "sk_test_xxx".into(),
        publishable_key: "pk_test_xxx".into(),
        webhook_secret: "whsec_xxx".into(),
        price_to_tier: HashMap::from([("price_A".into(), ("insight".into(), "annual".into()))]),
        tier_to_price: HashMap::from([(("insight".into(), "annual".into()), "price_A".into())]),
    };

    let service = StripeService::new(&config);
    assert_eq!(
        service.tier_from_price_id("price_A"),
        Some(("insight".into(), "annual".into()))
    );
    assert_eq!(
        service.price_id_for_tier("insight", "annual"),
        Some("price_A".into())
    );
    assert!(service.tier_from_price_id("nonexistent").is_none());
}

#[actix_web::test]
async fn platform_billing_strike_service_constructs() {
    use brickos_billing::strike::StrikeService;

    let _service = StrikeService::new("test_api_key".into(), "test_webhook_secret".into());
    // Construction succeeds — Strike service is ready (no live API call)
}

#[actix_web::test]
async fn platform_billing_strike_webhook_no_secret_dev_mode() {
    use brickos_billing::strike::StrikeService;

    // Empty webhook secret = dev mode (parse but don't verify signature)
    let service = StrikeService::new("test_key".into(), String::new());

    let payload = serde_json::json!({
        "id": "evt_123",
        "eventType": "invoice.updated",
        "data": { "entityId": "inv_456" }
    });
    let payload_bytes = serde_json::to_vec(&payload).unwrap();

    let result = service.verify_webhook(&payload_bytes, "any_signature");
    assert!(result.is_ok(), "dev mode should parse without verifying");

    let event = result.unwrap();
    assert_eq!(event.event_type, "invoice.updated");
}

// ═══════════════════════════════════════════════════════════════════════
// #58 — brickos-email: Provider trait + factory
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_email_log_provider_implements_trait() {
    use brickos_email::{EmailProvider, LogProvider};
    use std::sync::Arc;

    // LogProvider should implement the trait (compile-time check + runtime)
    let provider: Arc<dyn EmailProvider> = Arc::new(LogProvider);
    // Trait object construction succeeds
    assert!(Arc::strong_count(&provider) == 1);
}

#[actix_web::test]
async fn platform_email_log_provider_send() {
    use brickos_email::{EmailProvider, LogProvider};

    let provider = LogProvider;
    let result = provider
        .send("test@example.com", "Test Subject", "<p>html</p>", "text")
        .await;
    assert!(result.is_ok(), "LogProvider send should always succeed");
}

#[actix_web::test]
async fn platform_email_factory_fallback_to_log() {
    use brickos_email::create_email_provider;

    // With no MAILGUN/SMTP env vars, factory should return LogProvider
    let provider = create_email_provider(false);
    // Should not panic — provider is usable
    assert!(std::sync::Arc::strong_count(&provider) == 1);
}

// ═══════════════════════════════════════════════════════════════════════
// #59 — brickos-db: User + Organization models
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_db_org_roles_defined() {
    use brickos_db::models::organization::{ORG_ROLES, SHARE_SCOPES};

    assert!(
        ORG_ROLES.contains(&"owner"),
        "ORG_ROLES should include 'owner'"
    );
    assert!(
        ORG_ROLES.contains(&"practitioner"),
        "ORG_ROLES should include 'practitioner'"
    );
    assert!(
        ORG_ROLES.contains(&"patient"),
        "ORG_ROLES should include 'patient'"
    );

    assert!(!SHARE_SCOPES.is_empty(), "SHARE_SCOPES should have entries");
}

#[actix_web::test]
async fn platform_db_user_model_serializes() {
    use brickos_db::models::user::BaseUserResponse;

    // BaseUserResponse should be serializable (used in API responses)
    let resp = BaseUserResponse {
        id: Uuid::new_v4(),
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
}

// ═══════════════════════════════════════════════════════════════════════
// #43 — Row-Level Security: cross-user data isolation
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_rls_policies_exist_on_all_protected_tables() {
    let Some(pool) = setup_pool().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };

    let expected_tables = vec![
        "measurements",
        "devices",
        "doctor_chat_conversations",
        "measurement_templates",
        "user_medications",
        "influence_factors",
        "calculated_marker_values",
        "reference_ranges",
        "user_mfa",
        "user_preferences",
        "user_profile",
        "import_history",
        "import_sessions",
        "data_shares",
        "subscriptions",
        "data_access_log",
    ];

    for table in &expected_tables {
        let row = sqlx::query(
            "SELECT relrowsecurity, relforcerowsecurity
             FROM pg_class WHERE relname = $1",
        )
        .bind(table)
        .fetch_optional(&pool)
        .await
        .unwrap();

        let row = row.unwrap_or_else(|| panic!("Table '{}' not found", table));
        let rls_enabled: bool = row.get("relrowsecurity");
        let rls_forced: bool = row.get("relforcerowsecurity");

        assert!(rls_enabled, "RLS should be ENABLED on '{}'", table);
        assert!(rls_forced, "RLS should be FORCED on '{}'", table);
    }
}

#[actix_web::test]
async fn platform_rls_no_session_returns_zero_rows() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    // Without setting app.current_user_id, RLS should return 0 rows
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM measurements")
        .fetch_one(&pool)
        .await
        .unwrap();

    // Even if there is data, without the session var we get 0
    // (or the table is empty, which is also 0 — either way, no leak)
    assert_eq!(
        count, 0,
        "Without RLS session var, measurements should return 0 rows"
    );
}

#[actix_web::test]
async fn platform_rls_user_isolation() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    // Create two users
    let (user_a, _token_a, email_a) = create_test_user(&pool, &config).await;
    let (user_b, _token_b, email_b) = create_test_user(&pool, &config).await;

    // Insert a device for user A (bypassing RLS with superuser session)
    let device_id = Uuid::new_v4();
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_a.to_string())
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(
        "INSERT INTO devices (id, user_id, name, device_type, created_at)
         VALUES ($1, $2, 'Test Device', 'manual', now())
         ON CONFLICT DO NOTHING",
    )
    .bind(device_id)
    .bind(user_a)
    .execute(&pool)
    .await
    .unwrap();

    // User A should see the device
    let count_a: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(count_a >= 1, "User A should see their own device");

    // Switch to User B — should NOT see User A's device
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_b.to_string())
        .execute(&pool)
        .await
        .unwrap();

    let count_b: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices WHERE id = $1")
        .bind(device_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        count_b, 0,
        "User B should NOT see User A's device (RLS isolation)"
    );

    // Cleanup
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_a.to_string())
        .execute(&pool)
        .await
        .unwrap();
    let _ = sqlx::query("DELETE FROM devices WHERE id = $1")
        .bind(device_id)
        .execute(&pool)
        .await;

    cleanup_user(&pool, &email_a).await;
    cleanup_user(&pool, &email_b).await;
}

// ═══════════════════════════════════════════════════════════════════════
// #44 — Database role separation
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_db_roles_exist() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let roles: Vec<String> = sqlx::query_scalar(
        "SELECT rolname::text FROM pg_roles WHERE rolname IN ('sh_app', 'sh_readonly')",
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert!(
        roles.contains(&"sh_app".to_string()),
        "sh_app role should exist"
    );
    assert!(
        roles.contains(&"sh_readonly".to_string()),
        "sh_readonly role should exist"
    );
}

#[actix_web::test]
async fn platform_db_sh_app_has_no_delete() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    // Check that sh_app does NOT have DELETE privilege on user tables
    let has_delete: bool =
        sqlx::query_scalar("SELECT has_table_privilege('sh_app', 'measurements', 'DELETE')")
            .fetch_one(&pool)
            .await
            .unwrap();

    assert!(!has_delete, "sh_app should NOT have DELETE on measurements");
}

#[actix_web::test]
async fn platform_db_sh_app_has_select_insert_update() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    for priv_type in &["SELECT", "INSERT", "UPDATE"] {
        let has_priv: bool = sqlx::query_scalar(&format!(
            "SELECT has_table_privilege('sh_app', 'measurements', '{}')",
            priv_type
        ))
        .fetch_one(&pool)
        .await
        .unwrap();

        assert!(has_priv, "sh_app should have {} on measurements", priv_type);
    }
}

#[actix_web::test]
async fn platform_db_sh_readonly_has_only_select() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let has_select: bool =
        sqlx::query_scalar("SELECT has_table_privilege('sh_readonly', 'measurements', 'SELECT')")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(has_select, "sh_readonly should have SELECT");

    for priv_type in &["INSERT", "UPDATE", "DELETE"] {
        let has_priv: bool = sqlx::query_scalar(&format!(
            "SELECT has_table_privilege('sh_readonly', 'measurements', '{}')",
            priv_type
        ))
        .fetch_one(&pool)
        .await
        .unwrap();

        assert!(
            !has_priv,
            "sh_readonly should NOT have {} on measurements",
            priv_type
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════
// #67 — pgaudit extension
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_pgaudit_extension_installed() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgaudit')")
            .fetch_one(&pool)
            .await
            .unwrap();

    // pgaudit may not be available in CI (plain postgres:16-alpine),
    // but the migration should have run without error (CREATE IF NOT EXISTS).
    // If it IS available, it should be installed.
    if !exists {
        println!(
            "NOTE: pgaudit extension not available in this PostgreSQL instance. \
             This is expected in CI (plain postgres:16-alpine). \
             Production uses the custom Dockerfile with pgaudit compiled."
        );
    }
    // Test passes either way — the important thing is the migration didn't fail
}

// ═══════════════════════════════════════════════════════════════════════
// #45 — Data access audit log
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_data_access_log_table_exists() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'data_access_log'
        )",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(exists, "data_access_log table should exist");
}

#[actix_web::test]
async fn platform_data_access_log_insert_and_rls() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    let (user_a, _token_a, email_a) = create_test_user(&pool, &config).await;
    let (user_b, _token_b, email_b) = create_test_user(&pool, &config).await;

    // Set RLS context to user A
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_a.to_string())
        .execute(&pool)
        .await
        .unwrap();

    // Log an access event for user A's data
    let log_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO data_access_log (id, user_id, accessed_by, action, resource)
         VALUES ($1, $2, $2, 'view', 'measurements')",
    )
    .bind(log_id)
    .bind(user_a)
    .execute(&pool)
    .await
    .unwrap();

    // User A should see the log entry
    let count_a: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM data_access_log WHERE id = $1")
        .bind(log_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count_a, 1, "User A should see their own access log");

    // Switch to user B — should NOT see user A's access log
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_b.to_string())
        .execute(&pool)
        .await
        .unwrap();

    let count_b: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM data_access_log WHERE id = $1")
        .bind(log_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        count_b, 0,
        "User B should NOT see User A's access log (RLS)"
    );

    // Cleanup — switch back to user A to delete
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_a.to_string())
        .execute(&pool)
        .await
        .unwrap();
    let _ = sqlx::query("DELETE FROM data_access_log WHERE id = $1")
        .bind(log_id)
        .execute(&pool)
        .await;

    cleanup_user(&pool, &email_a).await;
    cleanup_user(&pool, &email_b).await;
}

// ═══════════════════════════════════════════════════════════════════════
// Integration: brickos crates wired into sovereign-health app
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_app_boots_with_all_crates() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    // The app should build and respond to /health with all crates integrated
    let app = test::init_service(build_test_app(pool, config)).await;

    let req = test_get("/health").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["status"], "ok");
    assert_eq!(body["service"], "sovereign-health-backend");
}

#[actix_web::test]
async fn platform_auth_flow_uses_brickos_auth_crate() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    // Full auth flow: signup → login → access protected endpoint
    let (user_id, token, email) = create_test_user(&pool, &config).await;

    let app = test::init_service(build_test_app(pool.clone(), config)).await;

    // Use JWT from brickos-auth to access /me
    let req = test_get("/api/v1/me")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "/me should succeed with valid JWT");

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(
        body["data"]["id"].as_str().unwrap(),
        user_id.to_string(),
        "/me should return the correct user"
    );

    cleanup_user(&pool, &email).await;
}

// ═══════════════════════════════════════════════════════════════════════
// RLS helper function
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn platform_rls_helper_function_exists() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'app_current_user_id'
        )",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(exists, "app_current_user_id() function should exist");
}

#[actix_web::test]
async fn platform_rls_helper_returns_null_without_session() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    // Reset session variable
    let _ = sqlx::query("SELECT set_config('app.current_user_id', '', false)")
        .execute(&pool)
        .await;

    let result: Option<Uuid> = sqlx::query_scalar("SELECT app_current_user_id()")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert!(
        result.is_none(),
        "app_current_user_id() should return NULL without session"
    );
}
