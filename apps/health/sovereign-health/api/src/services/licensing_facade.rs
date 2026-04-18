// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// SHI licensing facade -- maps legacy short feature names to namespaced
// brickos-licensing slugs. Used by #539 (planned migration of
// load_tier_features to query brickos.tier_features).
//
// Sprint 043 Phase A removed the shadow-mode infrastructure
// (has_feature_via_facade, shadow_compare_check_feature) since the
// shadow gate in tier::check_feature had zero callers.

/// Map a SHI legacy feature name to its namespaced brickos-licensing slug.
///
/// SHI uses short names like "csv_export" historically. brickos-licensing
/// uses prefixed slugs like "shi.csv_export" so the same crate can serve
/// CRM, Sovereign Link, and other apps without name collisions.
///
/// Returns None for unknown legacy names.
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
