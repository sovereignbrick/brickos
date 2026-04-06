// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use chrono::Utc;
use sqlx::PgPool;

use crate::config::Config;
use crate::{
    AiSystemInfo, HealthCheckResult, HealthChecks, HealthResponse, HelloResponse, SERVICE_NAME,
    VERSION,
};

fn ai_system_info() -> AiSystemInfo {
    AiSystemInfo {
        name: "Dr. Alex".to_string(),
        provider: "Anthropic".to_string(),
        model: "Claude Sonnet 4".to_string(),
        classification: "EU AI Act: Limited Risk (Art. 50)".to_string(),
        purpose: "Health data analysis and personalized insights".to_string(),
        limitations: "Not a medical device. Does not diagnose, treat, or prevent disease."
            .to_string(),
        data_scope: "User's own biomarker data, measurements, and health profile only".to_string(),
    }
}

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
            ai_system: Some(ai_system_info()),
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
            ai_system: Some(ai_system_info()),
        })
    }
}

pub async fn hello() -> impl Responder {
    HttpResponse::Ok().json(HelloResponse {
        message: format!("Hello from {SERVICE_NAME}!"),
        version: VERSION.to_string(),
    })
}

/// GET /api/v1/health/metrics — external API monitoring endpoint.
/// Returns live system metrics for admin dashboard and external uptime monitors.
pub async fn metrics(pool: Option<web::Data<PgPool>>) -> impl Responder {
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "status": "unavailable",
                "error": "Database not connected"
            }));
        }
    };

    // Database health + latency
    let db_start = std::time::Instant::now();
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool.get_ref())
        .await
        .is_ok();
    let db_latency_ms = db_start.elapsed().as_millis() as i64;

    // Active users (last 5 min, last 24h)
    let active_5m: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '5 minutes' AND is_deleted = false",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let active_24h: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours' AND is_deleted = false",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Import stats (last 24h)
    let imports_24h = sqlx::query_as::<_, (i64, i64, i64)>(
        r#"SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
             COUNT(*) FILTER (WHERE status = 'error') as errors
           FROM import_sessions
           WHERE created_at > NOW() - INTERVAL '24 hours'"#,
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or((0, 0, 0));

    // AI API usage (last 24h)
    let ai_stats = sqlx::query_as::<_, (i64, i64)>(
        r#"SELECT
             COUNT(*) as total_calls,
             COALESCE(SUM(total_tokens), 0) as total_tokens
           FROM ai_usage_log
           WHERE created_at > NOW() - INTERVAL '24 hours'"#,
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or((0, 0));

    // Error rate (last 1h from audit_log)
    let errors_1h: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM audit_log WHERE action LIKE '%.error' AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Audit log stats
    let audit_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM audit_log")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    HttpResponse::Ok().json(serde_json::json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "version": VERSION,
        "timestamp": Utc::now().to_rfc3339(),
        "database": {
            "status": if db_ok { "ok" } else { "down" },
            "latency_ms": db_latency_ms,
        },
        "users": {
            "active_5m": active_5m,
            "active_24h": active_24h,
        },
        "imports_24h": {
            "total": imports_24h.0,
            "confirmed": imports_24h.1,
            "errors": imports_24h.2,
        },
        "ai_api_24h": {
            "total_calls": ai_stats.0,
            "total_tokens": ai_stats.1,
        },
        "errors_1h": errors_1h,
        "audit_log_total": audit_total,
    }))
}
