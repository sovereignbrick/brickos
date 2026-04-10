// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #470 -- Tier x feature regression matrix
//
// The M3 safety net for #467 (SHI tier.rs facade refactor). Tests every
// (tier, feature) combination against the canonical truth table from
// design 022 §2.2-§2.3 and brickos-db migration 011_roles_consolidation_canonical_seed.
//
// These tests run against the OLD tier.rs today and MUST continue to pass
// against the NEW brickos-licensing facade after #467 ships. Any divergence
// is a real regression and the refactor must be reverted.
//
// Skips cleanly when DATABASE_URL is unset (no DB available).

mod common;

use sovereign_health_backend::error::AppError;
use sovereign_health_backend::services::tier;
use sqlx::{PgPool, Row};
use uuid::Uuid;

/// All 5 retail tiers covered by the matrix. Core is self-hosted and gets
/// unlimited everything via SHI_MODE=oss; not part of this test.
const TIERS: &[&str] = &["glimpse", "focus", "insight", "clarity", "horizon"];

/// Every gated feature in SHI's tier::check_feature match arm.
/// (lib.rs source of truth: services/tier.rs:262-274)
const FEATURES: &[&str] = &[
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

/// Canonical truth table per design 022 §2.2-§2.3 + migration
/// 011_roles_consolidation_canonical_seed.
///
/// Returns true iff the named feature should be ALLOWED on the named tier.
/// Any divergence between this table and the actual gate behavior is a
/// regression worth investigating.
///
/// IMPORTANT: MFA TOTP is universal per design 022 §2.2 ("always available,
/// never gated"). It is allowed on every tier including Glimpse. The
/// brickos-side matrix test caught a bug in the original truth table where
/// mfa_totp was denied on Glimpse.
fn expected_allowed(tier: &str, feature: &str) -> bool {
    match (tier, feature) {
        // MFA is universal -- never gated regardless of tier
        (_, "mfa_totp") => true,

        // ── Glimpse: nothing else gated ────────────────────────────────
        ("glimpse", _) => false,

        // ── Focus: most basic features, no AI/cohort/api ───────────────
        ("focus", "csv_export") => true,
        ("focus", "json_export") => true,
        ("focus", "custom_thresholds") => true,
        ("focus", "lifestyle_presets") => true,
        ("focus", "protocol_comparison") => true,
        ("focus", "body_composition") => true,
        ("focus", "supplement_marker_impact") => false,
        ("focus", "ai_dashboard_insights") => false,
        ("focus", "cohort_comparison") => false,
        ("focus", "api_access") => false,

        // ── Insight: + supplement_marker_impact, ai_dashboard_insights ─
        ("insight", "csv_export") => true,
        ("insight", "json_export") => true,
        ("insight", "custom_thresholds") => true,
        ("insight", "lifestyle_presets") => true,
        ("insight", "protocol_comparison") => true,
        ("insight", "body_composition") => true,
        ("insight", "supplement_marker_impact") => true,
        ("insight", "ai_dashboard_insights") => true,
        ("insight", "cohort_comparison") => false,
        ("insight", "api_access") => false,

        // ── Clarity: + cohort_comparison, api_access ───────────────────
        ("clarity", "csv_export") => true,
        ("clarity", "json_export") => true,
        ("clarity", "custom_thresholds") => true,
        ("clarity", "lifestyle_presets") => true,
        ("clarity", "protocol_comparison") => true,
        ("clarity", "body_composition") => true,
        ("clarity", "supplement_marker_impact") => true,
        ("clarity", "ai_dashboard_insights") => true,
        ("clarity", "cohort_comparison") => true,
        ("clarity", "api_access") => true,

        // ── Horizon: everything ────────────────────────────────────────
        ("horizon", _) => true,

        _ => false,
    }
}

/// Insert a fresh user + user_licenses row pointing at the named tier.
async fn create_user_with_tier(pool: &PgPool, tier_slug: &str) -> Option<Uuid> {
    use argon2::{
        password_hash::{rand_core::OsRng, SaltString},
        Argon2, PasswordHasher,
    };
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(b"TestPassword123!", &salt)
        .ok()?
        .to_string();

    let email = format!("matrix_{tier_slug}_{}@test.local", Uuid::new_v4());
    let row = sqlx::query(
        "INSERT INTO users (email, password_hash, display_name, tier)
         VALUES ($1, $2, 'Matrix Test', $3)
         RETURNING id",
    )
    .bind(&email)
    .bind(&hash)
    .bind(tier_slug)
    .fetch_one(pool)
    .await
    .ok()?;
    let user_id: Uuid = row.try_get("id").ok()?;

    let _ =
        sqlx::query("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
            .bind(user_id)
            .execute(pool)
            .await;
    let _ = sqlx::query("INSERT INTO user_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(user_id)
        .execute(pool)
        .await;

    let tier_row = sqlx::query("SELECT id FROM license_tiers WHERE slug = $1")
        .bind(tier_slug)
        .fetch_optional(pool)
        .await
        .ok()??;
    let tier_id: Uuid = tier_row.try_get("id").ok()?;

    sqlx::query(
        "INSERT INTO user_licenses (user_id, tier_id, status, started_at)
         VALUES ($1, $2, 'active', NOW())
         ON CONFLICT (user_id) DO UPDATE SET tier_id = $2, status = 'active'",
    )
    .bind(user_id)
    .bind(tier_id)
    .execute(pool)
    .await
    .ok()?;

    Some(user_id)
}

/// THE MATRIX. 5 tiers x 11 features = 55 (tier, feature) combinations.
/// Each iteration creates a fresh user, calls `check_feature`, and asserts
/// pass/fail per the canonical truth table.
///
/// On any divergence the test panics with a clear message identifying the
/// failing combination -- so the M3 safety net surfaces real regressions
/// without ambiguity.
#[actix_web::test]
async fn tier_feature_matrix_55_combinations() {
    let Some(pool) = common::setup_pool().await else {
        eprintln!("skipping tier_feature_matrix -- DATABASE_URL not set");
        return;
    };

    let mut failures: Vec<String> = Vec::new();
    let mut total = 0usize;

    for tier in TIERS {
        let Some(user_id) = create_user_with_tier(&pool, tier).await else {
            failures.push(format!("FAIL: could not create user with tier {tier}"));
            continue;
        };

        for feature in FEATURES {
            total += 1;
            let expected = expected_allowed(tier, feature);
            let result = tier::check_feature(&pool, user_id, feature).await;
            let actual_allowed = match &result {
                Ok(()) => true,
                Err(AppError::UpgradeRequired(_)) => false,
                Err(e) => {
                    failures.push(format!(
                        "ERROR: tier={tier} feature={feature} -- unexpected error: {e:?}"
                    ));
                    continue;
                }
            };

            if actual_allowed != expected {
                failures.push(format!(
                    "MISMATCH: tier={tier} feature={feature} -- expected {} got {}",
                    if expected { "ALLOWED" } else { "DENIED" },
                    if actual_allowed { "ALLOWED" } else { "DENIED" },
                ));
            }
        }
    }

    if !failures.is_empty() {
        let n = failures.len();
        let summary = failures.join("\n  ");
        panic!("{n} of {total} matrix cases failed:\n  {summary}");
    }

    eprintln!("tier_feature_matrix: {total}/{total} cases passed");
}
