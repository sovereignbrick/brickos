// ============================================================================
//  brickos-licensing -- client mode
//
//  Used by SHI, CRM, Sovereign Link, and any other BrickOS app that is NOT
//  the brickos-platform-api itself. Reads from a local cache populated by
//  HTTP refreshes against platform.brickos.io. The cache survives process
//  restarts and provides 370-day offline grace per design 022 §4.4.
//
//  Refresh strategy (simplified for #464 part 2):
//      1. ClientProvider::new(...).load_cache() at app startup
//      2. The hosting app (SHI, CRM, ...) calls refresh() periodically
//         (e.g. once per hour from a tokio task)
//      3. If refresh() fails, the cached data continues to be served
//      4. After 370 days without a successful refresh, all reads return
//         CacheStale and the app should display a "license server
//         unreachable" banner
//
//  HTTP contract (target endpoints, NOT YET wired in brickos-platform-api):
//      GET /licensing/features          -> Vec<FeatureRegistryRow>
//      GET /licensing/tiers/{slug}/features -> Vec<TierFeature>
//      GET /licensing/orgs/{id}/license -> Option<OrgLicenseRow>
//      GET /licensing/users/{id}/license -> Option<UserLicenseRow>
//
//  These endpoints are scheduled for the brickos-platform-api side of #465.
//  Until they exist, refresh() returns Internal("not yet implemented") and
//  the client falls back to whatever was last loaded from disk.
// ============================================================================

#![cfg(feature = "client")]

use crate::cache::LocalCache;
use crate::claims::{FeatureRegistryRow, TierFeature};
use crate::error::{LicensingError, Result};
use std::path::PathBuf;

/// HTTP client + local cache for licensing lookups.
///
/// Holds a reqwest client, the platform API URL, the service account bearer
/// token, and a LocalCache. Cheap to clone (all internal state is Arc).
#[derive(Clone)]
pub struct ClientProvider {
    platform_url: String,
    service_token: String,
    cache: LocalCache,
    http: reqwest::Client,
}

impl ClientProvider {
    pub fn new(platform_url: String, service_token: String, cache_dir: PathBuf) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("reqwest client builder must succeed with rustls");

        Self {
            platform_url,
            service_token,
            cache: LocalCache::new(cache_dir),
            http,
        }
    }

    /// Load any existing cache files from disk into memory. Call this once
    /// at app startup. Missing files are not an error.
    pub async fn load_cache(&self) -> Result<()> {
        self.cache.load_from_disk().await?;
        Ok(())
    }

    /// Returns the cache directory path. Useful for ops scripts that want to
    /// inspect or clear the local cache.
    pub fn cache_dir(&self) -> &std::path::Path {
        self.cache.cache_dir()
    }

    /// Returns the configured platform API URL.
    pub fn platform_url(&self) -> &str {
        &self.platform_url
    }

    /// Whether the cache is locked down due to 370-day offline grace expiry.
    /// Apps should display a "license server unreachable" banner when true.
    pub async fn is_locked_down(&self) -> bool {
        self.cache.is_locked_down().await
    }

    /// Returns the timestamp of the last successful refresh, or None if the
    /// cache has never been refreshed.
    pub async fn last_refresh(&self) -> Option<chrono::DateTime<chrono::Utc>> {
        self.cache.last_refresh().await
    }

    // ------------------------------------------------------------------------
    // Cache reads (the hot path -- no network calls)
    // ------------------------------------------------------------------------

    /// Read the feature registry from the local cache. Returns CacheStale
    /// if the 370-day grace has expired, CacheEmpty if no data has ever
    /// been cached.
    pub async fn load_feature_registry(&self) -> Result<Vec<FeatureRegistryRow>> {
        self.cache.get_features().await
    }

    /// Read tier_features for a tier from the local cache.
    pub async fn load_tier_features(&self, tier_slug: &str) -> Result<Vec<TierFeature>> {
        self.cache.get_tier_features(tier_slug).await
    }

    // ------------------------------------------------------------------------
    // Refresh from platform (called periodically by the hosting app)
    // ------------------------------------------------------------------------

    /// Fetch the latest feature registry + tier_features from the platform
    /// API and store them in the local cache. On success, the 370-day grace
    /// timer resets. On failure, returns the underlying HTTP error and the
    /// cached data continues to be served.
    ///
    /// **NOT YET IMPLEMENTED** -- the brickos-platform-api side of these
    /// endpoints lands in #465 follow-up. For now, this method returns an
    /// Internal error so the cache fall-through path is exercised in tests.
    pub async fn refresh(&self) -> Result<()> {
        Err(LicensingError::Internal(
            "platform /licensing endpoints not yet wired -- see #465 follow-up".into(),
        ))
    }

    /// Internal accessors used by the future HTTP refresh implementation.
    /// Kept private until the platform endpoints exist.
    #[allow(dead_code)] // wired in #465 follow-up
    pub(crate) fn http(&self) -> &reqwest::Client {
        &self.http
    }

    #[allow(dead_code)] // wired in #465 follow-up
    pub(crate) fn token(&self) -> &str {
        &self.service_token
    }
}
