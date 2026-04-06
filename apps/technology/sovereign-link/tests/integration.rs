//! Integration tests for Sovereign Link standalone mode.
//! Tests auth flows, CRUD operations, and redirect handling against a real SQLite DB.

#![cfg(feature = "standalone")]

use actix_web::{test, web, App, HttpResponse};
use serde_json::Value;
use std::sync::Arc;

use sovereign_link::config::StandaloneConfig;
use sovereign_link::db::sqlite::SqliteStore;
use sovereign_link::db::{LinkStore, UserStore};

fn test_config() -> StandaloneConfig {
    StandaloneConfig {
        host: "127.0.0.1".to_string(),
        port: 0,
        base_url: "http://localhost:8080".to_string(),
        db_path: ":memory:".to_string(),
        jwt_secret: "test-secret-do-not-use-in-production".to_string(),
        jwt_expiry_secs: 3600,
        allow_registration: true,
        admin_email: None,
        admin_password: None,
        nostr_enabled: true,
        nostr_nip89_publish: false,
        nostr_relays: vec![],
        nostr_nsec: None,
        default_code_length: 6,
        rate_limit_creates: 50,
    }
}

/// Macro to set up a fresh test app with in-memory SQLite.
macro_rules! setup_app {
    () => {{
        let config = test_config();
        setup_app!(config)
    }};
    ($config:expr) => {{
        let store = Arc::new(SqliteStore::open(&$config.db_path).unwrap());
        let ls: Arc<dyn LinkStore> = store.clone();
        let us: Arc<dyn UserStore> = store;
        test::init_service(
            App::new()
                .app_data(web::Data::new(ls))
                .app_data(web::Data::new(us))
                .app_data(web::Data::new($config))
                .route("/health", web::get().to(|| async { HttpResponse::Ok().json(serde_json::json!({"status": "ok"})) }))
                .configure(sovereign_link::configure_standalone_routes),
        )
        .await
    }};
}

/// Register a user and return the JWT token.
async fn get_token(app: &impl actix_web::dev::Service<actix_http::Request, Response = actix_web::dev::ServiceResponse, Error = actix_web::Error>) -> String {
    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(app, req).await;
    let body: Value = test::read_body_json(resp).await;
    body["token"].as_str().unwrap().to_string()
}

// ═══ Registration ═══════════════════════════════════════════════════════════

#[actix_web::test]
async fn register_creates_user_returns_jwt() {
    let app = setup_app!();
    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let body: Value = test::read_body_json(resp).await;
    assert!(body["token"].is_string());
    assert_eq!(body["user"]["email"], "test@example.com");
    assert_eq!(body["user"]["is_admin"], true);
}

#[actix_web::test]
async fn register_second_user_not_admin() {
    let app = setup_app!();
    // First user (admin)
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "admin@example.com", "password": "securepassword123"}))
        .to_request();
    test::call_service(&app, req).await;
    // Second user
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "user@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["user"]["is_admin"], false);
}

#[actix_web::test]
async fn register_duplicate_email_409() {
    let app = setup_app!();
    let json = serde_json::json!({"email": "test@example.com", "password": "securepassword123"});
    let req = test::TestRequest::post().uri("/auth/register").set_json(&json).to_request();
    test::call_service(&app, req).await;
    let req = test::TestRequest::post().uri("/auth/register").set_json(&json).to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 409);
}

#[actix_web::test]
async fn register_short_password_400() {
    let app = setup_app!();
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "short"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_web::test]
async fn register_disabled_403() {
    let mut config = test_config();
    config.allow_registration = false;
    let app = setup_app!(config);
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 403);
}

// ═══ Login ══════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn login_valid_credentials() {
    let app = setup_app!();
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    test::call_service(&app, req).await;

    let req = test::TestRequest::post().uri("/auth/login")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert!(body["token"].is_string());
}

