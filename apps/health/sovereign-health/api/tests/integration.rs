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

// ---------------------------------------------------------------------------
// Sprint 044: Org features
// ---------------------------------------------------------------------------

#[actix_web::test]
async fn test_org_settings_requires_auth() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get()
        .uri("/org-settings/general")
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    // Without Config app_data, auth extractor returns 500; with it, returns 401.
    // Either way, the endpoint is NOT accessible without auth.
    assert!(
        resp.status() == 401 || resp.status() == 500,
        "org-settings must not return 200 without auth, got {}",
        resp.status()
    );
}

#[actix_web::test]
async fn test_practitioner_requires_auth() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get()
        .uri("/practitioner/members")
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert!(
        resp.status() == 401 || resp.status() == 500,
        "practitioner must not return 200 without auth, got {}",
        resp.status()
    );
}

// Sprint 049 #049-12 (Design 029 v0.3): /demo/* is publicly reachable
// from eval.sovereignhealth.io without auth. Write verbs (POST, PUT,
// DELETE, PATCH) must never be registered under this prefix -- an
// unauth visitor could mutate demo data otherwise. Runtime assertion:
// each write verb on known /demo/* paths must return 404 or 405, NEVER
// 200/201/204.
#[actix_web::test]
async fn test_demo_namespace_has_no_write_handlers() {
    let app = test::init_service(App::new().configure(configure_routes)).await;

    // Exhaustive list of write verbs actix-web can route.
    let write_verbs = [
        ("POST", "/demo/zones"),
        ("POST", "/demo/measurements"),
        ("POST", "/demo/markers/iron"),
        ("POST", "/demo/trends/glucose"),
        ("PUT", "/demo/zones"),
        ("PUT", "/demo/measurements"),
        ("DELETE", "/demo/zones"),
        ("DELETE", "/demo/measurements"),
        ("DELETE", "/demo/markers/iron"),
        ("PATCH", "/demo/zones"),
        ("PATCH", "/demo/measurements"),
    ];

    // Governor rate-limit needs a peer IP; provide a loopback so the
    // request even reaches routing. (Without this the governor returns
    // 500 "Could not extract peer IP address" and the test spuriously
    // fails.)
    let peer = "127.0.0.1:12345".parse().unwrap();

    for (method, path) in write_verbs {
        let req = match method {
            "POST" => test::TestRequest::post()
                .uri(path)
                .peer_addr(peer)
                .to_request(),
            "PUT" => test::TestRequest::put()
                .uri(path)
                .peer_addr(peer)
                .to_request(),
            "DELETE" => test::TestRequest::delete()
                .uri(path)
                .peer_addr(peer)
                .to_request(),
            "PATCH" => test::TestRequest::patch()
                .uri(path)
                .peer_addr(peer)
                .to_request(),
            _ => unreachable!(),
        };
        let resp: ServiceResponse = test::call_service(&app, req).await;
        let status = resp.status().as_u16();
        assert!(
            status == 404 || status == 405,
            "{} {} registered a handler (returned {}); /demo/* MUST be read-only.",
            method,
            path,
            status
        );
    }
}
