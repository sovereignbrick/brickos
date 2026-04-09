pub mod auth;
pub mod health;

use actix_web::web;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // Health check (public)
        .route("/health", web::get().to(health::health_check))
        // Auth routes (public)
        .service(
            web::scope("/api/v1/auth")
                .route("/signup", web::post().to(auth::signup))
                .route("/login", web::post().to(auth::login))
                .route("/login/mfa", web::post().to(auth::login_mfa))
                .route("/verify-email", web::post().to(auth::verify_email))
                .route("/forgot-password", web::post().to(auth::forgot_password))
                .route("/reset-password", web::post().to(auth::reset_password))
                .route("/refresh", web::post().to(auth::refresh_token))
                .route("/logout", web::post().to(auth::logout))
                .route("/me", web::get().to(auth::me)),
        );
    // TODO: Add protected domain routes here (wrap with auth middleware)
}
