use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing_subscriber::EnvFilter;

mod config;
mod error;
mod handlers;
pub mod middleware;
#[allow(dead_code)]
mod models;

pub use config::Config;
pub use error::AppError;

/// Newtype for platform database pool (users, orgs, billing -- read-write).
pub struct PlatformPool(pub sqlx::PgPool);

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    // jsonwebtoken v10 requires explicit CryptoProvider
    // scaffold-api: jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER
    jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER
        .install_default()
        .expect("Failed to install JWT CryptoProvider");

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    let config = Config::from_env().expect("Failed to load config");
    let bind_addr = format!("{}:{}", config.host, config.port);

    // -- Platform pool (brickos DB: users, orgs, billing, auth) --
    // This is READ-WRITE: auth handlers INSERT/UPDATE users, tokens, MFA, etc.
    let platform_pool = PgPoolOptions::new()
        .max_connections(config.platform_db_pool_max)
        .connect(&config.platform_database_url)
        .await
        .expect("Failed to connect to platform database");

    // -- App pool (app-specific DB: domain tables) --
    let app_pool = PgPoolOptions::new()
        .max_connections(config.db_pool_max)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to app database");

    // Run app migrations
    sqlx::migrate!("./migrations")
        .run(&app_pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!(
        "Starting {} v{} on {}",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION"),
        bind_addr
    );

    // -- Services --
    // scaffold-api: brickos_crypto::Encryptor::new(Option<&str>) -> Self (no Clone, wrap in Arc)
    let encryptor = Arc::new(brickos_crypto::Encryptor::new(
        config.encryption_key.as_deref(),
    ));

    // scaffold-api: brickos_email::create_email_provider(bool) -> Arc<dyn EmailProvider>
    let email_provider: Arc<dyn brickos_email::EmailProvider> =
        brickos_email::create_email_provider(config.is_saas());

    // scaffold-api: brickos_notify::NotifyConfig::from_env() -> NotifyConfig
    // scaffold-api: brickos_notify::Notifier::new(NotifyConfig) -> Notifier
    let notify_config = brickos_notify::NotifyConfig::from_env();
    let notifier = brickos_notify::Notifier::new(notify_config);

    // -- Background capture queue processor --
    let queue_pool = app_pool.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            // Pick one pending capture and mark it as queued
            let result = sqlx::query(
                "UPDATE crm_captures SET status = 'queued', attempts = attempts + 1 \
                 WHERE id = (SELECT id FROM crm_captures WHERE status = 'pending' AND attempts < 3 \
                 ORDER BY created_at ASC LIMIT 1) RETURNING id",
            )
            .fetch_optional(&queue_pool)
            .await;

            match result {
                Ok(Some(row)) => {
                    let id: uuid::Uuid = sqlx::Row::get(&row, "id");
                    tracing::info!("Queue: moved capture {} to queued", id);
                }
                Ok(None) => {} // no pending captures
                Err(e) => {
                    tracing::warn!("Queue: error polling captures: {}", e);
                }
            }
        }
    });

    // -- CORS --
    let frontend_url = config.frontend_url.clone();

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_url)
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type"])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(tracing_actix_web::TracingLogger::default())
            // 35MB payload limit for image uploads
            .app_data(web::JsonConfig::default().limit(35 * 1024 * 1024))
            .app_data(web::Data::new(PlatformPool(platform_pool.clone())))
            .app_data(web::Data::new(app_pool.clone()))
            .app_data(web::Data::new(config.clone()))
            .app_data(web::Data::new(encryptor.clone()))
            .app_data(web::Data::new(email_provider.clone()))
            .app_data(web::Data::new(notifier.clone()))
            .configure(handlers::configure_routes)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
