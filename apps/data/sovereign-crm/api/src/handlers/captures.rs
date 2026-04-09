//! Capture CRUD + AI processing handlers -- camera-to-CRM pipeline.

use std::sync::Arc;
use std::time::Instant;

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use brickos_ai::manager::AiProviderManager;
use brickos_ai::provider::{InferenceConfig, Message};

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct CaptureResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub user_id: Uuid,
    pub capture_type: String,
    pub status: String,
    pub text_content: Option<String>,
    pub extracted_text: Option<String>,
    pub project_id: Option<Uuid>,
    pub processing_metadata: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub attempts: i32,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaptureRequest {
    pub capture_type: String,
    #[serde(default)]
    pub image_data: Option<String>,
    #[serde(default)]
    pub text_content: Option<String>,
    #[serde(default)]
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ListCapturesQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ExtractedData {
    #[serde(default)]
    contacts: Vec<ExtractedContact>,
    #[serde(default)]
    companies: Vec<ExtractedCompany>,
    #[serde(default)]
    subject: String,
    #[serde(default)]
    topics: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ExtractedContact {
    #[serde(default)]
    name: String,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    role: Option<String>,
    #[serde(default)]
    company: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ExtractedCompany {
    #[serde(default)]
    name: String,
    #[serde(default)]
    domain: Option<String>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(
    req: &HttpRequest,
    platform_pool: &PlatformPool,
) -> Result<(Uuid, Uuid), AppError> {
    let auth = extract_auth(req)?;
    let org_id = match auth.org_id {
        Some(id) => id,
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden)?,
    };
    Ok((auth.user_id, org_id))
}

const EXTRACTION_PROMPT: &str = "\
Extract ALL contact information from this image. This may be an email, business card, or document.\n\
Extract EVERY person mentioned: sender (From), recipients (To, CC), and anyone in signature blocks.\n\
For each person, extract: full name, email address, job title/role, company name, phone number if visible.\n\
Also extract company details from signatures, footers, or letterheads.\n\n\
Return ONLY valid JSON (no markdown, no code fences):\n\
{\"contacts\": [{\"name\": \"Full Name\", \"email\": \"email@example.com\", \"role\": \"Job Title\", \"company\": \"Company Name\"}], \
\"companies\": [{\"name\": \"Company Name\", \"domain\": \"example.com\"}], \
\"subject\": \"Brief description of the content\", \"topics\": [\"topic1\", \"topic2\"]}\n\
If no contacts found, return {\"contacts\": [], \"companies\": [], \"subject\": \"\", \"topics\": []}";

const TEXT_EXTRACTION_PROMPT: &str = "\
Extract ALL contact and company information from the following text.\n\
Extract every person mentioned with their full name, email, role/title, and company.\n\
Also extract company names and domains.\n\n\
Return ONLY valid JSON (no markdown, no code fences):\n\
{\"contacts\": [{\"name\": \"Full Name\", \"email\": \"email@example.com\", \"role\": \"Job Title\", \"company\": \"Company Name\"}], \
\"companies\": [{\"name\": \"Company Name\", \"domain\": \"example.com\"}], \
\"subject\": \"Brief description\", \"topics\": [\"topic1\"]}\n\
If no contacts found, return {\"contacts\": [], \"companies\": [], \"subject\": \"\", \"topics\": []}";

// ---------------------------------------------------------------------------
// POST /api/v1/captures
// ---------------------------------------------------------------------------

pub async fn create_capture(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<CreateCaptureRequest>,
) -> Result<HttpResponse, AppError> {
    let (user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let valid_types = ["photo", "text", "audio", "file"];
    if !valid_types.contains(&body.capture_type.as_str()) {
        return Err(AppError::Validation(
            "capture_type must be one of: photo, text, audio, file".into(),
        ));
    }

    if body.capture_type == "photo" && body.image_data.is_none() {
        return Err(AppError::Validation(
            "image_data is required for photo captures".into(),
        ));
    }
    if body.capture_type == "text" && body.text_content.is_none() {
        return Err(AppError::Validation(
            "text_content is required for text captures".into(),
        ));
    }

    let image_enc = encryptor.encrypt_opt(body.image_data.as_deref());
    let text_enc = encryptor.encrypt_opt(body.text_content.as_deref());

    let row = sqlx::query(
        "INSERT INTO crm_captures (org_id, user_id, capture_type, image_encrypted, text_content, project_id) \
         VALUES ($1, $2, $3, $4, $5, $6) \
         RETURNING id, org_id, user_id, capture_type, status, text_content, extracted_text, \
                   project_id, processing_metadata, error_message, attempts, created_at, processed_at",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(&body.capture_type)
    .bind(&image_enc)
    .bind(&text_enc)
    .bind(body.project_id)
    .fetch_one(pool.get_ref())
    .await?;

    let capture = row_to_capture(&row, &encryptor);
    Ok(HttpResponse::Created().json(ApiResponse::ok(capture)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/captures
// ---------------------------------------------------------------------------

pub async fn list_captures(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<ListCapturesQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let (sql, has_status) = if query.status.is_some() {
        (
            "SELECT id, org_id, user_id, capture_type, status, text_content, extracted_text, \
             project_id, processing_metadata, error_message, attempts, created_at, processed_at \
             FROM crm_captures WHERE org_id = $1 AND status = $4 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
                .to_string(),
            true,
        )
    } else {
        (
            "SELECT id, org_id, user_id, capture_type, status, text_content, extracted_text, \
             project_id, processing_metadata, error_message, attempts, created_at, processed_at \
             FROM crm_captures WHERE org_id = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
                .to_string(),
            false,
        )
    };

    let mut qb = sqlx::query(&sql)
        .bind(org_id)
        .bind(per_page as i64)
        .bind(offset as i64);

    if has_status {
        qb = qb.bind(query.status.as_deref().unwrap_or_default());
    }

    let rows = qb.fetch_all(pool.get_ref()).await?;

    let captures: Vec<CaptureResponse> = rows
        .iter()
        .map(|row| row_to_capture(row, &encryptor))
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(captures)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/captures/{id}
// ---------------------------------------------------------------------------

pub async fn get_capture(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let capture_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, org_id, user_id, capture_type, status, text_content, extracted_text, \
         project_id, processing_metadata, error_message, attempts, created_at, processed_at \
         FROM crm_captures WHERE id = $1 AND org_id = $2",
    )
    .bind(capture_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let capture = row_to_capture(&row, &encryptor);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(capture)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/captures/{id}/process -- trigger AI extraction
// ---------------------------------------------------------------------------

pub async fn process_capture(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let capture_id = path.into_inner();

    // Fetch capture
    let row = sqlx::query(
        "SELECT id, org_id, user_id, capture_type, status, image_encrypted, text_content, \
         project_id, attempts \
         FROM crm_captures WHERE id = $1 AND org_id = $2",
    )
    .bind(capture_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let capture_type: String = row.get("capture_type");
    let project_id: Option<Uuid> = row.get("project_id");
    let attempts: i32 = row.get("attempts");

    // Increment attempts
    sqlx::query("UPDATE crm_captures SET attempts = $1 WHERE id = $2")
        .bind(attempts + 1)
        .bind(capture_id)
        .execute(pool.get_ref())
        .await?;

    // Build AI manager from env
    let ai_manager = AiProviderManager::from_env();
    let config = InferenceConfig {
        temperature: 0.1,
        max_tokens: 4096,
    };

    let start = Instant::now();

    // Call AI based on capture type
    let ai_result = if capture_type == "photo" {
        let image_enc: Option<String> = row.get("image_encrypted");
        let image_raw = match image_enc {
            Some(enc) => encryptor.decrypt(&enc).map_err(AppError::Internal)?,
            None => {
                return Err(AppError::Validation(
                    "no image data for photo capture".into(),
                ))
            }
        };
        // Strip data URL prefix (e.g. "data:image/jpeg;base64,") if present
        let image_base64 = if let Some(pos) = image_raw.find(",base64,") {
            &image_raw[pos + 8..]
        } else if let Some(pos) = image_raw.find(";base64,") {
            &image_raw[pos + 8..]
        } else {
            &image_raw
        };
        ai_manager
            .vision(
                "You are a CRM data extraction assistant.",
                image_base64,
                EXTRACTION_PROMPT,
                &config,
            )
            .await
    } else {
        // text capture
        let text_enc: Option<String> = row.get("text_content");
        let text_content = match text_enc {
            Some(enc) => encryptor.decrypt(&enc).unwrap_or(enc),
            None => {
                return Err(AppError::Validation(
                    "no text content for text capture".into(),
                ))
            }
        };

        let messages = vec![Message {
            role: "user".to_string(),
            content: format!("{TEXT_EXTRACTION_PROMPT}\n\nText:\n{text_content}"),
        }];

        ai_manager
            .chat(
                "You are a CRM data extraction assistant.",
                messages,
                &config,
            )
            .await
    };

    let processing_ms = start.elapsed().as_millis() as i32;

    match ai_result {
        Ok(response) => {
            let extracted = parse_extraction(&response.content);

            match extracted {
                Ok(data) => {
                    // Create/update contacts and companies, create interaction
                    let persist_ctx = PersistContext {
                        pool: pool.get_ref(),
                        encryptor: &encryptor,
                        org_id,
                        user_id,
                        capture_id,
                        project_id,
                        ai_provider: &response.provider,
                        ai_model: &response.model,
                        processing_ms,
                    };
                    let result = persist_extraction(&persist_ctx, &data).await;

                    match result {
                        Ok(_) => {
                            let metadata = serde_json::json!({
                                "provider": response.provider,
                                "model": response.model,
                                "input_tokens": response.input_tokens,
                                "output_tokens": response.output_tokens,
                                "latency_ms": response.latency_ms,
                                "contacts_found": data.contacts.len(),
                                "companies_found": data.companies.len(),
                            });

                            let extracted_json = serde_json::to_string(&data).unwrap_or_default();
                            let extracted_enc = encryptor.encrypt(&extracted_json);

                            sqlx::query(
                                "UPDATE crm_captures SET status = 'extracted', \
                                 extracted_text = $1, processing_metadata = $2, \
                                 processed_at = now() WHERE id = $3",
                            )
                            .bind(&extracted_enc)
                            .bind(&metadata)
                            .bind(capture_id)
                            .execute(pool.get_ref())
                            .await?;
                        }
                        Err(e) => {
                            tracing::error!("Failed to persist extraction: {:?}", e);
                            sqlx::query(
                                "UPDATE crm_captures SET status = 'failed', \
                                 error_message = $1, processed_at = now() WHERE id = $2",
                            )
                            .bind(format!("persist error: {e}"))
                            .bind(capture_id)
                            .execute(pool.get_ref())
                            .await?;
                        }
                    }
                }
                Err(parse_err) => {
                    tracing::warn!("AI response parse failed: {}", parse_err);
                    sqlx::query(
                        "UPDATE crm_captures SET status = 'failed', \
                         error_message = $1, processed_at = now() WHERE id = $2",
                    )
                    .bind(format!("parse error: {parse_err}"))
                    .bind(capture_id)
                    .execute(pool.get_ref())
                    .await?;
                }
            }
        }
        Err(ai_err) => {
            tracing::error!("AI processing failed: {:?}", ai_err);
            sqlx::query(
                "UPDATE crm_captures SET status = 'failed', \
                 error_message = $1, processed_at = now() WHERE id = $2",
            )
            .bind(format!("AI error: {ai_err}"))
            .bind(capture_id)
            .execute(pool.get_ref())
            .await?;
        }
    }

    // Re-fetch updated capture
    let updated = sqlx::query(
        "SELECT id, org_id, user_id, capture_type, status, text_content, extracted_text, \
         project_id, processing_metadata, error_message, attempts, created_at, processed_at \
         FROM crm_captures WHERE id = $1 AND org_id = $2",
    )
    .bind(capture_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let capture = row_to_capture(&updated, &encryptor);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(capture)))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn row_to_capture(
    row: &sqlx::postgres::PgRow,
    encryptor: &Arc<brickos_crypto::Encryptor>,
) -> CaptureResponse {
    let text_enc: Option<String> = row.get("text_content");
    let extracted_enc: Option<String> = row.get("extracted_text");

    CaptureResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        user_id: row.get("user_id"),
        capture_type: row.get("capture_type"),
        status: row.get("status"),
        text_content: encryptor.decrypt_opt(text_enc),
        extracted_text: encryptor.decrypt_opt(extracted_enc),
        project_id: row.get("project_id"),
        processing_metadata: row.get("processing_metadata"),
        error_message: row.get("error_message"),
        attempts: row.get("attempts"),
        created_at: row.get("created_at"),
        processed_at: row.get("processed_at"),
    }
}

fn parse_extraction(content: &str) -> Result<ExtractedData, String> {
    // Try to find JSON in the response (AI might wrap it in markdown)
    let json_str = if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            &content[start..=end]
        } else {
            content
        }
    } else {
        content
    };

    serde_json::from_str::<ExtractedData>(json_str).map_err(|e| format!("JSON parse error: {e}"))
}

struct PersistContext<'a> {
    pool: &'a PgPool,
    encryptor: &'a Arc<brickos_crypto::Encryptor>,
    org_id: Uuid,
    user_id: Uuid,
    capture_id: Uuid,
    project_id: Option<Uuid>,
    ai_provider: &'a str,
    ai_model: &'a str,
    processing_ms: i32,
}

async fn persist_extraction(
    ctx: &PersistContext<'_>,
    data: &ExtractedData,
) -> Result<(), AppError> {
    let pool = ctx.pool;
    let encryptor = ctx.encryptor;
    let org_id = ctx.org_id;
    let mut contacts_created: i32 = 0;
    let mut companies_created: i32 = 0;

    // Upsert companies
    for company in &data.companies {
        if company.name.is_empty() {
            continue;
        }
        let existing = sqlx::query("SELECT id FROM crm_companies WHERE org_id = $1 AND name = $2")
            .bind(org_id)
            .bind(&company.name)
            .fetch_optional(pool)
            .await?;

        if existing.is_none() {
            sqlx::query("INSERT INTO crm_companies (org_id, name, domain) VALUES ($1, $2, $3) ON CONFLICT (org_id, domain) DO NOTHING")
                .bind(org_id)
                .bind(&company.name)
                .bind(company.domain.as_deref())
                .execute(pool)
                .await?;
            companies_created += 1;
        }
    }

    // Upsert contacts (dedup by email within org)
    let mut first_contact_id: Option<Uuid> = None;
    for contact in &data.contacts {
        if contact.name.is_empty() {
            continue;
        }

        let email_enc = encryptor.encrypt_opt(contact.email.as_deref());

        // Try dedup by email
        let existing_id = if let Some(ref email) = contact.email {
            let email_encrypted = encryptor.encrypt(email);
            let row = sqlx::query("SELECT id FROM crm_contacts WHERE org_id = $1 AND email = $2")
                .bind(org_id)
                .bind(&email_encrypted)
                .fetch_optional(pool)
                .await?;
            row.map(|r| r.get::<Uuid, _>("id"))
        } else {
            None
        };

        let contact_id = if let Some(id) = existing_id {
            // Update existing contact with any new info
            if contact.role.is_some() {
                sqlx::query(
                    "UPDATE crm_contacts SET role = COALESCE($1, role), \
                     last_seen = now(), updated_at = now() WHERE id = $2",
                )
                .bind(contact.role.as_deref())
                .bind(id)
                .execute(pool)
                .await?;
            }
            id
        } else {
            let row = sqlx::query(
                "INSERT INTO crm_contacts (org_id, email, name, role, lead_stage) \
                 VALUES ($1, $2, $3, $4, 'new') \
                 RETURNING id",
            )
            .bind(org_id)
            .bind(&email_enc)
            .bind(&contact.name)
            .bind(contact.role.as_deref())
            .fetch_one(pool)
            .await?;
            contacts_created += 1;
            row.get::<Uuid, _>("id")
        };

        if first_contact_id.is_none() {
            first_contact_id = Some(contact_id);
        }
    }

    // Create interaction record
    let subject_enc = encryptor.encrypt_opt(Some(data.subject.as_str()));
    let body_text = serde_json::to_string(&data.topics).unwrap_or_default();
    let body_enc = encryptor.encrypt(&body_text);

    sqlx::query(
        "INSERT INTO crm_interactions \
         (org_id, contact_id, interaction_type, subject, body, source_type, \
          source_image_ref, ai_provider, ai_model, processing_ms, project_id) \
         VALUES ($1, $2, 'capture', $3, $4, 'capture', $5, $6, $7, $8, $9)",
    )
    .bind(ctx.org_id)
    .bind(first_contact_id)
    .bind(&subject_enc)
    .bind(&body_enc)
    .bind(ctx.capture_id.to_string())
    .bind(ctx.ai_provider)
    .bind(ctx.ai_model)
    .bind(ctx.processing_ms)
    .bind(ctx.project_id)
    .execute(pool)
    .await?;

    // Log to ingestion log
    sqlx::query(
        "INSERT INTO crm_ingestion_log \
         (org_id, user_id, source_type, contacts_created, companies_created, \
          ai_provider, ai_model, processing_ms) \
         VALUES ($1, $2, 'capture', $3, $4, $5, $6, $7)",
    )
    .bind(ctx.org_id)
    .bind(ctx.user_id)
    .bind(contacts_created)
    .bind(companies_created)
    .bind(ctx.ai_provider)
    .bind(ctx.ai_model)
    .bind(ctx.processing_ms)
    .execute(pool)
    .await?;

    Ok(())
}
