// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSummary {
    pub id: Uuid,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub role: String,
    pub content: String,
    pub tokens_used: Option<i32>,
    pub created_at: DateTime<Utc>,
}

// Request/Response types
#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub question: String,
    pub conversation_id: Option<Uuid>,
    pub agent_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSummaryWithAgent {
    pub id: Uuid,
    pub title: Option<String>,
    pub agent_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub conversation_id: Uuid,
    pub message_id: Uuid,
    pub answer: String,
    pub remaining_quota: i32,
    pub monthly_limit: i32,
}

#[derive(Debug, Deserialize)]
pub struct RateRequest {
    pub message_id: Uuid,
    pub rating: String, // "helpful" | "not_helpful"
}

#[derive(Debug, Serialize)]
pub struct RateResponse {
    pub rated: bool,
}

#[derive(Debug, Serialize)]
pub struct ConversationDetail {
    pub id: Uuid,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub messages: Vec<Message>,
}

#[derive(Debug, Serialize)]
pub struct QuotaResponse {
    pub requests_used: i32,
    pub requests_limit: i32,
    pub remaining: i32,
    pub month: String,
    pub resets_at: String,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RenameConversationRequest {
    pub title: String,
}
