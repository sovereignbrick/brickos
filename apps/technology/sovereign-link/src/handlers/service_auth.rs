//! Service account authentication for platform mode (#332).
//!
//! Provides middleware and helpers for authenticating service-to-service
//! requests using API keys stored in `brickos.service_accounts`.

#[cfg(feature = "platform")]
use actix_web::{
    body::EitherBody,
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    HttpMessage, HttpResponse,
};
#[cfg(feature = "platform")]
use chrono::{DateTime, Utc};
#[cfg(feature = "platform")]
use sha2::{Digest, Sha256};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use std::{
    future::{ready, Future, Ready},
    pin::Pin,
    rc::Rc,
};
#[cfg(feature = "platform")]
use uuid::Uuid;

// ---------------------------------------------------------------------------
// ServiceAccount model
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ServiceAccount {
    pub id: Uuid,
    pub name: String,
    pub role: String,
    pub scopes: Vec<String>,
    pub rate_limit_rpm: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Middleware (Transform + Service)
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
pub struct ServiceAuthMiddleware;

#[cfg(feature = "platform")]
impl<S, B> Transform<S, ServiceRequest> for ServiceAuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type Transform = ServiceAuthMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ServiceAuthMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

#[cfg(feature = "platform")]
pub struct ServiceAuthMiddlewareService<S> {
    service: Rc<S>,
}

#[cfg(feature = "platform")]
impl<S, B> Service<ServiceRequest> for ServiceAuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = Rc::clone(&self.service);

        Box::pin(async move {
            // Extract the bearer token from the Authorization header
            let token = req
                .headers()
                .get("Authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer "));

            let token = match token {
                Some(t) => t.to_string(),
                None => {
                    let resp = HttpResponse::Unauthorized().json(
                        serde_json::json!({"error": "Missing or invalid Authorization header"}),
                    );
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            // Hash the token with SHA256 and look it up
            let pool = match req.app_data::<actix_web::web::Data<PgPool>>() {
                Some(p) => p.clone(),
                None => {
                    let resp = HttpResponse::InternalServerError()
                        .json(serde_json::json!({"error": "Database pool not configured"}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            let key_hash = hash_api_key(&token);

            let account = sqlx::query_as::<_, ServiceAccount>(
                r#"SELECT id, name, role, scopes, rate_limit_rpm, is_active, created_at
                   FROM brickos.service_accounts
                   WHERE api_key_hash = $1 AND is_active = true"#,
            )
            .bind(&key_hash)
            .fetch_optional(pool.get_ref())
            .await;

            let account = match account {
                Ok(Some(a)) => a,
                Ok(None) => {
                    let resp = HttpResponse::Unauthorized()
                        .json(serde_json::json!({"error": "Invalid API key"}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
                Err(e) => {
                    tracing::error!("Service auth DB error: {}", e);
                    let resp = HttpResponse::InternalServerError()
                        .json(serde_json::json!({"error": "Authentication check failed"}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            // Store the authenticated account in request extensions
            req.extensions_mut().insert(account);

            let res = svc.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Hash an API key with SHA256 (matches the storage format in brickos.service_accounts).
#[cfg(feature = "platform")]
pub fn hash_api_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    hex::encode(hasher.finalize())
}

/// Extract the authenticated service account from request extensions.
#[cfg(feature = "platform")]
pub fn extract_service_account(req: &actix_web::HttpRequest) -> Option<ServiceAccount> {
    req.extensions().get::<ServiceAccount>().cloned()
}

/// Check that the service account has the required scope.
/// Returns an error response if the scope is missing.
#[cfg(feature = "platform")]
pub fn require_scope(account: &ServiceAccount, scope: &str) -> Result<(), HttpResponse> {
    if account.scopes.contains(&scope.to_string()) || account.scopes.contains(&"*".to_string()) {
        Ok(())
    } else {
        Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": format!("Missing required scope: {}", scope)
        })))
    }
}

/// Check that the service account has the required role.
/// Returns an error response if the role does not match.
#[cfg(feature = "platform")]
pub fn require_role(account: &ServiceAccount, role: &str) -> Result<(), HttpResponse> {
    if account.role == role {
        Ok(())
    } else {
        Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": format!("Requires role: {}", role)
        })))
    }
}
