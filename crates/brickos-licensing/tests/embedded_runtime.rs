// ============================================================================
//  brickos-licensing integration tests -- embedded mode runtime (#464)
//
//  These tests run against a real postgres instance. They are gated on the
//  TEST_DATABASE_URL env var so they can be skipped in unit-test runs and
//  enabled in CI / local dev. Set TEST_DATABASE_URL to point at a postgres
//  with the brickos schema migrations 009-011 applied.
//
//  Quick local run:
//      docker run -d --name s40-test-pg --rm \
//          -e POSTGRES_USER=brickos -e POSTGRES_PASSWORD=test -e POSTGRES_DB=brickos_test \
//          -p 5499:5432 postgres:16
//      sleep 3
//      # apply migrations 009/010/011 against this DB (with stub schema)
//      TEST_DATABASE_URL="postgres://brickos:test@localhost:5499/brickos_test" \
//          cargo test -p brickos-licensing --test embedded_runtime
//      docker stop s40-test-pg
// ============================================================================

#![cfg(feature = "embedded")]

use brickos_licensing::embedded::EmbeddedProvider;
use sqlx::PgPool;
use uuid::Uuid;

/// Returns a pool against TEST_DATABASE_URL, or `None` if the env var is unset.
async fn try_pool() -> Option<PgPool> {
    let url = std::env::var("TEST_DATABASE_URL").ok()?;
    PgPool::connect(&url).await.ok()
}

/// Macro for tests that need a real DB. Skips with a printed message if no DB
/// is available, so the unit-test run stays green even without TEST_DATABASE_URL.
/// Pass the binding name as the second argument to satisfy macro hygiene.
macro_rules! db_test {
    ($name:ident, $p:ident, $body:block) => {
        #[tokio::test]
        async fn $name() {
            let Some(pool) = try_pool().await else {
                eprintln!(
                    "skipping {} -- TEST_DATABASE_URL not set or postgres unreachable",
                    stringify!($name)
                );
                return;
            };
            #[allow(unused_variables)]
            let $p: EmbeddedProvider = EmbeddedProvider::new(pool);
            $body
        }
    };
}

db_test!(load_feature_registry_returns_seeded_features, p, {
    let features = p.load_feature_registry().await.expect("load");
    // Migration 011 seeds 28 features (20 sovereign-health + 8 _platform)
    assert!(
        features.len() >= 28,
        "expected >= 28 features, got {}",
        features.len()
    );

    // Verify some specific known features exist
    let slugs: Vec<&str> = features.iter().map(|f| f.slug.as_str()).collect();
    assert!(slugs.contains(&"shi.csv_export"));
    assert!(slugs.contains(&"shi.markers_active"));
    assert!(slugs.contains(&"shi.calculated_markers"));
    assert!(slugs.contains(&"branding.custom_logo"));
    assert!(slugs.contains(&"support.priority"));

    // Namespace correctness
    let shi: Vec<_> = features
        .iter()
        .filter(|f| f.app_slug == "sovereign-health")
        .collect();
    let platform: Vec<_> = features
        .iter()
        .filter(|f| f.app_slug == "_platform")
        .collect();
    assert!(
        shi.len() >= 20,
        "expected >= 20 shi.* features, got {}",
        shi.len()
    );
    assert!(
        platform.len() >= 8,
        "expected >= 8 _platform features, got {}",
        platform.len()
    );
});

db_test!(load_tier_features_glimpse_canonical_limits, p, {
    let features = p.load_tier_features("glimpse").await.expect("load");
    assert!(
        !features.is_empty(),
        "glimpse must have at least one feature"
    );

    // Locked decision Q1: Glimpse = 10 active markers
    let markers = features
        .iter()
        .find(|f| f.feature_slug == "shi.markers_active")
        .expect("glimpse must include shi.markers_active");
    assert!(markers.included);
    assert_eq!(
        markers.limit_value,
        Some(10),
        "Glimpse must have exactly 10 active markers"
    );

    // Locked decision: calculated markers unlimited for ALL tiers
    let calc = features
        .iter()
        .find(|f| f.feature_slug == "shi.calculated_markers")
        .expect("glimpse must include shi.calculated_markers");
    assert!(calc.included);
    assert_eq!(
        calc.limit_value, None,
        "calculated_markers must be unlimited (NULL limit) on Glimpse"
    );

    // Locked decision: 30 days history on Glimpse
    let history = features
        .iter()
        .find(|f| f.feature_slug == "shi.history_days")
        .expect("glimpse must include shi.history_days");
    assert_eq!(history.limit_value, Some(30));
});

