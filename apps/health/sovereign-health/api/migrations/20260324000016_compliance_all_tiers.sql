-- Sprint 013: Compliance — all tiers green check
-- These frameworks apply to the platform itself, not per-tier

UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id IN (
    SELECT id FROM product_features WHERE feature_key IN (
        'compliance_gdpr', 'compliance_hipaa', 'compliance_nis2', 'compliance_iso27001', 'compliance_soc2'
    )
);
