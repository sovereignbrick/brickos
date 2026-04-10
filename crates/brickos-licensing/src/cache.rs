// ============================================================================
//  brickos-licensing -- local cache for client mode (#464 part 2)
//
//  JSON files on disk + in-memory mirror. Used by SHI / CRM / Sovereign Link
//  to keep working when platform.brickos.io is unreachable. Self-hosted
//  deployments rely on the cache for the entire offline period.
//
//  Layout (under cache_dir):
//      meta.json         -- {last_successful_refresh, schema_version}
//      registry.json     -- Vec<FeatureRegistryRow>
//      tier_features.json -- HashMap<tier_slug, Vec<TierFeature>>
//
//  370-day grace rule: if `now - last_successful_refresh > 370 days`, the
//  cache is considered locked down and reads return LicensingError::CacheStale.
//  Apps display a "license server unreachable" banner in this state.
//
//  See design 022 §4.4 for the freshness rules.
// ============================================================================

#![cfg(feature = "client")]

use crate::claims::{FeatureRegistryRow, TierFeature};
use crate::error::{LicensingError, Result};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

/// 370 days = 1 year + 5 days. Long enough that any annual maintenance contact
/// resets it. After this, the cache is considered locked down and reads fail.
pub const OFFLINE_GRACE_DAYS: i64 = 370;

const SCHEMA_VERSION: u32 = 1;

/// Persisted on disk under `<cache_dir>/meta.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheMeta {
    last_successful_refresh: Option<DateTime<Utc>>,
    schema_version: u32,
}

impl Default for CacheMeta {
    fn default() -> Self {
        Self {
            last_successful_refresh: None,
            schema_version: SCHEMA_VERSION,
        }
    }
}

/// In-memory cache state. Cloned cheaply via Arc<RwLock<...>>.
#[derive(Debug, Default, Clone)]
struct CacheState {
    meta: CacheMeta,
    features: Vec<FeatureRegistryRow>,
    tier_features: HashMap<String, Vec<TierFeature>>,
}

/// A clock abstraction so tests can travel through time without tokio::time::pause.
pub trait Clock: Send + Sync + 'static {
    fn now(&self) -> DateTime<Utc>;
}

/// Production clock -- always Utc::now().
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

/// Local cache for client mode. Holds an in-memory mirror of feature_registry +
/// tier_features, persisted to disk under `cache_dir`.
///
/// Cheap to clone -- internal state is Arc-wrapped.
#[derive(Clone)]
pub struct LocalCache {
    cache_dir: PathBuf,
    state: Arc<RwLock<CacheState>>,
    clock: Arc<dyn Clock>,
}

impl LocalCache {
    /// Construct a cache with the system clock. Does not perform any I/O --
    /// call `load_from_disk` to populate from existing files.
    pub fn new(cache_dir: PathBuf) -> Self {
        Self::with_clock(cache_dir, Arc::new(SystemClock))
    }

