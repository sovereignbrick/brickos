//! Integration tests for license tier enforcement, feature gates, and chat quota.
//!
//! Requires DATABASE_URL to be set. Tests skip gracefully if not available.

mod common;

use actix_web::test;
use sqlx::{PgPool, Row};
use uuid::Uuid;

async fn create_test_user_with_tier(pool: &PgPool, tier_slug: &str) -> Option<(Uuid, String)> {
    let email = format!("tier_test_{}@example.com", Uuid::new_v4());

    use argon2::{
        password_hash::{rand_core::OsRng, SaltString},
        Argon2, PasswordHasher,
    };
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(b"TestPassword123!", &salt)
        .ok()?
        .to_string();

    let row = sqlx::query("INSERT INTO users (email, password_hash, display_name, tier) VALUES ($1, $2, 'Tier Test', $3) RETURNING id")
        .bind(&email)
        .bind(&hash)
        .bind(tier_slug)
        .fetch_one(pool)
        .await
        .ok()?;

    let user_id: Uuid = row.try_get("id").ok()?;

    // Create profile rows
    sqlx::query("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(user_id)
        .execute(pool)
        .await
        .ok();

    sqlx::query("INSERT INTO user_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(user_id)
        .execute(pool)
        .await
        .ok();

    // Get tier_id
    let tier_row = sqlx::query("SELECT id FROM license_tiers WHERE slug = $1")
        .bind(tier_slug)
        .fetch_optional(pool)
        .await
        .ok()??;

    let tier_id: Uuid = tier_row.try_get("id").ok()?;

    // Create license
    sqlx::query(
        "INSERT INTO user_licenses (user_id, tier_id, status, started_at) VALUES ($1, $2, 'active', NOW()) ON CONFLICT (user_id) DO UPDATE SET tier_id = $2, status = 'active'"
    )
        .bind(user_id)
        .bind(tier_id)
        .execute(pool)
        .await
        .ok()?;

    let token = sovereign_health_backend::services::auth::create_jwt(
        &user_id.to_string(),
        "user",
        tier_slug,
        &std::env::var("JWT_SECRET").unwrap_or_else(|_| "test_secret_key_32chars_long_xxxx".into()),
        3600,
    )
    .ok()?;

    Some((user_id, token))
}

async fn cleanup_user(pool: &PgPool, user_id: Uuid) {
    let _ = sqlx::query("DELETE FROM chat_agent_quota WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_licenses WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_preferences WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_profile WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
}

// ─── Tier catalog ───

#[actix_web::test]
async fn test_list_tiers_returns_active_tiers() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license/tiers")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "Expected 200, got {}",
        resp.status()
    );

    let body: serde_json::Value = test::read_body_json(resp).await;
    let tiers = body["data"].as_array().expect("tiers should be array");
    assert!(tiers.len() >= 4, "Should have at least 4 active tiers");

    let slugs: Vec<&str> = tiers.iter().filter_map(|t| t["slug"].as_str()).collect();
    assert!(slugs.contains(&"glimpse"));
    assert!(slugs.contains(&"focus"));
    assert!(slugs.contains(&"insight"));
    assert!(slugs.contains(&"clarity"));
    // core should not be public
    assert!(!slugs.contains(&"core"));
}

#[actix_web::test]
async fn test_tier_prices_are_correct() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license/tiers")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let tiers = body["data"].as_array().unwrap();

    let focus = tiers.iter().find(|t| t["slug"] == "focus").unwrap();
    assert_eq!(focus["price_monthly_eur"].as_f64().unwrap(), 9.99);

    let insight = tiers.iter().find(|t| t["slug"] == "insight").unwrap();
    assert_eq!(insight["price_monthly_eur"].as_f64().unwrap(), 24.99);

    let clarity = tiers.iter().find(|t| t["slug"] == "clarity").unwrap();
    assert_eq!(clarity["price_monthly_eur"].as_f64().unwrap(), 49.99);
}

#[actix_web::test]
async fn test_glimpse_limits() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license/tiers")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let tiers = body["data"].as_array().unwrap();

    let glimpse = tiers.iter().find(|t| t["slug"] == "glimpse").unwrap();
    assert_eq!(glimpse["max_markers"].as_i64().unwrap(), 8);
    assert_eq!(glimpse["max_history_days"].as_i64().unwrap(), 30);
    assert!(!glimpse["csv_export"].as_bool().unwrap());
    assert!(!glimpse["json_export"].as_bool().unwrap());
}

#[actix_web::test]
async fn test_focus_features() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license/tiers")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let tiers = body["data"].as_array().unwrap();

    let focus = tiers.iter().find(|t| t["slug"] == "focus").unwrap();
    assert!(focus["csv_export"].as_bool().unwrap());
    assert!(focus["json_export"].as_bool().unwrap());
    assert!(focus["custom_thresholds"].as_bool().unwrap());
    // Focus has 20 markers in tier v3
    assert_eq!(focus["max_markers"].as_i64().unwrap(), 20);
}

// ─── Feature gate enforcement ───

#[actix_web::test]
async fn test_csv_export_requires_auth() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/export/csv")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn test_license_endpoint_requires_auth() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn test_license_returns_user_tier() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let Some((user_id, token)) = create_test_user_with_tier(&pool, "glimpse").await else {
        println!("Skipping - could not create test user");
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    // License endpoint should return user's tier info (structure may vary)
    assert!(
        !body["data"].is_null(),
        "License data should not be null: {}",
        body
    );

    cleanup_user(&pool, user_id).await;
}

// ─── SSoT: tier_features enforcement ───