db_test!(load_tier_features_calc_unlimited_all_tiers, p, {
    // Verify the locked decision: calculated markers unlimited everywhere
    for tier in ["glimpse", "focus", "insight", "clarity", "horizon", "core"] {
        let features = p.load_tier_features(tier).await.expect("load");
        let calc = features
            .iter()
            .find(|f| f.feature_slug == "shi.calculated_markers");
        assert!(
            calc.is_some(),
            "tier {tier} must include shi.calculated_markers"
        );
        let calc = calc.unwrap();
        assert!(calc.included, "calc must be included for tier {tier}");
        assert_eq!(
            calc.limit_value, None,
            "calculated_markers must be unlimited (NULL) for tier {tier}"
        );
    }
});

db_test!(load_active_org_license_none_for_unknown_org, p, {
    let unknown = Uuid::new_v4();
    let result = p.load_active_org_license(unknown).await.expect("load");
    assert!(result.is_none(), "unknown org must return None");
});

db_test!(is_revoked_false_for_random_jti, p, {
    let random = Uuid::new_v4();
    let revoked = p.is_revoked(random).await.expect("query");
    assert!(!revoked, "random jti must not be on the revocation list");
});

db_test!(load_user_license_none_for_unknown_user, p, {
    let unknown = Uuid::new_v4();
    let result = p.load_user_license(unknown).await.expect("load");
    assert!(result.is_none(), "unknown user must return None");
});

db_test!(count_org_members_zero_for_unknown_org, p, {
    let unknown = Uuid::new_v4();
    let count = p
        .count_org_members_by_role(unknown, "org_owner")
        .await
        .expect("count");
    assert_eq!(count, 0);
});

db_test!(focus_includes_csv_export_glimpse_does_not, p, {
    let glimpse = p.load_tier_features("glimpse").await.expect("load");
    let focus = p.load_tier_features("focus").await.expect("load");

    // Glimpse: csv_export NOT included (so should not appear in the included-only list)
    assert!(
        !glimpse.iter().any(|f| f.feature_slug == "shi.csv_export"),
        "Glimpse must NOT include shi.csv_export"
    );

    // Focus: csv_export included
    assert!(
        focus.iter().any(|f| f.feature_slug == "shi.csv_export"),
        "Focus must include shi.csv_export"
    );
});

// ============================================================================
//  Resolver tests (issue #465)
//
//  These tests insert real users + user_licenses rows + (optionally) org rows
//  and verify the effective tier resolver returns the correct tier + source.
// ============================================================================

use brickos_licensing::{LicenseSource, OrgContext};

/// Insert a fresh user and a user_licenses row pointing at the given tier.
/// Returns the user_id.
async fn insert_user_with_tier(p: &EmbeddedProvider, tier_slug: &str) -> Uuid {
    let user_id = Uuid::new_v4();
    sqlx::query("INSERT INTO brickos.users (id, email) VALUES ($1, $2)")
        .bind(user_id)
        .bind(format!("{user_id}@test.local"))
        .execute(p.pool())
        .await
        .expect("insert user");

    let tier_id: Uuid = sqlx::query_scalar("SELECT id FROM brickos.license_tiers WHERE slug = $1")
        .bind(tier_slug)
        .fetch_one(p.pool())
        .await
        .expect("tier lookup");

    sqlx::query(
        "INSERT INTO brickos.user_licenses (user_id, tier_id, status) VALUES ($1, $2, 'active')",
    )
    .bind(user_id)
    .bind(tier_id)
    .execute(p.pool())
    .await
    .expect("insert user_license");

    user_id
}

