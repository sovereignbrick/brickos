// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Row-Level Security middleware: sets app.current_user_id on every
// authenticated request so PostgreSQL RLS policies can enforce
// data isolation at the database level.
//
// Issue: https://github.com/sovereignbrick/brickos/issues/43

use actix_web::dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform};
use actix_web::{web, Error};
use futures_util::future::LocalBoxFuture;
use sqlx::PgPool;
use std::future::{ready, Ready};

use crate::config::Config;
use crate::services::auth::verify_jwt_with_fallback;

/// Middleware factory that sets RLS context on every request with a valid JWT.
pub struct RlsMiddleware;

impl<S, B> Transform<S, ServiceRequest> for RlsMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RlsMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RlsMiddlewareService { service }))
    }
}

pub struct RlsMiddlewareService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for RlsMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Try to extract user ID from JWT (if present)
        let user_id = extract_user_id_from_request(&req);
        let pool = req.app_data::<web::Data<PgPool>>().cloned();

        let fut = self.service.call(req);

        Box::pin(async move {
            // Set RLS context if we have both a user ID and a pool
            if let (Some(uid), Some(pool)) = (user_id, pool) {
                let _ = sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
                    .bind(uid.to_string())
                    .execute(pool.get_ref())
                    .await;
            }

            fut.await
        })
    }
}

/// Extract user ID from Authorization header without failing the request.
/// Returns None if no valid JWT is present (public endpoints).
fn extract_user_id_from_request(req: &ServiceRequest) -> Option<uuid::Uuid> {
    let config = req.app_data::<web::Data<Config>>()?;

    let auth_header = req.headers().get("Authorization")?.to_str().ok()?;

    let token = auth_header.strip_prefix("Bearer ")?;

    let claims = verify_jwt_with_fallback(
        token,
        &config.jwt_secret,
        config.jwt_secret_previous.as_deref(),
    )
    .ok()?;

    uuid::Uuid::parse_str(&claims.sub).ok()
}