    /// Construct with an injectable clock (for tests).
    pub fn with_clock(cache_dir: PathBuf, clock: Arc<dyn Clock>) -> Self {
        Self {
            cache_dir,
            state: Arc::new(RwLock::new(CacheState::default())),
            clock,
        }
    }

    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }

    /// Load all cache files from disk into memory. Missing files are not an
    /// error -- they leave the corresponding in-memory section empty.
    /// Returns the loaded `last_successful_refresh` (or None if no meta.json).
    pub async fn load_from_disk(&self) -> Result<Option<DateTime<Utc>>> {
        // Ensure the directory exists so subsequent writes don't fail
        tokio::fs::create_dir_all(&self.cache_dir)
            .await
            .map_err(|e| LicensingError::Internal(format!("create cache_dir: {e}")))?;

        let mut state = self.state.write().await;

        if let Some(meta) = read_json::<CacheMeta>(&self.meta_path()).await? {
            state.meta = meta;
        }
        if let Some(features) = read_json::<Vec<FeatureRegistryRow>>(&self.registry_path()).await? {
            state.features = features;
        }
        if let Some(tier_features) =
            read_json::<HashMap<String, Vec<TierFeature>>>(&self.tier_features_path()).await?
        {
            state.tier_features = tier_features;
        }

        Ok(state.meta.last_successful_refresh)
    }

    /// Replace the entire in-memory cache with the given data and persist to
    /// disk. Sets `last_successful_refresh` to the clock's now().
    /// Called by ClientProvider after a successful refresh from the platform.
    pub async fn store(
        &self,
        features: Vec<FeatureRegistryRow>,
        tier_features: HashMap<String, Vec<TierFeature>>,
    ) -> Result<()> {
        tokio::fs::create_dir_all(&self.cache_dir)
            .await
            .map_err(|e| LicensingError::Internal(format!("create cache_dir: {e}")))?;

        let now = self.clock.now();
        {
            let mut state = self.state.write().await;
            state.meta = CacheMeta {
                last_successful_refresh: Some(now),
                schema_version: SCHEMA_VERSION,
            };
            state.features = features.clone();
            state.tier_features = tier_features.clone();
        }

        write_json(
            &self.meta_path(),
            &CacheMeta {
                last_successful_refresh: Some(now),
                schema_version: SCHEMA_VERSION,
            },
        )
        .await?;
        write_json(&self.registry_path(), &features).await?;
        write_json(&self.tier_features_path(), &tier_features).await?;
        Ok(())
    }

    /// Return the cached feature registry. Returns CacheStale if the 370-day
    /// grace has been exceeded; returns CacheEmpty if no data has been loaded.
    pub async fn get_features(&self) -> Result<Vec<FeatureRegistryRow>> {
        self.check_grace().await?;
        let state = self.state.read().await;
        if state.features.is_empty() {
            return Err(LicensingError::CacheEmpty);
        }
        Ok(state.features.clone())
    }

    /// Return the cached tier_features for a given tier slug. Same error
    /// behavior as get_features.
    pub async fn get_tier_features(&self, tier_slug: &str) -> Result<Vec<TierFeature>> {
        self.check_grace().await?;
        let state = self.state.read().await;
        if state.tier_features.is_empty() {
            return Err(LicensingError::CacheEmpty);
        }
        state
            .tier_features
            .get(tier_slug)
            .cloned()
            .ok_or_else(|| LicensingError::TierNotFound(tier_slug.to_string()))
    }

    /// Returns the timestamp of the last successful refresh, or None if the
    /// cache has never been refreshed.
    pub async fn last_refresh(&self) -> Option<DateTime<Utc>> {
        self.state.read().await.meta.last_successful_refresh
    }

    /// True iff the 370-day grace period has been exceeded since the last
    /// successful refresh. False if the cache has never been refreshed
    /// (a fresh install with no contact yet is not "stale" -- it has just
    /// never been refreshed).
    pub async fn is_locked_down(&self) -> bool {
        let state = self.state.read().await;
        let Some(last) = state.meta.last_successful_refresh else {
            return false;
        };
        let age = self.clock.now() - last;
        age > Duration::days(OFFLINE_GRACE_DAYS)
    }

    async fn check_grace(&self) -> Result<()> {
        if self.is_locked_down().await {
            return Err(LicensingError::CacheStale);
        }
        Ok(())
    }

    fn meta_path(&self) -> PathBuf {
        self.cache_dir.join("meta.json")
    }
    fn registry_path(&self) -> PathBuf {
        self.cache_dir.join("registry.json")
    }
    fn tier_features_path(&self) -> PathBuf {
        self.cache_dir.join("tier_features.json")
    }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    match tokio::fs::read(path).await {
        Ok(bytes) => {
            let parsed = serde_json::from_slice(&bytes)
                .map_err(|e| LicensingError::Internal(format!("parse {}: {e}", path.display())))?;
            Ok(Some(parsed))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(LicensingError::Internal(format!(
            "read {}: {e}",
            path.display()
        ))),
    }
}

async fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<()> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|e| LicensingError::Internal(format!("serialize {}: {e}", path.display())))?;
    // Atomic write: write to a temp file and rename.
    let tmp = path.with_extension("json.tmp");
    tokio::fs::write(&tmp, &bytes)
        .await
        .map_err(|e| LicensingError::Internal(format!("write {}: {e}", tmp.display())))?;
    tokio::fs::rename(&tmp, path).await.map_err(|e| {
        LicensingError::Internal(format!(
            "rename {} -> {}: {e}",
            tmp.display(),
            path.display()
        ))
    })?;
    Ok(())
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use std::sync::Mutex;

    /// A clock that returns whatever time the test sets. Used to verify the
    /// 370-day grace logic without actually waiting a year.
    #[derive(Debug, Clone)]
    struct MockClock {
        now: Arc<Mutex<DateTime<Utc>>>,
    }

    impl MockClock {
        fn new(now: DateTime<Utc>) -> Self {
            Self {
                now: Arc::new(Mutex::new(now)),
            }
        }

        fn set(&self, t: DateTime<Utc>) {
            *self.now.lock().unwrap() = t;
        }
    }

    impl Clock for MockClock {
        fn now(&self) -> DateTime<Utc> {
            *self.now.lock().unwrap()
        }
    }

    fn sample_features() -> Vec<FeatureRegistryRow> {
        vec![
            FeatureRegistryRow {
                slug: "shi.csv_export".to_string(),
                app_slug: "sovereign-health".to_string(),
                category: "reporting".to_string(),
                name_en: "CSV Export".to_string(),
                name_de: "CSV-Export".to_string(),
                description_en: None,
                description_de: None,
                is_active: true,
            },
            FeatureRegistryRow {
                slug: "branding.custom_logo".to_string(),
                app_slug: "_platform".to_string(),
                category: "branding".to_string(),
                name_en: "Custom Logo".to_string(),
                name_de: "Eigenes Logo".to_string(),
                description_en: None,
                description_de: None,
                is_active: true,
            },
        ]
    }

    fn sample_tier_features() -> HashMap<String, Vec<TierFeature>> {
        let mut m = HashMap::new();
        m.insert(
            "glimpse".to_string(),
            vec![TierFeature {
                feature_slug: "shi.markers_active".to_string(),
                included: true,
                limit_value: Some(10),
                limit_label_en: Some("10 active".to_string()),
                limit_label_de: Some("10 aktiv".to_string()),
            }],
        );
        m.insert(
            "horizon".to_string(),
            vec![TierFeature {
                feature_slug: "branding.custom_logo".to_string(),
                included: true,
                limit_value: None,
                limit_label_en: Some("yes".to_string()),
                limit_label_de: Some("ja".to_string()),
            }],
        );
        m
    }

    fn tempdir() -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("brickos-licensing-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[tokio::test]
    async fn empty_cache_returns_cache_empty() {
        let dir = tempdir();
        let cache = LocalCache::new(dir.clone());
        cache.load_from_disk().await.unwrap();

        let result = cache.get_features().await;
        assert!(matches!(result, Err(LicensingError::CacheEmpty)));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn store_then_load_returns_data() {
        let dir = tempdir();
        let cache = LocalCache::new(dir.clone());
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        let features = cache.get_features().await.unwrap();
        assert_eq!(features.len(), 2);
        assert!(features.iter().any(|f| f.slug == "shi.csv_export"));

        let glimpse = cache.get_tier_features("glimpse").await.unwrap();
        assert_eq!(glimpse.len(), 1);
        assert_eq!(glimpse[0].limit_value, Some(10));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn store_persists_to_disk_and_survives_new_cache_instance() {
        let dir = tempdir();

        // First instance: store
        let cache1 = LocalCache::new(dir.clone());
        cache1
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        // Second instance: load from disk
        let cache2 = LocalCache::new(dir.clone());
        cache2.load_from_disk().await.unwrap();

        let features = cache2.get_features().await.unwrap();
        assert_eq!(features.len(), 2);

        let last = cache2.last_refresh().await;
        assert!(
            last.is_some(),
            "last_refresh should be persisted to meta.json"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn never_refreshed_is_not_locked_down() {
        let dir = tempdir();
        let cache = LocalCache::new(dir.clone());
        // No store call, no load call -- pristine state
        assert!(!cache.is_locked_down().await);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn within_370_days_is_not_locked_down() {
        let dir = tempdir();
        let t0 = Utc.with_ymd_and_hms(2026, 4, 10, 12, 0, 0).unwrap();
        let mock = Arc::new(MockClock::new(t0));
        let cache = LocalCache::with_clock(dir.clone(), mock.clone());

        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        // Advance 369 days -- still within grace
        mock.set(t0 + Duration::days(369));
        assert!(!cache.is_locked_down().await);

        // Cache reads work fine
        cache.get_features().await.unwrap();

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn exactly_at_370_days_is_not_locked_down() {
        let dir = tempdir();
        let t0 = Utc.with_ymd_and_hms(2026, 4, 10, 12, 0, 0).unwrap();
        let mock = Arc::new(MockClock::new(t0));
        let cache = LocalCache::with_clock(dir.clone(), mock.clone());
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        // Exactly 370 days: age == OFFLINE_GRACE_DAYS, comparison is `>`, so not locked down
        mock.set(t0 + Duration::days(370));
        assert!(!cache.is_locked_down().await);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn past_370_days_locks_down() {
        let dir = tempdir();
        let t0 = Utc.with_ymd_and_hms(2026, 4, 10, 12, 0, 0).unwrap();
        let mock = Arc::new(MockClock::new(t0));
        let cache = LocalCache::with_clock(dir.clone(), mock.clone());
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        // 371 days later: locked down
        mock.set(t0 + Duration::days(371));
        assert!(cache.is_locked_down().await);

        // Reads return CacheStale
        let result = cache.get_features().await;
        assert!(matches!(result, Err(LicensingError::CacheStale)));

        let result = cache.get_tier_features("glimpse").await;
        assert!(matches!(result, Err(LicensingError::CacheStale)));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn refresh_resets_grace() {
        let dir = tempdir();
        let t0 = Utc.with_ymd_and_hms(2026, 4, 10, 12, 0, 0).unwrap();
        let mock = Arc::new(MockClock::new(t0));
        let cache = LocalCache::with_clock(dir.clone(), mock.clone());
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        // Advance past grace
        mock.set(t0 + Duration::days(400));
        assert!(cache.is_locked_down().await);

        // Re-store at the new time = successful refresh, grace resets
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();
        assert!(!cache.is_locked_down().await);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn unknown_tier_returns_tier_not_found() {
        let dir = tempdir();
        let cache = LocalCache::new(dir.clone());
        cache
            .store(sample_features(), sample_tier_features())
            .await
            .unwrap();

        let result = cache.get_tier_features("nonexistent").await;
        assert!(matches!(result, Err(LicensingError::TierNotFound(_))));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
