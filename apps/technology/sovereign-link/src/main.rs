#[cfg(feature = "standalone")]
mod standalone {
    use actix_web::{web, App, HttpResponse, HttpServer};
    use std::sync::Arc;

    use sovereign_link::auth::email;
    use sovereign_link::config::StandaloneConfig;
    use sovereign_link::db::sqlite::SqliteStore;
    use sovereign_link::db::{LinkStore, UserStore};
    use sovereign_link::models::NewUser;

    pub async fn run() -> std::io::Result<()> {
        // Initialize logging
        tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
            )
            .init();

        let config = StandaloneConfig::from_env();
        tracing::info!(
            "Sovereign Link standalone starting on {}:{}",
            config.host,
            config.port
        );

        // Initialize SQLite
        let store = SqliteStore::open(&config.db_path).expect("Failed to open SQLite database");
        let store = Arc::new(store);

        // Seed admin user if configured and no users exist
        if let (Some(ref admin_email), Some(ref admin_password)) =
            (&config.admin_email, &config.admin_password)
        {
            let user_count = store.count().await.expect("Failed to count users");
            if user_count == 0 {
                let password_hash =
                    email::hash_password(admin_password).expect("Failed to hash admin password");
                let admin = store
                    .create(NewUser {
                        email: Some(admin_email.clone()),
                        password_hash: Some(password_hash),
                        nostr_pubkey: None,
                        display_name: Some("Admin".to_string()),
                    })
                    .await
                    .expect("Failed to create admin user");
                tracing::info!(
                    "Created admin user: {} (is_admin={})",
                    admin_email,
                    admin.is_admin
                );
            }
        }

        let link_store: Arc<dyn LinkStore> = store.clone();
        let user_store: Arc<dyn UserStore> = store;
        // Publish NIP-89 app listing if configured
        sovereign_link::nostr::publish_app_listing(&config).await;

        let bind_addr = format!("{}:{}", config.host, config.port);

        HttpServer::new(move || {
            App::new()
                .app_data(web::Data::new(link_store.clone()))
                .app_data(web::Data::new(user_store.clone()))
                .app_data(web::Data::new(config.clone()))
                .route(
                    "/health",
                    web::get().to(|| async {
                        HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
                    }),
                )
                .configure(sovereign_link::configure_standalone_routes)
        })
        .bind(&bind_addr)?
        .run()
        .await
    }
}

#[cfg(feature = "platform")]
mod platform {
    use actix_web::{web, App, HttpResponse, HttpServer};
    use sqlx::postgres::PgPoolOptions;
    use std::sync::Arc;

    use sovereign_link::db::postgres::PgLinkStore;
    use sovereign_link::db::LinkStore;
    use sovereign_link::platform_config::PlatformConfig;
    use sovereign_link::PlatformPool;

    pub async fn run() -> std::io::Result<()> {
        // Initialize logging
        tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
            )
            .init();

        // Load .env if present (non-fatal)
        let _ = dotenvy::dotenv();

        let config = PlatformConfig::from_env();
        tracing::info!(
            "Sovereign Link platform starting on {}:{}",
            config.host,
            config.port
        );

        // App pool: SLI database (short_links, clicks, etc.)
        let app_pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&config.database_url)
            .await
            .expect("Failed to connect to SLI database");

        tracing::info!("Connected to SLI database");

        // Platform pool: brickos database (users, orgs, service accounts)
        let platform_pool = PgPoolOptions::new()
            .max_connections(3)
            .connect(&config.platform_database_url)
            .await
            .expect("Failed to connect to platform database");

        tracing::info!("Connected to platform database");

        // Build the LinkStore from the app pool
        let link_store: Arc<dyn LinkStore> = Arc::new(PgLinkStore::new(app_pool));

        let bind_addr = format!("{}:{}", config.host, config.port);

        HttpServer::new(move || {
            App::new()
                .app_data(web::Data::new(link_store.clone()))
                .app_data(web::Data::new(PlatformPool(platform_pool.clone())))
                .route(
                    "/health",
                    web::get().to(|| async {
                        HttpResponse::Ok().json(serde_json::json!({
                            "status": "ok",
                            "service": "sovereign-link",
                            "mode": "platform"
                        }))
                    }),
                )
                .configure(sovereign_link::configure_routes)
        })
        .bind(&bind_addr)?
        .run()
        .await
    }
}

// When both features are active, prefer platform mode.
#[cfg(all(feature = "platform", feature = "standalone"))]
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    platform::run().await
}

#[cfg(all(feature = "platform", not(feature = "standalone")))]
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    platform::run().await
}

#[cfg(all(feature = "standalone", not(feature = "platform")))]
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    standalone::run().await
}

#[cfg(not(any(feature = "standalone", feature = "platform")))]
fn main() {
    eprintln!("This binary requires either the 'platform' or 'standalone' feature.");
    eprintln!("Build with: cargo build --features platform");
    eprintln!("        or: cargo build --features standalone");
    std::process::exit(1);
}
