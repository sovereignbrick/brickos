// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{HttpResponse, ResponseError};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Email already registered")]
    EmailConflict,

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Resource not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Internal server error")]
    Internal,

    #[error("Monthly quota exhausted - upgrade your plan for more Doctor Chat requests")]
    QuotaExceeded,

    #[error("Anthropic API key is not configured")]
    MissingApiKey,

    #[error("Upstream AI service error")]
    UpstreamError,

    #[error("Service is temporarily overloaded — please try again in a moment")]
    ServiceOverloaded,

    #[error("Too many requests — please wait a moment and try again")]
    RateLimited,

    #[error("Request timed out")]
    Timeout,

    #[error("Upgrade required")]
    UpgradeRequired(Box<crate::services::tier::TierError>),

    #[error("Forbidden")]
    Forbidden,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, code, message) = match self {
            AppError::InvalidCredentials => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "invalid_credentials",
                self.to_string(),
            ),
            AppError::EmailConflict => (
                actix_web::http::StatusCode::CONFLICT,
                "email_conflict",
                self.to_string(),
            ),
            AppError::Validation(msg) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "validation_error",
                msg.clone(),
            ),
            AppError::NotFound => (
                actix_web::http::StatusCode::NOT_FOUND,
                "not_found",
                self.to_string(),
            ),
            AppError::Unauthorized => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "unauthorized",
                self.to_string(),
            ),
            AppError::Internal => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                self.to_string(),
            ),
            AppError::QuotaExceeded => (
                actix_web::http::StatusCode::FORBIDDEN,
                "quota_exceeded",
                self.to_string(),
            ),
            AppError::MissingApiKey => (
                actix_web::http::StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                self.to_string(),
            ),
            AppError::UpstreamError => (
                actix_web::http::StatusCode::BAD_GATEWAY,
                "upstream_error",
                self.to_string(),
            ),
            AppError::ServiceOverloaded => (
                actix_web::http::StatusCode::SERVICE_UNAVAILABLE,
                "service_overloaded",
                self.to_string(),
            ),
            AppError::RateLimited => (
                actix_web::http::StatusCode::TOO_MANY_REQUESTS,
                "rate_limited",
                self.to_string(),
            ),
            AppError::Timeout => (
                actix_web::http::StatusCode::GATEWAY_TIMEOUT,
                "timeout",
                self.to_string(),
            ),
            AppError::Forbidden => (
                actix_web::http::StatusCode::FORBIDDEN,
                "forbidden",
                self.to_string(),
            ),
            AppError::UpgradeRequired(ref tier_err) => {
                return HttpResponse::Forbidden().json(json!({
                    "data": null,
                    "error": {
                        "code": "upgrade_required",
                        "message": tier_err.message,
                        "feature": tier_err.feature,
                        "current_tier": tier_err.current_tier,
                        "required_tier": tier_err.required_tier,
                        "upgrade_url": tier_err.upgrade_url
                    }
                }));
            }
        };

        HttpResponse::build(status).json(json!({
            "data": null,
            "error": {
                "code": code,
                "message": message
            }
        }))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match &e {
            sqlx::Error::Database(db_err) => {
                let code = db_err.code().unwrap_or_default();
                match code.as_ref() {
                    "23505" => AppError::EmailConflict, // unique_violation
                    "23503" => AppError::Validation("Referenced resource does not exist".into()),
                    "23514" => AppError::Validation("Value violates constraint".into()),
                    _ => {
                        tracing::error!("Database error ({}): {:?}", code, e);
                        AppError::Internal
                    }
                }
            }
            sqlx::Error::PoolTimedOut => {
                tracing::error!("Database pool exhausted");
                AppError::ServiceOverloaded
            }
            _ => {
                tracing::error!("Database error: {:?}", e);
                AppError::Internal
            }
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        tracing::error!("Application error: {:?}", e);
        AppError::Internal
    }
}

/// Classify an upstream HTTP error into an AppError variant.
/// Use this for all external service calls (Anthropic, Stripe, Strike, Mailgun).
pub fn classify_upstream_error(service: &str, status: u16) -> AppError {
    match status {
        401 | 403 => {
            tracing::error!(
                service = service,
                status = status,
                "External service auth error"
            );
            AppError::MissingApiKey
        }
        429 => {
            tracing::warn!(
                service = service,
                status = status,
                "External service rate limited"
            );
            AppError::RateLimited
        }
        503 | 529 => {
            tracing::warn!(
                service = service,
                status = status,
                "External service overloaded"
            );
            AppError::ServiceOverloaded
        }
        _ => {
            tracing::error!(service = service, status = status, "External service error");
            AppError::UpstreamError
        }
    }
}

/// Classify a reqwest error (timeout, connection failure, etc.) into an AppError.
pub fn classify_request_error(service: &str, err: &reqwest::Error) -> AppError {
    if err.is_timeout() {
        tracing::error!(service = service, "External service request timed out");
        AppError::Timeout
    } else if err.is_connect() {
        tracing::error!(service = service, "Could not connect to external service");
        AppError::UpstreamError
    } else {
        tracing::error!(service = service, error = %err, "External service request failed");
        AppError::UpstreamError
    }
}
