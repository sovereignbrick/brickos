/// CRUD integration test — validates full lifecycle of a BrickOS/Sovereign Health
/// user and their data across all major tables.
///
/// Test flow:
///   1. Create user (signup via API)
///   2. Add devices, measurements, templates, medications, chat
///   3. Read back and verify data + RLS isolation
///   4. Update records (profile, preferences, measurements)
///   5. Soft-delete measurements, verify filtering
///   6. Test constraint enforcement (FK, CHECK, UNIQUE)
///   7. Delete user cascade — verify all related data is gone
///
/// Requires DATABASE_URL + JWT_SECRET.
mod common;

use actix_web::{dev::ServiceResponse, test};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use common::{build_test_app, setup, setup_pool, test_get, test_post};
use sovereign_health_backend::config::Config;

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

async fn set_rls(pool: &PgPool, user_id: Uuid) {
    sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(user_id.to_string())
        .execute(pool)
        .await
        .unwrap();
}

async fn clear_rls(pool: &PgPool) {
    sqlx::query("SELECT set_config('app.current_user_id', '', false)")
        .execute(pool)
        .await
        .unwrap();
}

async fn signup_user(pool: &PgPool, config: &Config, email: &str) -> (Uuid, String) {
    let app = test::init_service(build_test_app(pool.clone(), config.clone())).await;
    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "CrudTest1!", "tos_accepted": true }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201, "Signup should return 201 for {}", email);
    let body: Value = test::read_body_json(resp).await;
    let user_id: Uuid = body["data"]["user"]["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    let token = body["data"]["token"].as_str().unwrap().to_string();
    (user_id, token)
}

