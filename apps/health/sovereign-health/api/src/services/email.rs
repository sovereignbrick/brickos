// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Semaphore;

// ---------------------------------------------------------------------------
// Trait
// ---------------------------------------------------------------------------

#[async_trait]
pub trait EmailProvider: Send + Sync {
    async fn send(&self, to: &str, subject: &str, html: &str, text: &str) -> Result<()>;

    async fn send_batch(
        &self,
        recipients: &[String],
        subject: &str,
        html: &str,
        text: &str,
        tags: &[String],
    ) -> Result<()>;

    async fn add_to_list(&self, email: &str, name: &str, tags: &[String]) -> Result<()>;

    async fn remove_from_list(&self, email: &str) -> Result<()>;

    async fn update_tags(&self, email: &str, add: &[String], remove: &[String]) -> Result<()>;
}

// ---------------------------------------------------------------------------
// 1. MailgunProvider  (SaaS mode)
// ---------------------------------------------------------------------------

pub struct MailgunProvider {
    client: reqwest::Client,
    api_key: String,
    domain: String,
    api_base: String,
    from: String,
    list_address: String,
    semaphore: Arc<Semaphore>,
}

impl MailgunProvider {
    pub fn new(
        api_key: String,
        domain: String,
        api_base: String,
        from: String,
        list_address: String,
    ) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            domain,
            api_base,
            from,
            list_address,
            semaphore: Arc::new(Semaphore::new(50)),
        }
    }

    fn base_url(&self) -> String {
        format!("{}/v3/{}", self.api_base, self.domain)
    }

    fn lists_base_url(&self) -> String {
        format!("{}/v3/lists", self.api_base)
    }
}

#[async_trait]
impl EmailProvider for MailgunProvider {
    async fn send(&self, to: &str, subject: &str, html: &str, text: &str) -> Result<()> {
        let _permit = self.semaphore.acquire().await?;

        let resp = self
            .client
            .post(format!("{}/messages", self.base_url()))
            .basic_auth("api", Some(&self.api_key))
            .form(&[
                ("from", self.from.as_str()),
                ("to", to),
                ("subject", subject),
                ("html", html),
                ("text", text),
            ])
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Mailgun send failed ({}): {}", status, body);
        }

        tracing::info!(to = to, subject = subject, "Email sent via Mailgun");
        Ok(())
    }

    async fn send_batch(
        &self,
        recipients: &[String],
        subject: &str,
        html: &str,
        text: &str,
        tags: &[String],
    ) -> Result<()> {
        for recipient in recipients {
            self.send(recipient, subject, html, text).await?;
        }
        tracing::info!(
            count = recipients.len(),
            tags = ?tags,
            "Batch email sent via Mailgun"
        );
        Ok(())
    }

    async fn add_to_list(&self, email: &str, name: &str, tags: &[String]) -> Result<()> {
        let url = format!("{}/{}/members", self.lists_base_url(), self.list_address);

        let vars = serde_json::json!({ "tags": tags });

        let resp = self
            .client
            .post(&url)
            .basic_auth("api", Some(&self.api_key))
            .form(&[
                ("address", email),
                ("name", name),
                ("vars", &vars.to_string()),
                ("upsert", "yes"),
            ])
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Mailgun add_to_list failed ({}): {}", status, body);
        }

        tracing::info!(email = email, "Added to Mailgun list");
        Ok(())
    }

    async fn remove_from_list(&self, email: &str) -> Result<()> {
        let url = format!(
            "{}/{}/members/{}",
            self.lists_base_url(),
            self.list_address,
            email
        );

        let resp = self
            .client
            .delete(&url)
            .basic_auth("api", Some(&self.api_key))
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::warn!(
                email = email,
                "Mailgun remove_from_list failed ({}): {}",
                status,
                body
            );
        }

        tracing::info!(email = email, "Removed from Mailgun list");
        Ok(())
    }

    async fn update_tags(&self, email: &str, add: &[String], remove: &[String]) -> Result<()> {
        // Mailgun list member vars approach: fetch current, merge, update
        let url = format!(
            "{}/{}/members/{}",
            self.lists_base_url(),
            self.list_address,
            email
        );

        let vars = serde_json::json!({
            "add_tags": add,
            "remove_tags": remove,
        });

        let resp = self
            .client
            .put(&url)
            .basic_auth("api", Some(&self.api_key))
            .form(&[("vars", vars.to_string())])
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Mailgun update_tags failed ({}): {}", status, body);
        }

        tracing::info!(email = email, add = ?add, remove = ?remove, "Updated Mailgun tags");
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// 2. SmtpProvider  (OSS self-hosted)
// ---------------------------------------------------------------------------

pub struct SmtpProvider {
    transport: lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
    from: String,
}

impl SmtpProvider {
    pub fn new(host: &str, port: u16, user: &str, pass: &str, from: String) -> Result<Self> {
        use lettre::transport::smtp::authentication::Credentials;
        use lettre::AsyncSmtpTransport;

        let creds = Credentials::new(user.to_string(), pass.to_string());

        let transport = AsyncSmtpTransport::<lettre::Tokio1Executor>::starttls_relay(host)?
            .port(port)
            .credentials(creds)
            .build();

        Ok(Self { transport, from })
    }
}

