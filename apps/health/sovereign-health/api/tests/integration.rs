use actix_web::{dev::ServiceResponse, test, App};
use sovereign_health_backend::{configure_routes, HealthResponse, HelloResponse};

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_health_returns_200() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_web::test]
async fn test_health_content_type_is_json() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    let ct = resp
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(ct.contains("application/json"));
}

#[actix_web::test]
async fn test_health_response_fields() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let body: HealthResponse = test::call_and_read_body_json(&app, req).await;
    assert_eq!(body.status, "ok");
    assert_eq!(body.service, "sovereign-health-backend");
    assert_eq!(body.version, sovereign_health_backend::VERSION);
    assert!(!body.timestamp.is_empty());
}

#[actix_web::test]
async fn test_health_timestamp_is_rfc3339() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let body: HealthResponse = test::call_and_read_body_json(&app, req).await;
    body.timestamp
        .parse::<chrono::DateTime<chrono::Utc>>()
        .expect("timestamp must be valid RFC3339");
}

// ---------------------------------------------------------------------------
// GET /api/v1/hello
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_hello_returns_200() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/api/v1/hello").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_web::test]
async fn test_hello_content_type_is_json() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/api/v1/hello").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    let ct = resp
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(ct.contains("application/json"));
}

#[actix_web::test]
async fn test_hello_response_fields() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/api/v1/hello").to_request();
    let body: HelloResponse = test::call_and_read_body_json(&app, req).await;
    assert_eq!(body.message, "Hello from sovereign-health-backend!");
    assert_eq!(body.version, sovereign_health_backend::VERSION);
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_unknown_route_returns_404() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/does-not-exist").to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

// ---------------------------------------------------------------------------
// Snapshot / Regression tests (insta)
// After changing response shapes: `make snapshot-review`, commit .snap files.
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_health_snapshot() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let mut body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    // Remove dynamic timestamp so the snapshot is deterministic
    body.as_object_mut().unwrap().remove("timestamp");
    insta::assert_json_snapshot!(body);
}

#[actix_web::test]
async fn test_hello_snapshot() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/api/v1/hello").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    insta::assert_json_snapshot!(body);
}

// Property-based tests live in tests/property.rs to avoid
// macro conflicts between proptest! and #[actix_web::test].
