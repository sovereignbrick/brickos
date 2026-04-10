// ============================================================================
//  BrickOS -- Shared Licensing Service
//
//  The single source of truth for tier resolution, feature gates, and signed
//  RS256 license certificates across all BrickOS apps. Used by SHI, CRM,
//  Sovereign Link, and the brickos-platform-api itself.
//
//  Architecture (design 022):
//
//      brickos-platform-api (embedded mode)
//          |
//          |  reads: feature_registry, tier_features, org_licenses
//          v
//      brickos schema in PlatformPool DB
//
//      SHI / CRM / Link (client mode)
//          |
//          |  HTTP -> /licensing/* on platform.brickos.io
//          |  local cache for offline (370-day grace)
//          v
//      brickos-platform-api (embedded mode)
//
//  https://brickos.io/
//  AGPL-3.0 -- https://github.com/sovereignbrick/brickos
// ============================================================================

pub mod claims;
pub mod error;
pub mod jwt;

#[cfg(feature = "embedded")]
pub mod embedded;

#[cfg(feature = "client")]
pub mod cache;

#[cfg(feature = "client")]
pub mod client;

pub use claims::{
    EffectiveTier, FeatureRegistryRow, LicenseClaims, LicenseInput, LicenseSource, OrgLicenseRow,
    TierFeature, UserLicenseRow,
};
pub use error::{LicensingError, Result};
pub use jwt::{generate_license, validate_license};

/// Crate version, exposed so apps can log which licensing client they use.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// The fixed UUID of the platform-wide "Individual User" pseudo-org.
/// Users with no `brickos.org_members` row are implicitly members of this org.
/// Inserted by migration 010_individual_pseudo_org.sql.
pub const INDIVIDUAL_ORG_UUID: &str = "00000000-0000-0000-0000-000000000001";

/// The org context for a tier resolution call. Either an explicit org or the
/// individual pseudo-org.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrgContext {
    Individual,
    Org(uuid::Uuid),
}

impl OrgContext {
    /// Returns the UUID for this context. For Individual it returns the
    /// platform-wide system org UUID.
    pub fn uuid(&self) -> uuid::Uuid {
        match self {
            OrgContext::Individual => uuid::Uuid::parse_str(INDIVIDUAL_ORG_UUID).unwrap(),
            OrgContext::Org(id) => *id,
        }
    }

    pub fn is_individual(&self) -> bool {
        matches!(self, OrgContext::Individual)
    }
}
