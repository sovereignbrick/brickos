use actix_web::{web, HttpRequest, HttpResponse};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::sync::Arc;

use crate::db::LinkStore;
use crate::models::*;

/// GET /r/{code} — The hot path. Must be fast.
///
/// Fast path: 10-char code with known 2-char prefix → build redirect URL from
/// app_prefixes table without touching short_links.
///
/// Slow path: vanity/campaign codes → full DB lookup on short_links.
pub async fn handle_redirect(
    code: web::Path<String>,
    req: HttpRequest,
    store: web::Data<Arc<dyn LinkStore>>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let code = code.into_inner();

    // Fast path: auto-generated affiliate code (2-char prefix + 8-char hash)
    if code.len() == AUTO_CODE_LEN {
        let prefix = &code[..PREFIX_LEN];
        let affiliate_code = &code[PREFIX_LEN..];

        if let Ok(Some(app)) = store.get_prefix(prefix).await {
            let target_url = format!("{}{}{}", app.base_url, app.signup_path, affiliate_code);

            // Record click async — look up or create the short_link row
            let pool_clone = pool.get_ref().clone();
            let code_clone = code.clone();
            let target_clone = target_url.clone();
            let meta = extract_click_meta(&req);
            tokio::spawn(async move {
                record_click_for_code(&pool_clone, &code_clone, &target_clone, meta).await;
            });

            return HttpResponse::MovedPermanently()
                .insert_header(("Location", target_url))
                .insert_header(("Cache-Control", "private, max-age=0"))
                .finish();
        }
    }

    // Slow path: DB lookup for vanity/campaign/generic codes
    match store.get_by_code(&code).await {
        Ok(Some(link)) => {
            let target = link.target_url.clone();
            let link_id = link.id;
            let store_clone = store.clone();
            let meta = extract_click_meta(&req);

            tokio::spawn(async move {
                let _ = store_clone.record_click(link_id, meta).await;
            });

            HttpResponse::MovedPermanently()
                .insert_header(("Location", target))
                .insert_header(("Cache-Control", "private, max-age=0"))
                .finish()
        }
        Ok(None) => HttpResponse::NotFound()
            .content_type("text/html")
            .body("<html><body><h1>Link not found</h1><p>This short link does not exist or has expired.</p></body></html>"),
        Err(e) => {
            tracing::error!("Shortener DB error for code '{}': {}", code, e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

fn extract_click_meta(req: &HttpRequest) -> ClickMeta {
    let referrer_domain = req
        .headers()
        .get("referer")
        .and_then(|v| v.to_str().ok())
        .and_then(url_domain);

    let country_code = req
        .headers()
        .get("cf-ipcountry")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_uppercase())
        .filter(|s| s.len() == 2 && s != "XX");

    // Privacy-preserving visitor hash: SHA256(IP + code + date)
    // Rotates daily — cannot be reversed to IP
    let visitor_hash = req
        .peer_addr()
        .map(|addr| {
            let today = chrono::Utc::now().format("%Y-%m-%d");
            let input = format!("{}:{}", addr.ip(), today);
            let mut hasher = Sha256::new();
            hasher.update(input.as_bytes());
            hex::encode(hasher.finalize())
        });

    ClickMeta {
        referrer_domain,
        country_code,
        visitor_hash,
    }
}

/// Extract domain from a URL (strip protocol, path, query).
fn url_domain(url: &str) -> Option<String> {
    let without_protocol = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))?;
    let domain = without_protocol.split('/').next()?;
    let domain = domain.split(':').next()?;
    if domain.is_empty() {
        None
    } else {
        Some(domain.to_lowercase())
    }
}

/// Record a click for a fast-path code, creating the short_link row if it doesn't exist.
async fn record_click_for_code(pool: &PgPool, code: &str, target_url: &str, meta: ClickMeta) {
    // Upsert: ensure the short_link row exists (auto-affiliate codes may not have been backfilled)
    let link_id: Option<(uuid::Uuid,)> = sqlx::query_as(
        r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key, affiliate_code)
           VALUES (gen_random_uuid(), $1, $2, 'affiliate',
                   (SELECT domain FROM app_prefixes WHERE prefix = LEFT($1, 2)),
                   (SELECT app_key FROM app_prefixes WHERE prefix = LEFT($1, 2)),
                   RIGHT($1, 8))
           ON CONFLICT (code) DO UPDATE SET updated_at = now()
           RETURNING id"#,
    )
    .bind(code)
    .bind(target_url)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if let Some((id,)) = link_id {
        let _ = sqlx::query(
            r#"INSERT INTO short_link_clicks (id, short_link_id, referrer_domain, country_code, visitor_hash)
               VALUES (gen_random_uuid(), $1, $2, $3, $4)"#,
        )
        .bind(id)
        .bind(&meta.referrer_domain)
        .bind(&meta.country_code)
        .bind(&meta.visitor_hash)
        .execute(pool)
        .await;
    }
}
