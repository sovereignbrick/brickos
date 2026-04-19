// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Shared test infrastructure for all integration tests.
// Import with: mod common;
//
// Not all test files use every function, so allow dead_code.
#![allow(dead_code)]

use actix_web::{dev::ServiceResponse, test::TestRequest, web, App};
use brickos_email::{EmailProvider, LogProvider};
use sovereign_health_backend::{
    config::Config,
    configure_routes,
    handlers::public_chat::*,
    middleware::org_resolver::OrgCache,
    services::{encryption::Encryptor, rate_limit::AuthRateLimiters},
};
use sqlx::PgPool;
use std::sync::Arc;

/// Connect to the test database and run migrations.
/// Returns None if DATABASE_URL is not set (tests skip gracefully).
pub async fn setup_pool() -> Option<PgPool> {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL").ok()?;
    let pool = PgPool::connect(&url).await.ok()?;
    sqlx::migrate!("./migrations").run(&pool).await.ok()?;
    Some(pool)
}

/// Create a Config + pool pair for tests.
/// Uses Config::test_default() with the real DATABASE_URL.
pub async fn setup() -> Option<(PgPool, Config)> {
    let pool = setup_pool().await?;
    let mut config = Config::test_default();
    config.database_url = std::env::var("DATABASE_URL").unwrap_or_default();
    if let Ok(secret) = std::env::var("JWT_SECRET") {
        config.jwt_secret = secret;
    }
    Some((pool, config))
}

/// Build a fully-configured test app with ALL required app_data.
///
/// This mirrors what main.rs registers. Every integration test MUST use this
/// instead of bare App::new() to avoid missing-extractor 500 errors.
///
/// Includes: Pool, Config, Encryptor, EmailProvider (LogProvider),
/// AuthRateLimiters, PublicChatConfig, PublicChatSessions,
/// PublicChatRateLimiter, DailyTokenTracker, DailyIpMessageTracker.
pub fn build_test_app(
    pool: PgPool,
    config: Config,
) -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        Response = ServiceResponse,
        Error = actix_web::Error,
        InitError = (),
    >,
> {
    // Core services
    let encryptor = Encryptor::new(None);
    let email_provider: Arc<dyn EmailProvider> = Arc::new(LogProvider);
    let rate_limiters = AuthRateLimiters::from_config(&config);

    // Public chat (needed for /v1/chat/public endpoints)
    let public_chat_config = PublicChatConfig::from_env().unwrap_or_else(|_| PublicChatConfig {
        anthropic_api_key_website: String::new(),
        public_chat_model: "test".into(),
        public_chat_max_messages: 5,
        public_chat_max_tokens: 200,
        public_chat_daily_token_limit: 10000,
        public_chat_rate_per_hour: 100,
        public_chat_conversations_per_hour: 100,
        public_chat_session_ttl_secs: 3600,
        system_prompt: "test".into(),
    });

    App::new()
        .app_data(web::Data::new(pool))
        .app_data(web::Data::new(config))
        .app_data(web::Data::new(encryptor))
        .app_data(web::Data::new(email_provider))
        .app_data(web::Data::new(rate_limiters))
        .app_data(web::Data::new(public_chat_config))
        .app_data(web::Data::new(PublicChatSessions::new()))
        .app_data(web::Data::new(PublicChatRateLimiter::new()))
        .app_data(web::Data::new(DailyTokenTracker::new()))
        .app_data(web::Data::new(DailyIpMessageTracker::new()))
        .app_data(web::Data::new(OrgCache::new()))
        .configure(configure_routes)
}

/// Default peer address for test requests.
/// The actix-governor rate limiter needs a peer IP to extract from requests.
/// Without this, all requests to rate-limited routes (e.g., /auth/*) will fail
/// with "Could not extract peer IP address from request" (500).
pub fn test_peer_addr() -> std::net::SocketAddr {
    "127.0.0.1:8080".parse().unwrap()
}

/// Create a TestRequest with a peer address pre-set.
/// Use this instead of `TestRequest::get()` / `TestRequest::post()` for
/// any request that hits a rate-limited route.
pub fn test_get(uri: &str) -> TestRequest {
    TestRequest::get().uri(uri).peer_addr(test_peer_addr())
}

pub fn test_post(uri: &str) -> TestRequest {
    TestRequest::post().uri(uri).peer_addr(test_peer_addr())
}
