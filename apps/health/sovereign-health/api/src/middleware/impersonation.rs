// Sovereign Health Intelligence -- AGPL-3.0
//
// Sprint 048 #048-15 (Option C, minimum-viable): impersonation scope
// gate. Runs on every request: if an `X-Impersonation-Token` header is
// present, classify the request path + method against the scope table
// (see handlers::impersonation::classify). Hard-excluded paths and
// write attempts are rejected before the handler runs.
//
// What this middleware DOES NOT do yet (Sprint 049 #048-13 Part B):
//   - Validate the token against the impersonation_sessions table
//   - Swap the effective user context to the patient
//   - Bump last_seen_at
//   - Write audit rows
//
// Intentionally sync: no DB lookups, no async. Purely header + path +
// method. The token presence alone is the signal; full validation
// ships with the user-swap work.

use actix_web::{
    body::EitherBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    HttpResponse,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
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

        match scope {
            ImpersonationScope::HardExcluded => {
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
