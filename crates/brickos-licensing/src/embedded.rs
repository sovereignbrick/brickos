// ============================================================================
//  brickos-licensing -- embedded mode
//
//  Used by brickos-platform-api itself: direct SQL against the brickos schema
//  in PlatformPool DB. No HTTP overhead.
//
//  This module is a stub for #462. The full implementation lands in #464.
// ============================================================================

#![cfg(feature = "embedded")]

use crate::claims::EffectiveTier;
use crate::error::Result;
use crate::OrgContext;
use sqlx::PgPool;
use uuid::Uuid;

/// Embedded licensing provider -- direct DB reads.
///
/// Holds a clone of the brickos PlatformPool. Cheap to construct because
/// PgPool is internally an Arc.
#[derive(Clone)]
pub struct EmbeddedProvider {
    pool: PgPool,
}

impl EmbeddedProvider {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Resolve a user's effective tier in the given org context.
    /// Stub for #462; full implementation in #464 + #465.
    pub async fn resolve_effective(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
    ) -> Result<EffectiveTier> {
        unimplemented!("issue #464/#465 -- effective tier resolver")
    }

    /// Check whether the user has a feature in the given org context.
    /// Stub for #462; full implementation in #465.
    pub async fn has_feature(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
        _feature_slug: &str,
    ) -> Result<bool> {
        unimplemented!("issue #465 -- has_feature")
    }

    /// Returns the underlying pool. Useful for handlers that need to issue
    /// their own queries (e.g. seat counts).
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}
