use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Forbidden")]
    Forbidden,
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Validation: {0}")]
    Validation(String),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Internal: {0}")]
    Internal(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct ErrorBody {
    data: Option<()>,
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: String,
    message: String,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, code) = match self {
            AppError::NotFound => (actix_web::http::StatusCode::NOT_FOUND, "not_found"),
            AppError::Unauthorized => (actix_web::http::StatusCode::UNAUTHORIZED, "unauthorized"),
            AppError::Forbidden => (actix_web::http::StatusCode::FORBIDDEN, "forbidden"),
            AppError::Conflict(_) => (actix_web::http::StatusCode::CONFLICT, "conflict"),
            AppError::Validation(_) => (actix_web::http::StatusCode::BAD_REQUEST, "validation"),
            AppError::Database(_) => {
                tracing::error!("Database error: {:?}", self);
                (
                    actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                    "database_error",
                )
            }
            AppError::Internal(_) => {
                tracing::error!("Internal error: {:?}", self);
                (
                    actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                )
            }
        };

        HttpResponse::build(status).json(ErrorBody {
            data: None,
            error: ErrorDetail {
                code: code.to_string(),
                message: self.to_string(),
            },
        })
    }
}
