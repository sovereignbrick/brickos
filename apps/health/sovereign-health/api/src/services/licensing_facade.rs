// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #467 part 2 -- SHI-side licensing facade.
//
// The seam between SHI's existing tier::check_feature API (which uses
// short legacy feature names like "csv_export") and the new
// brickos_licensing::EmbeddedProvider::has_feature API (which uses
// namespaced slugs like "shi.csv_export").
//
// This file is the M1 facade pattern from design 022 §13.5. The 14
// SHI files that call tier::check_feature continue to use the same
// short names; the mapping happens here in one place.
//
// Architecture:
//
//     handler.rs --> tier::check_feature(pool, user_id, "csv_export")
//                       |
//                       v
//                    [legacy tier.rs path -- reads license_tiers booleans]
//                       |
//                       | (when LICENSING_SHADOW_MODE is on)
//                       v
//                    [shadow_compare via licensing_facade]
//                       |
//                       v
//                    EmbeddedProvider::has_feature("shi.csv_export")
//                       |
//                       v
//                    [reads brickos.tier_features rows]
//
// In shadow mode, both paths run and any divergence is logged + metered.
// In non-shadow mode (default today), only the legacy path runs.
//
// After #467 part 3 (the full caller migration), the legacy path goes
// away and the facade becomes the only path.

use brickos_licensing::{embedded::EmbeddedProvider, OrgContext};
use sqlx::PgPool;
use uuid::Uuid;

/// Map a SHI legacy feature name to its namespaced brickos-licensing slug.
///
/// SHI uses short names like "csv_export" historically. brickos-licensing
/// uses prefixed slugs like "shi.csv_export" so the same crate can serve
/// CRM, Sovereign Link, and other apps without name collisions.
///
/// Returns None for unknown legacy names; callers should fall through to
/// the legacy path in that case (the legacy match-arm in tier.rs returns
/// `true` for unknown features, treating them as ungated).
pub fn legacy_to_namespaced(legacy: &str) -> Option<&'static str> {
    Some(match legacy {
        "csv_export" => "shi.csv_export",
        "json_export" => "shi.json_export",
        "custom_thresholds" => "shi.custom_thresholds",
        "lifestyle_presets" => "shi.lifestyle_presets",
        "protocol_comparison" => "shi.protocol_comparison",
        "body_composition" => "shi.body_composition",
        "supplement_marker_impact" => "shi.supplement_marker_impact",
        "ai_dashboard_insights" => "shi.ai_dashboard_insights",
        "cohort_comparison" => "shi.cohort_comparison",
        "mfa_totp" => "shi.mfa_totp",
        "api_access" => "shi.api_access",
        _ => return None,
    })
}

/// Run the brickos-licensing has_feature path for the given user + legacy
/// feature name. Returns Ok(allowed) if the feature could be resolved, or
/// Err on any database / mapping error.
///
/// This is called by the shadow_compare wrapper in tier::check_feature.
/// It does NOT consult the legacy path -- that's the caller's job to compare.
pub async fn has_feature_via_facade(
    provider: &EmbeddedProvider,
    user_id: Uuid,
    legacy_feature: &str,
) -> Result<bool, brickos_licensing::LicensingError> {
    let Some(namespaced) = legacy_to_namespaced(legacy_feature) else {
        // Unknown legacy feature -- the legacy match-arm in tier.rs returns
        // true (ungated). Mirror that here so the divergence comparison
        // doesn't false-positive on unrecognized features.
        return Ok(true);
    };

    provider
        .has_feature(user_id, OrgContext::Individual, namespaced)
        .await
}

/// Compare the result from the legacy path against the brickos-licensing
/// path and log any divergence to the metric `licensing_divergence`.
/// Returns the LEGACY result (the new path is observation-only in shadow
/// mode -- never affects user-visible behavior until #467 part 3).
///
/// Use case: wrap tier::check_feature calls during the shadow rollout window.
/// Read divergence logs + metric in tracing/metrics. Zero divergences over
/// one full smoke checklist cycle is the green light to flip the canonical
/// path in #467 part 3.
pub async fn shadow_compare_check_feature(
    legacy_result: bool,
    pool_for_shadow: Option<(&PgPool, &EmbeddedProvider, Uuid, &str)>,
) -> bool {
    let Some((_pool, provider, user_id, feature)) = pool_for_shadow else {
        return legacy_result;
    };

    match has_feature_via_facade(provider, user_id, feature).await {
        Ok(new_result) if new_result == legacy_result => {
            // Paths agree -- the happy case
        }
        Ok(new_result) => {
            tracing::error!(
                user_id = %user_id,
                feature = %feature,
                legacy = legacy_result,
                new = new_result,
                "LICENSING DIVERGENCE: legacy and brickos-licensing disagree on feature gate"
            );
            // TODO #467 part 3: increment metric `licensing_divergence` once
            // a metrics backend is wired into SHI. For now we rely on the
            // tracing::error log line.
        }
        Err(e) => {
            tracing::warn!(
                user_id = %user_id,
                feature = %feature,
                error = ?e,
                "shadow mode: brickos-licensing path errored, falling back to legacy"
            );
        }
    }

    legacy_result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_to_namespaced_known_features() {
        assert_eq!(legacy_to_namespaced("csv_export"), Some("shi.csv_export"));
        assert_eq!(legacy_to_namespaced("mfa_totp"), Some("shi.mfa_totp"));
        assert_eq!(
            legacy_to_namespaced("cohort_comparison"),
            Some("shi.cohort_comparison")
        );
    }

    #[test]
    fn legacy_to_namespaced_unknown_returns_none() {
        assert_eq!(legacy_to_namespaced("nonexistent"), None);
        assert_eq!(legacy_to_namespaced(""), None);
    }

    #[test]
    fn all_11_canonical_legacy_features_have_mapping() {
        // Source of truth: tier.rs:262-274 match arms
        let canonical = [
            "csv_export",
            "json_export",
            "custom_thresholds",
            "lifestyle_presets",
            "protocol_comparison",
            "body_composition",
            "supplement_marker_impact",
            "ai_dashboard_insights",
            "cohort_comparison",
            "mfa_totp",
            "api_access",
        ];
        for f in canonical {
            assert!(
                legacy_to_namespaced(f).is_some(),
                "missing mapping for canonical feature {f}"
            );
        }
    }
}