#[actix_web::test]
async fn login_wrong_password_401() {
    let app = setup_app!();
    let req = test::TestRequest::post().uri("/auth/register")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "securepassword123"}))
        .to_request();
    test::call_service(&app, req).await;

    let req = test::TestRequest::post().uri("/auth/login")
        .set_json(serde_json::json!({"email": "test@example.com", "password": "wrongpassword"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn login_nonexistent_401() {
    let app = setup_app!();
    let req = test::TestRequest::post().uri("/auth/login")
        .set_json(serde_json::json!({"email": "nobody@example.com", "password": "securepassword123"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

// ═══ Token Refresh ══════════════════════════════════════════════════════════

#[actix_web::test]
async fn refresh_valid_token() {
    let app = setup_app!();
    let token = get_token(&app).await;

    let req = test::TestRequest::post().uri("/auth/refresh")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert!(body["token"].is_string());
}

// ═══ API Auth Enforcement ═══════════════════════════════════════════════════

#[actix_web::test]
async fn api_no_auth_401() {
    let app = setup_app!();
    let req = test::TestRequest::get().uri("/api/v1/links").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn api_invalid_token_401() {
    let app = setup_app!();
    let req = test::TestRequest::get().uri("/api/v1/links")
        .insert_header(("Authorization", "Bearer invalid-garbage-token"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

// ═══ Links CRUD ═════════════════════════════════════════════════════════════

#[actix_web::test]
async fn create_and_list_links() {
    let app = setup_app!();
    let token = get_token(&app).await;

    // Create
    let req = test::TestRequest::post().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(serde_json::json!({"target_url": "https://sovereignhealth.io", "code": "shi"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let created: Value = test::read_body_json(resp).await;
    assert_eq!(created["code"], "shi");

    // List
    let req = test::TestRequest::get().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let links: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(links.len(), 1);
    assert_eq!(links[0]["code"], "shi");
}

#[actix_web::test]
async fn create_link_auto_code() {
    let app = setup_app!();
    let token = get_token(&app).await;

    let req = test::TestRequest::post().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(serde_json::json!({"target_url": "https://example.com"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let body: Value = test::read_body_json(resp).await;
    let code = body["code"].as_str().unwrap();
    assert!(code.len() >= 6, "Auto code should be at least 6 chars");
}

#[actix_web::test]
async fn create_link_reserved_code_400() {
    let app = setup_app!();
    let token = get_token(&app).await;

    let req = test::TestRequest::post().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(serde_json::json!({"target_url": "https://example.com", "code": "admin"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

// ═══ Redirect ═══════════════════════════════════════════════════════════════

#[actix_web::test]
async fn redirect_existing_link_301() {
    let app = setup_app!();
    let token = get_token(&app).await;

    // Create link
    let req = test::TestRequest::post().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(serde_json::json!({"target_url": "https://brickos.io", "code": "bos"}))
        .to_request();
    test::call_service(&app, req).await;

    // Redirect
    let req = test::TestRequest::get().uri("/r/bos").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 301);
    let loc = resp.headers().get("Location").unwrap().to_str().unwrap();
    assert_eq!(loc, "https://brickos.io");
}

#[actix_web::test]
async fn redirect_nonexistent_404() {
    let app = setup_app!();
    let req = test::TestRequest::get().uri("/r/doesnotexist").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

// ═══ QR Code ════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn qr_code_svg() {
    let app = setup_app!();
    let token = get_token(&app).await;

    let req = test::TestRequest::post().uri("/api/v1/links")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(serde_json::json!({"target_url": "https://example.com", "code": "qrtest"}))
        .to_request();
    test::call_service(&app, req).await;

    let req = test::TestRequest::get().uri("/r/qrtest.qr").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let ct = resp.headers().get("Content-Type").unwrap().to_str().unwrap();
    assert!(ct.contains("svg"));
}

// ═══ Health ═════════════════════════════════════════════════════════════════

#[actix_web::test]
async fn health_endpoint() {
    let app = setup_app!();
    let req = test::TestRequest::get().uri("/health").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}
