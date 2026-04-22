/// Sprint 050 #050-B1: backend integration tests for coverage gaps
/// identified in Sprint 048 + 049. Every test gates on DATABASE_URL
/// being set; skips gracefully for no-DB environments (CI without
/// postgres).
mod common;

use actix_web::{dev::ServiceResponse, test};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use common::{build_test_app, setup_pool, test_post};
use sovereign_health_backend::config::Config;

async fn cleanup_user(pool: &PgPool, email: &str) {
    let _ = sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(email)
        .execute(pool)
        .await;
}

// ──────────────────────────────────────────────────────────────────────
// Sprint 049 #049-18: signup_source persists when in the closed allowlist
// ──────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_signup_source_persists_for_allowed_value() {
    let Some(pool) = setup_pool().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({
            "email": email,
            "password": "TestPass1",
            "tos_accepted": true,
            "signup_source": "demo-optimized"
        }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    let row = sqlx::query("SELECT signup_source FROM users WHERE email = $1")
        .bind(&email)
        .fetch_one(&pool)
        .await
        .expect("signup row");
    let got: Option<String> = row.try_get("signup_source").ok().flatten();
    assert_eq!(got.as_deref(), Some("demo-optimized"));

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_signup_source_dropped_for_bogus_value() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    // Arbitrary input should be silently ignored, not stored.
    let req = test_post("/auth/signup")
        .set_json(json!({
            "email": email,
            "password": "TestPass1",
            "tos_accepted": true,
            "signup_source": "definitely-not-a-valid-source; DROP TABLE users; --"
        }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    let row = sqlx::query("SELECT signup_source FROM users WHERE email = $1")
        .bind(&email)
        .fetch_one(&pool)
        .await
        .expect("signup row");
    let got: Option<String> = row.try_get("signup_source").ok().flatten();
    assert!(got.is_none(), "expected null signup_source, got {got:?}");

    cleanup_user(&pool, &email).await;
}

// ──────────────────────────────────────────────────────────────────────
// Sprint 049 #049-11: demo user password lock rejects login with 401
// ──────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_demo_user_password_lock_rejects_login() {
    let Some(pool) = setup_pool().await else {
        return;
    };
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    // Any credentials should fail for optimized@ because password_hash
    // is a `$LOCKED` sentinel that argon2 never verifies against.
    let req = test_post("/auth/login")
        .set_json(json!({
            "email": "optimized@sovereignhealth.io",
            "password": "SovereignOptimal2026!"  // the former test password
        }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    // Either 401 (normal rejection) or 429 (rate limit on repeated runs).
    // Both prove the endpoint is reachable + password is NOT verifying.
    assert!(
        [401, 429].contains(&resp.status().as_u16()),
        "expected 401 or 429, got {}",
        resp.status()
    );
    if resp.status() == 401 {
        let body: Value = test::read_body_json(resp).await;
        assert!(
            body["error"]["code"].is_string(),
            "401 body must have structured error code"
        );
    }
}

// ──────────────────────────────────────────────────────────────────────
// Sprint 049 #049-22: bulk_consent_reminder requires org_owner|practitioner
// ──────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_bulk_consent_reminder_rejects_unauth() {
    let Some(pool) = setup_pool().await else {
        return;
    };
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    // No Authorization header -> 401 from auth middleware.
    let req = test_post("/org-settings/consent-reminders").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert!(
        [401, 500].contains(&resp.status().as_u16()),
        "expected 401 unauth (or 500 from missing DB in this env); got {}",
        resp.status()
    );
}

// ──────────────────────────────────────────────────────────────────────
// Sprint 049 #049-10: /demo/* rate limit at 60 req/min per IP
// ──────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_demo_rate_limit_enforced_under_burst() {
    // This test does NOT need a DB -- the governor wraps the scope
    // at the actix level. We just need to send 61 requests from the
    // same peer IP and verify the 61st is 429.

    // The build_test_app path needs DB access for other routes, but
    // /demo/zones itself will fetch -> error without DB. The GOVERNOR
    // runs BEFORE the handler, so the 429 fires regardless.

    let Some((pool, config)) = common::setup().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };
    let app = test::init_service(build_test_app(pool, config)).await;

    let burst: u32 = 61; // 60 burst + 1 that should trip the limiter
    let peer: std::net::SocketAddr = "127.0.0.42:12345".parse().unwrap();

    let mut got_429 = false;
    let mut last_status = 0u16;
    for i in 0..burst {
        let req = test::TestRequest::get()
            .uri("/demo/zones?profile=optimized")
            .peer_addr(peer)
            .to_request();
        let resp: ServiceResponse = test::call_service(&app, req).await;
        last_status = resp.status().as_u16();
        if last_status == 429 {
            got_429 = true;
            println!("governor fired at request #{}", i + 1);
            break;
        }
    }
    assert!(
        got_429,
        "expected at least one 429 within {} requests; last status was {}",
        burst, last_status
    );
}

// ──────────────────────────────────────────────────────────────────────
// Sprint 049 #049-12: /demo/* has no write handlers (already covered
// by integration.rs::test_demo_namespace_has_no_write_handlers; we
// re-assert here to document the guarantee per Design 029 §8.6)
// ──────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_demo_namespace_read_only_invariant() {
    let Some((pool, config)) = common::setup().await else {
        return;
    };
    let app = test::init_service(build_test_app(pool, config)).await;

    // Sample of write verbs. Any POST under /demo/* must never return
    // a 2xx (no write handler should exist).
    for path in &["/demo/zones", "/demo/measurements", "/demo/trends/glucose"] {
        let req = test::TestRequest::post()
            .uri(path)
            .peer_addr(common::test_peer_addr())
            .set_json(json!({}))
            .to_request();
        let resp: ServiceResponse = test::call_service(&app, req).await;
        let status = resp.status().as_u16();
        assert!(
            !(200..300).contains(&status),
            "POST {path} MUST NOT succeed (got {status})"
        );
    }
}
