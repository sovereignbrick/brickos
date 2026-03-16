/// Auth integration tests - require a real database when DATABASE_URL is set,
/// otherwise each test skips gracefully.
mod common;

use actix_web::{dev::ServiceResponse, test};
use serde_json::{json, Value};
use sqlx::PgPool;

use common::{build_test_app, setup_pool, test_get, test_post};
use sovereign_health_backend::config::Config;

async fn cleanup_user(pool: &PgPool, email: &str) {
    let _ = sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(email)
        .execute(pool)
        .await;
}

#[actix_web::test]
async fn test_signup_returns_jwt() {
    let Some(pool) = setup_pool().await else {
        println!("Skipping: no DATABASE_URL");
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201, "Expected 201 Created");

    let body: Value = test::read_body_json(resp).await;
    assert!(
        body["data"]["token"].as_str().is_some(),
        "token should be present"
    );
    assert!(
        body["data"]["refresh_token"].as_str().is_some(),
        "refresh_token should be present"
    );
    assert_eq!(body["data"]["user"]["email"], email);
    assert!(body["error"].is_null());

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_login_correct_password() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let _: ServiceResponse = test::call_service(&app, req).await;

    let req = test_post("/auth/login")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert!(body["data"]["token"].as_str().is_some());
    assert!(body["error"].is_null());

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_login_wrong_password() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let _: ServiceResponse = test::call_service(&app, req).await;

    let req = test_post("/auth/login")
        .set_json(json!({ "email": email, "password": "WrongPass9" }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["error"]["code"], "invalid_credentials");
    assert!(body["data"].is_null());

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_me_with_valid_jwt() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    let signup_body: Value = test::read_body_json(resp).await;
    let token = signup_body["data"]["token"].as_str().unwrap().to_string();

    let req = test_get("/auth/me")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["data"]["email"], email);
    assert!(body["error"].is_null());

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_me_with_invalid_jwt() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_get("/auth/me")
        .insert_header(("Authorization", "Bearer this.is.not.a.valid.jwt"))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["error"]["code"], "unauthorized");
}

#[actix_web::test]
async fn test_refresh_token() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    let signup_body: Value = test::read_body_json(resp).await;
    let refresh_token = signup_body["data"]["refresh_token"]
        .as_str()
        .unwrap()
        .to_string();

    let req = test_post("/auth/refresh")
        .set_json(json!({ "refresh_token": refresh_token }))
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert!(body["data"]["token"].as_str().is_some());
    assert!(body["data"]["refresh_token"].as_str().is_some());
    assert!(body["error"].is_null());

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_signup_weak_password() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(
            json!({ "email": "weakpasstest@test.com", "password": "abc", "tos_accepted": true }),
        )
        .to_request();

    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["error"]["code"], "validation_error");
}

#[actix_web::test]
async fn test_signup_duplicate_email() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let email = format!("test_{}@test.com", uuid::Uuid::new_v4());
    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    let req = test_post("/auth/signup")
        .set_json(json!({ "email": email, "password": "TestPass1", "tos_accepted": true }))
        .to_request();
    let resp: ServiceResponse = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 409);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["error"]["code"], "email_conflict");

    cleanup_user(&pool, &email).await;
}

#[actix_web::test]
async fn test_rate_limit() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let app = test::init_service(build_test_app(pool.clone(), Config::test_default())).await;

    let mut got_rate_limited = false;
    for _ in 0..6 {
        let req = test_post("/auth/login")
            .set_json(json!({ "email": "ratelimit@test.com", "password": "TestPass1", "tos_accepted": true }))
            .to_request();

        let resp: ServiceResponse = test::call_service(&app, req).await;
        if resp.status() == 429 {
            got_rate_limited = true;
            break;
        }
    }
    assert!(
        got_rate_limited,
        "Expected at least one 429 Too Many Requests after 6 rapid requests"
    );
}