db_test!(resolver_unknown_user_returns_glimpse_default, p, {
    let unknown = Uuid::new_v4();
    let tier = p
        .resolve_effective(unknown, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(tier.tier_slug, "glimpse");
    assert_eq!(tier.source, LicenseSource::Default);
    assert!(tier.features.iter().any(|f| f == "shi.markers_active"));
});

db_test!(resolver_focus_user_individual_context, p, {
    let user_id = insert_user_with_tier(&p, "focus").await;
    let tier = p
        .resolve_effective(user_id, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(tier.tier_slug, "focus");
    assert_eq!(tier.source, LicenseSource::UserLicense);
    assert!(tier.features.iter().any(|f| f == "shi.csv_export"));
});

db_test!(resolver_admin_override_active_short_circuits, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;

    // Apply admin override -> insight
    sqlx::query(
        "UPDATE brickos.user_licenses
         SET admin_override = true,
             admin_override_tier_slug = 'insight',
             admin_override_expires_at = NULL
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(p.pool())
    .await
    .expect("set override");

    let tier = p
        .resolve_effective(user_id, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(tier.tier_slug, "insight");
    assert_eq!(tier.source, LicenseSource::AdminOverride);
});

db_test!(resolver_admin_override_expired_falls_through, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;

    sqlx::query(
        "UPDATE brickos.user_licenses
         SET admin_override = true,
             admin_override_tier_slug = 'insight',
             admin_override_expires_at = NOW() - INTERVAL '1 day'
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(p.pool())
    .await
    .expect("set expired override");

    let tier = p
        .resolve_effective(user_id, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(
        tier.tier_slug, "glimpse",
        "expired override must fall through"
    );
    assert_eq!(tier.source, LicenseSource::UserLicense);
});

db_test!(resolver_grace_period_returns_previous_tier, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;

    // Simulate downgrade grace: user is "currently" on glimpse but previously on focus
    sqlx::query(
        "UPDATE brickos.user_licenses
         SET status = 'downgrade_grace',
             previous_tier_slug = 'focus',
             grace_period_ends = NOW() + INTERVAL '7 days'
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(p.pool())
    .await
    .expect("set grace");

    let tier = p
        .resolve_effective(user_id, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(tier.tier_slug, "focus");
    assert_eq!(tier.source, LicenseSource::GracePeriod);
});

db_test!(resolver_grace_period_expired_returns_current_tier, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;
    sqlx::query(
        "UPDATE brickos.user_licenses
         SET status = 'downgrade_grace',
             previous_tier_slug = 'focus',
             grace_period_ends = NOW() - INTERVAL '1 day'
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(p.pool())
    .await
    .expect("set expired grace");

    let tier = p
        .resolve_effective(user_id, OrgContext::Individual)
        .await
        .expect("resolve");
    assert_eq!(
        tier.tier_slug, "glimpse",
        "expired grace returns current tier"
    );
    assert_eq!(tier.source, LicenseSource::UserLicense);
});

db_test!(has_feature_glimpse_blocks_csv_export, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;
    let allowed = p
        .has_feature(user_id, OrgContext::Individual, "shi.csv_export")
        .await
        .expect("check");
    assert!(!allowed, "Glimpse must NOT have shi.csv_export");
});

db_test!(has_feature_focus_allows_csv_export, p, {
    let user_id = insert_user_with_tier(&p, "focus").await;
    let allowed = p
        .has_feature(user_id, OrgContext::Individual, "shi.csv_export")
        .await
        .expect("check");
    assert!(allowed, "Focus must have shi.csv_export");
});

db_test!(has_feature_calc_markers_unlimited_for_glimpse, p, {
    let user_id = insert_user_with_tier(&p, "glimpse").await;
    let allowed = p
        .has_feature(user_id, OrgContext::Individual, "shi.calculated_markers")
        .await
        .expect("check");
    assert!(
        allowed,
        "Glimpse must include calculated_markers (locked decision: unlimited for all tiers)"
    );
});

db_test!(horizon_includes_branding_features, p, {
    let horizon = p.load_tier_features("horizon").await.expect("load");

    let branding_features: Vec<&str> = horizon
        .iter()
        .filter(|f| f.feature_slug.starts_with("branding."))
        .map(|f| f.feature_slug.as_str())
        .collect();

    assert!(
        branding_features.len() >= 3,
        "Horizon must include at least 3 branding.* features, got {}",
        branding_features.len()
    );
    assert!(branding_features.contains(&"branding.custom_logo"));
    assert!(branding_features.contains(&"branding.custom_domain"));
});
