// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::{Datelike, Utc};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    config::Config,
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::doctor_chat::{
        ChatRequest, ChatResponse, ConversationDetail, ConversationSummaryWithAgent, Message,
        PaginationQuery, QuotaResponse, RateRequest, RateResponse,
    },
    services::doctor_chat::{build_health_context, call_claude, increment_quota, AnthropicMessage},
    services::tier,
};

// ── POST /doctor-chat ─────────────────────────────────────────────────────────

pub async fn chat(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    auth: AuthenticatedUser,
    body: web::Json<ChatRequest>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let question = body.question.trim().to_string();
    if question.is_empty() {
        return Err(AppError::Validation("question is required".to_string()));
    }
    if question.len() > 2000 {
        return Err(AppError::Validation(
            "question must be 2000 characters or fewer".to_string(),
        ));
    }

    // 1. Check AI credit pool (SSoT enforcement)
    let agent_type = body
        .agent_type
        .clone()
        .unwrap_or_else(|| "general".to_string());
    let _ai_credits = tier::check_ai_credits(pool.get_ref(), auth.user_id, &agent_type).await?;

    // 2. Get or create conversation
    let conversation_id = match body.conversation_id {
        Some(cid) => {
            // Verify ownership
            let exists = sqlx::query(
                "SELECT id FROM doctor_chat_conversations WHERE id = $1 AND user_id = $2 AND is_deleted = false",
            )
            .bind(cid)
            .bind(auth.user_id)
            .fetch_optional(pool.get_ref())
            .await?;
            if exists.is_none() {
                return Err(AppError::NotFound);
            }
            cid
        }
        None => {
            // Create new conversation; title = first 80 chars of question
            let agent_type = body
                .agent_type
                .clone()
                .unwrap_or_else(|| "general".to_string());
            let title: String = question.chars().take(80).collect();
            let row = sqlx::query(
                "INSERT INTO doctor_chat_conversations (user_id, title, agent_type) VALUES ($1, $2, $3) RETURNING id",
            )
            .bind(auth.user_id)
            .bind(&title)
            .bind(&agent_type)
            .fetch_one(pool.get_ref())
            .await?;
            row.try_get("id").map_err(|_| AppError::Internal)?
        }
    };

    // 3. Fetch conversation history (last 10 message pairs = 20 rows)
    let history_rows = sqlx::query(
        r#"SELECT role, content FROM doctor_chat_messages
           WHERE conversation_id = $1
           ORDER BY created_at DESC
           LIMIT 20"#,
    )
    .bind(conversation_id)
    .fetch_all(pool.get_ref())
    .await?;

    // Reverse so oldest-first for Claude. Decrypt messages stored encrypted.
    let history: Vec<AnthropicMessage> = history_rows
        .into_iter()
        .rev()
        .filter_map(|r| {
            let role: String = r.try_get("role").ok()?;
            let content_raw: String = r.try_get("content").ok()?;
            let content = enc.decrypt(&content_raw).unwrap_or(content_raw);
            // skip system messages
            if role == "system" {
                None
            } else {
                Some(AnthropicMessage { role, content })
            }
        })
        .collect();

    // 4. Build health context
    let health_context = build_health_context(pool.get_ref(), auth.user_id, enc.get_ref()).await?;

    // 5. Call Claude
    let claude_resp = match call_claude(
        &config.anthropic_api_key,
        &health_context,
        &question,
        history,
    )
    .await
    {
        Ok(resp) => resp,
        Err(e) => {
            crate::services::audit::log(
                pool.get_ref(),
                Some(auth.user_id),
                "chat.error",
                Some("doctor_chat"),
                None,
                None,
                Some(serde_json::json!({
                    "error": e.to_string(),
                    "agent_type": agent_type,
                })),
            )
            .await;
            return Err(e);
        }
    };

    // 5b. Log AI usage
    let _ = crate::services::ai_usage::log_usage(
        pool.get_ref(),
        Some(auth.user_id),
        "doctor_chat",
        &claude_resp.model,
        claude_resp.input_tokens.unwrap_or(0),
        claude_resp.output_tokens.unwrap_or(0),
    )
    .await;

    // 6. Store user message (encrypted at rest)
    let encrypted_question = enc.encrypt(&question);
    sqlx::query(
        "INSERT INTO doctor_chat_messages (conversation_id, role, content) VALUES ($1, 'user', $2)",
    )
    .bind(conversation_id)
    .bind(&encrypted_question)
    .execute(pool.get_ref())
    .await?;

    // 7. Store assistant response (encrypted at rest)
    let encrypted_response = enc.encrypt(&claude_resp.text);
    let msg_row = sqlx::query(
        r#"INSERT INTO doctor_chat_messages (conversation_id, role, content, tokens_used)
           VALUES ($1, 'assistant', $2, $3)
           RETURNING id"#,
    )
    .bind(conversation_id)
    .bind(&encrypted_response)
    .bind(claude_resp.total_tokens)
    .fetch_one(pool.get_ref())
    .await?;
    let message_id: Uuid = msg_row.try_get("id").map_err(|_| AppError::Internal)?;

    // 8. Update conversation updated_at
    sqlx::query("UPDATE doctor_chat_conversations SET updated_at = now() WHERE id = $1")
        .bind(conversation_id)
        .execute(pool.get_ref())
        .await?;

    // 9. Increment quota
    let (used, limit) = increment_quota(pool.get_ref(), auth.user_id).await?;
    let remaining = (limit - used).max(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": ChatResponse {
            conversation_id,
            message_id,
            answer: claude_resp.text,
            remaining_quota: remaining,
            monthly_limit: limit,
        },
        "error": null
    })))
}

// ── GET /doctor-chat/conversations ────────────────────────────────────────────

