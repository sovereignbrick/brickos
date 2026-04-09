use anyhow::Result;

#[derive(Clone)]
pub struct Config {
    // Database
    pub database_url: String,
    pub db_pool_max: u32,
    pub platform_database_url: String,
    pub platform_db_pool_max: u32,

    // Auth
    pub jwt_secret: String,
    pub jwt_expiry_secs: i64,
    pub refresh_expiry_secs: i64,

    // URLs
    pub frontend_url: String,
    pub api_base_url: String,

    // Server
    pub host: String,
    pub port: u16,

    // Branding
    pub product_name: String,
    pub support_email: String,

    // Encryption
    pub encryption_key: Option<String>,

    // Mode
    pub deploy_environment: String,

    // Email
    pub mailgun_api_key: Option<String>,
    pub mailgun_domain: Option<String>,

    // Notifications
    pub ntfy_base_url: Option<String>,
    pub ntfy_token: Option<String>,

    // AI (Ollama / Anthropic)
    pub ollama_base_url: Option<String>,
    pub ollama_model: Option<String>,
    pub anthropic_api_key: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let env = |key: &str| -> String {
            std::env::var(key).unwrap_or_else(|_| panic!("{key} must be set"))
        };
        let env_or = |key: &str, default: &str| -> String {
            std::env::var(key).unwrap_or_else(|_| default.to_string())
        };
        let env_opt =
            |key: &str| -> Option<String> { std::env::var(key).ok().filter(|v| !v.is_empty()) };

        Ok(Self {
            database_url: env("SCR_DATABASE_URL"),
            db_pool_max: env_or("SCR_DB_POOL_MAX", "10").parse()?,
            platform_database_url: env_or("SCR_PLATFORM_DATABASE_URL", &env("SCR_DATABASE_URL")),
            platform_db_pool_max: env_or("SCR_PLATFORM_DB_POOL_MAX", "5").parse()?,
            jwt_secret: env("SCR_JWT_SECRET"),
            jwt_expiry_secs: env_or("SCR_JWT_EXPIRY_SECS", "7200").parse()?,
            refresh_expiry_secs: env_or("SCR_REFRESH_EXPIRY_SECS", "5184000").parse()?,
            frontend_url: env_or("SCR_FRONTEND_URL", "http://localhost:3000"),
            api_base_url: env_or("SCR_API_BASE_URL", "http://localhost:8084"),
            host: env_or("SCR_HOST", "0.0.0.0"),
            port: env_or("SCR_PORT", "8084").parse()?,
            product_name: env_or("SCR_PRODUCT_NAME", "Sovereign CRM"),
            support_email: env_or("SCR_SUPPORT_EMAIL", "support@brickos.io"),
            encryption_key: env_opt("SCR_ENCRYPTION_KEY"),
            deploy_environment: env_or("DEPLOY_ENVIRONMENT", "development"),
            mailgun_api_key: env_opt("MAILGUN_API_KEY"),
            mailgun_domain: env_opt("MAILGUN_DOMAIN"),
            ntfy_base_url: env_opt("NTFY_BASE_URL"),
            ntfy_token: env_opt("NTFY_TOKEN"),
            ollama_base_url: env_opt("BRICKOS_OLLAMA_BASE_URL"),
            ollama_model: env_opt("BRICKOS_OLLAMA_MODEL"),
            anthropic_api_key: env_opt("ANTHROPIC_API_KEY"),
        })
    }

    pub fn is_saas(&self) -> bool {
        self.mailgun_api_key.is_some()
    }
}
