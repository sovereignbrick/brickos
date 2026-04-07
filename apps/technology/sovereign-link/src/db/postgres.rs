use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use super::LinkStore;
use crate::models::*;

pub struct PgLinkStore {
    pool: PgPool,
}

impl PgLinkStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl LinkStore for PgLinkStore {
    async fn get_by_code(&self, code: &str) -> anyhow::Result<Option<ShortLink>> {
        let link = sqlx::query_as::<_, ShortLink>(
            r#"SELECT id, code, target_url, link_type, domain, app_key,
                      owner_user_id, owner_org_id, affiliate_code, title,
                      is_active, expires_at, created_at, updated_at
               FROM short_links
               WHERE code = $1
                 AND is_active = true
                 AND (expires_at IS NULL OR expires_at > now())"#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(link)
    }

    async fn get_prefix(&self, prefix: &str) -> anyhow::Result<Option<AppPrefix>> {
        let p = sqlx::query_as::<_, AppPrefix>(
            "SELECT prefix, app_key, domain, base_url, signup_path, is_active
             FROM app_prefixes WHERE prefix = $1 AND is_active = true",
        )
        .bind(prefix)
        .fetch_optional(&self.pool)
        .await?;

        Ok(p)
    }

    async fn record_click(&self, link_id: Uuid, meta: ClickMeta) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO short_link_clicks (id, short_link_id, referrer_domain, country_code, visitor_hash)
               VALUES (gen_random_uuid(), $1, $2, $3, $4)"#,
        )
        .bind(link_id)
        .bind(&meta.referrer_domain)
        .bind(&meta.country_code)
        .bind(&meta.visitor_hash)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn create_link(
        &self,
        req: CreateLinkRequest,
        owner_user_id: Option<Uuid>,
    ) -> anyhow::Result<ShortLink> {
        let code = req.code.unwrap_or_else(generate_short_code);
        let link_type = req.link_type.unwrap_or_else(|| "generic".to_string());
        let domain = req.domain.unwrap_or_else(|| "health".to_string());
        let app_key = req
            .app_key
            .unwrap_or_else(|| "sovereign-health".to_string());

        let link = sqlx::query_as::<_, ShortLink>(
            r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key,
                                        owner_user_id, title, expires_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING id, code, target_url, link_type, domain, app_key,
                         owner_user_id, owner_org_id, affiliate_code, title,
                         is_active, expires_at, created_at, updated_at"#,
        )
        .bind(&code)
        .bind(&req.target_url)
        .bind(&link_type)
        .bind(&domain)
        .bind(&app_key)
        .bind(owner_user_id)
        .bind(&req.title)
        .bind(req.expires_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(link)
    }

    async fn list_by_owner(&self, user_id: Uuid) -> anyhow::Result<Vec<ShortLink>> {
        let links = sqlx::query_as::<_, ShortLink>(
            r#"SELECT sl.id, sl.code, sl.target_url, sl.link_type, sl.domain, sl.app_key,
                      sl.owner_user_id, sl.owner_org_id, sl.affiliate_code, sl.title,
                      sl.is_active, sl.expires_at, sl.created_at, sl.updated_at,
                      COALESCE(c.total_clicks, 0) as total_clicks,
                      COALESCE(c.clicks_7d, 0) as clicks_7d,
                      COALESCE(c.clicks_30d, 0) as clicks_30d
               FROM short_links sl
               LEFT JOIN LATERAL (
                   SELECT COUNT(*) as total_clicks,
                          COUNT(*) FILTER (WHERE clicked_at > now() - interval '7 days') as clicks_7d,
                          COUNT(*) FILTER (WHERE clicked_at > now() - interval '30 days') as clicks_30d
                   FROM short_link_clicks WHERE short_link_id = sl.id
               ) c ON true
               WHERE sl.owner_user_id = $1
               ORDER BY sl.created_at DESC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(links)
    }

    async fn update_link(
        &self,
        id: Uuid,
        owner_user_id: Uuid,
        req: UpdateLinkRequest,
    ) -> anyhow::Result<Option<ShortLink>> {
        let link = sqlx::query_as::<_, ShortLink>(
            r#"UPDATE short_links SET
                  target_url = COALESCE($3, target_url),
                  title = COALESCE($4, title),
                  is_active = COALESCE($5, is_active),
                  expires_at = COALESCE($6, expires_at),
                  updated_at = now()
               WHERE id = $1 AND owner_user_id = $2
               RETURNING id, code, target_url, link_type, domain, app_key,
                         owner_user_id, owner_org_id, affiliate_code, title,
                         is_active, expires_at, created_at, updated_at"#,
        )
        .bind(id)
        .bind(owner_user_id)
        .bind(&req.target_url)
        .bind(&req.title)
        .bind(req.is_active)
        .bind(req.expires_at)
        .fetch_optional(&self.pool)
        .await?;

        Ok(link)
    }

    async fn deactivate_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query(
            "UPDATE short_links SET is_active = false, updated_at = now()
             WHERE id = $1 AND owner_user_id = $2",
        )
        .bind(id)
        .bind(owner_user_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    async fn get_stats(&self, link_id: Uuid) -> anyhow::Result<LinkStats> {
        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1")
                .bind(link_id)
                .fetch_one(&self.pool)
                .await?;

        let clicks_7d: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '7 days'",
        )
        .bind(link_id)
        .fetch_one(&self.pool)
        .await?;

        let clicks_30d: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '30 days'",
        )
        .bind(link_id)
        .fetch_one(&self.pool)
        .await?;

        let unique_7d: (i64,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT visitor_hash) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '7 days'",
        )
        .bind(link_id)
        .fetch_one(&self.pool)
        .await?;

        let countries = sqlx::query_as::<_, CountryStat>(
            r#"SELECT country_code, COUNT(*) as count
               FROM short_link_clicks
               WHERE short_link_id = $1 AND country_code IS NOT NULL
               GROUP BY country_code ORDER BY count DESC LIMIT 10"#,
        )
        .bind(link_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(LinkStats {
            total_clicks: total.0,
            clicks_7d: clicks_7d.0,
            clicks_30d: clicks_30d.0,
            unique_visitors_7d: unique_7d.0,
            top_countries: countries,
        })
    }

    async fn get_recent_clicks(
        &self,
        link_id: Uuid,
        limit: i64,
    ) -> anyhow::Result<Vec<ShortLinkClick>> {
        let clicks = sqlx::query_as::<_, ShortLinkClick>(
            r#"SELECT id, short_link_id, referrer_domain, country_code, clicked_at
               FROM short_link_clicks
               WHERE short_link_id = $1
               ORDER BY clicked_at DESC
               LIMIT $2"#,
        )
        .bind(link_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(clicks)
    }

    async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<ShortLink>> {
        let link = sqlx::query_as::<_, ShortLink>(
            r#"SELECT id, code, target_url, link_type, domain, app_key,
                      owner_user_id, owner_org_id, affiliate_code, title,
                      is_active, expires_at, created_at, updated_at
               FROM short_links WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(link)
    }

    async fn delete_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query("DELETE FROM short_links WHERE id = $1 AND owner_user_id = $2")
            .bind(id)
            .bind(owner_user_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

/// Generate a 6-char random alphanumeric code for generic short links.
fn generate_short_code() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    (0..6)
        .map(|_| chars[rng.random_range(0..chars.len())])
        .collect()
}