#[async_trait]
impl EmailProvider for SmtpProvider {
    async fn send(&self, to: &str, subject: &str, html: &str, text: &str) -> Result<()> {
        use lettre::message::{header::ContentType, MultiPart, SinglePart};
        use lettre::{AsyncTransport, Message};

        let email = Message::builder()
            .from(self.from.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(text.to_string()),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html.to_string()),
                    ),
            )?;

        self.transport.send(email).await?;

        tracing::info!(to = to, subject = subject, "Email sent via SMTP");
        Ok(())
    }

    async fn send_batch(
        &self,
        recipients: &[String],
        subject: &str,
        html: &str,
        text: &str,
        _tags: &[String],
    ) -> Result<()> {
        for recipient in recipients {
            self.send(recipient, subject, html, text).await?;
        }
        tracing::info!(count = recipients.len(), "Batch email sent via SMTP");
        Ok(())
    }

    // List management is a no-op for SMTP (OSS has no mailing list)

    async fn add_to_list(&self, _email: &str, _name: &str, _tags: &[String]) -> Result<()> {
        Ok(())
    }

    async fn remove_from_list(&self, _email: &str) -> Result<()> {
        Ok(())
    }

    async fn update_tags(&self, _email: &str, _add: &[String], _remove: &[String]) -> Result<()> {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// 3. LogProvider  (fallback / dev)
// ---------------------------------------------------------------------------

pub struct LogProvider;

#[async_trait]
impl EmailProvider for LogProvider {
    async fn send(&self, to: &str, subject: &str, _html: &str, _text: &str) -> Result<()> {
        tracing::info!(
            to = to,
            subject = subject,
            "[LogProvider] Email would be sent"
        );
        // In dev mode, log the text body so verification URLs are visible
        if !_text.is_empty() {
            tracing::info!(body = _text, "[LogProvider] Email text body");
        }
        Ok(())
    }

    async fn send_batch(
        &self,
        recipients: &[String],
        subject: &str,
        _html: &str,
        _text: &str,
        tags: &[String],
    ) -> Result<()> {
        tracing::info!(
            count = recipients.len(),
            subject = subject,
            tags = ?tags,
            "[LogProvider] Batch email would be sent"
        );
        Ok(())
    }

    async fn add_to_list(&self, email: &str, name: &str, tags: &[String]) -> Result<()> {
        tracing::info!(
            email = email,
            name = name,
            tags = ?tags,
            "[LogProvider] Would add to list"
        );
        Ok(())
    }

    async fn remove_from_list(&self, email: &str) -> Result<()> {
        tracing::info!(email = email, "[LogProvider] Would remove from list");
        Ok(())
    }

    async fn update_tags(&self, email: &str, add: &[String], remove: &[String]) -> Result<()> {
        tracing::info!(
            email = email,
            add = ?add,
            remove = ?remove,
            "[LogProvider] Would update tags"
        );
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

pub fn create_email_provider(is_saas: bool) -> Arc<dyn EmailProvider> {
    let mailgun_key = std::env::var("MAILGUN_API_KEY")
        .ok()
        .filter(|s| !s.is_empty());
    let mailgun_domain = std::env::var("MAILGUN_DOMAIN")
        .ok()
        .filter(|s| !s.is_empty());
    let mailgun_from = std::env::var("MAILGUN_FROM")
        .unwrap_or_else(|_| "Sovereign Health <noreply@sovereignhealth.io>".to_string());
    let mailgun_api_base = std::env::var("MAILGUN_API_BASE")
        .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
    let mailgun_list =
        std::env::var("MAILGUN_LIST").unwrap_or_else(|_| "users@mg.sovereignhealth.io".to_string());

    let smtp_host = std::env::var("SMTP_HOST").ok().filter(|s| !s.is_empty());
    let smtp_port: u16 = std::env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse()
        .unwrap_or(587);
    let smtp_user = std::env::var("SMTP_USER").ok().filter(|s| !s.is_empty());
    let smtp_pass = std::env::var("SMTP_PASS").ok().filter(|s| !s.is_empty());
    let smtp_from = std::env::var("SMTP_FROM").ok().filter(|s| !s.is_empty());

    // Priority 1: Mailgun in SaaS mode
    if is_saas {
        if mailgun_key.is_none() {
            tracing::warn!("SaaS mode but MAILGUN_API_KEY is not set - emails will be logged only");
        }
        if let (Some(key), Some(domain)) = (mailgun_key, mailgun_domain) {
            tracing::info!(
                "Email provider: Mailgun (domain={}, base={})",
                domain,
                mailgun_api_base
            );
            return Arc::new(MailgunProvider::new(
                key,
                domain,
                mailgun_api_base,
                mailgun_from,
                mailgun_list,
            ));
        }
    }

    // Priority 2: SMTP (any mode)
    if let (Some(host), Some(user), Some(pass), Some(from)) =
        (smtp_host, smtp_user, smtp_pass, smtp_from)
    {
        match SmtpProvider::new(&host, smtp_port, &user, &pass, from) {
            Ok(provider) => {
                tracing::info!("Email provider: SMTP (host={}:{})", host, smtp_port);
                return Arc::new(provider);
            }
            Err(e) => {
                tracing::error!("Failed to create SMTP provider: {e}. Falling back to LogProvider");
            }
        }
    }

    // Fallback: log only
    tracing::info!("Email provider: Log (no email service configured)");
    Arc::new(LogProvider)
}
