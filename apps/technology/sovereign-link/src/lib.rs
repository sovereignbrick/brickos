pub mod db;
pub mod handlers;
pub mod models;
pub mod nostr;

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

/// Mount all routes for standalone mode (includes auth endpoints + web UI).
#[cfg(feature = "standalone")]
pub fn configure_standalone_routes(cfg: &mut web::ServiceConfig) {
    // Web UI pages
    cfg.route("/", web::get().to(handlers::web::home_page))
        .route("/login", web::get().to(handlers::web::login_page))
        .route("/register", web::get().to(handlers::web::register_page))
        .route("/dashboard", web::get().to(handlers::web::dashboard_page))
        .route("/new", web::get().to(handlers::web::new_link_page))
        .route("/new", web::post().to(handlers::web::create_link_form))
        .route(
            "/links/{id}",
            web::get().to(handlers::web::link_detail_page),
        )
        .route(
            "/links/{id}/edit",
            web::post().to(handlers::web::edit_link_form),
        )
        .route(
            "/links/{id}/delete",
            web::post().to(handlers::web::delete_link_form),
        )
        .route("/settings", web::get().to(handlers::web::settings_page))
        .route(
            "/settings/profile",
            web::post().to(handlers::web::update_profile_form),
        )
        .route(
            "/settings/password",
            web::post().to(handlers::web::change_password_form),
        )
        .route("/logout", web::post().to(handlers::web::logout_page));

    // Auth endpoints (JSON API)
    cfg.service(
        web::scope("/auth")
            .route("/register", web::post().to(auth::handlers::register))
            .route("/login", web::post().to(auth::handlers::login))
            .route("/login/form", web::post().to(auth::handlers::login_form))
            .route(
                "/register/form",
                web::post().to(auth::handlers::register_form),
            )
            .route("/refresh", web::post().to(auth::handlers::refresh))
            .route("/nostr", web::post().to(auth::handlers::nostr_login)),
    );

    // User API
    cfg.service(
        web::scope("/api/v1/me")
            .route(
                "/api-key",
                web::post().to(auth::handlers::generate_user_api_key),
            )
            .route(
                "/api-key",
                web::delete().to(auth::handlers::revoke_user_api_key),
            )
            .route(
                "/link-nostr",
                web::post().to(auth::handlers::link_nostr_account),
            )
            .route(
                "/link-email",
                web::post().to(auth::handlers::link_email_account),
            ),
    );

    // Redirect at top level: /{code}
    cfg.service(
        web::scope("/r").route("/{code}", web::get().to(handlers::redirect::handle_request)),
    );

    // Links API
    cfg.service(
        web::scope("/api/v1/links")
            .route("", web::get().to(handlers::api::list_links))
            .route("", web::post().to(handlers::api::create_link))
            .route("/{id}", web::put().to(handlers::api::update_link))
            .route("/{id}", web::delete().to(handlers::api::delete_link))
            .route("/{id}/stats", web::get().to(handlers::api::link_stats)),
    );
}
