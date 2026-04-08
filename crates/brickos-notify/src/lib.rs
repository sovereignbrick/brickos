// BrickOS Notification Service -- AGPL-3.0
//
// Admin notification service -- dual-dispatch to ntfy (sovereign) + Telegram (admin UI).
// All sends are fire-and-forget: notification failure must never break API requests.

use std::collections::HashMap;

/// Notification priority levels (maps to ntfy priorities 1-5)
#[derive(Debug, Clone, Copy)]
pub enum Priority {
    Min = 1,
    Low = 2,
    Default = 3,
    High = 4,
    Urgent = 5,
}

/// Notification channels -- each maps to an ntfy topic and a Telegram forum thread
#[derive(Debug, Clone, Copy)]
pub enum Channel {
    Critical,
    Errors,
    Billing,
    Users,
    Info,
}

/// Configuration for the notification service, loaded from env vars.
#[derive(Debug, Clone)]
pub struct NotifyConfig {
    // ntfy
    pub ntfy_base_url: Option<String>,
    pub ntfy_token: Option<String>,
    pub ntfy_app_prefix: String,
    // Telegram
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<String>,
    pub telegram_topic_ids: HashMap<&'static str, String>,
}

impl NotifyConfig {
    pub fn from_env() -> Self {
        let mut topic_ids = HashMap::new();
        for (key, env_key) in [
            ("critical", "TELEGRAM_CRITICAL_TOPIC_ID"),
            ("errors", "TELEGRAM_ERRORS_TOPIC_ID"),
            ("billing", "TELEGRAM_BILLING_TOPIC_ID"),
            ("users", "TELEGRAM_USERS_TOPIC_ID"),
            ("info", "TELEGRAM_INFO_TOPIC_ID"),
            ("status", "TELEGRAM_STATUS_TOPIC_ID"),
        ] {
            if let Ok(val) = std::env::var(env_key) {
                topic_ids.insert(key, val);
            }
        }

        Self {
            ntfy_base_url: std::env::var("NTFY_BASE_URL")
                .ok()
                .filter(|s| !s.is_empty()),
            ntfy_token: std::env::var("NTFY_TOKEN").ok().filter(|s| !s.is_empty()),
            ntfy_app_prefix: std::env::var("NTFY_APP_PREFIX").unwrap_or_else(|_| "sh".into()),
            telegram_bot_token: std::env::var("TELEGRAM_BOT_TOKEN")
                .ok()
                .filter(|s| !s.is_empty()),
            telegram_chat_id: std::env::var("TELEGRAM_CHAT_ID")
                .ok()
                .filter(|s| !s.is_empty()),
            telegram_topic_ids: topic_ids,
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.ntfy_base_url.is_some() || self.telegram_bot_token.is_some()
    }
}

/// The notification service. Clone-cheap (wraps an `Arc`-backed reqwest client).
#[derive(Debug, Clone)]
pub struct Notifier {
    config: NotifyConfig,
    client: reqwest::Client,
}

impl Notifier {
    pub fn new(config: NotifyConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap_or_default();
        Self { config, client }
    }

    /// Fire-and-forget: spawns the notification send on a background task.
    /// Never blocks or fails the caller.
    pub fn send(&self, channel: Channel, priority: Priority, title: &str, body: &str) {
        let this = self.clone();
        let title = title.to_string();
        let body = body.to_string();
        tokio::spawn(async move {
            this.dispatch(channel, priority, &title, &body).await;
        });
    }

    async fn dispatch(&self, channel: Channel, priority: Priority, title: &str, body: &str) {
        let (ntfy_result, tg_result) = tokio::join!(
            self.send_ntfy(channel, priority, title, body),
            self.send_telegram(channel, title, body),
        );

        if let Err(e) = ntfy_result {
            tracing::debug!("ntfy send failed: {e}");
        }
        if let Err(e) = tg_result {
            tracing::debug!("Telegram send failed: {e}");
        }
    }

    async fn send_ntfy(
        &self,
        channel: Channel,
        priority: Priority,
        title: &str,
        body: &str,
    ) -> Result<(), String> {
        let base_url = match &self.config.ntfy_base_url {
            Some(url) => url,
            None => return Ok(()),
        };

        let topic = format!("{}-{}", self.config.ntfy_app_prefix, channel_slug(channel));
        let url = format!("{}/{}", base_url, topic);

        let mut req = self
            .client
            .post(&url)
            .header("Title", title)
            .header("Priority", (priority as u8).to_string())
            .body(body.to_string());

        if let Some(ref token) = self.config.ntfy_token {
            req = req.bearer_auth(token);
        }

        req.send().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn send_telegram(&self, channel: Channel, title: &str, body: &str) -> Result<(), String> {
        let token = match &self.config.telegram_bot_token {
            Some(t) => t,
            None => return Ok(()),
        };
        let chat_id = match &self.config.telegram_chat_id {
            Some(c) => c,
            None => return Ok(()),
        };

        let slug = channel_slug(channel);
        let thread_id = self.config.telegram_topic_ids.get(slug);

        let text = format!("<b>{}</b>\n{}", html_escape(title), html_escape(body));

        let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
        let mut params = vec![
            ("chat_id", chat_id.as_str()),
            ("parse_mode", "HTML"),
            ("text", &text),
        ];

        let thread_id_str;
        if let Some(tid) = thread_id {
            thread_id_str = tid.clone();
            params.push(("message_thread_id", &thread_id_str));
        }

        self.client
            .post(&url)
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn channel_slug(channel: Channel) -> &'static str {
    match channel {
        Channel::Critical => "critical",
        Channel::Errors => "errors",
        Channel::Billing => "billing",
        Channel::Users => "users",
        Channel::Info => "info",
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
