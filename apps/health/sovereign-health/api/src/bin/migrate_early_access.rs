// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

//! Migrate early-access log file entries to Mailgun mailing list.
//!
//! Usage:
//!   cargo run --bin migrate-early-access
//!
//! Reads the early-access log file and adds each email to the Mailgun
//! early-access list via direct API call (not the default users list).

use std::fs;

const LOG_PATHS: &[&str] = &[
    "/app/data/early-access.log",
    "/data/early-access.log",
    "early-access.log",
];

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let mailgun_key = std::env::var("MAILGUN_API_KEY")
        .ok()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| anyhow::anyhow!("MAILGUN_API_KEY not set"))?;
    let mailgun_base = std::env::var("MAILGUN_API_BASE")
        .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
    let mailgun_domain =
        std::env::var("MAILGUN_DOMAIN").unwrap_or_else(|_| "sovereignhealth.io".to_string());
    let list_address = format!("early-access@{}", mailgun_domain);

    // Find log file
    let mut content = String::new();
    let mut found_path = None;
    for path in LOG_PATHS {
        if let Ok(c) = fs::read_to_string(path) {
            content = c;
            found_path = Some(*path);
            break;
        }
    }

    let path = found_path.ok_or_else(|| anyhow::anyhow!("No early-access log file found"))?;
    tracing::info!("Reading early-access log from: {path}");

    let client = reqwest::Client::new();
    let mut success = 0;
    let mut skipped = 0;
    let mut errors = 0;

    for line in content.lines() {
        let parts: Vec<&str> = line.splitn(2, " | ").collect();
        if parts.len() != 2 {
            continue;
        }
        let email = parts[1].trim().to_lowercase();
        if email.is_empty() || !email.contains('@') || !email.contains('.') {
            skipped += 1;
            continue;
        }

        let resp = client
            .post(format!(
                "{}/v3/lists/{}/members",
                mailgun_base, list_address
            ))
            .basic_auth("api", Some(&mailgun_key))
            .form(&[
                ("address", email.as_str()),
                ("subscribed", "true"),
                ("upsert", "true"),
            ])
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                success += 1;
                tracing::info!(email = %email, "Added to Mailgun list");
            }
            Ok(r) => {
                let body = r.text().await.unwrap_or_default();
                errors += 1;
                tracing::error!(email = %email, "Failed: {body}");
            }
            Err(e) => {
                errors += 1;
                tracing::error!(email = %email, "Request failed: {e}");
            }
        }

        // Rate limit courtesy
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    tracing::info!(
        success = success,
        skipped = skipped,
        errors = errors,
        "Early access migration complete"
    );
    Ok(())
}
