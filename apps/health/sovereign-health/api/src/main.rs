// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

// ============================================================================
//  SOVEREIGN HEALTH INTELLIGENCE
//
//  BLOOD · BIOMARKERS · INSIGHT
//
//  Privacy-first platform for collecting, analyzing, and understanding
//  blood markers and laboratory data.
//
//  Your body is the operating system of your life.
//  Blood is its diagnostic interface.
//
//  Bitcoin introduced Proof of Work.
//  Health needs Proof of Blood.
//
//  Inspired by the principles of sovereignty, self-custody,
//  and the ideas explored in "Brick by Brick":
//  https://www.amazon.de/-/en/Brick-Building-Sovereign-Life-Bitcoin/dp/B0FR42K8R1
//
//  Own your data. Understand your biology. Build health sovereignty.
//
//  https://sovereignhealth.io/
//  AGPL-3.0 -- https://github.com/sovereignbrick/brickos
// ============================================================================

use actix_cors::Cors;
use actix_web::{http, web, App, HttpResponse, HttpServer};
use sovereign_health_backend::configure_routes;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use tracing_subscriber::EnvFilter;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    // jsonwebtoken v10 requires explicit CryptoProvider selection
    jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER
        .install_default()
        .expect("Failed to install JWT CryptoProvider");

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    // Initialize Sentry error tracking (only if SENTRY_DSN is set)
    let _sentry_guard = std::env::var("SENTRY_DSN")
        .ok()
        .filter(|s| !s.is_empty())
        .map(|dsn| {
            sentry::init((
                dsn,
                sentry::ClientOptions {
                    release: Some(sovereign_health_backend::VERSION.into()),
                    environment: Some(
                        std::env::var("SHI_MODE")
                            .unwrap_or_else(|_| "development".to_string())
                            .into(),
                    ),
                    traces_sample_rate: 0.1,
                    ..Default::default()
                },
            ))
        });

    let config =
        sovereign_health_backend::config::Config::from_env().expect("Failed to load config");

    let connect_opts: PgConnectOptions = config.database_url.parse().expect("Invalid DATABASE_URL");
    // Disable prepared-statement caching to avoid stale-cache errors
    // after schema migrations (e.g. "bind message supplies N parameters,
    // but prepared statement requires M").
    let connect_opts = connect_opts.statement_cache_capacity(0);

    let pool = PgPoolOptions::new()
        .max_connections(config.db_pool_max)
        .connect_lazy_with(connect_opts);

    // Create notifier early so migrations and crons can use it
    let notify_config = sovereign_health_backend::services::notify::NotifyConfig::from_env();
    let notifier = sovereign_health_backend::services::notify::Notifier::new(notify_config.clone());

    // Run migrations on startup (non-fatal if DB is unavailable)
    {
        let pool_clone = pool.clone();
        let notifier_clone = notifier.clone();
        tokio::spawn(async move {
            match sqlx::migrate!("./migrations").run(&pool_clone).await {
                Ok(_) => {
                    tracing::info!("Migrations ran successfully");
                    // Auto-purge expired audit/access logs (DSGVO compliance)
                    sovereign_health_backend::services::audit::auto_purge(&pool_clone).await;
                }
                Err(e) => {
                    tracing::error!("Migration failure: {e}");
                    notifier_clone.send(
                        sovereign_health_backend::services::notify::Channel::Errors,
                        sovereign_health_backend::services::notify::Priority::Urgent,
                        "Migration failure on startup",
                        &format!("{e}"),
                    );
                }
            }
        });
    }

    // Affiliate evaluation cron: auto-approve expired pending conversions (daily)
    {
        let pool_clone = pool.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            loop {
                sovereign_health_backend::handlers::affiliate::cron_auto_approve(&pool_clone).await;
                tokio::time::sleep(std::time::Duration::from_secs(24 * 60 * 60)).await;
            }
        });
    }

    // Hard purge cron: permanently delete accounts past 30-day grace period (GDPR-F002)
    // + contact submission retention cleanup (GDPR-F005, #42)
    {
        let pool_clone = pool.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(120)).await;
            loop {
                sovereign_health_backend::services::purge::cron_hard_purge(&pool_clone).await;
                sovereign_health_backend::services::purge::cron_purge_contacts(&pool_clone).await;
                tokio::time::sleep(std::time::Duration::from_secs(24 * 60 * 60)).await;
            }
        });
    }

    if config.is_oss() {
        tracing::info!("Mode: OSS (self-hosted, no tier enforcement)");
    } else {
        tracing::info!("Mode: SaaS");
    }

    tracing::info!(
        "Starting {} on http://{}:{}",
        sovereign_health_backend::SERVICE_NAME,
        config.host,
        config.port,
    );

    let encryptor = sovereign_health_backend::services::encryption::Encryptor::new(
        config.encryption_key.as_deref(),
    );
    if encryptor.is_enabled() {
        tracing::info!("Encryption at rest: ENABLED");
    } else {
        tracing::warn!("Encryption at rest: DISABLED (ENCRYPTION_KEY not set)");
    }
    let encryptor_data = web::Data::new(encryptor);

    let email_provider = brickos_email::create_email_provider(!config.is_oss());
    let email_data = web::Data::new(email_provider);

    let rate_limiters = web::Data::new(
        sovereign_health_backend::services::rate_limit::AuthRateLimiters::from_config(&config),
    );

    // Stripe service (optional)
    let stripe_data: Option<web::Data<brickos_billing::stripe::StripeService>> = if config.is_oss()
    {
        tracing::info!("Stripe: DISABLED (OSS mode)");
        None
    } else if let Some(ref stripe_config) = config.stripe {
        tracing::info!("Stripe: ENABLED");
        Some(web::Data::new(brickos_billing::stripe::StripeService::new(
            stripe_config,
        )))
    } else {
        tracing::info!("Stripe: DISABLED (no secret key)");
        None
    };

    // Strike service (optional - Bitcoin payments)
    let strike_data: Option<web::Data<brickos_billing::strike::StrikeService>> =
        if let Some(ref api_key) = config.strike_api_key {
            tracing::info!("Strike (Bitcoin): ENABLED");
            Some(web::Data::new(brickos_billing::strike::StrikeService::new(
                api_key.clone(),
                config.strike_webhook_secret.clone(),
            )))
        } else {
            tracing::info!("Strike (Bitcoin): DISABLED (STRIKE_API_KEY not set)");
            None
        };

    // Payment gateway router
    let mut payment_router = sovereign_health_backend::payments::PaymentRouter::new();
    if let Some(ref sd) = stripe_data {
        let stripe_gw = sovereign_health_backend::payments::stripe_gateway::StripeGateway::new(
            sd.get_ref().clone(),
        );
        payment_router.register(std::sync::Arc::new(stripe_gw));
        tracing::info!("Payment gateway registered: Stripe");
    }
    if let Some(ref sd) = strike_data {
        let strike_gw = sovereign_health_backend::payments::strike_gateway::StrikeGateway::new(
            sd.get_ref().clone(),
        );
        payment_router.register(std::sync::Arc::new(strike_gw));
        tracing::info!("Payment gateway registered: Strike");
    }
    let payment_router_data = web::Data::new(payment_router);

    // Public chat config (Dr. Alex website chatbot)
    let public_chat_config =
        sovereign_health_backend::handlers::public_chat::PublicChatConfig::from_env()
            .expect("Failed to load public chat config");
    if public_chat_config.anthropic_api_key_website.is_empty() {
        tracing::warn!("Public chat: DISABLED (ANTHROPIC_API_KEY_WEBSITE not set)");
    } else {
        tracing::info!(
            "Public chat: ENABLED (model: {})",
            public_chat_config.public_chat_model
        );
    }
    let public_chat_config_data = web::Data::new(public_chat_config);
    let public_chat_sessions =
        web::Data::new(sovereign_health_backend::handlers::public_chat::PublicChatSessions::new());
    let public_chat_rate_limiter = web::Data::new(
        sovereign_health_backend::handlers::public_chat::PublicChatRateLimiter::new(),
    );
    let public_chat_token_tracker =
        web::Data::new(sovereign_health_backend::handlers::public_chat::DailyTokenTracker::new());
    let public_chat_daily_ip_tracker = web::Data::new(
        sovereign_health_backend::handlers::public_chat::DailyIpMessageTracker::new(),
    );

    if config.registration_enabled {
        tracing::info!("Registration: ENABLED");
    } else {
        tracing::info!("Registration: DISABLED");
    }

    // Content strings cache (5-min TTL, in-memory)
    let content_strings_cache = web::Data::new(
        sovereign_health_backend::handlers::content_strings::ContentStringsCache::new(),
    );

    // Notification service (ntfy + Telegram dual-dispatch) — reuse instance from above
    if notify_config.is_enabled() {
        tracing::info!(
            "Notifications: ENABLED (ntfy: {}, telegram: {})",
            notify_config.ntfy_base_url.is_some(),
            notify_config.telegram_bot_token.is_some()
        );
    } else {
        tracing::info!("Notifications: DISABLED (NTFY_BASE_URL and TELEGRAM_BOT_TOKEN not set)");
    }
    let notifier_data = web::Data::new(notifier);

    let extra_origins = config.cors_origins.clone();
    let bind_addr = format!("{}:{}", config.host, config.port);
    let cors_max_age = config.cors_max_age;
    let config_data = web::Data::new(config);

    HttpServer::new(move || {
        let mut cors = Cors::default()
            .allowed_origin(&config_data.frontend_url)
            .allowed_origin(&config_data.website_url);
        // Also allow www variant of website
        let www_website = config_data.website_url.replace("://", "://www.");
        cors = cors.allowed_origin(&www_website);
        // BrickOS platform domains
        cors = cors.allowed_origin("https://brickos.io");
        cors = cors.allowed_origin("https://www.brickos.io");
        cors = cors.allowed_origin("https://app.brickos.io");
        cors = cors.allowed_origin("https://demo.brickos.io");
        cors = cors.allowed_origin("https://api.brickos.io");
        if config_data.is_oss() || std::env::var("DEV_CORS").unwrap_or_default() == "true" {
            cors = cors.allowed_origin("http://localhost:3000");
        }
        for origin in &extra_origins {
            cors = cors.allowed_origin(origin);
        }
        let cors = cors
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                http::header::AUTHORIZATION,
                http::header::CONTENT_TYPE,
            ])
            .max_age(cors_max_age);

        let json_cfg = web::JsonConfig::default().error_handler(|err, _req| {
            let response = HttpResponse::BadRequest().json(serde_json::json!({
                "data": null,
                "error": { "code": "invalid_json", "message": "Invalid request body" }
            }));
            tracing::debug!("JSON parse error: {err}");
            actix_web::error::InternalError::from_response(err, response).into()
        });

        let payload_cfg = web::PayloadConfig::default().limit(35 * 1024 * 1024); // 35MB max payload

        let mut app = App::new()
            .wrap(sentry_actix::Sentry::new())
            .wrap(cors)
            .wrap(sovereign_health_backend::middleware::cache::CacheMiddleware)
            .wrap(sovereign_health_backend::middleware::rls::RlsMiddleware)
            .app_data(json_cfg)
            .app_data(payload_cfg)
            .app_data(web::Data::new(pool.clone()))
            .app_data(config_data.clone())
            .app_data(encryptor_data.clone())
            .app_data(email_data.clone())
            .app_data(rate_limiters.clone())
            .app_data(public_chat_config_data.clone())
            .app_data(public_chat_sessions.clone())
            .app_data(public_chat_rate_limiter.clone())
            .app_data(public_chat_token_tracker.clone())
            .app_data(public_chat_daily_ip_tracker.clone())
            .app_data(content_strings_cache.clone())
            .app_data(payment_router_data.clone())
            .app_data(notifier_data.clone());

        // Sovereign Link decoupled: runs as independent sli-api service (design 018)
        // SHI no longer embeds Sovereign Link routes or LinkStore

        if let Some(ref sd) = stripe_data {
            app = app.app_data(sd.clone());
        }
        if let Some(ref sd) = strike_data {
            app = app.app_data(sd.clone());
        }
        app.configure(configure_routes)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
