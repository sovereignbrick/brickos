pub mod db;
pub mod handlers;
pub mod models;

#[cfg(feature = "standalone")]
pub mod auth;
#[cfg(feature = "standalone")]
pub mod config;

use actix_web::web;

/// Mount all shortener routes onto an actix-web app.
/// Called by the host API (e.g., sovereign-health-backend) to integrate the shortener.
#[cfg(feature = "platform")]
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/r")
            // Single route handles both redirect and QR -- .qr suffix detected in handler
            .route("/{code}", web::get().to(handlers::redirect::handle_request)),
    );
    cfg.service(
        web::scope("/api/v1/links")
            .route("", web::get().to(handlers::api::list_links))
            .route("", web::post().to(handlers::api::create_link))
            .route("/{id}", web::put().to(handlers::api::update_link))
            .route("/{id}", web::delete().to(handlers::api::delete_link))
            .route("/{id}/stats", web::get().to(handlers::api::link_stats)),
    );
}

/// Mount all routes for standalone mode (includes auth endpoints).
#[cfg(feature = "standalone")]
pub fn configure_standalone_routes(cfg: &mut web::ServiceConfig) {
    // Auth endpoints
    cfg.service(
        web::scope("/auth")
            .route("/register", web::post().to(auth::handlers::register))
            .route("/login", web::post().to(auth::handlers::login))
            .route("/refresh", web::post().to(auth::handlers::refresh)),
    );
    // Redirect at top level: /{code}
    cfg.service(
        web::scope("/r")
            .route("/{code}", web::get().to(handlers::redirect::handle_request)),
    );
    // API
    cfg.service(
        web::scope("/api/v1/links")
            .route("", web::get().to(handlers::api::list_links))
            .route("", web::post().to(handlers::api::create_link))
            .route("/{id}", web::put().to(handlers::api::update_link))
            .route("/{id}", web::delete().to(handlers::api::delete_link))
            .route("/{id}/stats", web::get().to(handlers::api::link_stats)),
    );
}
