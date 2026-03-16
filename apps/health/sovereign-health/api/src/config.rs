// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use anyhow::Context;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct StripeConfig {
    pub secret_key: String,
    pub publishable_key: String,
    pub webhook_secret: String,
    /// Maps price_id -> (tier_slug, billing_interval)
    pub price_to_tier: HashMap<String, (String, String)>,
    /// Maps (tier_slug, billing_interval) -> price_id
    pub tier_to_price: HashMap<(String, String), String>,
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_secs: i64,
    pub refresh_expiry_secs: i64,
    pub anthropic_api_key: String,
    pub registration_enabled: bool,
    pub encryption_key: Option<String>,
    pub shi_mode: String,
    pub cors_origins: Vec<String>,
    pub stripe: Option<StripeConfig>,
    pub strike_api_key: Option<String>,
    pub strike_webhook_secret: String,
    pub btc_discount_percent: f64,

    // URLs
    pub frontend_url: String,
    pub api_base_url: String,
    pub website_url: String,

    // Branding
    pub product_name: String,
    pub support_email: String,

    // Server
    pub host: String,
    pub port: u16,
    pub db_pool_max: u32,
    pub cors_max_age: usize,

    // Auth rate limits
    pub rate_limit_register: usize,
    pub rate_limit_login: usize,
    pub rate_limit_forgot_password: usize,
    pub rate_limit_resend_verification: usize,
    pub rate_limit_reset_password: usize,
    pub rate_limit_window_secs: u64,

    // Auth governor
    pub auth_governor_per_second: u64,
    pub auth_governor_burst_size: u32,

    // Token/session expirations
    pub email_verification_expiry_hours: i64,
    pub password_reset_expiry_hours: i64,
    pub mfa_login_expiry_minutes: i64,
    pub mfa_setup_expiry_minutes: i64,
    pub grace_period_days: i64,

    // Anthropic API
    pub anthropic_api_url: String,
    pub anthropic_api_version: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
        let jwt_secret = std::env::var("JWT_SECRET").context("JWT_SECRET must be set")?;
        let anthropic_api_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or_default();
        let shi_mode = std::env::var("SHI_MODE").unwrap_or_default();
        let is_oss = shi_mode == "oss";
        let registration_enabled = std::env::var("REGISTRATION_ENABLED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(is_oss);
        let encryption_key = std::env::var("ENCRYPTION_KEY").ok();
        let cors_origins = std::env::var("CORS_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        // Stripe config (optional -- disabled when secret key not set)
        let stripe = Self::load_stripe_config();

        let jwt_expiry_secs = env_parse("JWT_EXPIRY_SECS", 2 * 60 * 60); // 2 hours
        let refresh_expiry_secs = env_parse("REFRESH_EXPIRY_SECS", 60 * 24 * 60 * 60); // 60 days

        let default_frontend = if is_oss {
            "http://localhost:3000"
        } else {
            "https://app.sovereignhealth.io"
        };

        Ok(Self {
            database_url,
            jwt_secret,
            jwt_expiry_secs,
            refresh_expiry_secs,
            anthropic_api_key,
            registration_enabled,
            encryption_key,
            shi_mode,
            cors_origins,
            stripe,
            strike_api_key: std::env::var("STRIKE_API_KEY")
                .ok()
                .filter(|s| !s.is_empty()),
            strike_webhook_secret: env_or("STRIKE_WEBHOOK_SECRET", ""),
            btc_discount_percent: env_parse("BTC_DISCOUNT_PERCENT", 5.0),

            // URLs
            frontend_url: env_or("FRONTEND_URL", default_frontend),
            api_base_url: env_or("API_BASE_URL", "https://api.sovereignhealth.io"),
            website_url: env_or("WEBSITE_URL", "https://sovereignhealth.io"),

            // Branding
            product_name: env_or("PRODUCT_NAME", "Sovereign Health"),
            support_email: env_or("SUPPORT_EMAIL", "sovereignhealthintelligence@proton.me"),

            // Server
            host: env_or("HOST", "0.0.0.0"),
            port: env_parse("PORT", 8080),
            db_pool_max: env_parse("DB_POOL_MAX", 5),
            cors_max_age: env_parse("CORS_MAX_AGE", 3600),

            // Auth rate limits
            rate_limit_register: env_parse("RATE_LIMIT_REGISTER", 5),
            rate_limit_login: env_parse("RATE_LIMIT_LOGIN", 10),
            rate_limit_forgot_password: env_parse("RATE_LIMIT_FORGOT_PASSWORD", 3),
            rate_limit_resend_verification: env_parse("RATE_LIMIT_RESEND_VERIFICATION", 3),
            rate_limit_reset_password: env_parse("RATE_LIMIT_RESET_PASSWORD", 5),
            rate_limit_window_secs: env_parse("RATE_LIMIT_WINDOW_SECS", 3600),

            // Auth governor
            auth_governor_per_second: env_parse("AUTH_GOVERNOR_PER_SECOND", 12),
            auth_governor_burst_size: env_parse("AUTH_GOVERNOR_BURST_SIZE", 5),

            // Token/session expirations
            email_verification_expiry_hours: env_parse("EMAIL_VERIFICATION_EXPIRY_HOURS", 24),
            password_reset_expiry_hours: env_parse("PASSWORD_RESET_EXPIRY_HOURS", 1),
            mfa_login_expiry_minutes: env_parse("MFA_LOGIN_EXPIRY_MINUTES", 5),
            mfa_setup_expiry_minutes: env_parse("MFA_SETUP_EXPIRY_MINUTES", 10),
            grace_period_days: env_parse("GRACE_PERIOD_DAYS", 7),

            // Anthropic API
            anthropic_api_url: env_or("ANTHROPIC_API_URL", "https://api.anthropic.com/v1/messages"),
            anthropic_api_version: env_or("ANTHROPIC_API_VERSION", "2023-06-01"),
        })
    }

    /// Create a Config suitable for tests. Reads DATABASE_URL and JWT_SECRET from env,
    /// uses test defaults for everything else.
    pub fn test_default() -> Self {
        dotenvy::dotenv().ok();
        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://localhost/test".into()),
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| {
                "test-secret-that-is-long-enough-for-testing-purposes-only".into()
            }),
            jwt_expiry_secs: 3600,
            refresh_expiry_secs: 86400,
            anthropic_api_key: String::new(),
            registration_enabled: true,
            encryption_key: None,
            shi_mode: "oss".into(),
            cors_origins: vec![],
            stripe: None,
            strike_api_key: None,
            strike_webhook_secret: String::new(),
            btc_discount_percent: 5.0,
            frontend_url: "http://localhost:3000".into(),
            api_base_url: "http://localhost:8080".into(),
            website_url: "http://localhost:3100".into(),
            product_name: "Sovereign Health Test".into(),
            support_email: "test@test.com".into(),
            host: "127.0.0.1".into(),
            port: 8080,
            db_pool_max: 5,
            cors_max_age: 3600,
            rate_limit_register: 100,
            rate_limit_login: 100,
            rate_limit_forgot_password: 100,
            rate_limit_resend_verification: 100,
            rate_limit_reset_password: 100,
            rate_limit_window_secs: 60,
            auth_governor_per_second: 100,
            auth_governor_burst_size: 100,
            email_verification_expiry_hours: 24,
            password_reset_expiry_hours: 1,
            mfa_login_expiry_minutes: 10,
            mfa_setup_expiry_minutes: 30,
            grace_period_days: 7,
            anthropic_api_url: "https://api.anthropic.com".into(),
            anthropic_api_version: "2023-06-01".into(),
        }
    }

    pub fn is_oss(&self) -> bool {
        self.shi_mode == "oss"
    }

    /// Read Anthropic API URL from env (for use in services without Config reference)
    pub fn anthropic_api_url_static() -> String {
        std::env::var("ANTHROPIC_API_URL")
            .unwrap_or_else(|_| "https://api.anthropic.com/v1/messages".to_string())
    }

    /// Read Anthropic API version from env (for use in services without Config reference)
    pub fn anthropic_api_version_static() -> String {
        std::env::var("ANTHROPIC_API_VERSION").unwrap_or_else(|_| "2023-06-01".to_string())
    }

    fn load_stripe_config() -> Option<StripeConfig> {
        let secret_key = std::env::var("STRIPE_SECRET_KEY").ok()?;
        if secret_key.is_empty() {
            return None;
        }
        let publishable_key = std::env::var("STRIPE_PUBLISHABLE_KEY").unwrap_or_default();
        let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();

        let mut price_to_tier = HashMap::new();
        let mut tier_to_price = HashMap::new();

        let tier_prices = [
            ("focus", "STRIPE_PRICE_FOCUS"),
            ("insight", "STRIPE_PRICE_INSIGHT"),
            ("clarity", "STRIPE_PRICE_CLARITY"),
            ("horizon", "STRIPE_PRICE_HORIZON"),
        ];

        for (tier_slug, env_prefix) in &tier_prices {
            if let Ok(monthly) = std::env::var(format!("{}_MONTHLY", env_prefix)) {
                if !monthly.is_empty() {
                    price_to_tier.insert(
                        monthly.clone(),
                        (tier_slug.to_string(), "monthly".to_string()),
                    );
                    tier_to_price.insert((tier_slug.to_string(), "monthly".to_string()), monthly);
                }
            }
            if let Ok(annual) = std::env::var(format!("{}_ANNUAL", env_prefix)) {
                if !annual.is_empty() {
                    price_to_tier.insert(
                        annual.clone(),
                        (tier_slug.to_string(), "annual".to_string()),
                    );
                    tier_to_price.insert((tier_slug.to_string(), "annual".to_string()), annual);
                }
            }
        }

        Some(StripeConfig {
            secret_key,
            publishable_key,
            webhook_secret,
            price_to_tier,
            tier_to_price,
        })
    }
}
