// BrickOS Platform API -- Configuration

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, std::env::VarError> {
        Ok(Self {
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "9000".to_string())
                .parse()
                .expect("PORT must be a valid u16"),
            database_url: std::env::var("DATABASE_URL")?,
        })
    }
}
