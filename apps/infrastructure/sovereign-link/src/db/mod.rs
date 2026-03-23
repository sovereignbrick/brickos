pub mod postgres;

use async_trait::async_trait;
use uuid::Uuid;

use crate::models::*;

/// Database abstraction for the shortener.
/// Platform mode: Postgres. Standalone mode (future): SQLite.
#[async_trait]
pub trait LinkStore: Send + Sync {
    /// Look up a short link by its code. Returns None if not found or inactive/expired.
    async fn get_by_code(&self, code: &str) -> anyhow::Result<Option<ShortLink>>;

    /// Look up an app prefix (e.g., "sh" → Sovereign Health).
    async fn get_prefix(&self, prefix: &str) -> anyhow::Result<Option<AppPrefix>>;

    /// Record a click (fire-and-forget, should not block the redirect).
    async fn record_click(&self, link_id: Uuid, meta: ClickMeta) -> anyhow::Result<()>;

    /// Create a new short link.
    async fn create_link(&self, req: CreateLinkRequest, owner_user_id: Option<Uuid>) -> anyhow::Result<ShortLink>;

    /// List all links owned by a user.
    async fn list_by_owner(&self, user_id: Uuid) -> anyhow::Result<Vec<ShortLink>>;

    /// Update a link's metadata.
    async fn update_link(&self, id: Uuid, owner_user_id: Uuid, req: UpdateLinkRequest) -> anyhow::Result<Option<ShortLink>>;

    /// Soft-deactivate a link.
    async fn deactivate_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool>;

    /// Get click stats for a link.
    async fn get_stats(&self, link_id: Uuid) -> anyhow::Result<LinkStats>;
}
