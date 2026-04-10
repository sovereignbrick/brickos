// ============================================================================
//  brickos-licensing -- client mode
//
//  Used by SHI, CRM, Sovereign Link, and any other BrickOS app that is NOT
//  the brickos-platform-api itself. Makes HTTP calls to platform.brickos.io
//  and caches results locally for offline tolerance (370-day grace).
//
//  This module is a stub for #462. The full implementation lands in #464.
// ============================================================================

#![cfg(feature = "client")]

use crate::claims::EffectiveTier;
use crate::error::Result;
use crate::OrgContext;
use std::path::PathBuf;
use uuid::Uuid;

/// HTTP client + local cache for licensing lookups.
///
/// Holds a reqwest client, the platform API URL, the service account bearer
/// token, and the cache directory. Cheap to clone (all internal state is Arc).
#[derive(Clone)]
#[allow(dead_code)] // fields used by #464 (client mode runtime), kept for skeleton
pub struct ClientProvider {
    platform_url: String,
    service_token: String,
    cache_dir: PathBuf,
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
            cache_dir,
            http,
        }
    }

    /// Resolve a user's effective tier via HTTP, falling back to local cache
    /// if the platform is unreachable. After 370 days of offline operation,
    /// locks down to Glimpse. See design 022 §4.4.
    ///
    /// Stub for #462; full implementation in #464.
    pub async fn resolve_effective(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
    ) -> Result<EffectiveTier> {
        unimplemented!("issue #464 -- client mode + 370d offline grace")
    }

    /// Stub for #462; full implementation in #465.
    pub async fn has_feature(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
        _feature_slug: &str,
    ) -> Result<bool> {
        unimplemented!("issue #465 -- has_feature via client")
    }

    /// Returns the cache directory path. Useful for ops scripts that want to
    /// inspect or clear the local cache.
    pub fn cache_dir(&self) -> &PathBuf {
        &self.cache_dir
    }

    /// Returns the configured platform API URL.
    pub fn platform_url(&self) -> &str {
        &self.platform_url
    }

    #[allow(dead_code)] // used by #464
    pub(crate) fn http(&self) -> &reqwest::Client {
        &self.http
    }

    #[allow(dead_code)] // used by #464
    pub(crate) fn token(&self) -> &str {
        &self.service_token
    }
}
