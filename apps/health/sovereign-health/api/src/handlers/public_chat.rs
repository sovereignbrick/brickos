// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use uuid::Uuid;

use crate::handlers::admin_settings::{get_setting_bool, get_setting_i64, get_setting_string};

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PublicChatRequest {
    pub messages: Vec<ChatMessage>,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

// ── In-memory session store ──────────────────────────────────────────────────

pub struct PublicChatSessions {
    sessions: Mutex<HashMap<String, SessionData>>,
}

struct SessionData {
    messages: Vec<ChatMessage>,
    last_active: Instant,
}

impl Default for PublicChatSessions {
    fn default() -> Self {
        Self::new()
    }
}

impl PublicChatSessions {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    fn cleanup_expired(&self, ttl_secs: u64) {
        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.retain(|_, v| v.last_active.elapsed().as_secs() < ttl_secs);
        }
    }

    fn get_messages(&self, session_id: &str) -> Vec<ChatMessage> {
        self.sessions
            .lock()
            .ok()
            .and_then(|s| s.get(session_id).map(|d| d.messages.clone()))
            .unwrap_or_default()
    }

    fn store_messages(&self, session_id: &str, messages: Vec<ChatMessage>) {
        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.insert(
                session_id.to_string(),
                SessionData {
                    messages,
                    last_active: Instant::now(),
                },
            );
        }
    }
}

// ── Rate limiter (per-IP) ────────────────────────────────────────────────────

pub struct PublicChatRateLimiter {
    messages_per_hour: Mutex<HashMap<String, Vec<Instant>>>,
    conversations_per_hour: Mutex<HashMap<String, Vec<Instant>>>,
}

impl Default for PublicChatRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl PublicChatRateLimiter {
    pub fn new() -> Self {
        Self {
            messages_per_hour: Mutex::new(HashMap::new()),
            conversations_per_hour: Mutex::new(HashMap::new()),
        }
    }

    fn check_message_rate(&self, ip: &str, max_per_hour: u32) -> Result<(), ()> {
        let mut map = self.messages_per_hour.lock().map_err(|_| ())?;
        let entries = map.entry(ip.to_string()).or_default();
        let cutoff = Instant::now() - std::time::Duration::from_secs(3600);
        entries.retain(|t| *t > cutoff);
        if entries.len() >= max_per_hour as usize {
            return Err(());
        }
        entries.push(Instant::now());
        Ok(())
    }

    fn check_conversation_rate(&self, ip: &str, max_per_hour: u32) -> Result<(), ()> {
        let mut map = self.conversations_per_hour.lock().map_err(|_| ())?;
        let entries = map.entry(ip.to_string()).or_default();
        let cutoff = Instant::now() - std::time::Duration::from_secs(3600);
        entries.retain(|t| *t > cutoff);
        if entries.len() >= max_per_hour as usize {
            return Err(());
        }
        entries.push(Instant::now());
        Ok(())
    }
}

// ── Per-IP daily message limit ───────────────────────────────────────────

pub struct DailyIpMessageTracker {
    /// Map of "YYYY-MM-DD:ip" -> count
    counts: Mutex<HashMap<String, u32>>,
}

impl Default for DailyIpMessageTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl DailyIpMessageTracker {
    pub fn new() -> Self {
        Self {
            counts: Mutex::new(HashMap::new()),
        }
    }

    fn check_and_increment(&self, ip: &str, limit: u32) -> Result<u32, u32> {
        let date = Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("{}:{}", date, ip);
        let mut map = self.counts.lock().unwrap_or_else(|e| e.into_inner());
        // Clean up old days (keys that don't start with today's date)
        map.retain(|k, _| k.starts_with(&date));
        let entry = map.entry(key).or_insert(0);
        if *entry >= limit {
            return Err(*entry);
        }
        *entry += 1;
        Ok(*entry)
    }
}

// ── Daily token tracker ──────────────────────────────────────────────────────

pub struct DailyTokenTracker {
    tokens: Mutex<HashMap<String, usize>>,
}

