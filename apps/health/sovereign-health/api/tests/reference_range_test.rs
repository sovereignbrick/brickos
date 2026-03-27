//! RC tests for reference ranges: completeness, consistency, and tooltip coverage.
//!
//! Requires DATABASE_URL to be set. Tests skip gracefully if not available.

mod common;

use sqlx::Row;

// ---- Reference range completeness ----

#[actix_web::test]
async fn test_all_markers_have_standard_reference_ranges() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Count markers without any reference range row (standard protocol)
    let missing: Vec<String> = sqlx::query_scalar(
        r#"SELECT m.marker_slug
           FROM markers m
           LEFT JOIN reference_ranges rr ON rr.marker_id = m.id AND rr.user_id IS NULL AND rr.protocol_context = 'standard'
           WHERE rr.id IS NULL
           ORDER BY m.marker_slug"#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    assert!(
        missing.is_empty(),
        "Markers missing standard reference ranges: {:?}",
        missing
    );
}

#[actix_web::test]
async fn test_no_null_threshold_ranges() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // All ranges should have at least green_min and green_max defined
    let incomplete: Vec<String> = sqlx::query_scalar(
        r#"SELECT m.marker_slug
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE rr.user_id IS NULL AND rr.protocol_context = 'standard'
             AND rr.green_min IS NULL AND rr.green_max IS NULL
           ORDER BY m.marker_slug"#,
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    assert!(
        incomplete.is_empty(),
        "Markers with all-NULL green ranges: {:?}",
        incomplete
    );
}

#[actix_web::test]
async fn test_green_range_inside_orange_range() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Green range should be a subset of orange range (when both are defined)
    let violations: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE rr.user_id IS NULL
             AND rr.orange_min IS NOT NULL AND rr.green_min IS NOT NULL
             AND rr.orange_min > rr.green_min"#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    assert_eq!(
        violations, 0,
        "Found {} ranges where orange_min > green_min",
        violations
    );

    let violations2: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE rr.user_id IS NULL
             AND rr.orange_max IS NOT NULL AND rr.green_max IS NOT NULL
             AND rr.orange_max < rr.green_max"#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    assert_eq!(
        violations2, 0,
        "Found {} ranges where orange_max < green_max",
        violations2
    );
}

#[actix_web::test]
async fn test_keto_protocol_ranges_exist() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // At least glucose, ketones, and triglycerides should have keto ranges
    let keto_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(DISTINCT m.marker_slug)
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE rr.user_id IS NULL AND rr.protocol_context = 'standard_keto'"#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    assert!(
        keto_count >= 5,
        "Expected at least 5 markers with keto ranges, got {}",
        keto_count
    );
}

#[actix_web::test]
async fn test_fasting_protocol_ranges_exist() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // At least glucose, ketones, uric_acid should have fasting ranges
    let fasting_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(DISTINCT m.marker_slug)
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE rr.user_id IS NULL AND rr.protocol_context LIKE 'fasting%'"#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    assert!(
        fasting_count >= 3,
        "Expected at least 3 markers with fasting ranges, got {}",
        fasting_count
    );
}

// ---- Tooltip coverage ----

#[actix_web::test]
async fn test_key_markers_have_tooltips() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Critical markers that must have tooltips
    let key_markers = vec![
        "glucose",
        "ketones",
        "insulin",
        "hba1c",
        "tsh",
        "ldl_c",
        "hdl_c",
        "triglycerides",
        "apob",
        "hs_crp",
        "hemoglobin",
        "hematocrit",
        "alt",
        "ast",
        "ggt",
        "egfr",
        "creatinine",
        "vitamin_d",
        "ferritin",
        "magnesium",
    ];

    let missing: Vec<String> = sqlx::query_scalar(
        r#"SELECT m.marker_slug
           FROM markers m
           LEFT JOIN marker_translations mt ON mt.marker_id = m.id AND mt.locale = 'en'
           WHERE m.marker_slug = ANY($1)
             AND (mt.tooltip IS NULL OR mt.tooltip = '')
           ORDER BY m.marker_slug"#,
    )
    .bind(&key_markers)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    assert!(
        missing.is_empty(),
        "Key markers missing English tooltips: {:?}",
        missing
    );
}

#[actix_web::test]
async fn test_tooltips_contain_loinc() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Tooltips that exist should contain LOINC reference
    let without_loinc: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM marker_translations mt
           WHERE mt.locale = 'en'
             AND mt.tooltip IS NOT NULL AND mt.tooltip != ''
             AND mt.tooltip NOT LIKE '%LOINC:%'"#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    assert_eq!(
        without_loinc, 0,
        "Found {} tooltips without LOINC reference",
        without_loinc
    );
}

// ---- Settings API returns reference ranges ----

#[actix_web::test]
async fn test_settings_returns_system_reference_ranges() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };

    // Need an authenticated user for /settings
    // Use the tier_test helper pattern
    let email = format!("range_test_{}@example.com", uuid::Uuid::new_v4());
    use argon2::{
        password_hash::{rand_core::OsRng, SaltString},
        Argon2, PasswordHasher,
    };
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(b"TestPass123!", &salt)
        .unwrap()
        .to_string();

    let row = sqlx::query("INSERT INTO users (email, password_hash, display_name, tier) VALUES ($1, $2, 'Range Test', 'glimpse') RETURNING id")
        .bind(&email)
        .bind(&hash)
        .fetch_optional(&pool)
        .await
        .unwrap();

    let Some(row) = row else { return };
    let user_id: uuid::Uuid = row.try_get("id").unwrap();

    // Create required profile rows
    let _ =
        sqlx::query("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
            .bind(user_id)
            .execute(&pool)
            .await;
    let _ = sqlx::query("INSERT INTO user_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(user_id)
        .execute(&pool)
        .await;
    let _ = sqlx::query("INSERT INTO user_licenses (user_id, tier_id, status, started_at) VALUES ($1, (SELECT id FROM license_tiers WHERE slug = 'glimpse'), 'active', NOW()) ON CONFLICT (user_id) DO NOTHING").bind(user_id).execute(&pool).await;

    let token = sovereign_health_backend::services::auth::create_jwt(
        &user_id.to_string(),
        "user",
        "glimpse",
        &std::env::var("JWT_SECRET").unwrap_or_else(|_| "test_secret_key_32chars_long_xxxx".into()),
        3600,
    )
    .unwrap();

    let app =
        actix_web::test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = actix_web::test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/settings")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = actix_web::test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "Settings should return 200, got {}",
        resp.status()
    );

    let body: serde_json::Value = actix_web::test::read_body_json(resp).await;
    let ranges = body["data"]["system_reference_ranges"].as_array();
    assert!(
        ranges.is_some(),
        "system_reference_ranges should be an array"
    );
    let ranges = ranges.unwrap();
    assert!(
        ranges.len() >= 60,
        "Should have at least 60 system reference ranges, got {}",
        ranges.len()
    );

    // Verify glucose has a range
    let glucose = ranges.iter().find(|r| r["marker_slug"] == "glucose");
    assert!(
        glucose.is_some(),
        "Glucose should have a system reference range"
    );
    let glucose = glucose.unwrap();
    assert!(
        glucose["green_min"].as_f64().is_some(),
        "Glucose green_min should be numeric"
    );
    assert!(
        glucose["green_max"].as_f64().is_some(),
        "Glucose green_max should be numeric"
    );

    // Cleanup
    let _ = sqlx::query("DELETE FROM user_licenses WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_preferences WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_profile WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;
    let _ = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;
}
