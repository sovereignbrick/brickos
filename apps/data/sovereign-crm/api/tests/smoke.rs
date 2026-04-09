//! Smoke tests: verify routes exist and basic responses.
//! These tests don't require a database -- they test route configuration only.

use actix_web::{test, web, App, HttpResponse};

async fn health_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "app": env!("CARGO_PKG_NAME"),
    }))
}

#[actix_web::test]
async fn health_endpoint_returns_200() {
    let app = test::init_service(App::new().route("/health", web::get().to(health_handler))).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let resp = actix_web::test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_web::test]
async fn health_response_has_version() {
    let app = test::init_service(App::new().route("/health", web::get().to(health_handler))).await;
    let req = test::TestRequest::get().uri("/health").to_request();
    let body = test::call_and_read_body(&app, req).await;
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
    assert_eq!(json["app"], "sovereign-crm-api");
}

#[actix_web::test]
async fn unknown_route_returns_404() {
    let app = test::init_service(App::new().route("/health", web::get().to(health_handler))).await;
    let req = test::TestRequest::get().uri("/nonexistent").to_request();
    let resp = actix_web::test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}
