//! Integration tests: full CRUD flows with actix_web::test.

#[actix_web::test]
async fn auth_signup_login_flow() {
    // TODO: signup -> verify email -> login -> /me returns user
}
