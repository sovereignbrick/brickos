// ============================================================================
//  brickos-licensing -- types: LicenseClaims, EffectiveTier, etc.
// ============================================================================

use serde::{Deserialize, Serialize};

/// The JWT claims for an organization license certificate. RS256-signed by
/// the platform private key, validated by every BrickOS app with the matching
/// public key.
///
/// See design 022 §6.1.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicenseClaims {
    /// Issuer (always "brickos-platform")
    pub iss: String,

    /// Subject -- the org UUID this license is for
    pub sub: String,

    /// Audience -- which apps this license grants access to
    /// e.g. ["sovereign-health", "sovereign-crm"]
    pub aud: Vec<String>,

    /// Issued at (unix timestamp)
    pub iat: i64,

    /// Expires at (unix timestamp)
    pub exp: i64,

    /// Not before (unix timestamp). Equal to iat in normal cases.
    pub nbf: i64,

    /// JWT ID -- used for revocation list lookup
    pub jti: String,

    /// Org display name (denormalized for offline display)
    pub org_name: String,

    /// Tier slug (e.g. "horizon", "insight", "custom")
    pub tier: String,

    /// Feature slugs granted by this license, namespaced by app
    /// e.g. ["shi.csv_export", "shi.pdf_reports", "branding.custom_logo"]
    pub features: Vec<String>,

    /// Seat caps per role
    pub max_owners: i32,
    pub max_practitioners: i32,
    pub max_members: i32,

    /// Billing rail used to create this license
    /// "manual_invoice" | "stripe_invoice" | "self_hosted"
    pub billing_model: String,
}

/// Input for generating a new license certificate.
#[derive(Debug, Clone)]
pub struct LicenseInput<'a> {
    pub org_id: &'a str,
    pub org_name: &'a str,
    pub tier: &'a str,
    pub aud: Vec<String>,
    pub features: Vec<String>,
    pub max_owners: i32,
    pub max_practitioners: i32,
    pub max_members: i32,
    pub expires_days: i64,
    pub billing_model: &'a str,
}

/// The result of resolving a user's effective tier in a given org context.
/// Used by feature gates throughout BrickOS apps.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveTier {
    pub tier_slug: String,
    pub features: Vec<String>,
    pub limits: Vec<TierFeature>,
    pub max_owners: i32,
    pub max_practitioners: i32,
    pub max_members: i32,
    pub source: LicenseSource,
}

/// Where the effective tier was sourced from. Used for audit + debugging.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LicenseSource {
    /// Stripe-driven user_licenses row (individual SaaS path)
    UserLicense,
    /// Stripe billing portal grace period (still on previous tier)
    GracePeriod,
    /// brickos admin override (audit field promoted to enforcement)
    AdminOverride,
    /// Active brickos.org_licenses JWT for this org
    OrgLicense,
    /// Self-hosted JWT loaded from disk (LICENSE_FILE env var)
    SelfHosted,
    /// Default fallback when no other source applies
    Default,
}

/// A single tier_features row -- maps a feature slug to a numeric limit and
/// i18n labels. Used by the in-app upgrade dialog and the brickos admin GUI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierFeature {
    pub feature_slug: String,
    pub included: bool,
    pub limit_value: Option<i64>,
    pub limit_label_en: Option<String>,
    pub limit_label_de: Option<String>,
}

impl EffectiveTier {
    /// Returns true if the tier grants the named feature.
    pub fn has_feature(&self, feature_slug: &str) -> bool {
        self.features.iter().any(|f| f == feature_slug)
    }

    /// Returns the numeric limit for a feature, or None if not gated by limit.
    pub fn limit_for(&self, feature_slug: &str) -> Option<i64> {
        self.limits
            .iter()
            .find(|f| f.feature_slug == feature_slug)
            .and_then(|f| f.limit_value)
    }

    /// Checks whether the org can add another member of the given role.
    /// Returns false (deny) if the seat cap is reached.
    pub fn allows_seat(&self, role: &str, current_count: i32) -> bool {
        match role {
            "org_owner" => current_count < self.max_owners,
            "practitioner" => current_count < self.max_practitioners,
            "member" => self.max_members < 0 || current_count < self.max_members,
            _ => true,
        }
    }
}
