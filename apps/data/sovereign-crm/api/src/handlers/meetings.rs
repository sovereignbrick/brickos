//! Meeting intelligence handlers -- transcription, summarization, action items.

use std::sync::Arc;

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use brickos_ai::manager::AiProviderManager;
use brickos_ai::provider::{InferenceConfig, Message};

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct MeetingResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub title: String,
    pub project_id: Option<Uuid>,
    pub summary: Option<String>,
    pub transcript: Option<String>,
    pub status: String,
    pub duration_secs: Option<i32>,
    pub attendee_count: i64,
    pub action_item_count: i64,
    pub recorded_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MeetingDetailResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub title: String,
    pub project_id: Option<Uuid>,
    pub summary: Option<String>,
    pub transcript: Option<String>,
    pub status: String,
    pub duration_secs: Option<i32>,
    pub attendee_count: i64,
    pub action_item_count: i64,
    pub recorded_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub attendees: Vec<AttendeeInfo>,
    pub action_items: Vec<ActionItemResponse>,
}

#[derive(Debug, Serialize)]
pub struct AttendeeInfo {
    pub contact_id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct ActionItemResponse {
    pub id: Uuid,
    pub description: String,
    pub assignee_name: Option<String>,
    pub assignee_contact_id: Option<Uuid>,
    pub due_date: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMeetingRequest {
    pub title: String,
    #[serde(default)]
    pub project_id: Option<Uuid>,
    #[serde(default)]
    pub recorded_at: Option<String>,
    #[serde(default)]
    pub attendee_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMeetingRequest {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListMeetingsQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct TranscribeRequest {
    pub transcript_text: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateActionItemRequest {
    pub description: String,
    #[serde(default)]
    pub assignee_contact_id: Option<Uuid>,
    #[serde(default)]
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct AiMeetingSummary {
    #[serde(default)]
    summary: String,
    #[serde(default)]
    action_items: Vec<AiActionItem>,
    #[serde(default)]
    key_topics: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct AiActionItem {
    #[serde(default)]
    description: String,
    #[serde(default)]
    assignee: Option<String>,
    #[serde(default)]
    due_date: Option<String>,
}

// ---------------------------------------------------------------------------
// POST /api/v1/meetings
// ---------------------------------------------------------------------------

pub async fn create_meeting(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<CreateMeetingRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    if body.title.trim().is_empty() {
        return Err(AppError::Validation("title is required".into()));
    }

    let recorded_at: Option<DateTime<Utc>> = match &body.recorded_at {
        Some(s) => Some(
            s.parse::<DateTime<Utc>>()
                .map_err(|_| AppError::Validation("invalid recorded_at datetime".into()))?,
        ),
        None => None,
    };

    let row = sqlx::query(
        "INSERT INTO crm_meetings (org_id, title, project_id, recorded_at) \
         VALUES ($1, $2, $3, $4) \
         RETURNING id, org_id, title, project_id, summary, transcript, \
                   status, duration_secs, recorded_at, created_at",
    )
    .bind(org_id)
    .bind(body.title.trim())
    .bind(body.project_id)
    .bind(recorded_at)
    .fetch_one(pool.get_ref())
    .await?;

    let meeting_id: Uuid = row.get("id");

    // Insert attendees if provided
    if let Some(ref attendee_ids) = body.attendee_ids {
        for contact_id in attendee_ids {
            sqlx::query(
                "INSERT INTO crm_meeting_attendees (meeting_id, contact_id) \
                 VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(meeting_id)
            .bind(contact_id)
            .execute(pool.get_ref())
            .await?;
        }
    }

    let meeting = row_to_meeting_response(&row, &encryptor, 0, 0);
    Ok(HttpResponse::Created().json(ApiResponse::ok(meeting)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/meetings
// ---------------------------------------------------------------------------

pub async fn list_meetings(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<ListMeetingsQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let (sql, has_project) = if query.project_id.is_some() {
        (
            "SELECT m.id, m.org_id, m.title, m.project_id, m.summary, m.transcript, \
             m.status, m.duration_secs, m.recorded_at, m.created_at, \
             (SELECT COUNT(*) FROM crm_meeting_attendees ma WHERE ma.meeting_id = m.id) AS attendee_count, \
             (SELECT COUNT(*) FROM crm_action_items ai WHERE ai.meeting_id = m.id) AS action_item_count \
             FROM crm_meetings m WHERE m.org_id = $1 AND m.project_id = $4 \
             ORDER BY m.created_at DESC LIMIT $2 OFFSET $3",
            true,
        )
    } else {
        (
            "SELECT m.id, m.org_id, m.title, m.project_id, m.summary, m.transcript, \
             m.status, m.duration_secs, m.recorded_at, m.created_at, \
             (SELECT COUNT(*) FROM crm_meeting_attendees ma WHERE ma.meeting_id = m.id) AS attendee_count, \
             (SELECT COUNT(*) FROM crm_action_items ai WHERE ai.meeting_id = m.id) AS action_item_count \
             FROM crm_meetings m WHERE m.org_id = $1 \
             ORDER BY m.created_at DESC LIMIT $2 OFFSET $3",
            false,
        )
    };

    let mut qb = sqlx::query(sql)
        .bind(org_id)
        .bind(per_page as i64)
        .bind(offset as i64);

    if has_project {
        qb = qb.bind(query.project_id.unwrap());
    }

    let rows = qb.fetch_all(pool.get_ref()).await?;

    let meetings: Vec<MeetingResponse> = rows
        .iter()
        .map(|row| {
            let attendee_count: i64 = row.get("attendee_count");
            let action_item_count: i64 = row.get("action_item_count");
            row_to_meeting_response(row, &encryptor, attendee_count, action_item_count)
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(meetings)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/meetings/{id}
// ---------------------------------------------------------------------------

pub async fn get_meeting(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    let row = sqlx::query(
        "SELECT m.id, m.org_id, m.title, m.project_id, m.summary, m.transcript, \
         m.status, m.duration_secs, m.recorded_at, m.created_at, \
         (SELECT COUNT(*) FROM crm_meeting_attendees ma WHERE ma.meeting_id = m.id) AS attendee_count, \
         (SELECT COUNT(*) FROM crm_action_items ai WHERE ai.meeting_id = m.id) AS action_item_count \
         FROM crm_meetings m WHERE m.id = $1 AND m.org_id = $2",
    )
    .bind(meeting_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    // Fetch attendees
    let attendee_rows = sqlx::query(
        "SELECT c.id AS contact_id, c.name \
         FROM crm_meeting_attendees ma \
         JOIN crm_contacts c ON c.id = ma.contact_id \
         WHERE ma.meeting_id = $1",
    )
    .bind(meeting_id)
    .fetch_all(pool.get_ref())
    .await?;

    let attendees: Vec<AttendeeInfo> = attendee_rows
        .iter()
        .map(|r| AttendeeInfo {
            contact_id: r.get("contact_id"),
            name: r.get("name"),
        })
        .collect();

    // Fetch action items
    let action_rows = sqlx::query(
        "SELECT ai.id, ai.description, ai.assignee_contact_id, ai.due_date, ai.completed_at, \
         c.name AS assignee_name \
         FROM crm_action_items ai \
         LEFT JOIN crm_contacts c ON c.id = ai.assignee_contact_id \
         WHERE ai.meeting_id = $1 \
         ORDER BY ai.created_at",
    )
    .bind(meeting_id)
    .fetch_all(pool.get_ref())
    .await?;

    let action_items: Vec<ActionItemResponse> =
        action_rows.iter().map(row_to_action_item).collect();

    let summary_enc: Option<String> = row.get("summary");
    let transcript_enc: Option<String> = row.get("transcript");
    let attendee_count: i64 = row.get("attendee_count");
    let action_item_count: i64 = row.get("action_item_count");

    let detail = MeetingDetailResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        title: row.get("title"),
        project_id: row.get("project_id"),
        summary: encryptor.decrypt_opt(summary_enc),
        transcript: encryptor.decrypt_opt(transcript_enc),
        status: row.get("status"),
        duration_secs: row.get("duration_secs"),
        attendee_count,
        action_item_count,
        recorded_at: row.get("recorded_at"),
        created_at: row.get("created_at"),
        attendees,
        action_items,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(detail)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/meetings/{id}
// ---------------------------------------------------------------------------

pub async fn update_meeting(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateMeetingRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    // Verify meeting exists and belongs to org
    let existing = sqlx::query("SELECT id FROM crm_meetings WHERE id = $1 AND org_id = $2")
        .bind(meeting_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;
    let _ = existing;

    let title_update = body.title.as_deref();
    let summary_enc = encryptor.encrypt_opt(body.summary.as_deref());
    let notes_enc = encryptor.encrypt_opt(body.notes.as_deref());

    sqlx::query(
        "UPDATE crm_meetings SET \
         title = COALESCE($1, title), \
         summary = COALESCE($2, summary), \
         transcript = COALESCE($3, transcript), \
         updated_at = now() \
         WHERE id = $4 AND org_id = $5",
    )
    .bind(title_update)
    .bind(&summary_enc)
    .bind(&notes_enc)
    .bind(meeting_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    // Re-fetch
    let row = sqlx::query(
        "SELECT m.id, m.org_id, m.title, m.project_id, m.summary, m.transcript, \
         m.status, m.duration_secs, m.recorded_at, m.created_at, \
         (SELECT COUNT(*) FROM crm_meeting_attendees ma WHERE ma.meeting_id = m.id) AS attendee_count, \
         (SELECT COUNT(*) FROM crm_action_items ai WHERE ai.meeting_id = m.id) AS action_item_count \
         FROM crm_meetings m WHERE m.id = $1 AND m.org_id = $2",
    )
    .bind(meeting_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let attendee_count: i64 = row.get("attendee_count");
    let action_item_count: i64 = row.get("action_item_count");
    let meeting = row_to_meeting_response(&row, &encryptor, attendee_count, action_item_count);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(meeting)))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/meetings/{id}
// ---------------------------------------------------------------------------

pub async fn delete_meeting(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    let result = sqlx::query("DELETE FROM crm_meetings WHERE id = $1 AND org_id = $2")
        .bind(meeting_id)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(serde_json::json!({"deleted": true}))))
}

// ---------------------------------------------------------------------------
// POST /api/v1/meetings/{id}/transcribe
// ---------------------------------------------------------------------------

pub async fn transcribe(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    body: web::Json<TranscribeRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    // Verify meeting exists
    sqlx::query("SELECT id FROM crm_meetings WHERE id = $1 AND org_id = $2")
        .bind(meeting_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    if body.transcript_text.trim().is_empty() {
        return Err(AppError::Validation("transcript_text is required".into()));
    }

    // Use AI to generate a summary from the transcript text
    let ai_manager = AiProviderManager::from_env();
    let config = InferenceConfig {
        temperature: 0.2,
        max_tokens: 4096,
    };

    let messages = vec![Message {
        role: "user".to_string(),
        content: format!(
            "Summarize this meeting transcript in 2-3 paragraphs:\n\n{}",
            body.transcript_text
        ),
    }];

    let summary_text = match ai_manager
        .chat(
            "You are a meeting summarization assistant. Provide concise, actionable summaries.",
            messages,
            &config,
        )
        .await
    {
        Ok(response) => response.content,
        Err(e) => {
            tracing::error!("AI transcription summary failed: {:?}", e);
            // Store transcript even if summary fails
            String::new()
        }
    };

    let transcript_enc = encryptor.encrypt(&body.transcript_text);
    let summary_enc = if summary_text.is_empty() {
        None
    } else {
        Some(encryptor.encrypt(&summary_text))
    };

    sqlx::query(
        "UPDATE crm_meetings SET \
         transcript = $1, summary = COALESCE($2, summary), \
         status = 'transcribed', updated_at = now() \
         WHERE id = $3 AND org_id = $4",
    )
    .bind(&transcript_enc)
    .bind(&summary_enc)
    .bind(meeting_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    // Re-fetch
    let row = sqlx::query(
        "SELECT m.id, m.org_id, m.title, m.project_id, m.summary, m.transcript, \
         m.status, m.duration_secs, m.recorded_at, m.created_at, \
         (SELECT COUNT(*) FROM crm_meeting_attendees ma WHERE ma.meeting_id = m.id) AS attendee_count, \
         (SELECT COUNT(*) FROM crm_action_items ai WHERE ai.meeting_id = m.id) AS action_item_count \
         FROM crm_meetings m WHERE m.id = $1 AND m.org_id = $2",
    )
    .bind(meeting_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let attendee_count: i64 = row.get("attendee_count");
    let action_item_count: i64 = row.get("action_item_count");
    let meeting = row_to_meeting_response(&row, &encryptor, attendee_count, action_item_count);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(meeting)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/meetings/{id}/summarize
// ---------------------------------------------------------------------------

const SUMMARIZE_PROMPT: &str = "\
Analyze this meeting transcript and return JSON:\n\
{\"summary\": \"...\", \"action_items\": [{\"description\": \"...\", \"assignee\": \"...\", \
\"due_date\": \"YYYY-MM-DD\"}], \"key_topics\": [\"...\"]}\n\
If no action items, return an empty array. Always include a summary and key_topics.";

pub async fn summarize(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    // Fetch meeting with transcript
    let row = sqlx::query(
        "SELECT id, org_id, transcript, status \
         FROM crm_meetings WHERE id = $1 AND org_id = $2",
    )
    .bind(meeting_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let transcript_enc: Option<String> = row.get("transcript");
    let transcript = encryptor
        .decrypt_opt(transcript_enc)
        .ok_or_else(|| AppError::Validation("meeting has no transcript to summarize".into()))?;

    // Call AI
    let ai_manager = AiProviderManager::from_env();
    let config = InferenceConfig {
        temperature: 0.1,
        max_tokens: 4096,
    };

    let messages = vec![Message {
        role: "user".to_string(),
        content: format!("{SUMMARIZE_PROMPT}\n\nTranscript:\n{transcript}"),
    }];

    let ai_response = ai_manager
        .chat(
            "You are a meeting analysis assistant. Return valid JSON only.",
            messages,
            &config,
        )
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("AI summarization failed: {e}")))?;

    // Parse AI response
    let parsed = parse_ai_summary(&ai_response.content)?;

    // Update meeting summary
    let summary_enc = encryptor.encrypt(&parsed.summary);
    sqlx::query(
        "UPDATE crm_meetings SET summary = $1, status = 'summarized', updated_at = now() \
         WHERE id = $2 AND org_id = $3",
    )
    .bind(&summary_enc)
    .bind(meeting_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    // Create action items, trying to match assignees to contacts
    let mut created_actions: Vec<ActionItemResponse> = Vec::new();
    for ai_item in &parsed.action_items {
        if ai_item.description.is_empty() {
            continue;
        }

        // Try to match assignee to a contact by name
        let assignee_id: Option<Uuid> = if let Some(ref assignee_name) = ai_item.assignee {
            let contact_row = sqlx::query(
                "SELECT id FROM crm_contacts \
                 WHERE org_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1",
            )
            .bind(org_id)
            .bind(assignee_name)
            .fetch_optional(pool.get_ref())
            .await?;
            contact_row.map(|r| r.get::<Uuid, _>("id"))
        } else {
            None
        };

        let due_date: Option<NaiveDate> = ai_item
            .due_date
            .as_deref()
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

        let action_row = sqlx::query(
            "INSERT INTO crm_action_items (org_id, meeting_id, assignee_contact_id, description, due_date) \
             VALUES ($1, $2, $3, $4, $5) \
             RETURNING id, description, assignee_contact_id, due_date, completed_at",
        )
        .bind(org_id)
        .bind(meeting_id)
        .bind(assignee_id)
        .bind(&ai_item.description)
        .bind(due_date)
        .fetch_one(pool.get_ref())
        .await?;

        created_actions.push(ActionItemResponse {
            id: action_row.get("id"),
            description: action_row.get("description"),
            assignee_name: ai_item.assignee.clone(),
            assignee_contact_id: action_row.get("assignee_contact_id"),
            due_date: action_row
                .get::<Option<NaiveDate>, _>("due_date")
                .map(|d| d.format("%Y-%m-%d").to_string()),
            completed_at: action_row.get("completed_at"),
        });
    }

    #[derive(Serialize)]
    struct SummarizeResponse {
        summary: String,
        key_topics: Vec<String>,
        action_items: Vec<ActionItemResponse>,
    }

    let resp = SummarizeResponse {
        summary: parsed.summary,
        key_topics: parsed.key_topics,
        action_items: created_actions,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(resp)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/meetings/{id}/actions
// ---------------------------------------------------------------------------

pub async fn list_actions(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    // Verify meeting belongs to org
    sqlx::query("SELECT id FROM crm_meetings WHERE id = $1 AND org_id = $2")
        .bind(meeting_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let rows = sqlx::query(
        "SELECT ai.id, ai.description, ai.assignee_contact_id, ai.due_date, ai.completed_at, \
         c.name AS assignee_name \
         FROM crm_action_items ai \
         LEFT JOIN crm_contacts c ON c.id = ai.assignee_contact_id \
         WHERE ai.meeting_id = $1 \
         ORDER BY ai.created_at",
    )
    .bind(meeting_id)
    .fetch_all(pool.get_ref())
    .await?;

    let actions: Vec<ActionItemResponse> = rows.iter().map(row_to_action_item).collect();
    Ok(HttpResponse::Ok().json(ApiResponse::ok(actions)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/meetings/{id}/actions
// ---------------------------------------------------------------------------

pub async fn create_action(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<CreateActionItemRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let meeting_id = path.into_inner();

    // Verify meeting belongs to org
    sqlx::query("SELECT id FROM crm_meetings WHERE id = $1 AND org_id = $2")
        .bind(meeting_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    if body.description.trim().is_empty() {
        return Err(AppError::Validation("description is required".into()));
    }

    let due_date: Option<NaiveDate> = match &body.due_date {
        Some(s) => Some(
            NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .map_err(|_| AppError::Validation("invalid due_date format (YYYY-MM-DD)".into()))?,
        ),
        None => None,
    };

    let row = sqlx::query(
        "INSERT INTO crm_action_items (org_id, meeting_id, assignee_contact_id, description, due_date) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING id, description, assignee_contact_id, due_date, completed_at",
    )
    .bind(org_id)
    .bind(meeting_id)
    .bind(body.assignee_contact_id)
    .bind(body.description.trim())
    .bind(due_date)
    .fetch_one(pool.get_ref())
    .await?;

    // Fetch assignee name if present
    let assignee_name: Option<String> = if let Some(contact_id) = body.assignee_contact_id {
        let name_row = sqlx::query("SELECT name FROM crm_contacts WHERE id = $1")
            .bind(contact_id)
            .fetch_optional(pool.get_ref())
            .await?;
        name_row.map(|r| r.get("name"))
    } else {
        None
    };

    let action = ActionItemResponse {
        id: row.get("id"),
        description: row.get("description"),
        assignee_name,
        assignee_contact_id: row.get("assignee_contact_id"),
        due_date: row
            .get::<Option<NaiveDate>, _>("due_date")
            .map(|d| d.format("%Y-%m-%d").to_string()),
        completed_at: row.get("completed_at"),
    };

    Ok(HttpResponse::Created().json(ApiResponse::ok(action)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/actions/{id}/complete
// ---------------------------------------------------------------------------

pub async fn complete_action(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let action_id = path.into_inner();

    let result = sqlx::query(
        "UPDATE crm_action_items SET completed_at = now() \
         WHERE id = $1 AND org_id = $2 AND completed_at IS NULL",
    )
    .bind(action_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Re-fetch
    let row = sqlx::query(
        "SELECT ai.id, ai.description, ai.assignee_contact_id, ai.due_date, ai.completed_at, \
         c.name AS assignee_name \
         FROM crm_action_items ai \
         LEFT JOIN crm_contacts c ON c.id = ai.assignee_contact_id \
         WHERE ai.id = $1",
    )
    .bind(action_id)
    .fetch_one(pool.get_ref())
    .await?;

    let action = row_to_action_item(&row);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(action)))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn row_to_meeting_response(
    row: &sqlx::postgres::PgRow,
    encryptor: &Arc<brickos_crypto::Encryptor>,
    attendee_count: i64,
    action_item_count: i64,
) -> MeetingResponse {
    let summary_enc: Option<String> = row.get("summary");
    let transcript_enc: Option<String> = row.get("transcript");

    MeetingResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        title: row.get("title"),
        project_id: row.get("project_id"),
        summary: encryptor.decrypt_opt(summary_enc),
        transcript: encryptor.decrypt_opt(transcript_enc),
        status: row.get("status"),
        duration_secs: row.get("duration_secs"),
        attendee_count,
        action_item_count,
        recorded_at: row.get("recorded_at"),
        created_at: row.get("created_at"),
    }
}

fn row_to_action_item(row: &sqlx::postgres::PgRow) -> ActionItemResponse {
    ActionItemResponse {
        id: row.get("id"),
        description: row.get("description"),
        assignee_name: row.get("assignee_name"),
        assignee_contact_id: row.get("assignee_contact_id"),
        due_date: row
            .get::<Option<NaiveDate>, _>("due_date")
            .map(|d| d.format("%Y-%m-%d").to_string()),
        completed_at: row.get("completed_at"),
    }
}

fn parse_ai_summary(content: &str) -> Result<AiMeetingSummary, AppError> {
    let json_str = if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            &content[start..=end]
        } else {
            content
        }
    } else {
        content
    };

    serde_json::from_str::<AiMeetingSummary>(json_str).map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to parse AI summary response: {e}"))
    })
}
