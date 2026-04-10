// BrickOS Platform -- Service Health Aggregator
//
// Server-side poller that checks each service /health endpoint.
// More secure than exposing Gatus API -- no external API surface.
// Results cached 60s.

use actix_web::{web, HttpResponse};
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::error::AppError;
use crate::middleware::auth::AdminUser;

#[derive(Debug, Clone, Serialize)]
pub struct ServiceHealth {
    pub name: String,
    pub environment: String,
    pub status: String, // "healthy", "degraded", "down", "unknown"
    pub version: Option<String>,
    pub latency_ms: Option<u64>,
    pub checked_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HealthDashboard {
    pub services: Vec<ServiceHealth>,
    pub checked_at: String,
}

struct CachedHealth {
    data: HealthDashboard,
    fetched_at: Instant,
}

static CACHE: std::sync::OnceLock<Mutex<Option<CachedHealth>>> = std::sync::OnceLock::new();
const CACHE_TTL: Duration = Duration::from_secs(60);

/// GET /admin/services -- Service health dashboard
pub async fn service_health(
    _admin: AdminUser,
    _pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let cache = CACHE.get_or_init(|| Mutex::new(None));

    // Return cached if fresh
    {
        let guard = cache.lock().unwrap();
        if let Some(cached) = guard.as_ref() {
            if cached.fetched_at.elapsed() < CACHE_TTL {
                return Ok(HttpResponse::Ok().json(&cached.data));
            }
        }
    }

    // Fetch fresh data
    let dashboard = poll_services().await;

    // Update cache
    {
        let mut guard = cache.lock().unwrap();
        *guard = Some(CachedHealth {
            data: dashboard.clone(),
            fetched_at: Instant::now(),
        });
    }

    Ok(HttpResponse::Ok().json(&dashboard))
}

async fn poll_services() -> HealthDashboard {
    let endpoints = vec![
        (
            "SHI API",
            "production",
            "https://api.sovereignhealth.io/health",
        ),
        (
            "SHI Frontend",
            "production",
            "https://app.sovereignhealth.io/",
        ),
        ("SHI Website", "production", "https://sovereignhealth.io/"),
        ("BrickOS Website", "production", "https://brickos.io/"),
        (
            "SHI API",
            "staging",
            "https://api-demo.sovereignhealth.io/health",
        ),
        (
            "SHI Frontend",
            "staging",
            "https://demo.sovereignhealth.io/",
        ),
    ];

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let mut services = Vec::new();

    for (name, env, url) in &endpoints {
        let start = Instant::now();
        let result = client.get(*url).send().await;
        let latency = start.elapsed().as_millis() as u64;

        let (status, version) = match result {
            Ok(resp) => {
                if resp.status().is_success() {
                    // Try to parse version from health endpoint JSON
                    let ver = if url.contains("/health") {
                        resp.json::<serde_json::Value>().await.ok().and_then(|v| {
                            v.get("version").and_then(|v| v.as_str().map(String::from))
                        })
                    } else {
                        None
                    };
                    if latency > 3000 {
                        ("degraded".to_string(), ver)
                    } else {
                        ("healthy".to_string(), ver)
                    }
                } else {
                    ("degraded".to_string(), None)
                }
            }
            Err(_) => ("down".to_string(), None),
        };

        services.push(ServiceHealth {
            name: name.to_string(),
            environment: env.to_string(),
            status,
            version,
            latency_ms: Some(latency),
            checked_at: chrono::Utc::now().to_rfc3339(),
        });
    }

    HealthDashboard {
        services,
        checked_at: chrono::Utc::now().to_rfc3339(),
    }
}
