/// Smoke tests - minimal checks that the app is alive.
/// Run these first in CI to fail fast before the full integration suite.
use actix_web::{test, App};
use sovereign_health_backend::configure_routes;

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
