#[cfg(feature = "platform")]
pub mod postgres;
#[cfg(feature = "standalone")]
pub mod sqlite;

use async_trait::async_trait;
use uuid::Uuid;

use crate::models::*;

/// Database abstraction for the shortener.
/// Platform mode: Postgres. Standalone mode: SQLite.
#[async_trait]
pub trait LinkStore: Send + Sync {
    /// Look up a short link by its code. Returns None if not found or inactive/expired.
    async fn get_by_code(&self, code: &str) -> anyhow::Result<Option<ShortLink>>;

    /// Look up an app prefix (e.g., "sh" → Sovereign Health).
    async fn get_prefix(&self, prefix: &str) -> anyhow::Result<Option<AppPrefix>>;

    /// Record a click (fire-and-forget, should not block the redirect).
    async fn record_click(&self, link_id: Uuid, meta: ClickMeta) -> anyhow::Result<()>;

    /// Create a new short link.
    async fn create_link(
        &self,
        req: CreateLinkRequest,
        owner_user_id: Option<Uuid>,
    ) -> anyhow::Result<ShortLink>;

    /// List all links owned by a user.
    async fn list_by_owner(&self, user_id: Uuid) -> anyhow::Result<Vec<ShortLink>>;

    /// Update a link's metadata.
    async fn update_link(
        &self,
        id: Uuid,
        owner_user_id: Uuid,
        req: UpdateLinkRequest,
    ) -> anyhow::Result<Option<ShortLink>>;

    /// Soft-deactivate a link.
    async fn deactivate_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool>;

    /// Get click stats for a link.
    async fn get_stats(&self, link_id: Uuid) -> anyhow::Result<LinkStats>;

    /// Get recent clicks for a link (most recent first, limited).
    async fn get_recent_clicks(
        &self,
        link_id: Uuid,
        limit: i64,
    ) -> anyhow::Result<Vec<ShortLinkClick>>;

    /// Get a link by its ID.
    async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<ShortLink>>;

    /// Hard-delete a link (standalone mode only).
    async fn delete_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool>;

    /// Get daily click counts for the last N days (for chart rendering).
    async fn get_daily_clicks(
        &self,
        link_id: Uuid,
        days: i32,
    ) -> anyhow::Result<Vec<(String, i64)>> {
        let _ = (link_id, days);
        Ok(Vec::new())
    }

    /// Get top referrer domains for a link.
    async fn get_top_referrers(
        &self,
        link_id: Uuid,
        limit: i32,
    ) -> anyhow::Result<Vec<(String, i64)>> {
        let _ = (link_id, limit);
        Ok(Vec::new())
    }
}

/// User storage abstraction for standalone mode authentication.
#[async_trait]
pub trait UserStore: Send + Sync {
    async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<User>>;
    async fn get_by_email(&self, email: &str) -> anyhow::Result<Option<User>>;
    async fn get_by_nostr_pubkey(&self, pubkey: &str) -> anyhow::Result<Option<User>>;
    async fn get_by_api_key_hash(&self, key_hash: &str) -> anyhow::Result<Option<User>>;
    async fn create(&self, new: NewUser) -> anyhow::Result<User>;
    async fn update(&self, id: &str, update: UpdateUser) -> anyhow::Result<Option<User>>;
    async fn link_nostr(&self, user_id: &str, pubkey: &str) -> anyhow::Result<()>;
    async fn link_email(
        &self,
        user_id: &str,
        email: &str,
        password_hash: &str,
    ) -> anyhow::Result<()>;
    async fn count(&self) -> anyhow::Result<i64>;
}
