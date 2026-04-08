/// Configuration for Sovereign Link in platform mode.
/// Env prefix: SLI_
#[derive(Debug, Clone)]
pub struct PlatformConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub platform_database_url: String,
    pub jwt_secret: String,
    pub base_url: String,
    pub encryption_key: Option<String>,
}

impl PlatformConfig {
    /// Load configuration from environment variables with SLI_ prefix.
    pub fn from_env() -> Self {
        let host = std::env::var("SLI_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = std::env::var("SLI_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(8082);
        let database_url =
            std::env::var("SLI_DATABASE_URL").expect("SLI_DATABASE_URL must be set");
        let platform_database_url = std::env::var("SLI_PLATFORM_DATABASE_URL")
            .expect("SLI_PLATFORM_DATABASE_URL must be set");
        let jwt_secret = std::env::var("SLI_JWT_SECRET").expect("SLI_JWT_SECRET must be set");
        let base_url =
            std::env::var("SLI_BASE_URL").unwrap_or_else(|_| "https://brickos.io".to_string());
        let encryption_key = std::env::var("SLI_ENCRYPTION_KEY").ok();

        Self {
            host,
            port,
            database_url,
            platform_database_url,
            jwt_secret,
            base_url,
            encryption_key,
        }
    }
}