impl Default for DailyTokenTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl DailyTokenTracker {
    pub fn new() -> Self {
        Self {
            tokens: Mutex::new(HashMap::new()),
        }
    }

    fn add_tokens(&self, count: usize) -> usize {
        let key = Utc::now().format("%Y-%m-%d").to_string();
        let mut map = self.tokens.lock().unwrap_or_else(|e| e.into_inner());
        // Clean up old days
        map.retain(|k, _| *k == key);
        let entry = map.entry(key).or_insert(0);
        *entry += count;
        *entry
    }

    fn current_total(&self) -> usize {
        let key = Utc::now().format("%Y-%m-%d").to_string();
        self.tokens
            .lock()
            .ok()
            .and_then(|m| m.get(&key).copied())
            .unwrap_or(0)
    }
}

// ── Config ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct PublicChatConfig {
    pub anthropic_api_key_website: String,
    pub public_chat_model: String,
    pub public_chat_max_messages: usize,
    pub public_chat_max_tokens: usize,
    pub public_chat_daily_token_limit: usize,
    pub public_chat_rate_per_hour: u32,
    pub public_chat_conversations_per_hour: u32,
    pub public_chat_session_ttl_secs: u64,
    pub system_prompt: String,
}

impl PublicChatConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let anthropic_api_key_website =
            std::env::var("ANTHROPIC_API_KEY_WEBSITE").unwrap_or_default();

        let public_chat_model = std::env::var("PUBLIC_CHAT_MODEL")
            .unwrap_or_else(|_| "claude-haiku-4-5-20251001".to_string());

        let public_chat_max_messages: usize = std::env::var("PUBLIC_CHAT_MAX_MESSAGES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);

        let public_chat_max_tokens: usize = std::env::var("PUBLIC_CHAT_MAX_TOKENS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(200);

        let public_chat_daily_token_limit: usize = std::env::var("PUBLIC_CHAT_DAILY_TOKEN_LIMIT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(500_000);

        let public_chat_rate_per_hour: u32 = std::env::var("PUBLIC_CHAT_RATE_PER_HOUR")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(20);

        let public_chat_conversations_per_hour: u32 =
            std::env::var("PUBLIC_CHAT_CONVERSATIONS_PER_HOUR")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3);

        let public_chat_session_ttl_secs: u64 = std::env::var("PUBLIC_CHAT_SESSION_TTL")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1800);

        // Load system prompt from file (fail fast if missing)
        let prompt_path = std::env::var("PUBLIC_CHAT_PROMPT_PATH")
            .unwrap_or_else(|_| "src/config/dr_alex_public_prompt.txt".to_string());
        let system_prompt = std::fs::read_to_string(&prompt_path).unwrap_or_else(|e| {
            tracing::warn!(
                "Could not load public chat prompt from {}: {}. Using embedded fallback.",
                prompt_path,
                e
            );
            include_str!("../config/dr_alex_public_prompt.txt").to_string()
        });

        Ok(Self {
            anthropic_api_key_website,
            public_chat_model,
            public_chat_max_messages,
            public_chat_max_tokens,
            public_chat_daily_token_limit,
            public_chat_rate_per_hour,
            public_chat_conversations_per_hour,
            public_chat_session_ttl_secs,
            system_prompt,
        })
    }
}

// ── Anthropic API types ──────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: usize,
    system: String,
    messages: Vec<AnthropicMessage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: Option<usize>,
    output_tokens: Option<usize>,
}

// ── Helper: extract client IP ────────────────────────────────────────────────

fn client_ip(req: &HttpRequest) -> String {
    // Cloudflare sets CF-Connecting-IP with the real client IP
    if let Some(cf_ip) = req.headers().get("CF-Connecting-IP") {
        if let Ok(ip) = cf_ip.to_str() {
            return ip.trim().to_string();
        }
    }
    // Fallback: X-Forwarded-For, X-Real-IP, then peer address
    req.connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string()
}

