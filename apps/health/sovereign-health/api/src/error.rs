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
        tracing::error!("Database error: {:?}", e);
        AppError::Internal
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        tracing::error!("Application error: {:?}", e);
        AppError::Internal
    }
}
