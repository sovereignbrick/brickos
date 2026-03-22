// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use chrono::Utc;
use sqlx::PgPool;

use crate::config::Config;
use crate::{
    HealthCheckResult, HealthChecks, HealthResponse, HelloResponse, SERVICE_NAME, VERSION,
};

pub async fn health(
    req: HttpRequest,
    config: Option<web::Data<Config>>,
    pool: Option<web::Data<PgPool>>,
) -> impl Responder {
    let mode = config
        .as_ref()
        .filter(|c| c.is_oss())
        .map(|_| "oss".to_string());

    let deep = req.query_string().contains("deep=1");

    if deep {
        let db_check = if let Some(pool) = pool {
            let start = std::time::Instant::now();
            match sqlx::query_scalar::<_, i32>("SELECT 1")
                .fetch_one(pool.get_ref())
                .await
            {
                Ok(_) => HealthCheckResult {
                    status: "ok".to_string(),
                    latency_ms: start.elapsed().as_millis() as i64,
                },
                Err(_) => HealthCheckResult {
                    status: "down".to_string(),
                    latency_ms: start.elapsed().as_millis() as i64,
                },
            }
        } else {
            HealthCheckResult {
                status: "down".to_string(),
                latency_ms: 0,
            }
        };

        let overall_status = if db_check.status == "ok" {
            "ok"
        } else {
            "degraded"
        };

        let response = HealthResponse {
            status: overall_status.to_string(),
            service: SERVICE_NAME.to_string(),
            version: VERSION.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            mode,
            checks: Some(HealthChecks { database: db_check }),
        };

        if overall_status == "ok" {
            HttpResponse::Ok().json(response)
        } else {
            HttpResponse::ServiceUnavailable().json(response)
        }
    } else {
        HttpResponse::Ok().json(HealthResponse {
            status: "ok".to_string(),
            service: SERVICE_NAME.to_string(),
            version: VERSION.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            mode,
            checks: None,
        })
    }
}

pub async fn hello() -> impl Responder {
    HttpResponse::Ok().json(HelloResponse {
        message: format!("Hello from {SERVICE_NAME}!"),
        version: VERSION.to_string(),
    })
}
