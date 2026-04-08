// BrickOS Platform API -- Configuration

/// Platform API configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct PlatformConfig {
    /// PostgreSQL connection string for the brickos database.
    pub database_url: String,
    /// Port to bind the HTTP server (default: 9000).
    pub port: u16,
    /// JWT secret for authenticating platform service accounts.
    /// Used once auth middleware is wired (scaffold phase -- suppress warning).
    #[allow(dead_code)]
    pub jwt_secret: String,
    /// Host to bind (default: 0.0.0.0).
    pub host: String,
}

impl PlatformConfig {
    /// Load configuration from environment variables.
    ///
    /// Required: PLATFORM_DATABASE_URL, PLATFORM_JWT_SECRET
    /// Optional: PLATFORM_PORT (default 9000), PLATFORM_HOST (default 0.0.0.0)
    pub fn from_env() -> Result<Self, String> {
        let database_url = std::env::var("PLATFORM_DATABASE_URL")
            .map_err(|_| "PLATFORM_DATABASE_URL must be set")?;
        let jwt_secret =
            std::env::var("PLATFORM_JWT_SECRET").map_err(|_| "PLATFORM_JWT_SECRET must be set")?;
        let port = std::env::var("PLATFORM_PORT")
            .unwrap_or_else(|_| "9000".to_string())
            .parse::<u16>()
            .map_err(|_| "PLATFORM_PORT must be a valid u16")?;
        let host = std::env::var("PLATFORM_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        Ok(Self {
            database_url,
            port,
            jwt_secret,
            host,
        })
    }
}
