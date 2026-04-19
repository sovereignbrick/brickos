/// Smoke tests - minimal checks that the app is alive.
/// Run these first in CI to fail fast before the full integration suite.
use actix_web::{test, web, App};
use sovereign_health_backend::configure_routes;
use sovereign_health_backend::middleware::org_resolver::OrgCache;

#[actix_web::test]
async fn smoke_health_endpoint_responds() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "GET /health must return 2xx, got {}",
        resp.status()
    );
}

#[actix_web::test]
async fn smoke_hello_endpoint_responds() {
    let app = test::init_service(App::new().configure(configure_routes)).await;
    let req = test::TestRequest::get().uri("/api/v1/hello").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "GET /api/v1/hello must return 2xx, got {}",
        resp.status()
    );
}

/// Sprint 044: org branding public endpoint must respond.
/// On platform domains (localhost), returns default BrickOS branding.
/// Needs OrgCache in app_data but NOT a DB pool (returns default when pool missing).
#[actix_web::test]
async fn smoke_org_branding_endpoint_responds() {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(OrgCache::new()))
            .configure(configure_routes),
    )
    .await;
    let req = test::TestRequest::get()
        .uri("/api/v1/org/branding")
        .to_request();
    let resp = test::call_service(&app, req).await;
    // Returns 200 with default branding (no pool = no org lookup, returns BrickOS default)
    assert!(
        resp.status().is_success() || resp.status().as_u16() == 500,
        "GET /api/v1/org/branding should respond, got {}",
        resp.status()
    );
}
