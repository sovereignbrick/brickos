// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

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
        doctor_chat::{call_claude_vision, call_claude_vision_multi, compress_image_if_needed},
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
        call_claude_vision(
            &config.anthropic_api_key,
            &file_base64,
            &ct,
            &import_type,
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
                Some(row.try_get::<Uuid, _>("id").map_err(|_| AppError::Internal)?)
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
        let imported_slugs: Vec<&str> = body.markers.iter().map(|m| m.marker_slug.as_str()).collect();
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
        call_claude_vision(
            &config.anthropic_api_key,
            &file_base64,
            &ct,
            "med_import",
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
               (user_id, name, category, factor_type, dosage, frequency, form,
                prescriber, source, ai_extracted_data)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id"#,
        )
        .bind(auth.user_id)
        .bind(name)
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
                "SELECT unit_canonical, abbreviation FROM markers WHERE marker_slug = $1"
            )
                .bind(slug)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten();

            let canonical_unit_str = marker_row.as_ref()
                .and_then(|r| r.try_get::<String, _>("unit_canonical").ok())
                .unwrap_or_default();
            let abbreviation: Option<String> = marker_row.as_ref()
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
