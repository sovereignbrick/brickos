// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse, Responder};
use chrono::Utc;

use crate::config::Config;
use crate::{HealthResponse, HelloResponse, SERVICE_NAME, VERSION};

pub async fn health(config: Option<web::Data<Config>>) -> impl Responder {
    let mode = config
        .as_ref()
        .filter(|c| c.is_oss())
        .map(|_| "oss".to_string());
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        service: SERVICE_NAME.to_string(),
        version: VERSION.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        mode,
    })
}

pub async fn hello() -> impl Responder {
    HttpResponse::Ok().json(HelloResponse {
        message: format!("Hello from {SERVICE_NAME}!"),
        version: VERSION.to_string(),
    })
}
