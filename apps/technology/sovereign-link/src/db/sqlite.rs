use async_trait::async_trait;
use r2d2::Pool;
use rusqlite::params;
use uuid::Uuid;

use super::{LinkStore, UserStore};
use crate::models::*;

type SqlitePool = Pool<r2d2_sqlite::SqliteConnectionManager>;

/// Re-export the r2d2 SQLite connection manager under a shorter name.
mod r2d2_sqlite {
    pub use rusqlite::Connection;

    /// Minimal r2d2 connection manager for rusqlite.
    #[derive(Debug, Clone)]
    pub struct SqliteConnectionManager {
        path: String,
    }

    impl SqliteConnectionManager {
        pub fn file(path: &str) -> Self {
            Self {
                path: path.to_string(),
            }
        }
    }

    impl r2d2::ManageConnection for SqliteConnectionManager {
        type Connection = Connection;
        type Error = rusqlite::Error;

        fn connect(&self) -> Result<Connection, rusqlite::Error> {
            let conn = Connection::open(&self.path)?;
            conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
            Ok(conn)
        }

        fn is_valid(&self, conn: &mut Connection) -> Result<(), rusqlite::Error> {
            conn.execute_batch("SELECT 1")?;
            Ok(())
        }

        fn has_broken(&self, _conn: &mut Connection) -> bool {
            false
        }
    }
}

/// SQLite-backed store for standalone mode. Implements both LinkStore and UserStore.
pub struct SqliteStore {
    pool: SqlitePool,
}

impl SqliteStore {
    /// Open (or create) the database and run migrations.
    pub fn open(db_path: &str) -> anyhow::Result<Self> {
        let manager = r2d2_sqlite::SqliteConnectionManager::file(db_path);
        let pool = Pool::builder().max_size(8).build(manager)?;

        // Run embedded migration
        let conn = pool.get()?;
        let migration_sql = include_str!("../../migrations/sqlite/001_initial.sql");
        conn.execute_batch(migration_sql)?;
        tracing::info!("SQLite database ready at {}", db_path);

        Ok(Self { pool })
    }
}

// ---------------------------------------------------------------------------
// LinkStore implementation
// ---------------------------------------------------------------------------

#[async_trait]
impl LinkStore for SqliteStore {
    async fn get_by_code(&self, code: &str) -> anyhow::Result<Option<ShortLink>> {
        let pool = self.pool.clone();
        let code = code.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, code, target_url, title, user_id, is_active, expires_at, click_count, created_at
                 FROM links
                 WHERE code = ?1 AND is_active = 1
                   AND (expires_at IS NULL OR expires_at > datetime('now'))",
            )?;

            let result = stmt.query_row(params![code], |row| {
                Ok(row_to_short_link(row))
            }).optional()?;

