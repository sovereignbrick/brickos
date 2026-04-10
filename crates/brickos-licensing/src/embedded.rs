// ============================================================================
//  brickos-licensing -- embedded mode runtime
//
//  Used by brickos-platform-api itself: direct SQL against the brickos schema
//  in PlatformPool DB. No HTTP overhead.
//
//  This module implements the data access layer (issue #464). The higher-level
//  resolver (#465) sits on top and adds business logic (admin override
//  short-circuit, grace period handling, individual vs org context routing).
// ============================================================================

#![cfg(feature = "embedded")]

use crate::claims::{
    EffectiveTier, FeatureRegistryRow, OrgLicenseRow, TierFeature, UserLicenseRow,
};
use crate::error::{LicensingError, Result};
use crate::OrgContext;
use sqlx::PgPool;
use sqlx::Row;
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

    /// Returns the underlying pool. Useful for handlers that need to issue
    /// their own queries (e.g. seat counts in #469).
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ------------------------------------------------------------------------
    // Feature registry
    // ------------------------------------------------------------------------

    /// Load every active feature from `brickos.feature_registry`.
    /// Used by the brickos admin GUI feature picker (#479) and to populate
    /// the client mode local cache (#464 part 2).
    pub async fn load_feature_registry(&self) -> Result<Vec<FeatureRegistryRow>> {
        let rows = sqlx::query(
            r#"SELECT slug, app_slug, category, name_en, name_de,
                      description_en, description_de, is_active
               FROM brickos.feature_registry
               WHERE is_active = true
               ORDER BY app_slug, category, slug"#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| FeatureRegistryRow {
                slug: r.get("slug"),
                app_slug: r.get("app_slug"),
                category: r.get("category"),
                name_en: r.get("name_en"),
                name_de: r.get("name_de"),
                description_en: r.try_get("description_en").ok(),
                description_de: r.try_get("description_de").ok(),
                is_active: r.get("is_active"),
            })
            .collect())
    }

    /// Load all `tier_features` rows for a given tier slug.
    /// Returns the canonical feature list with limit values + i18n labels.
    pub async fn load_tier_features(&self, tier_slug: &str) -> Result<Vec<TierFeature>> {
        let rows = sqlx::query(
            r#"SELECT feature_slug, included, limit_value, limit_label_en, limit_label_de
               FROM brickos.tier_features
               WHERE tier_slug = $1 AND included = true
               ORDER BY feature_slug"#,
        )
        .bind(tier_slug)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| TierFeature {
                feature_slug: r.get("feature_slug"),
                included: r.get("included"),
                limit_value: r.try_get("limit_value").ok(),
                limit_label_en: r.try_get("limit_label_en").ok(),
                limit_label_de: r.try_get("limit_label_de").ok(),
            })
            .collect())
    }

    // ------------------------------------------------------------------------
    // Org licenses
    // ------------------------------------------------------------------------

    /// Load the active (non-revoked) license for an organization.
    /// Returns None if the org has no active license. The partial unique
    /// index `idx_org_licenses_org_active` guarantees at most one row.
    pub async fn load_active_org_license(&self, org_id: Uuid) -> Result<Option<OrgLicenseRow>> {
        let row = sqlx::query(
            r#"SELECT id, org_id, tier_slug, features, max_owners, max_practitioners,
                      max_members, issued_at, expires_at, revoked_at, jwt_token, jti
               FROM brickos.org_licenses
               WHERE org_id = $1 AND revoked_at IS NULL
               LIMIT 1"#,
        )
        .bind(org_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(r) = row else { return Ok(None) };

        let features: serde_json::Value = r.get("features");
        let features: Vec<String> = serde_json::from_value(features)
            .map_err(|e| LicensingError::Internal(format!("org_licenses.features parse: {e}")))?;

        Ok(Some(OrgLicenseRow {
            id: r.get("id"),
            org_id: r.get("org_id"),
            tier_slug: r.get("tier_slug"),
            features,
            max_owners: r.get("max_owners"),
            max_practitioners: r.get("max_practitioners"),
            max_members: r.get("max_members"),
            issued_at: r.get("issued_at"),
            expires_at: r.get("expires_at"),
            revoked_at: r.try_get("revoked_at").ok().flatten(),
            jwt_token: r.get("jwt_token"),
            jti: r.get("jti"),
        }))
    }

    /// Check whether a JWT id is on the revocation list.
    /// Used by `validate_license` callers after JWT signature verification.
    pub async fn is_revoked(&self, jti: Uuid) -> Result<bool> {
        let row = sqlx::query("SELECT 1 FROM brickos.org_licenses_revoked WHERE jti = $1 LIMIT 1")
            .bind(jti)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.is_some())
    }

    // ------------------------------------------------------------------------
    // User licenses (Stripe-driven, individual SaaS path)
    // ------------------------------------------------------------------------

    /// Load the user_licenses row for a given user, joined with the tier slug
    /// from license_tiers. Returns None if the user has no row -- caller should
    /// fall back to Glimpse default in that case.
    pub async fn load_user_license(&self, user_id: Uuid) -> Result<Option<UserLicenseRow>> {
        let row = sqlx::query(
            r#"SELECT ul.user_id,
                      lt.slug AS tier_slug,
                      ul.status,
                      ul.grace_period_ends,
                      ul.previous_tier_slug,
                      ul.admin_override,
                      ul.admin_override_tier_slug,
                      ul.admin_override_expires_at
               FROM brickos.user_licenses ul
               JOIN brickos.license_tiers lt ON lt.id = ul.tier_id
               WHERE ul.user_id = $1
               LIMIT 1"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(r) = row else { return Ok(None) };

        Ok(Some(UserLicenseRow {
            user_id: r.get("user_id"),
            tier_slug: r.get("tier_slug"),
            status: r.get("status"),
            grace_period_ends: r.try_get("grace_period_ends").ok().flatten(),
            previous_tier_slug: r.try_get("previous_tier_slug").ok().flatten(),
            admin_override: r.try_get("admin_override").unwrap_or(false),
            admin_override_tier_slug: r.try_get("admin_override_tier_slug").ok().flatten(),
            admin_override_expires_at: r.try_get("admin_override_expires_at").ok().flatten(),
        }))
    }

    // ------------------------------------------------------------------------
    // Org members (seat enforcement helpers, used by #469)
    // ------------------------------------------------------------------------

    /// Count current members of a given role in an org. Used by seat
    /// enforcement before allowing add_org_member to insert.
    pub async fn count_org_members_by_role(&self, org_id: Uuid, role: &str) -> Result<i64> {
        let row = sqlx::query(
            "SELECT COUNT(*)::BIGINT AS c FROM brickos.org_members WHERE org_id = $1 AND role = $2",
        )
        .bind(org_id)
        .bind(role)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.get("c"))
    }

    // ------------------------------------------------------------------------
    // Effective tier resolution -- stub for #465
    // ------------------------------------------------------------------------

    /// Stub for #465 -- the resolver lives in services/effective_tier.rs and
    /// is implemented in the next issue.
    pub async fn resolve_effective(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
    ) -> Result<EffectiveTier> {
        Err(LicensingError::Internal(
            "resolve_effective not yet implemented (issue #465)".into(),
        ))
    }

    /// Stub for #465 -- depends on resolve_effective.
    pub async fn has_feature(
        &self,
        _user_id: Uuid,
        _ctx: OrgContext,
        _feature_slug: &str,
    ) -> Result<bool> {
        Err(LicensingError::Internal(
            "has_feature not yet implemented (issue #465)".into(),
        ))
    }
}
