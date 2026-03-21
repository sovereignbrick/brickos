// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use std::collections::HashMap;
use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    config::Config,
    error::AppError,
    middleware::auth::AuthenticatedUser,
    services::{
        doctor_chat::{
            call_claude_csv_extraction, call_claude_vision, call_claude_vision_multi,
            compress_image_if_needed,
        },
        marker_matcher, tier,
    },
};

const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE: usize = 30 * 1024 * 1024; // 30MB

// ---------------------------------------------------------------------------
// POST /import/upload
// ---------------------------------------------------------------------------

pub async fn upload(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    // Determine import type from query (default: lab_import)
    let import_type = "lab_import".to_string();

    // Check tier quota
    let quota_type = if import_type == "med_import" {
        "med_import"
    } else {
        "lab_import"
    };
    tier::check_chat_quota(pool.get_ref(), auth.user_id, quota_type).await?;

    // Read multipart files (up to 3)
    struct UploadedFile {
        bytes: Vec<u8>,
        name: String,
        content_type: String,
    }

    let mut files: Vec<UploadedFile> = Vec::new();
    let mut total_size: usize = 0;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|_| AppError::Validation("Multipart error".to_string()))?;
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "file" && field_name != "files" {
            continue;
        }

        if files.len() >= 3 {
            return Err(AppError::Validation(
                "Maximum 3 files per upload".to_string(),
            ));
        }

        let mut file_bytes: Vec<u8> = Vec::new();
        let mut content_type = String::new();
        let mut file_name = String::from("upload");

        if let Some(ct) = field.content_type() {
            content_type = ct.to_string();
        }
        if let Some(cd) = field.content_disposition() {
            if let Some(name) = cd.get_filename() {
                file_name = name.to_string();
            }
        }

        while let Some(chunk_result) = field.next().await {
            let chunk = chunk_result.map_err(|_| AppError::Validation("Read error".to_string()))?;
            file_bytes.extend_from_slice(&chunk);
            if file_bytes.len() > MAX_FILE_SIZE {
                return Err(AppError::Validation(format!(
                    "File '{}' is too large. Maximum size is 10MB per file.",
                    file_name
                )));
            }
        }

        if !file_bytes.is_empty() {
            total_size += file_bytes.len();
            if total_size > MAX_TOTAL_SIZE {
                return Err(AppError::Validation(
                    "Total upload size exceeds 30MB.".to_string(),
                ));
            }

            // Validate content type
            let detected_type = detect_media_type(&file_bytes, &content_type);
            let valid_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
            if !valid_types.contains(&detected_type.as_str()) {
                return Err(AppError::Validation(format!(
                    "File '{}': unsupported type. Accepted: JPEG, PNG, WebP, PDF.",
                    file_name
                )));
            }

            files.push(UploadedFile {
                bytes: file_bytes,
                name: file_name,
                content_type: detected_type,
            });
        }
    }

    if files.is_empty() {
        return Err(AppError::Validation(
            "At least one file is required".to_string(),
        ));
    }

    let file_names: Vec<&str> = files.iter().map(|f| f.name.as_str()).collect();
    let file_name = file_names.join(", ");
    let file_size: i64 = files.iter().map(|f| f.bytes.len() as i64).sum();
    let detected_type = files[0].content_type.clone();

    // Create import session
    let session_row = sqlx::query(
        r#"INSERT INTO import_sessions (user_id, file_name, file_type, file_size_bytes, import_type, status)
           VALUES ($1, $2, $3, $4, $5, 'uploaded')
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(&file_name)
    .bind(&detected_type)
    .bind(file_size)
    .bind(&import_type)
    .fetch_one(pool.get_ref())
    .await?;

    let session_id: Uuid = session_row.try_get("id").map_err(|_| AppError::Internal)?;

    // Compress images before sending to AI (Anthropic 5 MB per-image limit)
    let vision_result = if files.len() == 1 {
        let (compressed, ct) = compress_image_if_needed(&files[0].bytes, &files[0].content_type);
        let file_base64 = BASE64.encode(&compressed);
        call_claude_vision(&config.anthropic_api_key, &file_base64, &ct, &import_type).await
    } else {
        let file_data: Vec<(String, String)> = files
            .iter()
            .map(|f| {
                let (compressed, ct) = compress_image_if_needed(&f.bytes, &f.content_type);
                (BASE64.encode(&compressed), ct)
            })
            .collect();
        call_claude_vision_multi(&config.anthropic_api_key, &file_data, &import_type).await
    };

    match vision_result {
        Ok(response) => {
            // Parse JSON from response text
            let extracted = parse_extraction_response(&response.text);

            match extracted {
                Ok(markers) if !markers.is_empty() => {
                    // Log AI usage for lab scan
                    let _ = crate::services::ai_usage::log_usage(
                        pool.get_ref(),
                        Some(auth.user_id),
                        "scan_lab",
                        &response.model,
                        response.input_tokens.unwrap_or(0),
                        response.output_tokens.unwrap_or(0),
                    )
                    .await;

                    // Match markers to our catalog
                    let matched = match_extracted_markers(pool.get_ref(), &markers).await;

                    let lab_date = extract_field_str(&response.text, "lab_date");
                    let lab_provider = extract_field_str(&response.text, "lab_provider");
                    let lab_address = extract_field_str(&response.text, "lab_address");
                    let lab_postal_code = extract_field_str(&response.text, "lab_postal_code");
                    let lab_city = extract_field_str(&response.text, "lab_city");
                    let lab_country = extract_field_str(&response.text, "lab_country");

                    let markers_count = matched.len() as i32;

                    // Update session
                    sqlx::query(
                        r#"UPDATE import_sessions
                           SET status = 'extracted',
                               extracted_data = $1,
                               matched_data = $2,
                               markers_extracted = $3,
                               ai_tokens_used = $4,
                               lab_date = $5,
                               lab_provider = $6,
                               updated_at = NOW()
                           WHERE id = $7"#,
                    )
                    .bind(json!(markers))
                    .bind(json!(matched))
                    .bind(markers_count)
                    .bind(response.total_tokens)
                    .bind(
                        lab_date
                            .as_deref()
                            .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok()),
                    )
                    .bind(&lab_provider)
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;

                    // Increment quota
                    let _ =
                        tier::increment_chat_quota(pool.get_ref(), auth.user_id, quota_type).await;

                    // Count unmatched
                    let unmatched: Vec<&serde_json::Value> = matched
                        .iter()
                        .filter(|m| m.get("matched_marker").and_then(|v| v.as_str()).is_none())
                        .collect();

                    Ok(HttpResponse::Ok().json(json!({
                        "data": {
                            "session_id": session_id,
                            "file_name": file_name,
                            "extracted": matched,
                            "unmatched_count": unmatched.len(),
                            "total_count": markers_count,
                            "lab_date": lab_date,
                            "lab_provider": lab_provider,
                            "lab_address": lab_address,
                            "lab_postal_code": lab_postal_code,
                            "lab_city": lab_city,
                            "lab_country": lab_country,
                            "status": "extracted"
                        },
                        "error": null
                    })))
                }
                Ok(_) => {
                    // No markers found
                    sqlx::query(
                        "UPDATE import_sessions SET status = 'failed', error_message = 'No markers found', updated_at = NOW() WHERE id = $1",
                    )
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;

                    Err(AppError::Validation(
                        "No health markers found in this document. Make sure it is a lab report or blood test result.".to_string(),
                    ))
                }
                Err(e) => {
                    sqlx::query(
                        "UPDATE import_sessions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
                    )
                    .bind(e.to_string())
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;

                    Err(AppError::Validation(
                        "Could not read this document. Try a clearer photo or a different format."
                            .to_string(),
                    ))
                }
            }
        }
        Err(e) => {
            sqlx::query(
                "UPDATE import_sessions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(format!("{:?}", e))
            .bind(session_id)
            .execute(pool.get_ref())
            .await?;
            let _ = enc; // suppress unused
            Err(e)
        }
    }
}

