// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::task;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;

static PUBLISH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

pub async fn publish_website(
    _pool: web::Data<PgPool>,
    admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    // Prevent concurrent publishes
    if PUBLISH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Ok(HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": { "code": "publish_in_progress", "message": "A publish is already in progress. Please wait." }
        })));
    }

    let start = std::time::Instant::now();

    let result = task::spawn_blocking(|| {
        // Step 1: Build the static site
        let build = std::process::Command::new("pnpm")
            .args(["build"])
            .current_dir("/opt/sovereign-health/website")
            .output();

        match build {
            Ok(output) if output.status.success() => {
                // Step 2: Copy to nginx root
                let copy = std::process::Command::new("cp")
                    .args(["-r", "out/.", "/opt/sovereign-health/homepage/"])
                    .current_dir("/opt/sovereign-health/website")
                    .output();

                match copy {
                    Ok(o) if o.status.success() => Ok("Website published successfully".to_string()),
                    Ok(o) => Err(format!(
                        "Copy failed: {}",
                        String::from_utf8_lossy(&o.stderr)
                    )),
                    Err(e) => Err(format!("Copy error: {}", e)),
                }
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Truncate to avoid huge response
                let stderr_trunc: String = stderr.chars().take(2000).collect();
                let stdout_trunc: String = stdout.chars().take(2000).collect();
                Err(format!(
                    "Build failed:\nstdout: {}\nstderr: {}",
                    stdout_trunc, stderr_trunc
                ))
            }
            Err(e) => Err(format!("Build error: {}", e)),
        }
    })
    .await;

    PUBLISH_IN_PROGRESS.store(false, Ordering::SeqCst);

    let duration_ms = start.elapsed().as_millis() as u64;
    let timestamp = chrono::Utc::now().to_rfc3339();

    match result {
        Ok(Ok(msg)) => {
            tracing::info!(
                admin_id = %admin.user_id,
                duration_ms = duration_ms,
                "Website published successfully"
            );
            Ok(HttpResponse::Ok().json(json!({
                "data": {
                    "success": true,
                    "message": msg,
                    "duration_ms": duration_ms,
                    "timestamp": timestamp,
                },
                "error": null
            })))
        }
        Ok(Err(msg)) => {
            tracing::error!(
                admin_id = %admin.user_id,
                error = %msg,
                "Website publish failed"
            );
            Ok(HttpResponse::InternalServerError().json(json!({
                "data": {
                    "success": false,
                    "message": msg,
                    "duration_ms": duration_ms,
                    "timestamp": timestamp,
                },
                "error": null
            })))
        }
        Err(e) => {
            tracing::error!(
                admin_id = %admin.user_id,
                error = %e,
                "Website publish task panicked"
            );
            Ok(HttpResponse::InternalServerError().json(json!({
                "data": {
                    "success": false,
                    "message": format!("Task error: {}", e),
                    "duration_ms": duration_ms,
                    "timestamp": timestamp,
                },
                "error": null
            })))
        }
    }
}
