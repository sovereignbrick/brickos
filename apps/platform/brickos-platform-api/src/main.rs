// BrickOS Platform API -- AGPL-3.0 -- https://brickos.io/
//
// Platform-level API for managing orgs, service accounts, platform stats,
// and i18n monitoring. Port 9000.

mod config;

use actix_web::{web, App, HttpResponse, HttpServer};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use tracing_subscriber::EnvFilter;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SERVICE_NAME: &str = "brickos-platform-api";

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": SERVICE_NAME,
        "version": VERSION,
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env if present (development convenience)
    if let Ok(path) = dotenvy::dotenv() {
        eprintln!("Loaded env from {}", path.display());
    }

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    let config = config::PlatformConfig::from_env().expect("Failed to load platform config");

    let connect_opts: PgConnectOptions = config
        .database_url
        .parse()
        .expect("Invalid PLATFORM_DATABASE_URL");
    // Disable prepared-statement caching to avoid stale-cache errors after migrations
    let connect_opts = connect_opts.statement_cache_capacity(0);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect_lazy_with(connect_opts);

    let bind_addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Starting {SERVICE_NAME} v{VERSION} on http://{bind_addr}");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/platform/api/v1/health", web::get().to(health))
    })
    .bind(&bind_addr)?
    .run()
    .await
}
