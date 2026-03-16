/// M05 measurement integration tests.
/// These tests require a live PostgreSQL database.
/// They are skipped automatically if DATABASE_URL or JWT_SECRET are not set.
///
/// Run with: DATABASE_URL=postgres://... JWT_SECRET=testsecret cargo test --test measurement_test
mod common;

use actix_web::test;
use chrono::Utc;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use sovereign_health_backend::config::Config;

/// Create a test user and return (user_id, jwt_token).
async fn create_test_user(pool: &PgPool, config: &Config) -> (Uuid, String) {
    let email = format!("test_{}@example.com", Uuid::new_v4());
    let password = "TestPassword123!";

    use argon2::{
        password_hash::{rand_core::OsRng, SaltString},
        Argon2, PasswordHasher,
    };
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("hash failed")
        .to_string();

    let row = sqlx::query(
        "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(&email)
    .bind(&password_hash)
    .bind("Test User")
    .fetch_one(pool)
    .await
    .expect("insert user failed");

    use sqlx::Row;
    let user_id: Uuid = row.try_get("id").expect("get id");

    // Insert required profile rows
    sqlx::query("INSERT INTO user_preferences (user_id) VALUES ($1)")
        .bind(user_id)
        .execute(pool)
        .await
        .ok();

    sqlx::query("INSERT INTO user_profile (user_id) VALUES ($1)")
        .bind(user_id)
        .execute(pool)
        .await
        .ok();

    // Create JWT
    use sovereign_health_backend::services::auth::create_jwt;
    let token = create_jwt(
        &user_id.to_string(),
        "user",
        "free",
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )
    .expect("create jwt");

    (user_id, token)
}

/// Clean up test user data (cascades to measurements etc.)
async fn cleanup_user(pool: &PgPool, user_id: Uuid) {
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await
        .ok();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_create_measurement_session() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [
            { "marker_slug": "glucose", "value": 5.5 },
            { "marker_slug": "ketones", "value": 1.2 }
        ],
        "protocol_tag": "standard"
    });

    let req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(body.to_string())
        .to_request();

    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let resp_body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 201, "body: {}", resp_body);
    let measurements = resp_body["data"]["measurements"]
        .as_array()
        .expect("measurements array");
    assert_eq!(measurements.len(), 2);

    let slugs: Vec<&str> = measurements
        .iter()
        .map(|m| m["marker_slug"].as_str().unwrap())
        .collect();
    assert!(slugs.contains(&"glucose"));
    assert!(slugs.contains(&"ketones"));

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_gki_auto_calculated() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [
            { "marker_slug": "glucose", "value": 5.5 },
            { "marker_slug": "ketones", "value": 1.1 }
        ],
        "protocol_tag": "standard"
    });

    let req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(body.to_string())
        .to_request();

    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let resp_body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 201, "body: {}", resp_body);
    let calculated = resp_body["data"]["calculated_markers"]
        .as_array()
        .expect("calculated_markers array");

    let gki = calculated
        .iter()
        .find(|m| m["marker_slug"].as_str() == Some("gki"));
    assert!(
        gki.is_some(),
        "GKI should be calculated, got: {:?}",
        calculated
    );

    let gki_val = gki.unwrap()["value"].as_f64().expect("gki value");
    // GKI = 5.5 / 1.1 = 5.0
    assert!(
        (gki_val - 5.0).abs() < 0.01,
        "GKI expected ~5.0, got {}",
        gki_val
    );

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_whtr_auto_calculated() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    // Set height_cm for WHtR calculation
    sqlx::query("UPDATE user_profile SET height_cm = 175 WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await
        .expect("set height");

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [
            { "marker_slug": "waist_circumference", "value": 87.5 }
        ],
        "protocol_tag": "standard"
    });

    let req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(body.to_string())
        .to_request();

    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let resp_body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 201, "body: {}", resp_body);
    let calculated = resp_body["data"]["calculated_markers"]
        .as_array()
        .expect("calculated_markers");

    let whtr = calculated
        .iter()
        .find(|m| m["marker_slug"].as_str() == Some("whtr"));
    assert!(
        whtr.is_some(),
        "WHtR should be calculated, got: {:?}",
        calculated
    );

    let whtr_val = whtr.unwrap()["value"].as_f64().expect("whtr value");
    // WHtR = 87.5 / 175.0 = 0.5
    assert!(
        (whtr_val - 0.5).abs() < 0.01,
        "WHtR expected ~0.5, got {}",
        whtr_val
    );

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_validation_rejects_out_of_range() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [
            { "marker_slug": "glucose", "value": 999.0 }
        ],
        "protocol_tag": "standard"
    });

    let req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(body.to_string())
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400, "Should reject out-of-range glucose");

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_get_measurements_list() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // Create a measurement first
    let create_body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.0 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    test::call_service(&app, create_req).await;

    // Now list
    let list_req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements?page=1&per_page=10")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, list_req).await;
    let status = resp.status();
    let body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 200, "body: {}", body);
    assert!(body["data"].is_array());
    assert!(body["meta"]["total"].as_i64().unwrap_or(0) >= 1);
    assert_eq!(body["meta"]["page"].as_i64().unwrap(), 1);
    assert_eq!(body["meta"]["per_page"].as_i64().unwrap(), 10);

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_get_measurements_filter_date() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let now = Utc::now();

    // Create measurement
    let create_body = json!({
        "measured_at": now.to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.0 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    test::call_service(&app, create_req).await;

    // Filter within range - should find it
    // Use format_with_items to avoid '+' in timezone offset (URL-unsafe in query params)
    let fmt = "%Y-%m-%dT%H:%M:%S%.fZ";
    let from = (now - chrono::Duration::hours(1)).format(fmt).to_string();
    let to = (now + chrono::Duration::hours(1)).format(fmt).to_string();
    let uri = format!("/measurements?from={}&to={}", from, to);
    let list_req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri(&uri)
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, list_req).await;
    let body: Value = test::read_body_json(resp).await;
    assert!(body["meta"]["total"].as_i64().unwrap_or(0) >= 1);

    // Filter outside range - should not find it
    let future_from = (now + chrono::Duration::days(1)).format(fmt).to_string();
    let future_to = (now + chrono::Duration::days(2)).format(fmt).to_string();
    let uri2 = format!("/measurements?from={}&to={}", future_from, future_to);
    let list_req2 = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri(&uri2)
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp2 = test::call_service(&app, list_req2).await;
    let body2: Value = test::read_body_json(resp2).await;
    assert_eq!(body2["meta"]["total"].as_i64().unwrap_or(0), 0);

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_put_measurement() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // Create measurement
    let create_body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.0 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    let create_resp = test::call_service(&app, create_req).await;
    let create_body: Value = test::read_body_json(create_resp).await;
    let measurement_id = create_body["data"]["measurements"][0]["id"]
        .as_str()
        .expect("measurement id");

    // Update value
    let update_body = json!({ "value": 6.5 });
    let update_req = test::TestRequest::put()
        .peer_addr(common::test_peer_addr())
        .uri(&format!("/measurements/{}", measurement_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(update_body.to_string())
        .to_request();

    let update_resp = test::call_service(&app, update_req).await;
    let update_status = update_resp.status();
    let update_body: Value = test::read_body_json(update_resp).await;

    assert_eq!(update_status, 200, "body: {}", update_body);
    let updated_val = update_body["data"]["value"].as_f64().expect("value");
    assert!(
        (updated_val - 6.5).abs() < 0.01,
        "Expected 6.5, got {}",
        updated_val
    );

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_delete_soft() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // Create measurement
    let create_body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.0 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    let create_resp = test::call_service(&app, create_req).await;
    let create_body: Value = test::read_body_json(create_resp).await;
    let measurement_id = create_body["data"]["measurements"][0]["id"]
        .as_str()
        .expect("measurement id");

    // Delete it
    let del_req = test::TestRequest::delete()
        .peer_addr(common::test_peer_addr())
        .uri(&format!("/measurements/{}", measurement_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let del_resp = test::call_service(&app, del_req).await;
    assert_eq!(del_resp.status(), 200);

    // GET should 404
    let get_req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri(&format!("/measurements/{}", measurement_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let get_resp = test::call_service(&app, get_req).await;
    assert_eq!(get_resp.status(), 404);

    // List should not include it
    let list_req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let list_resp = test::call_service(&app, list_req).await;
    let list_body: Value = test::read_body_json(list_resp).await;
    let ids: Vec<&str> = list_body["data"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|m| m["id"].as_str())
        .collect();
    assert!(!ids.contains(&measurement_id));

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_get_zones() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/zones")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 200, "body: {}", body);
    let zones = body["data"].as_array().expect("zones array");
    assert_eq!(
        zones.len(),
        8,
        "Expected 8 zones, got {}: {:?}",
        zones.len(),
        zones
    );

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_get_trends() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user_id, token) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // Create some measurements
    let create_body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.2 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    test::call_service(&app, create_req).await;

    // Get trends
    let req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri("/trends/glucose?days=30")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    let status = resp.status();
    let body: Value = test::read_body_json(resp).await;

    assert_eq!(status, 200, "body: {}", body);
    assert_eq!(body["data"]["marker_slug"].as_str().unwrap(), "glucose");
    assert!(body["data"]["points"].is_array());

    cleanup_user(&pool, user_id).await;
}

#[actix_web::test]
async fn test_no_auth_returns_401() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // All M05 endpoints should return 401 without auth
    let endpoints = [
        "/measurements",
        "/zones",
        "/trends/glucose",
        "/calculated-markers",
    ];

    for uri in endpoints {
        let req = test::TestRequest::get()
            .peer_addr(common::test_peer_addr())
            .uri(uri)
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status(),
            401,
            "Expected 401 on GET {}, got {}",
            uri,
            resp.status()
        );
    }
}

#[actix_web::test]
async fn test_cannot_read_other_user_measurement() {
    let Some((pool, config)) = common::setup().await else {
        println!("Skipping DB test - DATABASE_URL not available");
        return;
    };

    let (user1_id, token1) = create_test_user(&pool, &config).await;
    let (user2_id, token2) = create_test_user(&pool, &config).await;

    let app = test::init_service(common::build_test_app(pool.clone(), config.clone())).await;

    // User 1 creates a measurement
    let create_body = json!({
        "measured_at": Utc::now().to_rfc3339(),
        "values": [{ "marker_slug": "glucose", "value": 5.0 }]
    });
    let create_req = test::TestRequest::post()
        .peer_addr(common::test_peer_addr())
        .uri("/measurements")
        .insert_header(("Authorization", format!("Bearer {}", token1)))
        .insert_header(("Content-Type", "application/json"))
        .set_payload(create_body.to_string())
        .to_request();
    let create_resp = test::call_service(&app, create_req).await;
    let create_body: Value = test::read_body_json(create_resp).await;
    let measurement_id = create_body["data"]["measurements"][0]["id"]
        .as_str()
        .expect("measurement id");

    // User 2 tries to read it - should get 404
    let get_req = test::TestRequest::get()
        .peer_addr(common::test_peer_addr())
        .uri(&format!("/measurements/{}", measurement_id))
        .insert_header(("Authorization", format!("Bearer {}", token2)))
        .to_request();
    let get_resp = test::call_service(&app, get_req).await;
    assert_eq!(
        get_resp.status(),
        404,
        "User 2 should not see user 1's measurement"
    );

    cleanup_user(&pool, user1_id).await;
    cleanup_user(&pool, user2_id).await;
}
