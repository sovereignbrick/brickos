// BrickOS Platform API -- AGPL-3.0
//
// Platform administration API for managing service accounts, organizations,
// and cross-app infrastructure. Runs on port 9000.

mod config;
mod handlers;

use actix_cors::Cors;
use actix_web::{http, web, App, HttpResponse, HttpServer};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use tracing_subscriber::EnvFilter;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SERVICE_NAME: &str = "brickos-platform-api";

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    let config = config::Config::from_env().expect("DATABASE_URL must be set");

    let connect_opts: PgConnectOptions = config.database_url.parse().expect("Invalid DATABASE_URL");
    let connect_opts = connect_opts.statement_cache_capacity(0);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect_lazy_with(connect_opts);

    tracing::info!(
        "Starting {} v{} on http://{}:{}",
        SERVICE_NAME,
        VERSION,
        config.host,
        config.port,
    );

    let bind_addr = format!("{}:{}", config.host, config.port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("https://brickos.io")
            .allowed_origin("https://app.brickos.io")
            .allowed_origin("https://api.brickos.io")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                http::header::AUTHORIZATION,
                http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .route(
                "/health",
                web::get().to(|| async {
                    HttpResponse::Ok().json(serde_json::json!({
                        "status": "ok",
                        "service": SERVICE_NAME,
                        "version": VERSION,
                    }))
                }),
            )
            .configure(handlers::service_accounts::configure)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