            Ok(result)
        })
        .await?
    }

    async fn get_prefix(&self, _prefix: &str) -> anyhow::Result<Option<AppPrefix>> {
        // App prefixes are a platform-mode concept; standalone mode does not use them.
        Ok(None)
    }

    async fn record_click(&self, link_id: Uuid, meta: ClickMeta) -> anyhow::Result<()> {
        let pool = self.pool.clone();
        let link_id_str = link_id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            conn.execute(
                "INSERT INTO clicks (link_id, visitor_hash, referrer_domain, country_code)
                 VALUES (?1, ?2, ?3, ?4)",
                params![link_id_str, meta.visitor_hash, meta.referrer_domain, meta.country_code],
            )?;
            // Update denormalized click count
            conn.execute(
                "UPDATE links SET click_count = click_count + 1 WHERE id = ?1",
                params![link_id_str],
            )?;
            Ok(())
        })
        .await?
    }

    async fn create_link(
        &self,
        req: CreateLinkRequest,
        owner_user_id: Option<Uuid>,
    ) -> anyhow::Result<ShortLink> {
        let pool = self.pool.clone();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let id = Uuid::new_v4().to_string();
            let code = req.code.unwrap_or_else(generate_short_code);
            let user_id = owner_user_id
                .map(|u| u.to_string())
                .unwrap_or_default();
            let expires_at = req.expires_at.map(|dt| dt.to_rfc3339());
            let now = chrono::Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO links (id, user_id, code, target_url, title, expires_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, user_id, code, req.target_url, req.title, expires_at, now],
            )?;

            // Build a ShortLink to return
            Ok(make_short_link(&id, &code, &req.target_url, req.title.as_deref(), owner_user_id, expires_at.as_deref(), &now))
        })
        .await?
    }

    async fn list_by_owner(&self, user_id: Uuid) -> anyhow::Result<Vec<ShortLink>> {
        let pool = self.pool.clone();
        let uid = user_id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, code, target_url, title, user_id, is_active, expires_at, click_count, created_at
                 FROM links WHERE user_id = ?1 ORDER BY created_at DESC",
            )?;

            let links = stmt
                .query_map(params![uid], |row| Ok(row_to_short_link(row)))?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(links)
        })
        .await?
    }

    async fn update_link(
        &self,
        id: Uuid,
        owner_user_id: Uuid,
        req: UpdateLinkRequest,
    ) -> anyhow::Result<Option<ShortLink>> {
        let pool = self.pool.clone();
        let id_str = id.to_string();
        let uid = owner_user_id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;

            // Build dynamic SET clause
            let mut sets = Vec::new();
            let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
            let mut idx = 1;

            if let Some(ref target) = req.target_url {
                sets.push(format!("target_url = ?{}", idx));
                values.push(Box::new(target.clone()));
                idx += 1;
            }
            if let Some(ref title) = req.title {
                sets.push(format!("title = ?{}", idx));
                values.push(Box::new(title.clone()));
                idx += 1;
            }
            if let Some(active) = req.is_active {
                sets.push(format!("is_active = ?{}", idx));
                values.push(Box::new(active as i32));
                idx += 1;
            }
            if let Some(ref exp) = req.expires_at {
                sets.push(format!("expires_at = ?{}", idx));
                values.push(Box::new(exp.to_rfc3339()));
                idx += 1;
            }

            if sets.is_empty() {
                // Nothing to update, just return the existing row
                let mut stmt = conn.prepare(
                    "SELECT id, code, target_url, title, user_id, is_active, expires_at, click_count, created_at
                     FROM links WHERE id = ?1 AND user_id = ?2",
                )?;
                return Ok(stmt.query_row(params![id_str, uid], |row| Ok(row_to_short_link(row))).optional()?);
            }

            let sql = format!(
                "UPDATE links SET {} WHERE id = ?{} AND user_id = ?{}",
                sets.join(", "),
                idx,
                idx + 1
            );
            values.push(Box::new(id_str.clone()));
            values.push(Box::new(uid.clone()));

            let params_ref: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
            let affected = conn.execute(&sql, params_ref.as_slice())?;

            if affected == 0 {
                return Ok(None);
            }

            let mut stmt = conn.prepare(
                "SELECT id, code, target_url, title, user_id, is_active, expires_at, click_count, created_at
                 FROM links WHERE id = ?1",
            )?;
            Ok(stmt.query_row(params![id_str], |row| Ok(row_to_short_link(row))).optional()?)
        })
        .await?
    }

    async fn deactivate_link(&self, id: Uuid, owner_user_id: Uuid) -> anyhow::Result<bool> {
        let pool = self.pool.clone();
        let id_str = id.to_string();
        let uid = owner_user_id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let affected = conn.execute(
                "UPDATE links SET is_active = 0 WHERE id = ?1 AND user_id = ?2",
                params![id_str, uid],
            )?;
            Ok(affected > 0)
        })
        .await?
    }

    async fn get_stats(&self, link_id: Uuid) -> anyhow::Result<LinkStats> {
        let pool = self.pool.clone();
        let lid = link_id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;

            let total: i64 = conn.query_row(
                "SELECT COUNT(*) FROM clicks WHERE link_id = ?1",
                params![lid],
                |row| row.get(0),
            )?;

            let clicks_7d: i64 = conn.query_row(
                "SELECT COUNT(*) FROM clicks WHERE link_id = ?1 AND clicked_at > datetime('now', '-7 days')",
                params![lid],
                |row| row.get(0),
            )?;

            let clicks_30d: i64 = conn.query_row(
                "SELECT COUNT(*) FROM clicks WHERE link_id = ?1 AND clicked_at > datetime('now', '-30 days')",
                params![lid],
                |row| row.get(0),
            )?;

            let unique_7d: i64 = conn.query_row(
                "SELECT COUNT(DISTINCT visitor_hash) FROM clicks WHERE link_id = ?1 AND clicked_at > datetime('now', '-7 days')",
                params![lid],
                |row| row.get(0),
            )?;

            let mut stmt = conn.prepare(
                "SELECT country_code, COUNT(*) as count FROM clicks
                 WHERE link_id = ?1 AND country_code IS NOT NULL
                 GROUP BY country_code ORDER BY count DESC LIMIT 10",
            )?;
            let countries = stmt
                .query_map(params![lid], |row| {
                    Ok(CountryStat {
                        country_code: row.get(0)?,
                        count: row.get(1)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(LinkStats {
                total_clicks: total,
                clicks_7d,
                clicks_30d,
                unique_visitors_7d: unique_7d,
                top_countries: countries,
            })
        })
        .await?
    }
}

// ---------------------------------------------------------------------------
// UserStore implementation
// ---------------------------------------------------------------------------

#[async_trait]
impl UserStore for SqliteStore {
    async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<User>> {
        let pool = self.pool.clone();
        let id = id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, email, password_hash, nostr_pubkey, display_name, api_key_hash, is_admin, created_at
                 FROM users WHERE id = ?1",
            )?;
            Ok(stmt.query_row(params![id], |row| Ok(row_to_user(row))).optional()?)
        })
        .await?
    }

    async fn get_by_email(&self, email: &str) -> anyhow::Result<Option<User>> {
        let pool = self.pool.clone();
        let email = email.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, email, password_hash, nostr_pubkey, display_name, api_key_hash, is_admin, created_at
                 FROM users WHERE email = ?1",
            )?;
            Ok(stmt.query_row(params![email], |row| Ok(row_to_user(row))).optional()?)
        })
        .await?
    }

    async fn get_by_nostr_pubkey(&self, pubkey: &str) -> anyhow::Result<Option<User>> {
        let pool = self.pool.clone();
        let pubkey = pubkey.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, email, password_hash, nostr_pubkey, display_name, api_key_hash, is_admin, created_at
                 FROM users WHERE nostr_pubkey = ?1",
            )?;
            Ok(stmt.query_row(params![pubkey], |row| Ok(row_to_user(row))).optional()?)
        })
        .await?
    }

    async fn get_by_api_key_hash(&self, key_hash: &str) -> anyhow::Result<Option<User>> {
        let pool = self.pool.clone();
        let key_hash = key_hash.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, email, password_hash, nostr_pubkey, display_name, api_key_hash, is_admin, created_at
                 FROM users WHERE api_key_hash = ?1",
            )?;
            Ok(stmt.query_row(params![key_hash], |row| Ok(row_to_user(row))).optional()?)
        })
        .await?
    }

    async fn create(&self, new: NewUser) -> anyhow::Result<User> {
        let pool = self.pool.clone();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();

            // First user becomes admin
            let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
            let is_admin = count == 0;

            conn.execute(
                "INSERT INTO users (id, email, password_hash, nostr_pubkey, display_name, is_admin, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, new.email, new.password_hash, new.nostr_pubkey, new.display_name, is_admin as i32, now],
            )?;

            Ok(User {
                id,
                email: new.email,
                password_hash: new.password_hash,
                nostr_pubkey: new.nostr_pubkey,
                display_name: new.display_name,
                api_key_hash: None,
                is_admin,
                created_at: now,
            })
        })
        .await?
    }

    async fn update(&self, id: &str, update: UpdateUser) -> anyhow::Result<Option<User>> {
        let pool = self.pool.clone();
        let id = id.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;

            let mut sets = Vec::new();
            let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
            let mut idx = 1;

            if let Some(ref dn) = update.display_name {
                sets.push(format!("display_name = ?{}", idx));
                values.push(Box::new(dn.clone()));
                idx += 1;
            }
            if let Some(ref ph) = update.password_hash {
                sets.push(format!("password_hash = ?{}", idx));
                values.push(Box::new(ph.clone()));
                idx += 1;
            }
            if let Some(ref ak) = update.api_key_hash {
                sets.push(format!("api_key_hash = ?{}", idx));
                values.push(Box::new(ak.clone()));
                idx += 1;
            }

            if sets.is_empty() {
                return get_user_by_id(&conn, &id);
            }

            let sql = format!(
                "UPDATE users SET {} WHERE id = ?{}",
                sets.join(", "),
                idx
            );
            values.push(Box::new(id.clone()));

            let params_ref: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
            let affected = conn.execute(&sql, params_ref.as_slice())?;

            if affected == 0 {
                return Ok(None);
            }

            get_user_by_id(&conn, &id)
        })
        .await?
    }

    async fn link_nostr(&self, user_id: &str, pubkey: &str) -> anyhow::Result<()> {
        let pool = self.pool.clone();
        let user_id = user_id.to_string();
        let pubkey = pubkey.to_string();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            conn.execute(
                "UPDATE users SET nostr_pubkey = ?1 WHERE id = ?2",
                params![pubkey, user_id],
            )?;
            Ok(())
        })
        .await?
    }

    async fn count(&self) -> anyhow::Result<i64> {
        let pool = self.pool.clone();
        tokio::task::spawn_blocking(move || {
            let conn = pool.get()?;
            let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
            Ok(count)
        })
        .await?
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn row_to_user(row: &rusqlite::Row<'_>) -> User {
    User {
        id: row.get_unwrap(0),
        email: row.get_unwrap(1),
        password_hash: row.get_unwrap(2),
        nostr_pubkey: row.get_unwrap(3),
        display_name: row.get_unwrap(4),
        api_key_hash: row.get_unwrap(5),
        is_admin: row.get::<_, i32>(6).unwrap_or(0) != 0,
        created_at: row.get_unwrap(7),
    }
}

fn get_user_by_id(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, email, password_hash, nostr_pubkey, display_name, api_key_hash, is_admin, created_at
         FROM users WHERE id = ?1",
    )?;
    Ok(stmt.query_row(params![id], |row| Ok(row_to_user(row))).optional()?)
}

