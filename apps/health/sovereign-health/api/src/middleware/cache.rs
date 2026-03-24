// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Cache-Control middleware: sets appropriate cache headers on responses
// based on route pattern and HTTP method.

use actix_web::dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform};
use actix_web::http::header::{self, HeaderValue};
use actix_web::Error;
use futures_util::future::LocalBoxFuture;
use std::future::{ready, Ready};

pub struct CacheMiddleware;

impl<S, B> Transform<S, ServiceRequest> for CacheMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = CacheMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CacheMiddlewareService { service }))
    }
}

pub struct CacheMiddlewareService<S> {
    service: S,
}

fn cache_value_for(method: &str, path: &str) -> Option<&'static str> {
    // Mutations never cached
    if method != "GET" && method != "HEAD" {
        return Some("no-store");
    }

    // Health check — always fresh
    if path == "/health" {
        return Some("no-cache");
    }

    // Auth routes — never cache
    if path.starts_with("/api/v1/auth/") || path.starts_with("/auth/") {
        return Some("no-store, no-cache");
    }

    // Public content — cacheable by CDN
    if path.starts_with("/v1/content/") || path.starts_with("/api/v1/content/") {
        return Some("public, max-age=3600");
    }

    // Public config/tiers — moderate cache
    if path.starts_with("/api/tiers/") || path.starts_with("/api/config/") {
        return Some("public, max-age=1800");
    }

    // User dashboard — short private cache
    if path.contains("/dashboard") {
        return Some("private, max-age=60");
    }

    // User measurements — moderate private cache
    if path.contains("/measurements") {
        return Some("private, max-age=300");
    }

    // User markers (with auth) — moderate private cache
    if path.contains("/markers/") && !path.starts_with("/v1/content/") {
        return Some("private, max-age=300");
    }

    None
}

impl<S, B> Service<ServiceRequest> for CacheMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let method = req.method().as_str().to_owned();
        let path = req.path().to_owned();
        let fut = self.service.call(req);

        Box::pin(async move {
            let mut res = fut.await?;

            // Only set if not already set by the handler
            if !res.headers().contains_key(header::CACHE_CONTROL) {
                if let Some(value) = cache_value_for(&method, &path) {
                    res.headers_mut().insert(
                        header::CACHE_CONTROL,
                        HeaderValue::from_static(value),
                    );
                }
            }

            Ok(res)
        })
    }
}
