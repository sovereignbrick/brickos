// ============================================================================
//  brickos-licensing -- error types
// ============================================================================

use thiserror::Error;

pub type Result<T> = std::result::Result<T, LicensingError>;

#[derive(Debug, Error)]
pub enum LicensingError {
    #[error("license validation failed: {0}")]
    Validation(String),

    #[error("license expired at {0}")]
    Expired(chrono::DateTime<chrono::Utc>),

    #[error("license not yet valid (nbf in future)")]
    NotYetValid,

    #[error("audience mismatch: expected {expected}, got {actual}")]
    AudienceMismatch { expected: String, actual: String },

    #[error("license revoked: jti={0}")]
    Revoked(String),

    #[error("seat limit exceeded: role={role}, current={current}, max={max}")]
    SeatLimitExceeded {
        role: String,
        current: i64,
        max: i64,
    },

    #[error("cache empty -- never refreshed and no stored data")]
    CacheEmpty,

    #[error("cache stale -- 370-day offline grace exceeded; license server unreachable")]
    CacheStale,

    #[error("feature not allowed: {0}")]
    FeatureNotAllowed(String),

    #[error("tier not found: {0}")]
    TierNotFound(String),

    #[error("organization not found: {0}")]
    OrgNotFound(String),

    #[error("key load failed: {0}")]
    KeyLoad(String),

    #[error("JWT encode failed: {0}")]
    JwtEncode(#[from] jsonwebtoken::errors::Error),

    #[cfg(feature = "embedded")]
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[cfg(feature = "client")]
    #[error("HTTP client error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("internal: {0}")]
    Internal(String),
}