fn row_to_short_link(row: &rusqlite::Row<'_>) -> ShortLink {
    let id_str: String = row.get_unwrap(0);
    let owner_str: String = row.get_unwrap(4);
    let is_active: i32 = row.get_unwrap(5);
    let expires_at_str: Option<String> = row.get_unwrap(6);
    let created_at_str: String = row.get_unwrap(8);

    ShortLink {
        id: Uuid::parse_str(&id_str).unwrap_or_default(),
        code: row.get_unwrap(1),
        target_url: row.get_unwrap(2),
        title: row.get_unwrap(3),
        link_type: "generic".to_string(),
        domain: "standalone".to_string(),
        app_key: "sovereign-link".to_string(),
        owner_user_id: Uuid::parse_str(&owner_str).ok(),
        owner_org_id: None,
        affiliate_code: None,
        is_active: is_active != 0,
        expires_at: expires_at_str.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&chrono::Utc))),
        created_at: chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
        updated_at: chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
    }
}

fn make_short_link(
    id: &str,
    code: &str,
    target_url: &str,
    title: Option<&str>,
    owner_user_id: Option<Uuid>,
    expires_at: Option<&str>,
    created_at: &str,
) -> ShortLink {
    let now = chrono::DateTime::parse_from_rfc3339(created_at)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(|_| chrono::Utc::now());

    ShortLink {
        id: Uuid::parse_str(id).unwrap_or_default(),
        code: code.to_string(),
        target_url: target_url.to_string(),
        title: title.map(|s| s.to_string()),
        link_type: "generic".to_string(),
        domain: "standalone".to_string(),
        app_key: "sovereign-link".to_string(),
        owner_user_id,
        owner_org_id: None,
        affiliate_code: None,
        is_active: true,
        expires_at: expires_at.and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&chrono::Utc))),
        created_at: now,
        updated_at: now,
    }
}

/// Generate a 6-char random alphanumeric code.
fn generate_short_code() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    (0..6)
        .map(|_| chars[rng.random_range(0..chars.len())])
        .collect()
}

/// Trait extension to make rusqlite query_row return Option on NotFound.
trait OptionalRow<T> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalRow<T> for Result<T, rusqlite::Error> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