pub async fn list_conversations(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query(
        r#"SELECT
               c.id, c.title, c.agent_type, c.created_at, c.updated_at,
               COUNT(m.id) as message_count,
               COUNT(*) OVER() as total_count
           FROM doctor_chat_conversations c
           LEFT JOIN doctor_chat_messages m ON m.conversation_id = c.id
           WHERE c.user_id = $1 AND c.is_deleted = false
           GROUP BY c.id
           ORDER BY c.updated_at DESC
           LIMIT $2 OFFSET $3"#,
    )
    .bind(auth.user_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(pool.get_ref())
    .await?;

    let total_count: i64 = rows
        .first()
        .and_then(|r| r.try_get::<i64, _>("total_count").ok())
        .unwrap_or(0);

    let conversations: Vec<ConversationSummaryWithAgent> = rows
        .iter()
        .map(|r| ConversationSummaryWithAgent {
            id: r.try_get("id").unwrap_or_default(),
            title: r.try_get("title").ok().flatten(),
            agent_type: r.try_get("agent_type").ok().flatten(),
            created_at: r.try_get("created_at").unwrap_or_else(|_| Utc::now()),
            updated_at: r.try_get("updated_at").unwrap_or_else(|_| Utc::now()),
            message_count: r.try_get("message_count").unwrap_or(0),
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": conversations,
        "meta": { "page": page, "per_page": per_page, "total": total_count },
        "error": null
    })))
}

// ── GET /doctor-chat/conversations/:id ───────────────────────────────────────

pub async fn get_conversation(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let conversation_id = path.into_inner();

    let conv_row = sqlx::query(
        "SELECT id, title, created_at FROM doctor_chat_conversations WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(conversation_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let msg_rows = sqlx::query(
        "SELECT id, conversation_id, role, content, tokens_used, created_at
         FROM doctor_chat_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool.get_ref())
    .await?;

    let messages: Vec<Message> = msg_rows
        .iter()
        .map(|r| {
            let content_raw: String = r.try_get("content").unwrap_or_default();
            Message {
                id: r.try_get("id").unwrap_or_default(),
                conversation_id: r.try_get("conversation_id").unwrap_or_default(),
                role: r.try_get("role").unwrap_or_default(),
                content: enc.decrypt(&content_raw).unwrap_or(content_raw),
                tokens_used: r.try_get("tokens_used").ok().flatten(),
                created_at: r.try_get("created_at").unwrap_or_else(|_| Utc::now()),
            }
        })
        .collect();

    let detail = ConversationDetail {
        id: conv_row.try_get("id").unwrap_or_default(),
        title: conv_row.try_get("title").ok().flatten(),
        created_at: conv_row
            .try_get("created_at")
            .unwrap_or_else(|_| Utc::now()),
        messages,
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": detail,
        "error": null
    })))
}

// ── PUT /doctor-chat/conversations/:id ────────────────────────────────────────

pub async fn rename_conversation(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<crate::models::doctor_chat::RenameConversationRequest>,
) -> Result<HttpResponse, AppError> {
    let conversation_id = path.into_inner();
    let title = body.title.trim().to_string();
    if title.is_empty() || title.len() > 200 {
        return Err(AppError::Validation(
            "title must be between 1 and 200 characters".to_string(),
        ));
    }

    let result = sqlx::query(
        "UPDATE doctor_chat_conversations SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3",
    )
    .bind(&title)
    .bind(conversation_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

// ── DELETE /doctor-chat/conversations/:id ──────────────────────────────────────

pub async fn delete_conversation(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let conversation_id = path.into_inner();

    let result = sqlx::query(
        "UPDATE doctor_chat_conversations SET is_deleted = true, deleted_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(conversation_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "deleted": true },
        "error": null
    })))
}

// ── POST /doctor-chat/conversations/:id/rate ──────────────────────────────────

pub async fn rate_message(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<RateRequest>,
) -> Result<HttpResponse, AppError> {
    let conversation_id = path.into_inner();

    // Verify conversation ownership
    sqlx::query("SELECT id FROM doctor_chat_conversations WHERE id = $1 AND user_id = $2 AND is_deleted = false")
        .bind(conversation_id)
        .bind(auth.user_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    // Validate rating value
    if body.rating != "helpful" && body.rating != "not_helpful" {
        return Err(AppError::Validation(
            "rating must be 'helpful' or 'not_helpful'".to_string(),
        ));
    }

    // Verify message belongs to this conversation
    sqlx::query("SELECT id FROM doctor_chat_messages WHERE id = $1 AND conversation_id = $2")
        .bind(body.message_id)
        .bind(conversation_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    // Upsert rating
    sqlx::query(
        r#"INSERT INTO doctor_chat_ratings (message_id, user_id, rating)
           VALUES ($1, $2, $3)
           ON CONFLICT (message_id, user_id) DO UPDATE SET rating = $3"#,
    )
    .bind(body.message_id)
    .bind(auth.user_id)
    .bind(&body.rating)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": RateResponse { rated: true },
        "error": null
    })))
}

// ── GET /doctor-chat/quota ────────────────────────────────────────────────────

pub async fn get_quota(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    // Use AI credit pool status (SSoT, non-enforcing) for display
    let ai_status = tier::get_ai_credit_status(pool.get_ref(), auth.user_id).await?;

    let now = Utc::now();
    let month_str = format!("{}-{:02}", now.year(), now.month());

    let resp = QuotaResponse {
        requests_used: ai_status.used,
        requests_limit: ai_status.limit.unwrap_or(-1), // -1 = unlimited
        remaining: ai_status.remaining.unwrap_or(-1),  // -1 = unlimited
        month: month_str,
        resets_at: ai_status.resets_at,
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": resp,
        "error": null
    })))
}