// ---------------------------------------------------------------------------
// POST /import/confirm
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ConfirmRequest {
    pub session_id: Uuid,
    pub markers: Vec<ConfirmMarker>,
    pub measured_at: Option<chrono::DateTime<Utc>>,
    pub protocol_tag: Option<String>,
    pub device_id: Option<Uuid>,
    pub lab_id: Option<Uuid>,
    pub lab_name: Option<String>,
    pub lab_address: Option<String>,
    pub lab_postal_code: Option<String>,
    pub lab_city: Option<String>,
    pub lab_country: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct ConfirmMarker {
    pub marker_slug: String,
    pub value: f64,
}

pub async fn confirm(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
    body: web::Json<ConfirmRequest>,
) -> Result<HttpResponse, AppError> {
    // Verify session ownership and status
    let session = sqlx::query(
        "SELECT id, status, lab_date FROM import_sessions WHERE id = $1 AND user_id = $2",
    )
    .bind(body.session_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let status: String = session.try_get("status").unwrap_or_default();
    if status != "extracted" {
        return Err(AppError::Validation(
            "This import session has already been confirmed or failed.".to_string(),
        ));
    }

    let measured_at = body.measured_at.unwrap_or_else(|| {
        // Try to use lab_date from session
        let lab_date: Option<chrono::NaiveDate> = session.try_get("lab_date").ok().flatten();
        lab_date
            .map(|d| d.and_hms_opt(8, 0, 0).unwrap_or_default().and_utc())
            .unwrap_or_else(Utc::now)
    });

    let protocol_tag = body
        .protocol_tag
        .clone()
        .unwrap_or_else(|| "standard".to_string());

    // Resolve lab: use provided lab_id, or create from lab_name if given
    let lab_id: Option<Uuid> = if body.lab_id.is_some() {
        body.lab_id
    } else if let Some(ref lab_name) = body.lab_name {
        if !lab_name.trim().is_empty() {
            Some(
                crate::handlers::labs::find_or_create(
                    pool.get_ref(),
                    auth.user_id,
                    lab_name,
                    body.lab_address.as_deref(),
                    body.lab_postal_code.as_deref(),
                    body.lab_city.as_deref(),
                    body.lab_country.as_deref(),
                )
                .await?,
            )
        } else {
            None
        }
    } else {
        None
    };

    // Also create/find a lab device so it appears in Settings > Devices
    let device_id: Option<Uuid> = if let Some(ref lab_name) = body.lab_name {
        if !lab_name.trim().is_empty() {
            // Check if a lab device with this name already exists
            let existing = sqlx::query(
                "SELECT id FROM devices WHERE user_id = $1 AND device_name = $2 AND device_type = 'lab' AND is_deleted = false",
            )
            .bind(auth.user_id)
            .bind(lab_name.trim())
            .fetch_optional(pool.get_ref())
            .await?;

            if let Some(r) = existing {
                // Update address info on existing lab device
                sqlx::query(
                    r#"UPDATE devices SET
                           lab_address = COALESCE($1, lab_address),
                           lab_postal_code = COALESCE($2, lab_postal_code),
                           lab_city = COALESCE($3, lab_city),
                           lab_country = COALESCE($4, lab_country),
                           updated_at = NOW()
                       WHERE id = $5"#,
                )
                .bind(&body.lab_address)
                .bind(&body.lab_postal_code)
                .bind(&body.lab_city)
                .bind(&body.lab_country)
                .bind(r.try_get::<Uuid, _>("id").unwrap_or_default())
                .execute(pool.get_ref())
                .await?;
                Some(r.try_get::<Uuid, _>("id").unwrap_or_default())
            } else {
                // Create new lab device
                let row = sqlx::query(
                    r#"INSERT INTO devices (user_id, device_name, device_type, status,
                                           lab_address, lab_postal_code, lab_city, lab_country)
                       VALUES ($1, $2, 'lab', 'active', $3, $4, $5, $6)
                       RETURNING id"#,
                )
                .bind(auth.user_id)
                .bind(lab_name.trim())
                .bind(&body.lab_address)
                .bind(&body.lab_postal_code)
                .bind(&body.lab_city)
                .bind(&body.lab_country)
                .fetch_one(pool.get_ref())
                .await?;
                Some(
                    row.try_get::<Uuid, _>("id")
                        .map_err(|_| AppError::Internal)?,
                )
            }
        } else {
            body.device_id
        }
    } else {
        body.device_id
    };

    let mut created_count = 0i32;

    for cm in &body.markers {
        // Look up marker
        let marker_row =
            sqlx::query("SELECT id, unit_canonical FROM markers WHERE marker_slug = $1")
                .bind(&cm.marker_slug)
                .fetch_optional(pool.get_ref())
                .await?;

        let Some(marker_row) = marker_row else {
            continue;
        };

        let marker_id: Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;
        let unit_canonical: String = marker_row
            .try_get("unit_canonical")
            .map_err(|_| AppError::Internal)?;

        // Calculate status
        let status = crate::services::reference::calculate_status(
            pool.get_ref(),
            marker_id,
            auth.user_id,
            cm.value,
            &protocol_tag,
        )
        .await?;

        // Insert measurement
        sqlx::query(
            r#"INSERT INTO measurements (
                user_id, marker_id, timestamp, value_canonical, unit_canonical, status,
                protocol_tag, device_id, lab_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
        )
        .bind(auth.user_id)
        .bind(marker_id)
        .bind(measured_at)
        .bind(enc.encrypt_f64(cm.value))
        .bind(&unit_canonical)
        .bind(&status)
        .bind(&protocol_tag)
        .bind(device_id)
        .bind(lab_id)
        .execute(pool.get_ref())
        .await?;

        created_count += 1;
    }

    // Update lab device markers_measured — add imported marker slugs
    if let Some(dev_id) = device_id {
        let imported_slugs: Vec<&str> = body
            .markers
            .iter()
            .map(|m| m.marker_slug.as_str())
            .collect();
        sqlx::query(
            r#"UPDATE devices SET markers_measured = (
                SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(markers_measured, '{}') || $1::text[]))
            ), updated_at = NOW()
            WHERE id = $2"#,
        )
        .bind(&imported_slugs)
        .bind(dev_id)
        .execute(pool.get_ref())
        .await
        .ok();
    }

    // Update session
    sqlx::query(
        r#"UPDATE import_sessions
           SET status = 'confirmed', markers_imported = $1, confirmed_data = $2, updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(created_count)
    .bind(json!(body.markers))
    .bind(body.session_id)
    .execute(pool.get_ref())
    .await?;

    // Insert import history
    let now = Utc::now();
    sqlx::query(
        r#"INSERT INTO import_history (user_id, import_type, source_type, markers_extracted, markers_imported, lab_date, lab_provider)
           SELECT user_id, import_type, file_type, markers_extracted, $1,
                  lab_date, lab_provider
           FROM import_sessions WHERE id = $2"#,
    )
    .bind(created_count)
    .bind(body.session_id)
    .execute(pool.get_ref())
    .await?;

    let _ = now; // suppress unused

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "session_id": body.session_id,
            "measurements_created": created_count,
            "message": format!("{} markers imported", created_count)
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /import/history
// ---------------------------------------------------------------------------

pub async fn history(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT ih.id, ih.import_type, ih.source_type, ih.markers_extracted,
                  ih.markers_imported, ih.lab_date, ih.lab_provider, ih.created_at,
                  iss.file_name, iss.status
           FROM import_history ih
           LEFT JOIN import_sessions iss ON iss.id = (
               SELECT id FROM import_sessions
               WHERE user_id = ih.user_id AND created_at <= ih.created_at
               ORDER BY created_at DESC LIMIT 1
           )
           WHERE ih.user_id = $1
           ORDER BY ih.created_at DESC
           LIMIT 50"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let entries: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "import_type": r.try_get::<String, _>("import_type").unwrap_or_default(),
                "source_type": r.try_get::<String, _>("source_type").unwrap_or_default(),
                "markers_extracted": r.try_get::<i32, _>("markers_extracted").unwrap_or(0),
                "markers_imported": r.try_get::<i32, _>("markers_imported").unwrap_or(0),
                "lab_date": r.try_get::<Option<chrono::NaiveDate>, _>("lab_date").ok().flatten().map(|d| d.to_string()),
                "lab_provider": r.try_get::<Option<String>, _>("lab_provider").ok().flatten(),
                "file_name": r.try_get::<Option<String>, _>("file_name").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                    .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": entries,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /import/sessions/{id}
// ---------------------------------------------------------------------------

pub async fn get_session(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();

    let row = sqlx::query(
        r#"SELECT id, file_name, file_type, import_type, status,
                  matched_data, markers_extracted, markers_imported,
                  lab_date, lab_provider, error_message, created_at
           FROM import_sessions
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(session_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "session_id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
            "file_name": row.try_get::<String, _>("file_name").unwrap_or_default(),
            "file_type": row.try_get::<String, _>("file_type").unwrap_or_default(),
            "import_type": row.try_get::<String, _>("import_type").unwrap_or_default(),
            "status": row.try_get::<String, _>("status").unwrap_or_default(),
            "extracted": row.try_get::<Option<serde_json::Value>, _>("matched_data").ok().flatten(),
            "markers_extracted": row.try_get::<i32, _>("markers_extracted").unwrap_or(0),
            "markers_imported": row.try_get::<i32, _>("markers_imported").unwrap_or(0),
            "lab_date": row.try_get::<Option<chrono::NaiveDate>, _>("lab_date").ok().flatten().map(|d| d.to_string()),
            "lab_provider": row.try_get::<Option<String>, _>("lab_provider").ok().flatten(),
            "error_message": row.try_get::<Option<String>, _>("error_message").ok().flatten(),
            "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").unwrap_or_else(|_| Utc::now()).to_rfc3339(),
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /import/upload-medication
// ---------------------------------------------------------------------------

pub async fn upload_medication(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    auth: AuthenticatedUser,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    // Check tier quota for medication import
    tier::check_chat_quota(pool.get_ref(), auth.user_id, "med_import").await?;

    // Read multipart files (up to 3)
    struct UploadedMedFile {
        bytes: Vec<u8>,
        name: String,
        content_type: String,
    }

    let mut files: Vec<UploadedMedFile> = Vec::new();
    let mut total_size: usize = 0;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|_| AppError::Validation("Multipart error".to_string()))?;
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "file" && field_name != "files" {
            continue;
        }

        if files.len() >= 3 {
            return Err(AppError::Validation(
                "Maximum 3 files per upload".to_string(),
            ));
        }

        let mut file_bytes: Vec<u8> = Vec::new();
        let mut content_type = String::new();
        let mut file_name = String::from("upload");

        if let Some(ct) = field.content_type() {
            content_type = ct.to_string();
        }
        if let Some(cd) = field.content_disposition() {
            if let Some(name) = cd.get_filename() {
                file_name = name.to_string();
            }
        }

        while let Some(chunk_result) = field.next().await {
            let chunk = chunk_result.map_err(|_| AppError::Validation("Read error".to_string()))?;
            file_bytes.extend_from_slice(&chunk);
            if file_bytes.len() > MAX_FILE_SIZE {
                return Err(AppError::Validation(format!(
                    "File '{}' is too large. Maximum size is 10MB per file.",
                    file_name
                )));
            }
        }

        if !file_bytes.is_empty() {
            total_size += file_bytes.len();
            if total_size > MAX_TOTAL_SIZE {
                return Err(AppError::Validation(
                    "Total upload size exceeds 30MB.".to_string(),
                ));
            }

            let detected_type = detect_media_type(&file_bytes, &content_type);
            let valid_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
            if !valid_types.contains(&detected_type.as_str()) {
                return Err(AppError::Validation(format!(
                    "File '{}': unsupported type. Accepted: JPEG, PNG, WebP, PDF.",
                    file_name
                )));
            }

            files.push(UploadedMedFile {
                bytes: file_bytes,
                name: file_name,
                content_type: detected_type,
            });
        }
    }

    if files.is_empty() {
        return Err(AppError::Validation(
            "At least one file is required".to_string(),
        ));
    }

    let file_names: Vec<&str> = files.iter().map(|f| f.name.as_str()).collect();
    let file_name = file_names.join(", ");
    let file_size: i64 = files.iter().map(|f| f.bytes.len() as i64).sum();
    let detected_type = files[0].content_type.clone();

    let session_row = sqlx::query(
        r#"INSERT INTO import_sessions (user_id, file_name, file_type, file_size_bytes, import_type, status)
           VALUES ($1, $2, $3, $4, 'med_import', 'uploaded')
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(&file_name)
    .bind(&detected_type)
    .bind(file_size)
    .fetch_one(pool.get_ref())
    .await?;

    let session_id: Uuid = session_row.try_get("id").map_err(|_| AppError::Internal)?;

    // Compress images before sending to AI (Anthropic 5 MB per-image limit)
    let vision_result = if files.len() == 1 {
        let (compressed, ct) = compress_image_if_needed(&files[0].bytes, &files[0].content_type);
        let file_base64 = BASE64.encode(&compressed);
        call_claude_vision(&config.anthropic_api_key, &file_base64, &ct, "med_import").await
    } else {
        let file_data: Vec<(String, String)> = files
            .iter()
            .map(|f| {
                let (compressed, ct) = compress_image_if_needed(&f.bytes, &f.content_type);
                (BASE64.encode(&compressed), ct)
            })
            .collect();
        call_claude_vision_multi(&config.anthropic_api_key, &file_data, "med_import").await
    };

    match vision_result {
        Ok(response) => {
            // Log AI usage for medication scan
            let _ = crate::services::ai_usage::log_usage(
                pool.get_ref(),
                Some(auth.user_id),
                "track_medication",
                &response.model,
                response.input_tokens.unwrap_or(0),
                response.output_tokens.unwrap_or(0),
            )
            .await;

            let extracted = parse_medication_response(&response.text);

            sqlx::query(
                r#"UPDATE import_sessions
                   SET status = 'extracted', extracted_data = $1, markers_extracted = $2,
                       ai_tokens_used = $3, updated_at = NOW()
                   WHERE id = $4"#,
            )
            .bind(json!(extracted))
            .bind(extracted.len() as i32)
            .bind(response.total_tokens)
            .bind(session_id)
            .execute(pool.get_ref())
            .await?;

            let _ = tier::increment_chat_quota(pool.get_ref(), auth.user_id, "med_import").await;

            // Return extracted data for frontend review -- do NOT create records yet
            Ok(HttpResponse::Ok().json(json!({
                "data": {
                    "session_id": session_id,
                    "import_type": "med_import",
                    "status": "extracted",
                    "medications": extracted,
                    "total_count": extracted.len()
                },
                "error": null
            })))
        }
        Err(e) => {
            sqlx::query(
                "UPDATE import_sessions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(format!("{:?}", e))
            .bind(session_id)
            .execute(pool.get_ref())
            .await?;
            Err(e)
        }
    }
}

// ---------------------------------------------------------------------------
// POST /import/{sessionId}/confirm-medications
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ConfirmMedicationsRequest {
    pub medications: Vec<ConfirmMedicationItem>,
}

#[derive(Deserialize, Serialize)]
pub struct ConfirmMedicationIngredient {
    pub name: String,
    pub amount: Option<String>,
    pub unit: Option<String>,
    pub role: Option<String>, // "active" or "auxiliary"
    pub notes: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct ConfirmMedicationItem {
    pub name: String,
    pub brand: Option<String>,
    pub factor_type: Option<String>, // "medication" or "supplement"
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub form: Option<String>,
    pub prescriber: Option<String>,
    pub ingredients: Option<Vec<ConfirmMedicationIngredient>>,
}

pub async fn confirm_medications(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<ConfirmMedicationsRequest>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();

    // Verify session ownership and status
    let session = sqlx::query(
        "SELECT id, status FROM import_sessions WHERE id = $1 AND user_id = $2 AND import_type = 'med_import'",
    )
    .bind(session_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let status: String = session.try_get("status").unwrap_or_default();
    if status != "extracted" {
        return Err(AppError::Validation(
            "This import session has already been confirmed or failed.".to_string(),
        ));
    }

    // Tier check: count vs max_medications
    let current_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*)::int4 FROM influence_factors WHERE user_id = $1 AND is_active = true",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    crate::services::tier::check_count_limit(
        pool.get_ref(),
        auth.user_id,
        "medications",
        current_count,
    )
    .await?;

    let mut created_count = 0i32;

    for med in &body.medications {
        let name = med.name.trim();
        if name.is_empty() {
            continue;
        }

        let factor_type = med.factor_type.as_deref().unwrap_or("medication");
        let category = factor_type; // category mirrors factor_type
        let source = "ai_import";

        let row = sqlx::query(
            r#"INSERT INTO influence_factors
               (user_id, name, brand, category, factor_type, dosage, frequency, form,
                prescriber, source, ai_extracted_data)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING id"#,
        )
        .bind(auth.user_id)
        .bind(name)
        .bind(&med.brand)
        .bind(category)
        .bind(factor_type)
        .bind(&med.dosage)
        .bind(&med.frequency)
        .bind(&med.form)
        .bind(&med.prescriber)
        .bind(source)
        .bind(json!(med))
        .fetch_one(pool.get_ref())
        .await?;

        let factor_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

        // Insert ingredients
        if let Some(ref ingredients) = med.ingredients {
            for (idx, ing) in ingredients.iter().enumerate() {
                let ing_name = ing.name.trim();
                if ing_name.is_empty() {
                    continue;
                }
                // Map role to unit field is not needed; use amount and role
                let ing_role = ing.role.as_deref().unwrap_or("active");
                let ing_unit = ing.unit.as_deref();
                let ing_notes = ing.notes.as_deref();
                sqlx::query(
                    r#"INSERT INTO influence_factor_ingredients
                       (factor_id, name, amount, unit, role, sort_order, notes)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
                )
                .bind(factor_id)
                .bind(ing_name)
                .bind(&ing.amount)
                .bind(ing_unit)
                .bind(ing_role)
                .bind(idx as i32)
                .bind(ing_notes)
                .execute(pool.get_ref())
                .await?;
            }
        }

        created_count += 1;
    }

    // Update session status
    sqlx::query(
        r#"UPDATE import_sessions
           SET status = 'confirmed', markers_imported = $1, confirmed_data = $2, updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(created_count)
    .bind(json!(body.medications))
    .bind(session_id)
    .execute(pool.get_ref())
    .await?;

    // Insert import history
    sqlx::query(
        r#"INSERT INTO import_history (user_id, import_type, source_type, markers_extracted, markers_imported, lab_date, lab_provider)
           SELECT user_id, import_type, file_type, markers_extracted, $1,
                  lab_date, lab_provider
           FROM import_sessions WHERE id = $2"#,
    )
    .bind(created_count)
    .bind(session_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "session_id": session_id,
            "influence_factors_created": created_count,
            "message": format!("{} influence factors imported", created_count)
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /import/upload-measurements  (Phase 6: tabular data)
// ---------------------------------------------------------------------------

const MEASUREMENT_EXTRACTION_PROMPT: &str = r#"You are analyzing a health measurement spreadsheet exported as CSV.

Rules:
1. Identify the header row (the row with column names like "Gewicht", "Blutdruck", "Blutzucker", etc.)
2. Map each data column to a health marker using the user's marker list provided below.
3. Detect the date format used (DD.MM.YYYY, MM/DD/YYYY, D.M.YYYY, etc.)
4. Detect measurement protocols from a "Messung" or similar column (e.g. "Nüchtern" = fasting, "2h nach Essen" = postprandial, "Abendmessung" = standard)
5. Parse ALL data rows, converting European comma decimals (e.g. "72,6") to dot decimals (72.6)
6. A cell with "-", "--", or empty means NO value — set it to null, do NOT use 0
7. Values prefixed with "*" (e.g. "*8.32") are out-of-range flags — strip the "*" and use the numeric value
8. Skip rows where ALL marker columns are empty or "-"
9. For each marker column, suggest which user device it likely belongs to based on the device's markers_measured list
10. Extract any "diet" or "Ernährungs-modus" column as diet_protocol
11. Extract any "Bemerkung" or notes column as notes
12. Percentage values like "7% fat" or "19% Muscle" — extract the numeric part only (7, 19)

CRITICAL — Reject summary/average tables:
- ONLY reject if the columns are time RANGES (e.g. "7 Days", "30 Days", "6 Months", "1 Year") instead of specific dates.
- ONLY reject if the table header explicitly says "Overview", "Analysis", "Average", "Durchschnitt", or "Zusammenfassung".
- Do NOT reject tables that have specific dates (e.g. "24.6.2025") even if they have protocol labels like "Nüchtern", "2h nach Essen", "Abendmessung" — these are individual measurements with protocol context, not summaries.
- For summary tables, return: {"error": "summary_table", "columns": [], "rows": [], "protocols": {}}

CRITICAL — Year inference for DD/MM dates:
- Dates may appear as DD/MM or DD.MM without a year; look for a year label in headers, tabs, or nearby context
- If dates descend chronologically and cross a year boundary (e.g. 27/02 then 31/12), earlier months belong to the previous year
- When no year is visible, assume current year for recent months and previous year for months that would be in the future
- Always output full YYYY-MM-DD dates

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "columns": [
    { "index": 5, "source_name": "Gewicht (kg)", "marker_slug": "weight", "unit": "kg", "suggested_device": "device name or null" }
  ],
  "protocols": {
    "Nüchtern": "fasting",
    "2h nach Essen": "postprandial",
    "Abendmessung": "standard"
  },
  "rows": [
    {
      "date": "2025-06-24",
      "time": "06:00",
      "protocol": "fasting",
      "diet": "Sardinen 72h",
      "notes": "some notes or null",
      "values": { "weight": 73.0, "bp_systolic": 109 }
    }
  ]
}

IMPORTANT:
- Only include marker columns that have at least one non-empty value across all rows
- values keys must use the marker_slug, not the source column name
- null values must be omitted from the values object (do not include keys with null)
- Dates must be normalized to YYYY-MM-DD format
- Times must be normalized to HH:MM format (24h)
- If a row has a date and time but data is grouped (e.g. weight + BMI + body fat on same row), extract ALL markers from that row
"#;

const MEASUREMENT_IMAGE_PROMPT: &str = r#"This is a photo of a health measurement table or spreadsheet.
Extract ALL visible data. Read every row and column carefully.

Rules:
1. Each row must have a specific DATE (DD.MM.YY, DD.MM.YYYY, etc.) — not a time range like "7 Days" or "30 Days"
2. Map columns to health markers from the user's marker list
3. Convert European comma decimals ("68,70") to dot decimals (68.70)
4. A cell with "-", "--", or empty means NO value — omit it
5. Values with "*" prefix (e.g. "*8.32") — strip the "*", use the numeric value
6. Percentage values like "7% fat", "19% Muscle" — extract numeric part only
7. If the photo shows BMI values alongside weight, extract both as separate columns
8. Extract time if visible (e.g. "05:55" below or next to the date)

CRITICAL — Reject summary/average tables:
- ONLY reject if columns are time RANGES ("7 Days", "30 Days", "6 Months", "1 Year") instead of specific dates.
- ONLY reject if the table header explicitly says "Overview", "Analysis", "Average", "Durchschnitt", or "Zusammenfassung".
- Do NOT reject tables with specific dates even if they have protocol labels like "Nüchtern", "2h nach Essen" — these are individual measurements.
- For summary tables, return: {"error": "summary_table", "columns": [], "rows": [], "protocols": {}}

CRITICAL — Year inference for DD/MM dates:
- Many device apps show dates as DD/MM or DD.MM without the year
- Look for a year label elsewhere on screen (e.g. "2026" in a header, tab, or sidebar)
- If dates are in descending chronological order and cross a year boundary (e.g. 27/02 then 31/12), the earlier months belong to the previous year
- When no year is visible, assume current year for recent months and previous year for months that would be in the future
- Always output full YYYY-MM-DD dates

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "columns": [
    { "index": 0, "source_name": "Weight", "marker_slug": "weight", "unit": "kg", "suggested_device": "device name or null" }
  ],
  "protocols": {},
  "rows": [
    { "date": "2026-03-20", "time": "05:55", "protocol": "standard", "diet": null, "notes": null, "values": { "weight": 68.7 } }
  ]
}

IMPORTANT:
- values keys must use marker_slug from the user's marker list
- null values must be omitted from the values object
- Dates normalized to YYYY-MM-DD, times to HH:MM (24h)
"#;

pub async fn upload_measurements(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    auth: AuthenticatedUser,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    tier::check_chat_quota(pool.get_ref(), auth.user_id, "measurement_import").await?;

    struct UploadedFile {
        bytes: Vec<u8>,
        name: String,
        content_type: String,
    }

    let mut files: Vec<UploadedFile> = Vec::new();
    let mut total_size: usize = 0;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|_| AppError::Validation("Multipart error".to_string()))?;
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "file" && field_name != "files" {
            continue;
        }

        if files.len() >= 3 {
            return Err(AppError::Validation(
                "Maximum 3 files per upload".to_string(),
            ));
        }

        let mut file_bytes: Vec<u8> = Vec::new();
        let mut content_type = String::new();
        let mut file_name = String::from("upload");

        if let Some(ct) = field.content_type() {
            content_type = ct.to_string();
        }
        if let Some(cd) = field.content_disposition() {
            if let Some(name) = cd.get_filename() {
                file_name = name.to_string();
            }
        }

        while let Some(chunk_result) = field.next().await {
            let chunk = chunk_result.map_err(|_| AppError::Validation("Read error".to_string()))?;
            file_bytes.extend_from_slice(&chunk);
            if file_bytes.len() > MAX_FILE_SIZE {
                return Err(AppError::Validation(format!(
                    "File '{}' is too large. Maximum size is 10MB per file.",
                    file_name
                )));
            }
        }

        if !file_bytes.is_empty() {
            total_size += file_bytes.len();
            if total_size > MAX_TOTAL_SIZE {
                return Err(AppError::Validation(
                    "Total upload size exceeds 30MB.".to_string(),
                ));
            }
            files.push(UploadedFile {
                bytes: file_bytes,
                name: file_name,
                content_type,
            });
        }
    }

    if files.is_empty() {
        return Err(AppError::Validation(
            "At least one file is required".to_string(),
        ));
    }

    let file_names: Vec<&str> = files.iter().map(|f| f.name.as_str()).collect();
    let file_name = file_names.join(", ");
    let file_size: i64 = files.iter().map(|f| f.bytes.len() as i64).sum();

    // Determine if this is a spreadsheet or image upload
    let is_spreadsheet = files.iter().any(|f| {
        let ext = f.name.rsplit('.').next().unwrap_or("").to_lowercase();
        matches!(ext.as_str(), "ods" | "xlsx" | "xls" | "csv")
    });

    let detected_type = if is_spreadsheet {
        let ext = files[0]
            .name
            .rsplit('.')
            .next()
            .unwrap_or("")
            .to_lowercase();
        match ext.as_str() {
            "ods" => "application/vnd.oasis.opendocument.spreadsheet",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv" => "text/csv",
            _ => "application/octet-stream",
        }
        .to_string()
    } else {
        detect_media_type(&files[0].bytes, &files[0].content_type)
    };

    // Validate image types if not spreadsheet
    if !is_spreadsheet {
        for f in &files {
            let dt = detect_media_type(&f.bytes, &f.content_type);
            let valid = ["image/jpeg", "image/png", "image/webp"];
            if !valid.contains(&dt.as_str()) {
                return Err(AppError::Validation(format!(
                    "File '{}': unsupported type. Accepted: JPEG, PNG, WebP, ODS, XLSX, CSV.",
                    f.name
                )));
            }
        }
    }

    // Create import session
    let session_row = sqlx::query(
        r#"INSERT INTO import_sessions (user_id, file_name, file_type, file_size_bytes, import_type, status)
           VALUES ($1, $2, $3, $4, 'measurement_import', 'uploaded')
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(&file_name)
    .bind(&detected_type)
    .bind(file_size)
    .fetch_one(pool.get_ref())
    .await?;

    let session_id: Uuid = session_row.try_get("id").map_err(|_| AppError::Internal)?;

    // Fetch user's markers for the AI prompt context
    let marker_rows = sqlx::query(
        "SELECT marker_slug, abbreviation, unit_canonical FROM markers ORDER BY marker_slug",
    )
    .fetch_all(pool.get_ref())
    .await?;

    let alias_map = marker_matcher::aliases_by_slug();
    let markers_context: Vec<String> = marker_rows
        .iter()
        .map(|r| {
            let slug: String = r.try_get("marker_slug").unwrap_or_default();
            let abbr: Option<String> = r.try_get("abbreviation").ok().flatten();
            let unit: String = r.try_get("unit_canonical").unwrap_or_default();
            let aliases = alias_map
                .get(slug.as_str())
                .map(|v| v.join(", "))
                .unwrap_or_default();
            let mut parts = vec![slug.clone()];
            if let Some(a) = abbr {
                parts.push(format!("({})", a));
            }
            parts.push(format!("[{}]", unit));
            if !aliases.is_empty() {
                parts.push(format!("aka: {}", aliases));
            }
            format!("  {}", parts.join(" "))
        })
        .collect();

    // Fetch user's devices for device matching context
    let device_rows = sqlx::query(
        "SELECT id, device_name, device_type, markers_measured FROM devices WHERE user_id = $1 AND is_deleted = false AND status = 'active' ORDER BY device_name",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let devices_context: Vec<String> = device_rows
        .iter()
        .map(|r| {
            let name: String = r.try_get("device_name").unwrap_or_default();
            let dtype: String = r.try_get("device_type").unwrap_or_default();
            let measured: Vec<String> = r
                .try_get("markers_measured")
                .unwrap_or_else(|_| Vec::<String>::new());
            format!(
                "  {} (type: {}, markers: {})",
                name,
                dtype,
                measured.join(", ")
            )
        })
        .collect();

    let user_context = format!(
        "User's markers:\n{}\n\nUser's devices:\n{}",
        markers_context.join("\n"),
        if devices_context.is_empty() {
            "  (no devices registered)".to_string()
        } else {
            devices_context.join("\n")
        }
    );

    // Process based on file type
    let ai_response = if is_spreadsheet {
        // Convert spreadsheet to CSV if needed
        let csv_content = spreadsheet_to_csv(&files[0].bytes, &files[0].name).await?;

        let user_message = format!(
            "{}\n\nCSV content:\n{}",
            user_context,
            // Limit to first 500 lines to avoid token limits
            csv_content
                .lines()
                .take(500)
                .collect::<Vec<&str>>()
                .join("\n")
        );

        call_claude_csv_extraction(
            &config.anthropic_api_key,
            MEASUREMENT_EXTRACTION_PROMPT,
            &user_message,
        )
        .await
    } else {
        // Image upload — use vision API with measurement-specific prompt
        let system_and_context = format!(
            "{}\n\n{}\n\nReturn ONLY valid JSON with the structure specified.",
            MEASUREMENT_IMAGE_PROMPT, user_context
        );

        if files.len() == 1 {
            let (compressed, ct) =
                compress_image_if_needed(&files[0].bytes, &files[0].content_type);
            let file_base64 = BASE64.encode(&compressed);
            // Use vision with custom prompt via raw API call
            call_claude_vision_for_measurements(
                &config.anthropic_api_key,
                &file_base64,
                &ct,
                &system_and_context,
            )
            .await
        } else {
            let file_data: Vec<(String, String)> = files
                .iter()
                .map(|f| {
                    let (compressed, ct) = compress_image_if_needed(&f.bytes, &f.content_type);
                    (BASE64.encode(&compressed), ct)
                })
                .collect();
            call_claude_vision_multi_for_measurements(
                &config.anthropic_api_key,
                &file_data,
                &system_and_context,
            )
            .await
        }
    };

    match ai_response {
        Ok(response) => {
            let _ = crate::services::ai_usage::log_usage(
                pool.get_ref(),
                Some(auth.user_id),
                "measurement_import",
                &response.model,
                response.input_tokens.unwrap_or(0),
                response.output_tokens.unwrap_or(0),
            )
            .await;

            // Parse the structured extraction response
            let parsed = parse_measurement_extraction(&response.text);

            match parsed {
                Ok(extraction) => {
                    let row_count = extraction
                        .get("rows")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    let col_count = extraction
                        .get("columns")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);

                    if row_count == 0 || col_count == 0 {
                        sqlx::query(
                            "UPDATE import_sessions SET status = 'failed', error_message = 'No measurement data found', updated_at = NOW() WHERE id = $1",
                        )
                        .bind(session_id)
                        .execute(pool.get_ref())
                        .await?;
                        return Err(AppError::Validation(
                            "No measurement data found in this file. Make sure it contains dates and numeric health values.".to_string(),
                        ));
                    }

                    // Enrich columns with marker matching and device IDs
                    let enriched_columns = enrich_columns_with_db(
                        pool.get_ref(),
                        auth.user_id,
                        extraction
                            .get("columns")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default(),
                        &device_rows,
                    )
                    .await;

                    let mut enriched = extraction.clone();
                    enriched["columns"] = json!(enriched_columns);

                    sqlx::query(
                        r#"UPDATE import_sessions
                           SET status = 'extracted',
                               extracted_data = $1,
                               matched_data = $2,
                               markers_extracted = $3,
                               ai_tokens_used = $4,
                               updated_at = NOW()
                           WHERE id = $5"#,
                    )
                    .bind(json!(extraction))
                    .bind(json!(enriched))
                    .bind(col_count as i32)
                    .bind(response.total_tokens)
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;

                    let _ = tier::increment_chat_quota(
                        pool.get_ref(),
                        auth.user_id,
                        "measurement_import",
                    )
                    .await;

                    Ok(HttpResponse::Ok().json(json!({
                        "data": {
                            "session_id": session_id,
                            "file_name": file_name,
                            "import_type": "measurement_import",
                            "status": "extracted",
                            "columns": enriched_columns,
                            "protocols": extraction.get("protocols"),
                            "rows": extraction.get("rows"),
                            "total_rows": row_count,
                            "total_markers": col_count
                        },
                        "error": null
                    })))
                }
                Err(e) if e == "summary_table" => {
                    sqlx::query(
                        "UPDATE import_sessions SET status = 'failed', error_message = 'Summary/average table detected — not importable', updated_at = NOW() WHERE id = $1",
                    )
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;
                    Err(AppError::Validation(
                        "This appears to be a summary or analysis view with averaged values, not individual measurements. Please export the raw data view with specific dates instead.".to_string(),
                    ))
                }
                Err(e) => {
                    sqlx::query(
                        "UPDATE import_sessions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
                    )
                    .bind(&e)
                    .bind(session_id)
                    .execute(pool.get_ref())
                    .await?;
                    Err(AppError::Validation(
                        "Could not parse measurement data from this file. Try a different format."
                            .to_string(),
                    ))
                }
            }
        }
        Err(e) => {
            sqlx::query(
                "UPDATE import_sessions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(format!("{:?}", e))
            .bind(session_id)
            .execute(pool.get_ref())
            .await?;
            Err(e)
        }
    }
}

// ---------------------------------------------------------------------------
// POST /import/confirm-measurements  (Phase 6: tabular data)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ConfirmMeasurementsRequest {
    pub session_id: Uuid,
    pub column_mapping: Vec<ColumnMapping>,
    pub selected_rows: Vec<usize>,
    pub skip_duplicates: Option<bool>,
    pub protocol_overrides: Option<HashMap<String, String>>,
}

#[derive(Deserialize, Serialize)]
pub struct ColumnMapping {
    pub marker_slug: String,
    pub device_id: Option<Uuid>,
    pub unit: Option<String>,
}

pub async fn confirm_measurements(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
    body: web::Json<ConfirmMeasurementsRequest>,
) -> Result<HttpResponse, AppError> {
    let session = sqlx::query(
        "SELECT id, status, extracted_data, matched_data FROM import_sessions WHERE id = $1 AND user_id = $2 AND import_type = 'measurement_import'",
    )
    .bind(body.session_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let status: String = session.try_get("status").unwrap_or_default();
    if status != "extracted" {
        return Err(AppError::Validation(
            "This import session has already been confirmed or failed.".to_string(),
        ));
    }

    let matched_data: serde_json::Value = session.try_get("matched_data").unwrap_or(json!({}));

    let rows = matched_data
        .get("rows")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let skip_dupes = body.skip_duplicates.unwrap_or(true);

    // Build slug -> column mapping lookup
    let col_map: std::collections::HashMap<String, &ColumnMapping> = body
        .column_mapping
        .iter()
        .map(|c| (c.marker_slug.clone(), c))
        .collect();

    // Build protocol remap: old_tag -> new_tag from user overrides
    let protocol_remap: HashMap<String, String> = if let Some(ref overrides) = body.protocol_overrides {
        let original_protocols = matched_data
            .get("protocols")
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_default();
        let mut remap = HashMap::new();
        for (source, original_val) in &original_protocols {
            if let (Some(old_tag), Some(new_tag)) = (original_val.as_str(), overrides.get(source)) {
                if old_tag != new_tag {
                    remap.insert(old_tag.to_string(), new_tag.clone());
                }
            }
        }
        remap
    } else {
        HashMap::new()
    };

    let mut created_ids: Vec<Uuid> = Vec::new();
    let mut skipped_dupes = 0i32;

    for row_idx in &body.selected_rows {
        let Some(row) = rows.get(*row_idx) else {
            continue;
        };

        let date_str = row.get("date").and_then(|v| v.as_str()).unwrap_or("");
        let time_str = row.get("time").and_then(|v| v.as_str()).unwrap_or("08:00");
        let raw_protocol = row
            .get("protocol")
            .and_then(|v| v.as_str())
            .unwrap_or("standard");
        let protocol_str = protocol_remap
            .get(raw_protocol)
            .map(|s| s.as_str())
            .unwrap_or(raw_protocol);

        // Parse timestamp
        let measured_at = parse_measurement_timestamp(date_str, time_str);
        let Some(measured_at) = measured_at else {
            continue;
        };

        let values = row
            .get("values")
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_default();

        // Skip rows with no values
        if values.is_empty() {
            continue;
        }

        for (slug, val) in &values {
            let Some(col_cfg) = col_map.get(slug) else {
                continue;
            };

            let Some(value) = val.as_f64() else {
                continue;
            };

            // Look up marker
            let marker_row =
                sqlx::query("SELECT id, unit_canonical FROM markers WHERE marker_slug = $1")
                    .bind(&col_cfg.marker_slug)
                    .fetch_optional(pool.get_ref())
                    .await?;

            let Some(marker_row) = marker_row else {
                continue;
            };

            let marker_id: Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;
            let unit_canonical: String = marker_row
                .try_get("unit_canonical")
                .map_err(|_| AppError::Internal)?;

            // Duplicate check
            if skip_dupes {
                let existing = sqlx::query(
                    "SELECT id FROM measurements WHERE user_id = $1 AND marker_id = $2 AND timestamp = $3 LIMIT 1",
                )
                .bind(auth.user_id)
                .bind(marker_id)
                .bind(measured_at)
                .fetch_optional(pool.get_ref())
                .await?;

                if existing.is_some() {
                    skipped_dupes += 1;
                    continue;
                }
            }

            let status = crate::services::reference::calculate_status(
                pool.get_ref(),
                marker_id,
                auth.user_id,
                value,
                protocol_str,
            )
            .await?;

            let row_result = sqlx::query(
                r#"INSERT INTO measurements (
                    user_id, marker_id, timestamp, value_canonical, unit_canonical, status,
                    protocol_tag, device_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id"#,
            )
            .bind(auth.user_id)
            .bind(marker_id)
            .bind(measured_at)
            .bind(enc.encrypt_f64(value))
            .bind(&unit_canonical)
            .bind(&status)
            .bind(protocol_str)
            .bind(col_cfg.device_id)
            .fetch_one(pool.get_ref())
            .await?;

            let measurement_id: Uuid = row_result.try_get("id").map_err(|_| AppError::Internal)?;
            created_ids.push(measurement_id);
        }

        // Update device markers_measured for each device used
        for col_cfg in body.column_mapping.iter() {
            if let Some(dev_id) = col_cfg.device_id {
                let slugs = vec![col_cfg.marker_slug.as_str()];
                sqlx::query(
                    r#"UPDATE devices SET markers_measured = (
                        SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(markers_measured, '{}') || $1::text[]))
                    ), updated_at = NOW()
                    WHERE id = $2"#,
                )
                .bind(&slugs)
                .bind(dev_id)
                .execute(pool.get_ref())
                .await
                .ok();
            }
        }
    }

    let created_count = created_ids.len() as i32;

    // Store measurement IDs for rollback + update session
    sqlx::query(
        r#"UPDATE import_sessions
           SET status = 'confirmed', markers_imported = $1, measurement_ids = $2,
               confirmed_data = $3, updated_at = NOW()
           WHERE id = $4"#,
    )
    .bind(created_count)
    .bind(&created_ids)
    .bind(json!(body.column_mapping))
    .bind(body.session_id)
    .execute(pool.get_ref())
    .await?;

    // Insert import history
    sqlx::query(
        r#"INSERT INTO import_history (user_id, import_type, source_type, markers_extracted, markers_imported, lab_date, lab_provider)
           SELECT user_id, import_type, file_type, markers_extracted, $1, NULL, NULL
           FROM import_sessions WHERE id = $2"#,
    )
    .bind(created_count)
    .bind(body.session_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "session_id": body.session_id,
            "measurements_created": created_count,
            "duplicates_skipped": skipped_dupes,
            "message": format!("{} measurements imported", created_count)
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// DELETE /import/sessions/{id}/rollback  (Phase 6: undo an import)
// ---------------------------------------------------------------------------

pub async fn rollback_import(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();

    let session = sqlx::query(
        "SELECT id, status, measurement_ids, markers_imported FROM import_sessions WHERE id = $1 AND user_id = $2",
    )
    .bind(session_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let status: String = session.try_get("status").unwrap_or_default();
    if status != "confirmed" {
        return Err(AppError::Validation(
            "Only confirmed imports can be rolled back.".to_string(),
        ));
    }

    let measurement_ids: Vec<Uuid> = session
        .try_get("measurement_ids")
        .unwrap_or_else(|_| Vec::new());

    if measurement_ids.is_empty() {
        return Err(AppError::Validation(
            "No measurements to roll back.".to_string(),
        ));
    }

    // Delete all measurements from this import
    let deleted = sqlx::query("DELETE FROM measurements WHERE id = ANY($1) AND user_id = $2")
        .bind(&measurement_ids)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    let deleted_count = deleted.rows_affected() as i32;

    // Update session status
    sqlx::query(
        r#"UPDATE import_sessions
           SET status = 'rolled_back', updated_at = NOW()
           WHERE id = $1"#,
    )
    .bind(session_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "session_id": session_id,
            "measurements_deleted": deleted_count,
            "message": format!("{} measurements rolled back", deleted_count)
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn detect_media_type(bytes: &[u8], hint: &str) -> String {
    // Check magic bytes
    if bytes.len() >= 4 {
        if bytes[0..2] == [0xFF, 0xD8] {
            return "image/jpeg".to_string();
        }
        if bytes[0..4] == [0x89, 0x50, 0x4E, 0x47] {
            return "image/png".to_string();
        }
        if bytes[0..4] == [0x25, 0x50, 0x44, 0x46] {
            return "application/pdf".to_string();
        }
        if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
            return "image/webp".to_string();
        }
    }
    // Fall back to content-type hint
    hint.to_string()
}

fn parse_extraction_response(text: &str) -> Result<Vec<serde_json::Value>, String> {
    // Try to extract JSON array from the response
    // The AI might wrap it in markdown code fences
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // Try parsing the whole thing as a JSON array
    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(cleaned) {
        return Ok(arr);
    }

    // Try finding a JSON array within the text
    if let Some(start) = cleaned.find('[') {
        if let Some(end) = cleaned.rfind(']') {
            let slice = &cleaned[start..=end];
            if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(slice) {
                return Ok(arr);
            }
        }
    }

    // Try as a JSON object with a markers array
    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(cleaned) {
        if let Some(markers) = obj.get("markers").and_then(|v| v.as_array()) {
            return Ok(markers.clone());
        }
    }

    Err("Could not parse extraction result".to_string())
}

fn parse_medication_response(text: &str) -> Vec<serde_json::Value> {
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(cleaned) {
        return arr;
    }

    if let Some(start) = cleaned.find('[') {
        if let Some(end) = cleaned.rfind(']') {
            let slice = &cleaned[start..=end];
            if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(slice) {
                return arr;
            }
        }
    }

    Vec::new()
}

fn extract_field_str(text: &str, field: &str) -> Option<String> {
    // Try to find field in the JSON response
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(cleaned) {
        if let Some(val) = obj.get(field).and_then(|v| v.as_str()) {
            return Some(val.to_string());
        }
    }
    None
}

async fn match_extracted_markers(
    pool: &PgPool,
    markers: &[serde_json::Value],
) -> Vec<serde_json::Value> {
    use sqlx::Row;
    let mut matched = Vec::new();

    for m in markers {
        let ai_name = m.get("marker_name").and_then(|v| v.as_str()).unwrap_or("");
        let value = m.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let unit = m.get("unit").and_then(|v| v.as_str()).unwrap_or("");
        let ref_range = m
            .get("reference_range")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let flag = m.get("flag").and_then(|v| v.as_str()).unwrap_or("normal");
        let confidence = m.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.5);

        let slug = marker_matcher::match_marker(ai_name);

        if let Some(slug) = slug {
            // Look up canonical unit + abbreviation from DB
            let marker_row = sqlx::query(
                "SELECT unit_canonical, abbreviation FROM markers WHERE marker_slug = $1",
            )
            .bind(slug)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

            let canonical_unit_str = marker_row
                .as_ref()
                .and_then(|r| r.try_get::<String, _>("unit_canonical").ok())
                .unwrap_or_default();
            let abbreviation: Option<String> = marker_row
                .as_ref()
                .and_then(|r| r.try_get::<Option<String>, _>("abbreviation").ok())
                .flatten();

            // Try unit conversion
            let (converted_value, converted_unit) = marker_matcher::convert_unit(slug, value, unit)
                .map(|(v, u)| (v, u.to_string()))
                .unwrap_or((value, canonical_unit_str.clone()));

            let match_confidence = if confidence > 0.9 {
                "high"
            } else if confidence > 0.7 {
                "medium"
            } else {
                "low"
            };

            matched.push(json!({
                "original_name": ai_name,
                "matched_marker": slug,
                "abbreviation": abbreviation,
                "match_confidence": match_confidence,
                "value_original": value,
                "unit_original": unit,
                "value_converted": (converted_value * 100.0).round() / 100.0,
                "unit_converted": converted_unit,
                "reference_range": ref_range,
                "flag": flag,
                "extraction_confidence": confidence,
            }));
        } else {
            matched.push(json!({
                "original_name": ai_name,
                "matched_marker": null,
                "match_confidence": "unmatched",
                "value_original": value,
                "unit_original": unit,
                "value_converted": null,
                "unit_converted": null,
                "reference_range": ref_range,
                "flag": flag,
                "extraction_confidence": confidence,
            }));
        }
    }

    matched
}

// ---------------------------------------------------------------------------
// Phase 6 helpers: spreadsheet conversion, parsing, device matching
// ---------------------------------------------------------------------------

async fn spreadsheet_to_csv(bytes: &[u8], filename: &str) -> Result<String, AppError> {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();

    if ext == "csv" {
        // Already CSV — just decode as UTF-8
        return String::from_utf8(bytes.to_vec()).map_err(|_| {
            AppError::Validation("CSV file is not valid UTF-8. Try saving as UTF-8.".to_string())
        });
    }

    // Write to temp file and convert with LibreOffice
    let tmp_dir = std::env::temp_dir();
    let tmp_id = Uuid::new_v4();
    // Use clean filename (no spaces) to avoid LibreOffice output path issues
    let input_path = tmp_dir.join(format!("import_{}.{}", tmp_id, ext));
    let csv_path = tmp_dir.join(format!("import_{}.csv", tmp_id));

    tokio::fs::write(&input_path, bytes).await.map_err(|e| {
        tracing::error!("Failed to write temp spreadsheet: {:?}", e);
        AppError::Internal
    })?;

    let output = tokio::process::Command::new("libreoffice")
        .args([
            "--headless",
            "--convert-to",
            "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,0",
            "--outdir",
            tmp_dir.to_str().unwrap_or("/tmp"),
            input_path.to_str().unwrap_or(""),
        ])
        .output()
        .await
        .map_err(|e| {
            tracing::error!("LibreOffice conversion failed: {:?}", e);
            AppError::Validation(
                "Could not process the spreadsheet. Please try exporting it as CSV first."
                    .to_string(),
            )
        })?;

    // Clean up input file
    let _ = tokio::fs::remove_file(&input_path).await;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        tracing::error!("LibreOffice error: stderr={}, stdout={}", stderr, stdout);
        return Err(AppError::Validation(
            "Could not convert the spreadsheet. Please try saving it as CSV and uploading again."
                .to_string(),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    tracing::info!("LibreOffice output: {}", stdout);

    // Find the converted CSV — multi-sheet files produce UUID-SheetName.csv
    let csv_path = if csv_path.exists() {
        csv_path
    } else {
        // Multi-sheet: pick the largest CSV (data sheets are bigger than explanation sheets)
        let prefix = format!("import_{}", tmp_id);
        let mut best: Option<(std::path::PathBuf, u64)> = None;
        if let Ok(mut entries) = tokio::fs::read_dir(&tmp_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(&prefix) && name.ends_with(".csv") {
                    let size = entry.metadata().await.map(|m| m.len()).unwrap_or(0);
                    if best.is_none() || size > best.as_ref().unwrap().1 {
                        best = Some((entry.path(), size));
                    }
                }
            }
        }
        // Clean up all other CSV files from this conversion
        if let Ok(mut entries) = tokio::fs::read_dir(&tmp_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(&prefix) && name.ends_with(".csv") {
                    if let Some((ref best_path, _)) = best {
                        if entry.path() != *best_path {
                            let _ = tokio::fs::remove_file(entry.path()).await;
                        }
                    }
                }
            }
        }
        best.map(|(p, _)| p).ok_or_else(|| {
            tracing::error!("No CSV output found for prefix {}", prefix);
            AppError::Validation(
                "Could not read the converted file. Please try saving as CSV and uploading again."
                    .to_string(),
            )
        })?
    };

    // Read the converted CSV (handle non-UTF-8 encodings like Latin-1 from LibreOffice)
    let csv_bytes = tokio::fs::read(&csv_path).await.map_err(|e| {
        tracing::error!("Failed to read converted CSV at {:?}: {:?}", csv_path, e);
        AppError::Validation(
            "Could not read the converted file. Please try saving as CSV and uploading again."
                .to_string(),
        )
    })?;
    let csv_content = String::from_utf8(csv_bytes.clone()).unwrap_or_else(|_| {
        tracing::info!("CSV not UTF-8, falling back to Latin-1 decoding");
        csv_bytes.iter().map(|&b| b as char).collect()
    });

    // Clean up all CSV files matching this import ID
    let prefix = format!("import_{}", tmp_id);
    if let Ok(mut entries) = tokio::fs::read_dir(&tmp_dir).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) && name.ends_with(".csv") {
                let _ = tokio::fs::remove_file(entry.path()).await;
            }
        }
    }

    Ok(csv_content)
}

fn parse_measurement_extraction(text: &str) -> Result<serde_json::Value, String> {
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // Try parsing as a JSON object with columns + rows
    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(cleaned) {
        // Detect summary/average tables rejected by the AI
        if obj.get("error").and_then(|v| v.as_str()) == Some("summary_table") {
            return Err("summary_table".to_string());
        }
        if obj.get("columns").is_some() && obj.get("rows").is_some() {
            return Ok(obj);
        }
    }

    // Try finding a JSON object within the text
    if let Some(start) = cleaned.find('{') {
        if let Some(end) = cleaned.rfind('}') {
            let slice = &cleaned[start..=end];
            if let Ok(obj) = serde_json::from_str::<serde_json::Value>(slice) {
                if obj.get("error").and_then(|v| v.as_str()) == Some("summary_table") {
                    return Err("summary_table".to_string());
                }
                if obj.get("columns").is_some() && obj.get("rows").is_some() {
                    return Ok(obj);
                }
            }
        }
    }

    Err("Could not parse measurement extraction result".to_string())
}

fn parse_measurement_timestamp(date_str: &str, time_str: &str) -> Option<chrono::DateTime<Utc>> {
    // Try YYYY-MM-DD (ISO, expected from AI normalization)
    let date = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .or_else(|_| chrono::NaiveDate::parse_from_str(date_str, "%d.%m.%Y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(date_str, "%d.%m.%y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(date_str, "%m/%d/%Y"))
        .ok()?;

    let time = chrono::NaiveTime::parse_from_str(time_str, "%H:%M")
        .or_else(|_| chrono::NaiveTime::parse_from_str(time_str, "%H:%M:%S"))
        .unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(8, 0, 0).unwrap());

    Some(date.and_time(time).and_utc())
}

/// Marker slugs that are calculated, not measured — skip during import
const CALCULATED_MARKER_SLUGS: &[&str] = &["bmi", "gki", "whtr"];

async fn enrich_columns_with_db(
    pool: &PgPool,
    _user_id: Uuid,
    columns: Vec<serde_json::Value>,
    device_rows: &[sqlx::postgres::PgRow],
) -> Vec<serde_json::Value> {
    let mut enriched = Vec::new();

    for col in columns {
        let marker_slug = col
            .get("marker_slug")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let source_name = col
            .get("source_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let suggested_device = col
            .get("suggested_device")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // Verify marker via matcher — prefer source_name match (more reliable for
        // foreign language columns) over AI's marker_slug when they disagree.
        let source_match = marker_matcher::match_marker(source_name);
        let resolved_slug = if let Some(sm) = source_match {
            // Source name matched — trust it (handles German column headers etc.)
            Some(sm)
        } else if !marker_slug.is_empty() {
            // Fall back to AI's suggestion
            marker_matcher::match_marker(marker_slug)
        } else {
            None
        };

        let Some(slug) = resolved_slug else {
            // Unmatched column
            enriched.push(json!({
                "index": col.get("index"),
                "source_name": source_name,
                "marker_slug": null,
                "abbreviation": null,
                "unit": col.get("unit"),
                "device_id": null,
                "device_name": null,
                "match_confidence": "unmatched"
            }));
            continue;
        };

        // Skip calculated markers — we compute these ourselves
        if CALCULATED_MARKER_SLUGS.contains(&slug) {
            enriched.push(json!({
                "index": col.get("index"),
                "source_name": source_name,
                "marker_slug": null,
                "abbreviation": null,
                "unit": col.get("unit"),
                "device_id": null,
                "device_name": null,
                "match_confidence": "calculated_skip"
            }));
            continue;
        }

        // Look up marker details from DB
        let marker_row =
            sqlx::query("SELECT unit_canonical, abbreviation FROM markers WHERE marker_slug = $1")
                .bind(slug)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten();

        let unit = marker_row
            .as_ref()
            .and_then(|r| r.try_get::<String, _>("unit_canonical").ok())
            .unwrap_or_default();
        let abbreviation: Option<String> = marker_row
            .as_ref()
            .and_then(|r| r.try_get::<Option<String>, _>("abbreviation").ok())
            .flatten();

        // Find matching device
        let mut device_id: Option<Uuid> = None;
        let mut device_name: Option<String> = None;

        for dr in device_rows {
            let d_name: String = dr.try_get("device_name").unwrap_or_default();
            let measured: Vec<String> = dr
                .try_get("markers_measured")
                .unwrap_or_else(|_| Vec::new());

            // Match by device name suggestion or by markers_measured containing this slug
            let name_match = !suggested_device.is_empty()
                && d_name
                    .to_lowercase()
                    .contains(&suggested_device.to_lowercase());
            let slug_match = measured.iter().any(|m| m == slug);

            if name_match || slug_match {
                device_id = dr.try_get::<Uuid, _>("id").ok();
                device_name = Some(d_name);
                break;
            }
        }

        enriched.push(json!({
            "index": col.get("index"),
            "source_name": source_name,
            "marker_slug": slug,
            "abbreviation": abbreviation,
            "unit": unit,
            "device_id": device_id,
            "device_name": device_name,
            "match_confidence": "high"
        }));
    }

    enriched
}

async fn call_claude_vision_for_measurements(
    api_key: &str,
    file_base64: &str,
    media_type: &str,
    system_prompt: &str,
) -> Result<crate::services::doctor_chat::ClaudeResponse, AppError> {
    let req_body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": system_prompt,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": file_base64
                    }
                },
                {
                    "type": "text",
                    "text": "Extract all measurement data from this table image. Return JSON only."
                }
            ]
        }]
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let resp = client
        .post(crate::config::Config::anthropic_api_url_static())
        .header("x-api-key", api_key)
        .header(
            "anthropic-version",
            &crate::config::Config::anthropic_api_version_static(),
        )
        .header("content-type", "application/json")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Vision measurement request failed: {:?}", e);
            AppError::UpstreamError
        })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        tracing::error!("Anthropic Vision API error {}: {}", status, body);
        return Err(AppError::UpstreamError);
    }

    let parsed: serde_json::Value = resp.json().await.map_err(|e| {
        tracing::error!("Failed to parse vision response: {:?}", e);
        AppError::UpstreamError
    })?;

    let text = parsed["content"]
        .as_array()
        .and_then(|arr| arr.iter().find(|c| c["type"] == "text"))
        .and_then(|c| c["text"].as_str())
        .unwrap_or("{}")
        .to_string();

    let input_tokens = parsed["usage"]["input_tokens"].as_i64().map(|v| v as i32);
    let output_tokens = parsed["usage"]["output_tokens"].as_i64().map(|v| v as i32);
    let total_tokens = match (input_tokens, output_tokens) {
        (Some(i), Some(o)) => Some(i + o),
        _ => None,
    };

    Ok(crate::services::doctor_chat::ClaudeResponse {
        text,
        total_tokens,
        input_tokens,
        output_tokens,
        model: "claude-sonnet-4-20250514".to_string(),
    })
}

