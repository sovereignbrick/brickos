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
    EffectiveTier, FeatureRegistryRow, LicenseSource, OrgLicenseRow, TierFeature, UserLicenseRow,
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
    // Effective tier resolution (issue #465)
    // ------------------------------------------------------------------------

    /// Resolve a user's effective tier in the given org context.
    ///
    /// Resolution order (design 022 §3.5, §2.5, §2.6):
    ///
    /// 1. **Org context**: load active org_licenses for the org. If found,
    ///    return EffectiveTier from the JWT claims. The org license takes
    ///    precedence over individual subscriptions while the user is acting
    ///    in an org context.
    ///
    /// 2. **Individual context**: load user_licenses row.
    ///    - If `admin_override = true` AND `admin_override_tier_slug IS NOT NULL`
    ///      AND `(admin_override_expires_at IS NULL OR > now())`,
    ///      return the override tier (LicenseSource::AdminOverride).
    ///    - Else if `status = 'downgrade_grace'` AND `grace_period_ends > now()`,
    ///      return the previous tier (LicenseSource::GracePeriod).
    ///    - Else return the current tier (LicenseSource::UserLicense).
    ///    - If no row at all, return Glimpse default (LicenseSource::Default).
    pub async fn resolve_effective(&self, user_id: Uuid, ctx: OrgContext) -> Result<EffectiveTier> {
        // Org path
        if let OrgContext::Org(org_id) = ctx {
            if let Some(org_license) = self.load_active_org_license(org_id).await? {
                return self.build_effective_from_org_license(org_license).await;
            }
            // Org has no active license -- fall through to user's individual tier
        }

        // Individual path
        let user_license = self.load_user_license(user_id).await?;

        let (tier_slug, source) = match user_license {
            None => ("glimpse".to_string(), LicenseSource::Default),
            Some(ul) => {
                let now = chrono::Utc::now();

                // Check admin override first (short-circuits all other paths)
                if ul.admin_override {
                    if let Some(override_slug) = ul.admin_override_tier_slug.clone() {
                        let still_valid = ul
                            .admin_override_expires_at
                            .map(|exp| exp > now)
                            .unwrap_or(true);
                        if still_valid {
                            (override_slug, LicenseSource::AdminOverride)
                        } else {
                            // Override expired -- fall through to normal resolution
                            self.resolve_normal(&ul, now)
                        }
                    } else {
                        self.resolve_normal(&ul, now)
                    }
                } else {
                    self.resolve_normal(&ul, now)
                }
            }
        };

        self.build_effective_from_tier_slug(tier_slug, source).await
    }

    /// Helper: normal (non-override) tier resolution. Honors grace period.
    fn resolve_normal(
        &self,
        ul: &UserLicenseRow,
        now: chrono::DateTime<chrono::Utc>,
    ) -> (String, LicenseSource) {
        if ul.status == "downgrade_grace" {
            if let Some(grace_end) = ul.grace_period_ends {
                if grace_end > now {
                    if let Some(prev) = ul.previous_tier_slug.clone() {
                        return (prev, LicenseSource::GracePeriod);
                    }
                }
            }
        }
        (ul.tier_slug.clone(), LicenseSource::UserLicense)
    }

    /// Helper: build EffectiveTier from a tier slug by loading its features.
    async fn build_effective_from_tier_slug(
        &self,
        tier_slug: String,
        source: LicenseSource,
    ) -> Result<EffectiveTier> {
        let limits = self.load_tier_features(&tier_slug).await?;
        let features: Vec<String> = limits.iter().map(|f| f.feature_slug.clone()).collect();

        Ok(EffectiveTier {
            tier_slug,
            features,
            limits,
            // Individual users have implicit seat caps of 1/0/0
            max_owners: 1,
            max_practitioners: 0,
            max_members: 0,
            source,
        })
    }

    /// Helper: build EffectiveTier from an org_licenses row. The row's
    /// features list is the source of truth (it was set when the JWT was
    /// issued); we still load the tier_features for limit_value lookups.
    async fn build_effective_from_org_license(
        &self,
        org_license: OrgLicenseRow,
    ) -> Result<EffectiveTier> {
        let limits = self.load_tier_features(&org_license.tier_slug).await?;

        Ok(EffectiveTier {
            tier_slug: org_license.tier_slug,
            features: org_license.features,
            limits,
            max_owners: org_license.max_owners,
            max_practitioners: org_license.max_practitioners,
            max_members: org_license.max_members,
            source: LicenseSource::OrgLicense,
        })
    }

    /// Returns true iff the resolved effective tier grants the named feature.
    pub async fn has_feature(
        &self,
        user_id: Uuid,
        ctx: OrgContext,
        feature_slug: &str,
    ) -> Result<bool> {
        let tier = self.resolve_effective(user_id, ctx).await?;
        Ok(tier.has_feature(feature_slug))
    }
}
