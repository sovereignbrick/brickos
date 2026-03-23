pub mod db;
pub mod handlers;
pub mod models;

use actix_web::web;

/// Mount all shortener routes onto an actix-web app.
/// Called by the host API (e.g., sovereign-health-backend) to integrate the shortener.
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/r")
            // Single route handles both redirect and QR — .qr suffix detected in handler
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
