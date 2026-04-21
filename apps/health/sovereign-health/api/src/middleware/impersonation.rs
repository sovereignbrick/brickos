// Sovereign Health Intelligence -- AGPL-3.0
//
// Sprint 048 #048-15 + #048-16: impersonation scope gate + block
// audit. Runs on every request: if an `X-Impersonation-Token` header
// is present, classify the request path + method against the scope
// table (see handlers::impersonation::classify). Hard-excluded paths
// and write attempts are rejected with 403 before the handler runs,
// AND a fire-and-forget audit_log row is written.
//
// Token validation + effective-user swap + bumping last_seen_at +
// per-read audit rows live in the AuthenticatedUser extractor
// (middleware/auth.rs). The scope-gate middleware intentionally runs
// BEFORE that extractor so writes / out-of-scope calls are rejected
// without the extractor's async DB cost.

use actix_web::{
    body::EitherBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    web, HttpResponse,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
use sqlx::PgPool;
use std::rc::Rc;

use crate::handlers::impersonation::{classify, ImpersonationScope};

pub struct ImpersonationScopeGate;

impl<S, B> Transform<S, ServiceRequest> for ImpersonationScopeGate
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type InitError = ();
    type Transform = ImpersonationScopeGateMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ImpersonationScopeGateMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct ImpersonationScopeGateMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for ImpersonationScopeGateMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = actix_web::Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    actix_web::dev::forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let token_present = req.headers().get("X-Impersonation-Token").is_some();

        if !token_present {
            // No impersonation header: plain request, pass through.
            let fut = self.service.call(req);
            return Box::pin(async move {
                let res = fut.await?;
                Ok(res.map_into_left_body())
            });
        }

        let path = req.path().to_string();
        let method = req.method().clone();
        let scope = classify(&path, &method);

        // Capture token + pool for audit before moving req.
        let token_value = req
            .headers()
            .get("X-Impersonation-Token")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());
        let pool = req
            .app_data::<web::Data<PgPool>>()
            .map(|p| p.get_ref().clone());

        match scope {
            ImpersonationScope::HardExcluded => {
                audit_block(
                    pool.clone(),
                    "impersonation.blocked_out_of_scope",
                    &path,
                    method.as_str(),
                    token_value.as_deref(),
                );
                let (req, _pl) = req.into_parts();
                let body = serde_json::json!({
                    "data": null,
                    "error": {
                        "code": "impersonation_out_of_scope",
                        "message": "This endpoint is not reachable during a practitioner impersonation session."
                    }
                });
                let response = HttpResponse::Forbidden().json(body).map_into_right_body();
                Box::pin(async move { Ok(ServiceResponse::new(req, response)) })
            }
            ImpersonationScope::BlockedWrite => {
                audit_block(
                    pool.clone(),
                    "impersonation.blocked_write",
                    &path,
                    method.as_str(),
                    token_value.as_deref(),
                );
                let (req, _pl) = req.into_parts();
                let body = serde_json::json!({
                    "data": null,
                    "error": {
                        "code": "impersonation_readonly",
                        "message": "Impersonation sessions are read-only; writes are not permitted."
                    }
                });
                let response = HttpResponse::Forbidden().json(body).map_into_right_body();
                Box::pin(async move { Ok(ServiceResponse::new(req, response)) })
            }
            ImpersonationScope::Allowed | ImpersonationScope::Other => {
                let fut = self.service.call(req);
                Box::pin(async move {
                    let res = fut.await?;
                    Ok(res.map_into_left_body())
                })
            }
        }
    }
}

/// Sprint 048 #048-16: fire-and-forget audit row for a blocked
/// impersonation request. Actor id is NOT resolved here (middleware
/// runs before JWT extraction); metadata captures what we have (path,
/// method, token prefix) so it can be correlated with the
/// impersonation.start row via session id later.
fn audit_block(
    pool: Option<PgPool>,
    action: &'static str,
    path: &str,
    method: &str,
    token: Option<&str>,
) {
    let Some(pool) = pool else { return };
    let path = path.to_string();
    let method = method.to_string();
    let token_prefix = token
        .map(|t| t.chars().take(8).collect::<String>())
        .unwrap_or_default();
    tokio::spawn(async move {
        let _ = sqlx::query(
            r#"
            INSERT INTO audit_log (action, metadata, app_key)
            VALUES ($1, $2, 'shi')
            "#,
        )
        .bind(action)
        .bind(serde_json::json!({
            "path": path,
            "method": method,
            "token_prefix": token_prefix,
        }))
        .execute(&pool)
        .await;
    });
}