async fn get_marker_id(pool: &PgPool, slug: &str) -> Uuid {
    sqlx::query_scalar("SELECT id FROM markers WHERE marker_slug = $1")
        .bind(slug)
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn cascade_delete_user(pool: &PgPool, user_id: Uuid) {
    // CASCADE handles most FKs, but some tables need explicit cleanup
    set_rls(pool, user_id).await;
    let _ = sqlx::query("DELETE FROM data_access_log WHERE user_id = $1 OR accessed_by = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM audit_log WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM license_events WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_licenses WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM user_segments WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM app_roles WHERE user_id = $1 OR granted_by = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM promotion_redemptions WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM payment_events WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM email_sends WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM ai_usage_log WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM btc_payments WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM report_history WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM report_quota WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM chat_agent_quota WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
    // Now delete user — CASCADE handles measurements, devices, prefs, profile, etc.
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await
        .unwrap();
}

// ═══════════════════════════════════════════════════════════════════════
// 1. CREATE — Full user lifecycle setup
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn crud_create_user_and_data() {
    let Some((pool, config)) = setup().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };

    let email = format!("crud_test_{}@test.sovereignhealth.io", Uuid::new_v4());
    let (user_id, token) = signup_user(&pool, &config, &email).await;

    // Verify 1:1 tables were auto-created
    set_rls(&pool, user_id).await;

    let prefs_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM user_preferences WHERE user_id = $1)")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(
        prefs_exists,
        "user_preferences should be auto-created on signup"
    );

    let profile_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM user_profile WHERE user_id = $1)")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(
        profile_exists,
        "user_profile should be auto-created on signup"
    );

    // ── Add device ──
    let device_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO devices (id, user_id, device_name, device_type, markers_measured)
         VALUES ($1, $2, 'Test Glucometer', 'blood_analyzer', ARRAY['glucose', 'ketones'])",
    )
    .bind(device_id)
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    // ── Add measurements ──
    let glucose_id = get_marker_id(&pool, "glucose").await;
    let ketones_id = get_marker_id(&pool, "ketones").await;
    let weight_id = get_marker_id(&pool, "weight").await;

    let m1_id = Uuid::new_v4();
    let m2_id = Uuid::new_v4();
    let m3_id = Uuid::new_v4();

    // Glucose measurement linked to device
    sqlx::query(
        "INSERT INTO measurements (id, user_id, marker_id, device_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, meal_timing_tag)
         VALUES ($1, $2, $3, $4, NOW() - interval '2 hours', '5.2', 'mmol/L', 'green', 'fasting', 'no_tag')",
    )
    .bind(m1_id).bind(user_id).bind(glucose_id).bind(device_id)
    .execute(&pool).await.unwrap();

    // Ketones measurement linked to device
    sqlx::query(
        "INSERT INTO measurements (id, user_id, marker_id, device_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, meal_timing_tag)
         VALUES ($1, $2, $3, $4, NOW() - interval '2 hours', '1.8', 'mmol/L', 'green', 'fasting', 'no_tag')",
    )
    .bind(m2_id).bind(user_id).bind(ketones_id).bind(device_id)
    .execute(&pool).await.unwrap();

    // Weight measurement (manual, no device)
    sqlx::query(
        "INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, meal_timing_tag)
         VALUES ($1, $2, $3, NOW() - interval '1 hour', '82.5', 'kg', 'green', 'standard', 'no_tag')",
    )
    .bind(m3_id).bind(user_id).bind(weight_id)
    .execute(&pool).await.unwrap();

    // ── Add measurement template ──
    let template_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO measurement_templates (id, user_id, name, marker_slugs, is_default)
         VALUES ($1, $2, 'Morning Fasting', ARRAY['glucose', 'ketones'], true)",
    )
    .bind(template_id)
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    // ── Add influence factor (medication) ──
    let med_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO influence_factors (id, user_id, name, category, factor_type, dosage, frequency, is_active)
         VALUES ($1, $2, 'Vitamin D3', 'vitamins-minerals', 'supplement', '5000 IU', 'daily', true)",
    )
    .bind(med_id)
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    // ── Add doctor chat conversation + message ──
    let convo_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO doctor_chat_conversations (id, user_id, title) VALUES ($1, $2, 'GKI question')",
    )
    .bind(convo_id)
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    let msg_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO doctor_chat_messages (id, conversation_id, role, content)
         VALUES ($1, $2, 'user', 'What is a good GKI target?')",
    )
    .bind(msg_id)
    .bind(convo_id)
    .execute(&pool)
    .await
    .unwrap();

    // ── Add data access log entry ──
    sqlx::query(
        "INSERT INTO data_access_log (user_id, accessed_by, action, resource)
         VALUES ($1, $1, 'view', 'measurements')",
    )
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    // ═══════════════════════════════════════════════════════════════════
    // 2. READ — Verify all data was stored correctly
    // ═══════════════════════════════════════════════════════════════════

    let measurement_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(measurement_count, 3, "Should have 3 measurements");

    let device_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM devices WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(device_count, 1, "Should have 1 device");

    let glucose_val: String =
        sqlx::query_scalar("SELECT value_canonical FROM measurements WHERE id = $1")
            .bind(m1_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(glucose_val, "5.2", "Glucose value should be 5.2");

    // Verify device link
    let linked_device: Option<Uuid> =
        sqlx::query_scalar("SELECT device_id FROM measurements WHERE id = $1")
            .bind(m1_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        linked_device,
        Some(device_id),
        "Glucose should be linked to device"
    );

    let manual_device: Option<Uuid> =
        sqlx::query_scalar("SELECT device_id FROM measurements WHERE id = $1")
            .bind(m3_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(
        manual_device.is_none(),
        "Weight should have no device (manual)"
    );

    // Verify template
    let template_markers: Vec<String> =
        sqlx::query_scalar("SELECT unnest(marker_slugs) FROM measurement_templates WHERE id = $1")
            .bind(template_id)
            .fetch_all(&pool)
            .await
            .unwrap();
    assert_eq!(template_markers, vec!["glucose", "ketones"]);

    // Verify influence factor
    let med_name: String = sqlx::query_scalar("SELECT name FROM influence_factors WHERE id = $1")
        .bind(med_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(med_name, "Vitamin D3");

    // Verify chat
    let chat_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM doctor_chat_conversations WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(chat_count, 1);

    // ═══════════════════════════════════════════════════════════════════
    // 3. UPDATE — Modify records
    // ═══════════════════════════════════════════════════════════════════

    // Update profile
    sqlx::query(
        "UPDATE user_profile SET gender = 'male', age = 35, height_cm = 180.5 WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    let height: String =
        sqlx::query_scalar("SELECT height_cm::text FROM user_profile WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(height, "180.5");

    // Update preferences
    sqlx::query(
        "UPDATE user_preferences SET glucose_unit = 'mg/dL', date_format = 'MM/DD/YYYY' WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(&pool)
    .await
    .unwrap();

    let glucose_unit: String =
        sqlx::query_scalar("SELECT glucose_unit FROM user_preferences WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(glucose_unit, "mg/dL");

    // Update measurement value
    sqlx::query("UPDATE measurements SET value_canonical = '5.4', status = 'green' WHERE id = $1")
        .bind(m1_id)
        .execute(&pool)
        .await
        .unwrap();

    let updated_val: String =
        sqlx::query_scalar("SELECT value_canonical FROM measurements WHERE id = $1")
            .bind(m1_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(updated_val, "5.4");

    // Update device nickname
    sqlx::query("UPDATE devices SET device_nickname = 'My Fora' WHERE id = $1")
        .bind(device_id)
        .execute(&pool)
        .await
        .unwrap();

    // Deactivate medication
    sqlx::query(
        "UPDATE influence_factors SET is_active = false, end_date = CURRENT_DATE WHERE id = $1",
    )
    .bind(med_id)
    .execute(&pool)
    .await
    .unwrap();

    let med_active: bool =
        sqlx::query_scalar("SELECT is_active FROM influence_factors WHERE id = $1")
            .bind(med_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(!med_active, "Medication should be deactivated");

    // ═══════════════════════════════════════════════════════════════════
    // 4. SOFT DELETE — Verify filtering
    // ═══════════════════════════════════════════════════════════════════

    // Soft-delete one measurement
    sqlx::query("UPDATE measurements SET is_deleted = true, deleted_at = NOW() WHERE id = $1")
        .bind(m1_id)
        .execute(&pool)
        .await
        .unwrap();

    let active_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        active_count, 2,
        "Should have 2 active measurements after soft delete"
    );

    let total_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurements WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(total_count, 3, "Total measurements should still be 3");

    // ═══════════════════════════════════════════════════════════════════
    // 5. RLS ISOLATION — Second user cannot see first user's data
    // ═══════════════════════════════════════════════════════════════════

    let email_b = format!("crud_test_b_{}@test.sovereignhealth.io", Uuid::new_v4());
    let (user_b, _token_b) = signup_user(&pool, &config, &email_b).await;

    set_rls(&pool, user_b).await;

    let cross_measurements: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurements WHERE id = $1")
            .bind(m2_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cross_measurements, 0,
        "User B should NOT see User A's measurements via RLS"
    );

    let cross_devices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices WHERE id = $1")
        .bind(device_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        cross_devices, 0,
        "User B should NOT see User A's devices via RLS"
    );

    let cross_templates: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurement_templates WHERE id = $1")
            .bind(template_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cross_templates, 0,
        "User B should NOT see User A's templates via RLS"
    );

    let cross_factors: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM influence_factors WHERE id = $1")
            .bind(med_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cross_factors, 0,
        "User B should NOT see User A's medications via RLS"
    );

    let cross_chat: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM doctor_chat_conversations WHERE id = $1")
            .bind(convo_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(cross_chat, 0, "User B should NOT see User A's chat via RLS");

    let cross_access_log: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM data_access_log WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cross_access_log, 0,
        "User B should NOT see User A's access log via RLS"
    );

    // ═══════════════════════════════════════════════════════════════════
    // 6. CONSTRAINT ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════════

    set_rls(&pool, user_id).await;

    // Duplicate email should fail
    let dup_result = sqlx::query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash')")
        .bind(&email)
        .execute(&pool)
        .await;
    assert!(dup_result.is_err(), "Duplicate email should violate UNIQUE");

    // FK violation: measurement with non-existent marker
    let bad_marker = sqlx::query(
        "INSERT INTO measurements (user_id, marker_id, timestamp, value_canonical, unit_canonical, protocol_tag, meal_timing_tag)
         VALUES ($1, '00000000-0000-0000-0000-000000000099', NOW(), '1.0', 'x', 'standard', 'no_tag')",
    )
    .bind(user_id)
    .execute(&pool)
    .await;
    assert!(
        bad_marker.is_err(),
        "Non-existent marker_id should violate FK"
    );

    // Stress level CHECK constraint (must be 1-10)
    let bad_stress = sqlx::query(
        "INSERT INTO measurements (user_id, marker_id, timestamp, value_canonical, unit_canonical, protocol_tag, meal_timing_tag, stress_level)
         VALUES ($1, $2, NOW(), '5.0', 'mmol/L', 'standard', 'no_tag', 15)",
    )
    .bind(user_id)
    .bind(glucose_id)
    .execute(&pool)
    .await;
    assert!(
        bad_stress.is_err(),
        "stress_level=15 should violate CHECK constraint (1-10)"
    );

    // Valid stress level should succeed
    let ok_stress_id = Uuid::new_v4();
    let ok_stress = sqlx::query(
        "INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, protocol_tag, meal_timing_tag, stress_level)
         VALUES ($1, $2, $3, NOW(), '5.0', 'mmol/L', 'standard', 'no_tag', 7)",
    )
    .bind(ok_stress_id)
    .bind(user_id)
    .bind(glucose_id)
    .execute(&pool)
    .await;
    assert!(ok_stress.is_ok(), "stress_level=7 should be valid");

    // ═══════════════════════════════════════════════════════════════════
    // 7. API roundtrip — /me endpoint returns correct user
    // ═══════════════════════════════════════════════════════════════════

    let app = test::init_service(build_test_app(pool.clone(), config.clone())).await;
    let req = test_get("/api/v1/me")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["data"]["email"], email);

    // ═══════════════════════════════════════════════════════════════════
    // 8. DELETE — CASCADE removes all user data
    // ═══════════════════════════════════════════════════════════════════

    set_rls(&pool, user_id).await;
    cascade_delete_user(&pool, user_id).await;

    // Verify user is gone
    clear_rls(&pool).await;
    let user_exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(!user_exists, "User should be deleted");

    // Verify all cascaded data is gone (query without RLS to be sure)
    // These use superuser connection, so RLS doesn't block
    let orphan_measurements: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurements WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        orphan_measurements, 0,
        "Measurements should be CASCADE deleted"
    );

    let orphan_devices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices WHERE user_id = $1")
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(orphan_devices, 0, "Devices should be CASCADE deleted");

    let orphan_prefs: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_preferences WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(orphan_prefs, 0, "Preferences should be CASCADE deleted");

    let orphan_profile: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_profile WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(orphan_profile, 0, "Profile should be CASCADE deleted");

    let orphan_templates: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurement_templates WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(orphan_templates, 0, "Templates should be CASCADE deleted");

    let orphan_factors: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM influence_factors WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        orphan_factors, 0,
        "Influence factors should be CASCADE deleted"
    );

    let orphan_chat: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM doctor_chat_conversations WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        orphan_chat, 0,
        "Chat conversations should be CASCADE deleted"
    );

    // Chat messages should also be gone (CASCADE from conversations)
    let orphan_msgs: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM doctor_chat_messages WHERE id = $1")
            .bind(msg_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(orphan_msgs, 0, "Chat messages should be CASCADE deleted");

    // Clean up User B
    cascade_delete_user(&pool, user_b).await;
}

// ═══════════════════════════════════════════════════════════════════════
// RLS without session — zero rows, not an error
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn crud_rls_zero_rows_without_session() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    clear_rls(&pool).await;

    // All RLS-protected tables should return 0 rows without session
    let tables = [
        "measurements",
        "devices",
        "measurement_templates",
        "influence_factors",
        "user_preferences",
        "user_profile",
        "subscriptions",
    ];

    for table in &tables {
        let count: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {}", table))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(
            count, 0,
            "Table '{}' should return 0 rows without RLS session",
            table
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Reference ranges — system defaults visible to all users
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn crud_reference_ranges_system_visible() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    let email = format!("crud_ref_{}@test.sovereignhealth.io", Uuid::new_v4());
    let (user_id, _token) = signup_user(&pool, &config, &email).await;

    set_rls(&pool, user_id).await;

    // System reference ranges (user_id IS NULL) should be visible to any user
    let system_ranges: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM reference_ranges WHERE user_id IS NULL")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(
        system_ranges > 0,
        "System reference ranges should be visible to users"
    );

    cascade_delete_user(&pool, user_id).await;
}

// ═══════════════════════════════════════════════════════════════════════
// Idempotency key — duplicate INSERT should be rejected
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn crud_idempotency_key_unique() {
    let Some((pool, config)) = setup().await else {
        return;
    };

    let email = format!("crud_idemp_{}@test.sovereignhealth.io", Uuid::new_v4());
    let (user_id, _token) = signup_user(&pool, &config, &email).await;

    set_rls(&pool, user_id).await;
    let glucose_id = get_marker_id(&pool, "glucose").await;

    let idemp_key = format!("idemp_{}", Uuid::new_v4());

    // First insert with idempotency key
    let first = sqlx::query(
        "INSERT INTO measurements (user_id, marker_id, timestamp, value_canonical, unit_canonical, protocol_tag, meal_timing_tag, idempotency_key)
         VALUES ($1, $2, NOW(), '5.0', 'mmol/L', 'standard', 'no_tag', $3)",
    )
    .bind(user_id)
    .bind(glucose_id)
    .bind(&idemp_key)
    .execute(&pool)
    .await;
    assert!(first.is_ok(), "First insert should succeed");

    // Duplicate idempotency key should fail
    let second = sqlx::query(
        "INSERT INTO measurements (user_id, marker_id, timestamp, value_canonical, unit_canonical, protocol_tag, meal_timing_tag, idempotency_key)
         VALUES ($1, $2, NOW(), '6.0', 'mmol/L', 'standard', 'no_tag', $3)",
    )
    .bind(user_id)
    .bind(glucose_id)
    .bind(&idemp_key)
    .execute(&pool)
    .await;
    assert!(
        second.is_err(),
        "Duplicate idempotency key should be rejected"
    );

    cascade_delete_user(&pool, user_id).await;
}

// ═══════════════════════════════════════════════════════════════════════
// Markers and zones — seed data integrity
// ═══════════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn crud_seed_data_integrity() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    // Core markers should exist
    let core_markers = ["glucose", "ketones", "weight", "bp_systolic", "heart_rate"];
    for slug in &core_markers {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM markers WHERE marker_slug = $1)")
                .bind(slug)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert!(exists, "Marker '{}' should exist in seed data", slug);
    }

    // Calculated markers should exist
    let calc_markers = ["gki", "bmi", "whtr"];
    for slug in &calc_markers {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM calculated_markers WHERE marker_slug = $1)",
        )
        .bind(slug)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(exists, "Calculated marker '{}' should exist", slug);
    }

    // Zones should exist
    let zone_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM zones")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(zone_count >= 8, "Should have at least 8 zones");

    // License tiers should exist
    let tier_slugs: Vec<String> =
        sqlx::query_scalar("SELECT slug FROM license_tiers ORDER BY slug")
            .fetch_all(&pool)
            .await
            .unwrap();
    assert!(tier_slugs.contains(&"glimpse".to_string()));
    assert!(tier_slugs.contains(&"clarity".to_string()));
}
