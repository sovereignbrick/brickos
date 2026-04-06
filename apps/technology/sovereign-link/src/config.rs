use serde::Deserialize;
use std::path::Path;

/// Configuration for standalone mode.
/// Loading order: defaults -> config.toml (if exists) -> environment variables (override).
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
    pub nostr_nip89_publish: bool,
    pub default_code_length: usize,
    pub rate_limit_creates: usize,
}

/// TOML file structure matching config.example.toml
#[derive(Debug, Default, Deserialize)]
struct TomlConfig {
    #[serde(default)]
    server: TomlServer,
    #[serde(default)]
    database: TomlDatabase,
    #[serde(default)]
    auth: TomlAuth,
    #[serde(default)]
    admin: TomlAdmin,
    #[serde(default)]
    nostr: TomlNostr,
}

#[derive(Debug, Default, Deserialize)]
struct TomlServer {
    host: Option<String>,
    port: Option<u16>,
    base_url: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct TomlDatabase {
    path: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct TomlAuth {
    jwt_secret: Option<String>,
    jwt_expiry_secs: Option<i64>,
    allow_registration: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
struct TomlAdmin {
    email: Option<String>,
    password: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct TomlNostr {
    enabled: Option<bool>,
    nip89_publish: Option<bool>,
}

impl StandaloneConfig {
    /// Load configuration with precedence: defaults -> config.toml -> env vars.
    pub fn load() -> Self {
        let toml = Self::load_toml();
        Self::merge(toml)
    }

    /// Legacy method for backward compatibility.
    pub fn from_env() -> Self {
        Self::load()
    }

    /// Try to load config.toml from the current directory or a custom path.
    fn load_toml() -> TomlConfig {
        // Check SOVEREIGN_LINK_CONFIG env var for custom path
        let config_path = std::env::var("SOVEREIGN_LINK_CONFIG")
            .unwrap_or_else(|_| "config.toml".to_string());

        let path = Path::new(&config_path);
        if !path.exists() {
            tracing::debug!("No config file at {}, using defaults + env vars", config_path);
            return TomlConfig::default();
        }

        match std::fs::read_to_string(path) {
            Ok(content) => match toml::from_str::<TomlConfig>(&content) {
                Ok(cfg) => {
                    tracing::info!("Loaded config from {}", config_path);
                    cfg
                }
                Err(e) => {
                    tracing::warn!("Failed to parse {}: {}. Using defaults.", config_path, e);
                    TomlConfig::default()
                }
            },
            Err(e) => {
                tracing::warn!("Failed to read {}: {}. Using defaults.", config_path, e);
                TomlConfig::default()
            }
        }
    }

    /// Merge TOML config with env var overrides. Env vars always win.
    fn merge(toml: TomlConfig) -> Self {
        let host = env_or_toml("SOVEREIGN_LINK_HOST", toml.server.host, "0.0.0.0");
        let port = env_or_toml("SOVEREIGN_LINK_PORT", toml.server.port.map(|p| p.to_string()), "8080")
            .parse()
            .unwrap_or(8080);
        let default_base = format!("http://{}:{}", host, port);
        let base_url = env_or_toml("SOVEREIGN_LINK_BASE_URL", toml.server.base_url, &default_base);
        let db_path = env_or_toml("SOVEREIGN_LINK_DB_PATH", toml.database.path, "./data.db");

        let jwt_secret = {
            let val = env_or_toml("SOVEREIGN_LINK_JWT_SECRET", toml.auth.jwt_secret, "");
            if val.is_empty() {
                let secret = generate_random_hex(32);
                tracing::warn!(
                    "No JWT secret configured. Generated ephemeral secret. \
                     Set [auth].jwt_secret in config.toml or SOVEREIGN_LINK_JWT_SECRET env var \
                     for persistent sessions across restarts."
                );
                secret
            } else {
                val
            }
        };

        let jwt_expiry_secs = env_or_toml(
            "SOVEREIGN_LINK_JWT_EXPIRY_SECS",
            toml.auth.jwt_expiry_secs.map(|s| s.to_string()),
            "86400",
        )
        .parse()
        .unwrap_or(86400);

        let allow_registration = env_or_toml(
            "SOVEREIGN_LINK_ALLOW_REGISTRATION",
            toml.auth.allow_registration.map(|b| b.to_string()),
            "true",
        )
        .parse()
        .unwrap_or(true);

        let admin_email = env_or_toml_opt("SOVEREIGN_LINK_ADMIN_EMAIL", toml.admin.email);
        let admin_password = env_or_toml_opt("SOVEREIGN_LINK_ADMIN_PASSWORD", toml.admin.password);

        let nostr_enabled = env_or_toml(
            "SOVEREIGN_LINK_NOSTR_ENABLED",
            toml.nostr.enabled.map(|b| b.to_string()),
            "true",
        )
        .parse()
        .unwrap_or(true);

        let nostr_nip89_publish = env_or_toml(
            "SOVEREIGN_LINK_NOSTR_NIP89_PUBLISH",
            toml.nostr.nip89_publish.map(|b| b.to_string()),
            "false",
        )
        .parse()
        .unwrap_or(false);

        let default_code_length = env_or_toml("SOVEREIGN_LINK_CODE_LENGTH", None, "6")
            .parse()
            .unwrap_or(6);

        let rate_limit_creates = env_or_toml("SOVEREIGN_LINK_RATE_LIMIT_CREATES", None, "50")
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
            nostr_nip89_publish,
            default_code_length,
            rate_limit_creates,
        }
    }
}

/// Resolve a value: env var > toml value > default.
fn env_or_toml(env_key: &str, toml_val: Option<String>, default: &str) -> String {
    if let Ok(val) = std::env::var(env_key) {
        if !val.is_empty() {
            return val;
        }
    }
    toml_val.unwrap_or_else(|| default.to_string())
}

/// Resolve an optional value: env var > toml value > None.
fn env_or_toml_opt(env_key: &str, toml_val: Option<String>) -> Option<String> {
    if let Ok(val) = std::env::var(env_key) {
        if !val.is_empty() {
            return Some(val);
        }
    }
    toml_val
}

fn generate_random_hex(bytes: usize) -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let random_bytes: Vec<u8> = (0..bytes).map(|_| rng.random()).collect();
    hex::encode(random_bytes)
}