#[actix_web::test]
async fn test_load_tier_features_returns_features() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    use sovereign_health_backend::services::tier;
    let fs = tier::load_tier_features(&pool, "glimpse").await;
    assert!(fs.is_ok(), "Should load glimpse tier features");
    let fs = fs.unwrap();
    assert_eq!(fs.tier_slug, "glimpse");
    // Glimpse should NOT include csv_export
    assert!(!fs.is_included("csv_export"));
    // Glimpse SHOULD have markers with a limit
    let markers_limit = fs.get_limit("markers");
    assert!(
        markers_limit.is_some(),
        "Glimpse should have a markers limit"
    );
    assert_eq!(markers_limit.unwrap(), 8);
}

#[actix_web::test]
async fn test_load_tier_features_focus_includes_csv() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    use sovereign_health_backend::services::tier;
    let fs = tier::load_tier_features(&pool, "focus").await.unwrap();
    assert!(
        fs.is_included("csv_export"),
        "Focus should include csv_export"
    );
    assert!(
        fs.is_included("custom_thresholds"),
        "Focus should include custom_thresholds"
    );
    assert_eq!(fs.get_limit("markers"), Some(20));
}

#[actix_web::test]
async fn test_load_tier_features_unlimited_tiers() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    use sovereign_health_backend::services::tier;
    // Core and admin should be synthetic unlimited
    let core = tier::load_tier_features(&pool, "core").await.unwrap();
    assert_eq!(core.tier_slug, "core");

    let admin = tier::load_tier_features(&pool, "admin").await.unwrap();
    assert_eq!(admin.tier_slug, "admin");
}

#[actix_web::test]
async fn test_check_tier_feature_glimpse_blocked() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let Some((user_id, _token)) = create_test_user_with_tier(&pool, "glimpse").await else {
        println!("Skipping - could not create test user");
        return;
    };

    use sovereign_health_backend::services::tier;
    // Glimpse should NOT be allowed csv_export
    let result = tier::check_tier_feature(&pool, user_id, "csv_export").await;
    assert!(result.is_err(), "Glimpse should not have csv_export");

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_check_tier_feature_focus_allowed() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let Some((user_id, _token)) = create_test_user_with_tier(&pool, "focus").await else {
        println!("Skipping - could not create test user");
        return;
    };

    use sovereign_health_backend::services::tier;
    // Focus SHOULD be allowed csv_export
    let result = tier::check_tier_feature(&pool, user_id, "csv_export").await;
    assert!(result.is_ok(), "Focus should have csv_export");

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_check_tier_limit_templates() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let Some((user_id, _token)) = create_test_user_with_tier(&pool, "glimpse").await else {
        println!("Skipping - could not create test user");
        return;
    };

    use sovereign_health_backend::services::tier;
    // Glimpse allows 1 template - 0 used should be OK
    let result = tier::check_tier_limit(&pool, user_id, "measurement_templates", 0).await;
    assert!(result.is_ok(), "0 templates should be within limit");

    // 1 used = at limit, should be blocked (>= check)
    let result = tier::check_tier_limit(&pool, user_id, "measurement_templates", 1).await;
    assert!(
        result.is_err(),
        "1 template should hit the limit for Glimpse"
    );

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_ai_credits_glimpse() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let Some((user_id, _token)) = create_test_user_with_tier(&pool, "glimpse").await else {
        println!("Skipping - could not create test user");
        return;
    };

    use sovereign_health_backend::services::tier;

    // Glimpse should have limited AI credits
    let status = tier::check_ai_credits(&pool, user_id, "general").await;
    assert!(
        status.is_ok(),
        "Glimpse should be able to use AI credits initially"
    );
    let status = status.unwrap();
    assert!(status.limit.is_some(), "Glimpse should have a credit limit");
    assert_eq!(status.used, 0);

    // Consume a credit
    let consumed = tier::consume_ai_credits(&pool, user_id, "general").await;
    assert!(consumed.is_ok(), "Should be able to consume a credit");
    let consumed = consumed.unwrap();
    assert_eq!(consumed.used, 1);

    // Clean up
    let _ = sqlx::query("DELETE FROM ai_credit_usage WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;
    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_ai_credits_clarity_unlimited() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let Some((user_id, _token)) = create_test_user_with_tier(&pool, "clarity").await else {
        println!("Skipping - could not create test user");
        return;
    };

    use sovereign_health_backend::services::tier;

    // Clarity should have unlimited AI credits
    let status = tier::check_ai_credits(&pool, user_id, "general").await;
    assert!(status.is_ok(), "Clarity should pass AI credit check");
    let status = status.unwrap();
    assert!(
        status.limit.is_none(),
        "Clarity should have unlimited credits"
    );

    cleanup_user(&pool, user_id).await;
}

// ─── Tiers/features API endpoint ───

#[actix_web::test]
async fn test_tiers_features_api_returns_matrix() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/api/tiers/features")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "Expected 200, got {}",
        resp.status()
    );

    let body: serde_json::Value = test::read_body_json(resp).await;
    // Should have tiers and groups
    assert!(
        !body["data"]["tiers"].is_null(),
        "Should have tiers in response"
    );
}

// ─── Annual discount consistency ───

#[actix_web::test]
async fn test_annual_price_is_discounted() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/license/tiers")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let tiers = body["data"].as_array().unwrap();

    for tier in tiers {
        let monthly = tier["price_monthly_eur"].as_f64();
        let annual = tier["price_annual_eur"].as_f64();

        if let (Some(m), Some(a)) = (monthly, annual) {
            if m > 0.0 {
                let yearly_full = m * 12.0;
                assert!(
                    a < yearly_full,
                    "Tier {} annual ({}) should be less than 12x monthly ({})",
                    tier["slug"],
                    a,
                    yearly_full
                );
            }
        }
    }
}
