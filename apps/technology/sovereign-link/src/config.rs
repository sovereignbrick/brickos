/// Configuration for standalone mode, loaded from environment variables.
#[derive(Debug, Clone)]
pub struct StandaloneConfig {
    pub host: String,
    pub port: u16,
    pub base_url: String,
    pub db_path: String,
    pub jwt_secret: String,
    pub jwt_expiry_secs: i64,
    pub allow_registration: bool,
    pub admin_email: Option<String>,
    pub admin_password: Option<String>,
    pub nostr_enabled: bool,
    pub default_code_length: usize,
    pub rate_limit_creates: usize,
}

impl StandaloneConfig {
    /// Load configuration from SOVEREIGN_LINK_* environment variables with sensible defaults.
    pub fn from_env() -> Self {
        let host = env_or("SOVEREIGN_LINK_HOST", "0.0.0.0");
        let port = env_or("SOVEREIGN_LINK_PORT", "8080")
            .parse()
            .unwrap_or(8080);
        let base_url = env_or(
            "SOVEREIGN_LINK_BASE_URL",
            &format!("http://{}:{}", host, port),
        );
        let db_path = env_or("SOVEREIGN_LINK_DB_PATH", "./data.db");

        let jwt_secret = {
            let val = env_or("SOVEREIGN_LINK_JWT_SECRET", "");
            if val.is_empty() {
                let secret = generate_random_hex(32);
                tracing::warn!(
                    "No SOVEREIGN_LINK_JWT_SECRET set -- generated ephemeral secret. \
                     Set this env var for persistent sessions across restarts."
                );
                tracing::info!("Generated JWT secret: {}", secret);
                secret
            } else {
                val
            }
        };

        let jwt_expiry_secs = env_or("SOVEREIGN_LINK_JWT_EXPIRY_SECS", "86400")
            .parse()
            .unwrap_or(86400);

        let allow_registration = env_or("SOVEREIGN_LINK_ALLOW_REGISTRATION", "true")
            .parse()
            .unwrap_or(true);

        let admin_email = std::env::var("SOVEREIGN_LINK_ADMIN_EMAIL").ok().filter(|s| !s.is_empty());
        let admin_password = std::env::var("SOVEREIGN_LINK_ADMIN_PASSWORD").ok().filter(|s| !s.is_empty());

        let nostr_enabled = env_or("SOVEREIGN_LINK_NOSTR_ENABLED", "true")
            .parse()
            .unwrap_or(true);

        let default_code_length = env_or("SOVEREIGN_LINK_CODE_LENGTH", "6")
            .parse()
            .unwrap_or(6);

        let rate_limit_creates = env_or("SOVEREIGN_LINK_RATE_LIMIT_CREATES", "50")
            .parse()
            .unwrap_or(50);

        Self {
            host,
            port,
            base_url,
            db_path,
            jwt_secret,
            jwt_expiry_secs,
            allow_registration,
            admin_email,
            admin_password,
            nostr_enabled,
            default_code_length,
            rate_limit_creates,
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn generate_random_hex(bytes: usize) -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let random_bytes: Vec<u8> = (0..bytes).map(|_| rng.random()).collect();
    hex::encode(random_bytes)
}
