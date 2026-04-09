//! Smoke tests: verify routes exist and basic responses.

use actix_web::test;

#[actix_web::test]
async fn health_endpoint_returns_200() {
    // TODO: build test app, call /health, assert 200
}

#[actix_web::test]
async fn unauth_returns_401() {
    // TODO: call protected route without token, assert 401
}
