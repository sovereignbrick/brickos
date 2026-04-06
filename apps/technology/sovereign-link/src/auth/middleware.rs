use actix_web::body::EitherBody;
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform};
use actix_web::{web, Error, HttpMessage, HttpResponse};
use std::future::{ready, Future, Ready};
use std::pin::Pin;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::{api_key, jwt};
use crate::config::StandaloneConfig;
use crate::db::UserStore;

/// Middleware that authenticates API requests via JWT or API key.
/// On success, inserts the user's UUID into request extensions.
/// On failure, returns 401 Unauthorized.
pub struct ApiAuth;

impl<S, B> Transform<S, ServiceRequest> for ApiAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = ApiAuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ApiAuthMiddleware {
            service: Arc::new(service),
        }))
    }
}

pub struct ApiAuthMiddleware<S> {
    service: Arc<S>,
}

impl<S, B> Service<ServiceRequest> for ApiAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(
        &self,
        ctx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();

        Box::pin(async move {
            // Extract Bearer token from Authorization header
            let token = extract_token(&req);

            let token = match token {
                Some(t) if !t.is_empty() => t,
                _ => {
                    let resp = HttpResponse::Unauthorized()
                        .json(serde_json::json!({"error": "Missing authentication token"}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            // Get config and user store from app data
            let config = req.app_data::<web::Data<StandaloneConfig>>().cloned();
            let user_store = req.app_data::<web::Data<Arc<dyn UserStore>>>().cloned();

            let (config, user_store) = match (config, user_store) {
                (Some(c), Some(u)) => (c, u),
                _ => {
                    let resp = HttpResponse::InternalServerError()
                        .json(serde_json::json!({"error": "Server misconfiguration"}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            // Try JWT first
            if let Ok(claims) = jwt::verify_token(&token, &config.jwt_secret) {
                if let Ok(uid) = Uuid::parse_str(&claims.sub) {
                    req.extensions_mut().insert(uid);
                    let res = svc.call(req).await?;
                    return Ok(res.map_into_left_body());
                }
            }

            // Try API key
            let key_hash = api_key::hash_api_key(&token);
            if let Ok(Some(user)) = user_store.get_by_api_key_hash(&key_hash).await {
                if let Ok(uid) = Uuid::parse_str(&user.id) {
                    req.extensions_mut().insert(uid);
                    let res = svc.call(req).await?;
                    return Ok(res.map_into_left_body());
                }
            }

            let resp = HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
            Ok(req.into_response(resp).map_into_right_body())
        })
    }
}

/// Extract authentication token from Authorization header or auth_token cookie.
fn extract_token(req: &ServiceRequest) -> Option<String> {
    // Try Authorization: Bearer <token>
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(header_str) = auth_header.to_str() {
            if let Some(token) = header_str.strip_prefix("Bearer ") {
                return Some(token.to_string());
            }
        }
    }

    // Try auth_token cookie (for web UI sessions using API endpoints)
    if let Some(cookie_header) = req.headers().get("Cookie") {
        if let Ok(cookies) = cookie_header.to_str() {
            for cookie in cookies.split(';') {
                let cookie = cookie.trim();
                if let Some(token) = cookie.strip_prefix("auth_token=") {
                    return Some(token.to_string());
                }
            }
        }
    }

    None
}