async fn call_claude_vision_multi_for_measurements(
    api_key: &str,
    files: &[(String, String)],
    system_prompt: &str,
) -> Result<crate::services::doctor_chat::ClaudeResponse, AppError> {
    let mut content_blocks: Vec<serde_json::Value> = Vec::new();
    for (file_base64, media_type) in files {
        content_blocks.push(serde_json::json!({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": file_base64
            }
        }));
    }
    content_blocks.push(serde_json::json!({
        "type": "text",
        "text": "Extract all measurement data from these table images. Return a single combined JSON."
    }));

    let req_body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": system_prompt,
        "messages": [{
            "role": "user",
            "content": content_blocks
        }]
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let resp = client
        .post(crate::config::Config::anthropic_api_url_static())
        .header("x-api-key", api_key)
        .header(
            "anthropic-version",
            &crate::config::Config::anthropic_api_version_static(),
        )
        .header("content-type", "application/json")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Vision multi measurement request failed: {:?}", e);
            AppError::UpstreamError
        })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        tracing::error!("Anthropic Vision API error {}: {}", status, body);
        return Err(AppError::UpstreamError);
    }

    let parsed: serde_json::Value = resp.json().await.map_err(|e| {
        tracing::error!("Failed to parse vision multi response: {:?}", e);
        AppError::UpstreamError
    })?;

    let text = parsed["content"]
        .as_array()
        .and_then(|arr| arr.iter().find(|c| c["type"] == "text"))
        .and_then(|c| c["text"].as_str())
        .unwrap_or("{}")
        .to_string();

    let input_tokens = parsed["usage"]["input_tokens"].as_i64().map(|v| v as i32);
    let output_tokens = parsed["usage"]["output_tokens"].as_i64().map(|v| v as i32);
    let total_tokens = match (input_tokens, output_tokens) {
        (Some(i), Some(o)) => Some(i + o),
        _ => None,
    };

    Ok(crate::services::doctor_chat::ClaudeResponse {
        text,
        total_tokens,
        input_tokens,
        output_tokens,
        model: "claude-sonnet-4-20250514".to_string(),
    })
}