// ── POST /v1/chat/public ─────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn chat(
    req: HttpRequest,
    body: web::Json<PublicChatRequest>,
    config: web::Data<PublicChatConfig>,
    sessions: web::Data<PublicChatSessions>,
    rate_limiter: web::Data<PublicChatRateLimiter>,
    token_tracker: web::Data<DailyTokenTracker>,
    daily_ip_tracker: web::Data<DailyIpMessageTracker>,
    pool: web::Data<sqlx::PgPool>,
) -> HttpResponse {
    let ip = client_ip(&req);

    // ── App settings overrides (DB-driven, with env/config fallbacks) ────
    // Check new keys first, fall back to legacy dr_alex_* keys for backward compat
    let web_enabled = {
        let v = get_setting_bool(pool.get_ref(), "health_coach_web_enabled", true).await;
        if v { v } else { get_setting_bool(pool.get_ref(), "dr_alex_web_enabled", true).await }
    };
    if !web_enabled {
        return HttpResponse::ServiceUnavailable().json(json!({
            "data": null,
            "error": {
                "code": "service_unavailable",
                "message": "Health Coach is currently unavailable. Please try again later."
            }
        }));
    }

    let daily_limit = get_setting_i64(pool.get_ref(), "health_coach_daily_limit", 10).await as u32;
    let session_limit = get_setting_i64(
        pool.get_ref(),
        "health_coach_session_limit",
        config.public_chat_max_messages as i64,
    )
    .await as usize;
    let model_override =
        get_setting_string(pool.get_ref(), "health_coach_model", &config.public_chat_model).await;
    let max_tokens_override = get_setting_i64(
        pool.get_ref(),
        "health_coach_max_tokens",
        config.public_chat_max_tokens as i64,
    )
    .await as usize;

    // Check daily token budget
    if token_tracker.current_total() >= config.public_chat_daily_token_limit {
        return HttpResponse::ServiceUnavailable().json(json!({
            "data": null,
            "error": {
                "code": "service_unavailable",
                "message": "Dr. Alex is taking a short break. Please try again tomorrow."
            }
        }));
    }

    // Check API key
    if config.anthropic_api_key_website.is_empty() {
        tracing::error!("ANTHROPIC_API_KEY_WEBSITE not configured");
        return HttpResponse::ServiceUnavailable().json(json!({
            "data": null,
            "error": {
                "code": "service_unavailable",
                "message": "Dr. Alex is currently unavailable. Please try again later."
            }
        }));
    }

    // Validate request
    if body.messages.is_empty() {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": {
                "code": "validation_error",
                "message": "At least one message is required."
            }
        }));
    }

    // Check last message is from user
    if let Some(last) = body.messages.last() {
        if last.role != "user" {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": {
                    "code": "validation_error",
                    "message": "Last message must be from user."
                }
            }));
        }
        if last.content.trim().is_empty() || last.content.len() > 2000 {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": {
                    "code": "validation_error",
                    "message": "Message must be between 1 and 2000 characters."
                }
            }));
        }
    }

    // Per-IP daily message limit
    if daily_ip_tracker
        .check_and_increment(&ip, daily_limit)
        .is_err()
    {
        return HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": {
                "code": "daily_limit_reached",
                "message": "Daily message limit reached. Create a free account for unlimited conversations."
            }
        }));
    }

    // Resolve session
    let session_id = body
        .session_id
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let is_new_session = body.session_id.is_none()
        || body
            .session_id
            .as_ref()
            .map(|s| s.is_empty())
            .unwrap_or(true);

    // Rate limit: new conversations
    if is_new_session
        && rate_limiter
            .check_conversation_rate(&ip, config.public_chat_conversations_per_hour)
            .is_err()
    {
        return HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": {
                "code": "rate_limited",
                "message": "Too many requests. Please try again later."
            }
        }));
    }

    // Rate limit: messages
    if rate_limiter
        .check_message_rate(&ip, config.public_chat_rate_per_hour)
        .is_err()
    {
        return HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": {
                "code": "rate_limited",
                "message": "Too many requests. Please try again later."
            }
        }));
    }

    // Clean up expired sessions periodically
    sessions.cleanup_expired(config.public_chat_session_ttl_secs);

    // Get existing session messages or start fresh
    let mut stored_messages = sessions.get_messages(&session_id);

    // Check session message limit (return 429, not a chat message)
    let total_messages = stored_messages.len() + 1; // +1 for the new user message
    if total_messages > session_limit {
        return HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": {
                "code": "session_limit_reached",
                "message": "Session message limit reached. Create a free account for unlimited conversations."
            }
        }));
    }

    // Build messages for Anthropic API
    // Use stored history + new user message from request
    let new_user_message = body.messages.last().expect("validated above");
    stored_messages.push(ChatMessage {
        role: "user".to_string(),
        content: new_user_message.content.clone(),
    });

    let api_messages: Vec<AnthropicMessage> = stored_messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .map(|m| AnthropicMessage {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    // Call Anthropic API (use DB-overridden model and max_tokens)
    let client = reqwest::Client::new();
    let req_body = AnthropicRequest {
        model: model_override,
        max_tokens: max_tokens_override,
        system: config.system_prompt.clone(),
        messages: api_messages,
    };

    let resp = match client
        .post(crate::config::Config::anthropic_api_url_static())
        .header("x-api-key", &config.anthropic_api_key_website)
        .header(
            "anthropic-version",
            &crate::config::Config::anthropic_api_version_static(),
        )
        .header("content-type", "application/json")
        .json(&req_body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Anthropic request failed: {:?}", e);
            return HttpResponse::BadGateway().json(json!({
                "data": null,
                "error": {
                    "code": "upstream_error",
                    "message": "Dr. Alex is having trouble connecting. Please try again in a moment."
                }
            }));
        }
    };

    let status = resp.status();
    if !status.is_success() {
        let body_text = resp.text().await.unwrap_or_default();
        tracing::error!("Anthropic API error {}: {}", status, body_text);
        return HttpResponse::BadGateway().json(json!({
            "data": null,
            "error": {
                "code": "upstream_error",
                "message": "Dr. Alex is having trouble right now. Please try again in a moment."
            }
        }));
    }

    let parsed: AnthropicResponse = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("Failed to parse Anthropic response: {:?}", e);
            return HttpResponse::BadGateway().json(json!({
                "data": null,
                "error": {
                    "code": "upstream_error",
                    "message": "Dr. Alex encountered an issue. Please try again."
                }
            }));
        }
    };

    let assistant_text = parsed
        .content
        .into_iter()
        .find(|c| c.content_type == "text")
        .and_then(|c| c.text)
        .unwrap_or_else(|| "I couldn't generate a response. Please try again.".to_string());

    // Track output tokens
    if let Some(ref usage) = parsed.usage {
        if let Some(output_tokens) = usage.output_tokens {
            token_tracker.add_tokens(output_tokens);
        }
    }

    // Log AI usage (public chat, no user_id)
    {
        let input_tok = parsed
            .usage
            .as_ref()
            .and_then(|u| u.input_tokens)
            .unwrap_or(0) as i32;
        let output_tok = parsed
            .usage
            .as_ref()
            .and_then(|u| u.output_tokens)
            .unwrap_or(0) as i32;
        let _ = crate::services::ai_usage::log_usage(
            pool.get_ref(),
            None,
            "public_chat",
            &config.public_chat_model,
            input_tok,
            output_tok,
        )
        .await;
    }

    // Store updated conversation (user message + assistant response)
    stored_messages.push(ChatMessage {
        role: "assistant".to_string(),
        content: assistant_text.clone(),
    });
    sessions.store_messages(&session_id, stored_messages);

    HttpResponse::Ok().json(json!({
        "data": {
            "role": "assistant",
            "content": assistant_text,
            "session_id": session_id
        },
        "error": null
    }))
}
