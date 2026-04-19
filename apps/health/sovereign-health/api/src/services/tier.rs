// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{Datelike, Utc};
use serde::Serialize;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::AppError;

// ── Glimpse allowed markers ──────────────────────────────────────────────────

pub const GLIMPSE_MARKERS: &[&str] = &[
    "glucose",
    "ketones",
    "bp_systolic",
    "bp_diastolic",
    "heart_rate",
    "weight",
    "chol_total",
    "hba1c",
];

// ── Tier limits struct ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct TierLimits {
    pub tier_slug: String,
    pub tier_name: String,
    pub max_markers: Option<i32>,
    pub max_history_days: Option<i32>,
    pub max_calculated_markers: Option<i32>,
    pub max_templates: Option<i32>,
    pub max_medications: Option<i32>,
    // Sprint 044 #490 item 3: boolean feature fields removed.
    // Feature gating is now via check_tier_feature() -> brickos.tier_features.
    // Per-agent chat limits
    pub chat_general_monthly: Option<i32>,
    pub chat_trends_monthly: Option<i32>,
    pub chat_labs_monthly: Option<i32>,
    pub chat_diet_monthly: Option<i32>,
    pub chat_supplements_monthly: Option<i32>,
    pub chat_protocols_monthly: Option<i32>,
    pub chat_lab_import_monthly: Option<i32>,
    pub chat_med_import_monthly: Option<i32>,
    pub chat_measurement_import_monthly: Option<i32>,
    pub pdf_reports_monthly: Option<i32>,
    // Measurement cap
    pub max_measurements: Option<i32>,
    // Grace period
    pub is_grace_period: bool,
    pub grace_period_ends: Option<String>,
    pub previous_tier_slug: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentQuotaStatus {
    pub agent_type: String,
    pub used: i32,
    pub limit: Option<i32>,
    pub remaining: Option<i32>,
    pub resets_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LicenseInfo {
    pub tier: TierInfo,
    pub status: String,
    pub started_at: String,
    pub expires_at: Option<String>,
    pub is_grace_period: bool,
    pub limits: TierLimits,
    pub chat_quota: Vec<AgentQuotaStatus>,
    pub downgrade_info: Option<DowngradeInfo>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TierInfo {
    pub slug: String,
    pub name: String,
    pub tagline: Option<String>,
    pub price_monthly_eur: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DowngradeInfo {
    pub previous_tier: String,
    pub downgraded_at: String,
    pub grace_period_ends: String,
}

// ── Tier error for upgrade_required responses ────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TierError {
    pub error: String,
    pub feature: String,
    pub current_tier: String,
    pub required_tier: String,
    pub message: String,
    pub upgrade_url: String,
}

impl TierError {
    pub fn upgrade_required(feature: &str, current: &str, required: &str, msg: &str) -> Self {
        Self {
            error: "upgrade_required".to_string(),
            feature: feature.to_string(),
            current_tier: current.to_string(),
            required_tier: required.to_string(),
            message: msg.to_string(),
            upgrade_url: "/pricing".to_string(),
        }
    }
}

// ── Core functions ───────────────────────────────────────────────────────────

/// Get user's effective tier limits, accounting for grace periods
pub async fn get_user_tier(pool: &PgPool, user_id: Uuid) -> Result<TierLimits, AppError> {
    // Check for SHI_MODE=oss -- unlimited for self-hosted
    if std::env::var("SHI_MODE").unwrap_or_default() == "oss" {
        return Ok(unlimited_tier("core"));
    }

    // Note: admin role does NOT bypass tier enforcement.
    // Admin is for panel access, not license tiers.

    let row = sqlx::query(
        r#"SELECT lt.slug, lt.name,
            lt.max_markers, lt.max_history_days, lt.max_calculated_markers,
            lt.max_templates, lt.max_medications,
            lt.chat_general_monthly, lt.chat_trends_monthly, lt.chat_labs_monthly,
            lt.chat_diet_monthly, lt.chat_supplements_monthly, lt.chat_protocols_monthly,
            lt.chat_lab_import_monthly, lt.chat_med_import_monthly,
            lt.chat_measurement_import_monthly,
            lt.pdf_reports_monthly, lt.max_measurements,
            ul.status, ul.grace_period_ends, ul.previous_tier_slug,
            ul.downgraded_at, ul.admin_override,
            COALESCE(ul.payment_method, 'stripe') as payment_method
        FROM user_licenses ul
        JOIN license_tiers lt ON lt.id = ul.tier_id
        WHERE ul.user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    let row = match row {
        Some(r) => r,
        None => return Ok(default_glimpse_tier()),
    };

    let slug: String = row
        .try_get("slug")
        .unwrap_or_else(|_| "glimpse".to_string());
    let name: String = row
        .try_get("name")
        .unwrap_or_else(|_| "Glimpse".to_string());
    let status: String = row
        .try_get("status")
        .unwrap_or_else(|_| "active".to_string());

    // Check grace period
    let grace_ends: Option<chrono::DateTime<Utc>> = row.try_get("grace_period_ends").ok().flatten();
    let prev_slug: Option<String> = row.try_get("previous_tier_slug").ok().flatten();
    let is_grace = status == "downgrade_grace" && grace_ends.is_some_and(|g| Utc::now() < g);

    // During grace period, use previous tier's limits
    if is_grace {
        if let Some(ref prev) = prev_slug {
            let prev_limits = get_tier_by_slug(pool, prev).await?;
            if let Some(mut limits) = prev_limits {
                limits.is_grace_period = true;
                limits.grace_period_ends = grace_ends.map(|g| g.to_rfc3339());
                limits.previous_tier_slug = prev_slug;
                return Ok(limits);
            }
        }
    }

    // BTC prepaid: check if prepaid period is still active
    let payment_method: String = row
        .try_get("payment_method")
        .unwrap_or_else(|_| "stripe".to_string());
    let admin_override: bool = row.try_get("admin_override").unwrap_or(false);

    if payment_method == "strike_btc" && !admin_override {
        let btc_active: bool = sqlx::query_scalar(
            r#"SELECT EXISTS(
                SELECT 1 FROM btc_payments
                WHERE user_id = $1 AND status = 'paid' AND prepaid_until > NOW()
            )"#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if !btc_active {
            return Ok(default_glimpse_tier());
        }
    }

    Ok(TierLimits {
        tier_slug: slug,
        tier_name: name,
        max_markers: row.try_get("max_markers").ok().flatten(),
        max_history_days: row.try_get("max_history_days").ok().flatten(),
        max_calculated_markers: row.try_get("max_calculated_markers").ok().flatten(),
        max_templates: row.try_get("max_templates").ok().flatten(),
        max_medications: row.try_get("max_medications").ok().flatten(),
        chat_general_monthly: row.try_get("chat_general_monthly").ok().flatten(),
        chat_trends_monthly: row.try_get("chat_trends_monthly").ok().flatten(),
        chat_labs_monthly: row.try_get("chat_labs_monthly").ok().flatten(),
        chat_diet_monthly: row.try_get("chat_diet_monthly").ok().flatten(),
        chat_supplements_monthly: row.try_get("chat_supplements_monthly").ok().flatten(),
        chat_protocols_monthly: row.try_get("chat_protocols_monthly").ok().flatten(),
        chat_lab_import_monthly: row.try_get("chat_lab_import_monthly").ok().flatten(),
        chat_med_import_monthly: row.try_get("chat_med_import_monthly").ok().flatten(),
        chat_measurement_import_monthly: row
            .try_get("chat_measurement_import_monthly")
            .ok()
            .flatten(),
        pdf_reports_monthly: row.try_get("pdf_reports_monthly").ok().flatten(),
        max_measurements: row.try_get("max_measurements").ok().flatten(),
        is_grace_period: false,
        grace_period_ends: None,
        previous_tier_slug: None,
    })
}

// NOTE: The old `check_feature` (Sprint 040 #467 shadow refactor) and
// `check_feature_via_brickos_tier_features` were removed in Sprint 043
// Phase A. The live feature gating path is `check_tier_feature` ->
// `load_user_features` -> `load_tier_features`, which now queries
// `brickos.tier_features` (Sprint 044 #539).

/// Check and return per-agent chat quota
pub async fn check_chat_quota(
    pool: &PgPool,
    user_id: Uuid,
    agent_type: &str,
) -> Result<AgentQuotaStatus, AppError> {
    let tier = get_user_tier(pool, user_id).await?;
    let limit = chat_limit_for_agent(&tier, agent_type);

    // limit == Some(0) means disabled for this tier
    if limit == Some(0) {
        let required = required_tier_for_agent(agent_type);
        let msg = format!(
            "{} is available on {} and above.",
            agent_label(agent_type),
            required
        );
        return Err(AppError::UpgradeRequired(Box::new(
            TierError::upgrade_required(
                &format!("chat_{}", agent_type),
                &tier.tier_slug,
                &required,
                &msg,
            ),
        )));
    }

    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());
    let resets_at = next_month_reset();

    let used = get_agent_used(pool, user_id, &month_year, agent_type).await?;

    let remaining = limit.map(|l| (l - used).max(0));

    // Check exhaustion
    if let Some(rem) = remaining {
        if rem <= 0 {
            return Err(AppError::QuotaExceeded);
        }
    }

    Ok(AgentQuotaStatus {
        agent_type: agent_type.to_string(),
        used,
        limit,
        remaining,
        resets_at,
    })
}

/// Increment per-agent chat quota, returns updated status
pub async fn increment_chat_quota(
    pool: &PgPool,
    user_id: Uuid,
    agent_type: &str,
) -> Result<AgentQuotaStatus, AppError> {
    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());

    sqlx::query(
        r#"INSERT INTO chat_agent_quota (user_id, month_year, agent_type, used_count)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (user_id, month_year, agent_type)
           DO UPDATE SET used_count = chat_agent_quota.used_count + 1"#,
    )
    .bind(user_id)
    .bind(&month_year)
    .bind(agent_type)
    .execute(pool)
    .await?;

    let tier = get_user_tier(pool, user_id).await?;
    let limit = chat_limit_for_agent(&tier, agent_type);
    let used = get_agent_used(pool, user_id, &month_year, agent_type).await?;
    let remaining = limit.map(|l| (l - used).max(0));

    Ok(AgentQuotaStatus {
        agent_type: agent_type.to_string(),
        used,
        limit,
        remaining,
        resets_at: next_month_reset(),
    })
}

/// Check if user can access a specific marker (Glimpse restriction)
/// Sprint 040 #468 part 2a: 3-state evaluation for marker access.
///
/// 1. **Default** (no env vars): legacy GLIMPSE_MARKERS const lookup.
///    Identical to pre-#468 behavior. Glimpse users can only enter
///    measurements for the 8 hardcoded markers.
///
/// 2. **`MARKER_ACCESS_SHADOW_MODE=1`**: legacy + new user_markers query.
///    Both paths run, divergences logged via tracing::error with structured
///    fields. The LEGACY result is returned.
///
/// 3. **`MARKER_ACCESS_USE_NEW_PATH=1`**: new user_markers path is canonical.
///    The user can enter measurements for any marker that has
///    user_markers.is_active = true. The cap of 10 active markers for
///    Glimpse is enforced at the activate handler, NOT here.
///
/// After zero divergences in shadow mode, set MARKER_ACCESS_USE_NEW_PATH=1
/// and the GLIMPSE_MARKERS const can be deleted (per #490 item 5).
pub async fn check_marker_access(
    pool: &PgPool,
    user_id: Uuid,
    marker_slug: &str,
) -> Result<(), AppError> {
    let shadow_mode = std::env::var("MARKER_ACCESS_SHADOW_MODE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let use_new_path = std::env::var("MARKER_ACCESS_USE_NEW_PATH")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let tier = get_user_tier(pool, user_id).await?;

    // Unlimited tiers always pass (regardless of which path is in use)
    if tier.max_markers.is_none() {
        return Ok(());
    }

    // Legacy path: hardcoded GLIMPSE_MARKERS list
    let legacy_allowed = GLIMPSE_MARKERS.contains(&marker_slug);

    // New path: user_markers table with the active flag
    let new_allowed = if shadow_mode || use_new_path {
        Some(
            crate::services::user_markers::is_marker_active_by_slug(pool, user_id, marker_slug)
                .await?,
        )
    } else {
        None
    };

    if shadow_mode {
        if let Some(new) = new_allowed {
            if new != legacy_allowed {
                tracing::error!(
                    user_id = %user_id,
                    marker_slug = %marker_slug,
                    tier = %tier.tier_slug,
                    legacy = legacy_allowed,
                    new = new,
                    "MARKER ACCESS DIVERGENCE: legacy GLIMPSE_MARKERS and user_markers disagree"
                );
            }
        }
    }

    let allowed = if use_new_path {
        new_allowed.unwrap_or(legacy_allowed)
    } else {
        legacy_allowed
    };

    if allowed {
        Ok(())
    } else {
        Err(AppError::UpgradeRequired(Box::new(
            TierError::upgrade_required(
                "marker_access",
                &tier.tier_slug,
                "focus",
                "Unlock all markers with Focus. Upgrade to track everything that matters.",
            ),
        )))
    }
}

/// Get max history days for the user (None = unlimited)
pub async fn get_history_days_limit(pool: &PgPool, user_id: Uuid) -> Result<Option<i32>, AppError> {
    let tier = get_user_tier(pool, user_id).await?;
    Ok(tier.max_history_days)
}

/// Check count-based limits (templates, medications)
pub async fn check_count_limit(
    pool: &PgPool,
    user_id: Uuid,
    resource: &str,
    current_count: i32,
) -> Result<(), AppError> {
    let tier = get_user_tier(pool, user_id).await?;
    let limit = match resource {
        "templates" => tier.max_templates,
        "medications" => tier.max_medications,
        _ => None,
    };

    if let Some(max) = limit {
        if current_count >= max {
            let required = "focus";
            let msg = format!(
                "You've reached your {} limit ({}/{}). Upgrade for more.",
                resource, current_count, max
            );
            return Err(AppError::UpgradeRequired(Box::new(
                TierError::upgrade_required(resource, &tier.tier_slug, required, &msg),
            )));
        }
    }
    Ok(())
}

/// Check measurement cap (total measurement count vs tier limit)
pub async fn check_measurement_cap(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    let tier = get_user_tier(pool, user_id).await?;

    let max = match tier.max_measurements {
        Some(m) => m,
        None => return Ok(()), // unlimited
    };

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    if count >= max as i64 {
        let msg = format!(
            "You've reached your measurement limit ({}/{}). Upgrade for more.",
            count, max
        );
        return Err(AppError::UpgradeRequired(Box::new(
            TierError::upgrade_required("measurements", &tier.tier_slug, "focus", &msg),
        )));
    }

    Ok(())
}

/// Get measurement usage for the current user (used + limit)
pub async fn get_measurement_usage(
    platform_pool: &PgPool,
    app_pool: &PgPool,
    user_id: Uuid,
) -> Result<(i64, Option<i32>), AppError> {
    let tier = get_user_tier(platform_pool, user_id).await?;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false AND is_demo = false",
    )
    .bind(user_id)
    .fetch_one(app_pool)
    .await
    .unwrap_or(0);

    Ok((count, tier.max_measurements))
}

/// Get full license info for the /license endpoint
pub async fn get_full_license_info(
    platform_pool: &PgPool,
    app_pool: &PgPool,
    user_id: Uuid,
) -> Result<LicenseInfo, AppError> {
    let limits = get_user_tier(platform_pool, user_id).await?;

    // Admin users get a synthetic license info
    if limits.tier_slug == "admin" {
        return Ok(LicenseInfo {
            tier: TierInfo {
                slug: "admin".to_string(),
                name: "Admin".to_string(),
                tagline: Some("Full platform access".to_string()),
                price_monthly_eur: None,
            },
            status: "active".to_string(),
            started_at: Utc::now().to_rfc3339(),
            expires_at: None,
            is_grace_period: false,
            limits,
            chat_quota: vec![],
            downgrade_info: None,
        });
    }

    let license_row = sqlx::query(
        r#"SELECT lt.slug, lt.name, lt.tagline, lt.price_monthly_eur::float8 as price,
            ul.status, ul.started_at, ul.expires_at,
            ul.downgraded_at, ul.grace_period_ends, ul.previous_tier_slug
        FROM user_licenses ul
        JOIN license_tiers lt ON lt.id = ul.tier_id
        WHERE ul.user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(platform_pool)
    .await?;

    let (tier_info, status, started_at, expires_at, downgrade_info) = match license_row {
        Some(row) => {
            let slug: String = row
                .try_get("slug")
                .unwrap_or_else(|_| "glimpse".to_string());
            let name: String = row
                .try_get("name")
                .unwrap_or_else(|_| "Glimpse".to_string());
            let tagline: Option<String> = row.try_get("tagline").ok().flatten();
            let price: Option<f64> = row.try_get("price").ok().flatten();
            let status: String = row
                .try_get("status")
                .unwrap_or_else(|_| "active".to_string());
            let started: chrono::DateTime<Utc> =
                row.try_get("started_at").unwrap_or_else(|_| Utc::now());
            let expires: Option<chrono::DateTime<Utc>> = row.try_get("expires_at").ok().flatten();
            let downgraded: Option<chrono::DateTime<Utc>> =
                row.try_get("downgraded_at").ok().flatten();
            let grace_ends: Option<chrono::DateTime<Utc>> =
                row.try_get("grace_period_ends").ok().flatten();
            let prev_slug: Option<String> = row.try_get("previous_tier_slug").ok().flatten();

            let di = if let (Some(da), Some(ge), Some(ps)) =
                (downgraded, grace_ends, prev_slug.clone())
            {
                Some(DowngradeInfo {
                    previous_tier: ps,
                    downgraded_at: da.to_rfc3339(),
                    grace_period_ends: ge.to_rfc3339(),
                })
            } else {
                None
            };

            (
                TierInfo {
                    slug,
                    name,
                    tagline,
                    price_monthly_eur: price,
                },
                status,
                started.to_rfc3339(),
                expires.map(|e| e.to_rfc3339()),
                di,
            )
        }
        None => (
            TierInfo {
                slug: "glimpse".to_string(),
                name: "Glimpse".to_string(),
                tagline: Some("Start your health journey".to_string()),
                price_monthly_eur: Some(0.0),
            },
            "active".to_string(),
            Utc::now().to_rfc3339(),
            None,
            None,
        ),
    };

    // Get all agent quotas for current month
    let chat_quota = get_all_agent_quotas(app_pool, user_id, &limits).await?;

    Ok(LicenseInfo {
        tier: tier_info,
        status: status.clone(),
        started_at,
        expires_at,
        is_grace_period: limits.is_grace_period,
        limits,
        chat_quota,
        downgrade_info,
    })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async fn get_tier_by_slug(pool: &PgPool, slug: &str) -> Result<Option<TierLimits>, AppError> {
    let row = sqlx::query(
        r#"SELECT slug, name,
            max_markers, max_history_days, max_calculated_markers,
            max_templates, max_medications,
            chat_general_monthly, chat_trends_monthly, chat_labs_monthly,
            chat_diet_monthly, chat_supplements_monthly, chat_protocols_monthly,
            chat_lab_import_monthly, chat_med_import_monthly,
            chat_measurement_import_monthly,
            pdf_reports_monthly, max_measurements
        FROM license_tiers WHERE slug = $1"#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| TierLimits {
        tier_slug: r.try_get("slug").unwrap_or_default(),
        tier_name: r.try_get("name").unwrap_or_default(),
        max_markers: r.try_get("max_markers").ok().flatten(),
        max_history_days: r.try_get("max_history_days").ok().flatten(),
        max_calculated_markers: r.try_get("max_calculated_markers").ok().flatten(),
        max_templates: r.try_get("max_templates").ok().flatten(),
        max_medications: r.try_get("max_medications").ok().flatten(),
        chat_general_monthly: r.try_get("chat_general_monthly").ok().flatten(),
        chat_trends_monthly: r.try_get("chat_trends_monthly").ok().flatten(),
        chat_labs_monthly: r.try_get("chat_labs_monthly").ok().flatten(),
        chat_diet_monthly: r.try_get("chat_diet_monthly").ok().flatten(),
        chat_supplements_monthly: r.try_get("chat_supplements_monthly").ok().flatten(),
        chat_protocols_monthly: r.try_get("chat_protocols_monthly").ok().flatten(),
        chat_lab_import_monthly: r.try_get("chat_lab_import_monthly").ok().flatten(),
        chat_med_import_monthly: r.try_get("chat_med_import_monthly").ok().flatten(),
        chat_measurement_import_monthly: r
            .try_get("chat_measurement_import_monthly")
            .ok()
            .flatten(),
        pdf_reports_monthly: r.try_get("pdf_reports_monthly").ok().flatten(),
        max_measurements: r.try_get("max_measurements").ok().flatten(),
        is_grace_period: false,
        grace_period_ends: None,
        previous_tier_slug: None,
    }))
}

async fn get_agent_used(
    pool: &PgPool,
    user_id: Uuid,
    month_year: &str,
    agent_type: &str,
) -> Result<i32, AppError> {
    let row = sqlx::query(
        "SELECT used_count FROM chat_agent_quota WHERE user_id = $1 AND month_year = $2 AND agent_type = $3",
    )
    .bind(user_id)
    .bind(month_year)
    .bind(agent_type)
    .fetch_optional(pool)
    .await?;

    Ok(row
        .map(|r| r.try_get::<i32, _>("used_count").unwrap_or(0))
        .unwrap_or(0))
}

async fn get_all_agent_quotas(
    pool: &PgPool,
    user_id: Uuid,
    tier: &TierLimits,
) -> Result<Vec<AgentQuotaStatus>, AppError> {
    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());
    let resets_at = next_month_reset();

    let agents = [
        "general",
        "trends",
        "labs",
        "diet",
        "supplements",
        "protocols",
        "lab_import",
        "med_import",
        "measurement_import",
    ];
    let mut quotas = Vec::new();

    for agent in &agents {
        let limit = chat_limit_for_agent(tier, agent);
        let used = get_agent_used(pool, user_id, &month_year, agent).await?;
        let remaining = limit.map(|l| (l - used).max(0));

        quotas.push(AgentQuotaStatus {
            agent_type: agent.to_string(),
            used,
            limit,
            remaining,
            resets_at: resets_at.clone(),
        });
    }

    Ok(quotas)
}

fn chat_limit_for_agent(tier: &TierLimits, agent_type: &str) -> Option<i32> {
    match agent_type {
        "general" => tier.chat_general_monthly,
        "trends" => tier.chat_trends_monthly,
        "labs" => tier.chat_labs_monthly,
        "diet" => tier.chat_diet_monthly,
        "supplements" => tier.chat_supplements_monthly,
        "protocols" => tier.chat_protocols_monthly,
        "lab_import" => tier.chat_lab_import_monthly,
        "med_import" => tier.chat_med_import_monthly,
        "measurement_import" => tier.chat_measurement_import_monthly,
        _ => tier.chat_general_monthly,
    }
}

fn next_month_reset() -> String {
    let now = Utc::now();
    let (y, m) = if now.month() == 12 {
        (now.year() + 1, 1u32)
    } else {
        (now.year(), now.month() + 1)
    };
    format!("{}-{:02}-01T00:00:00Z", y, m)
}

fn required_tier_for_agent(agent_type: &str) -> String {
    match agent_type {
        "diet" | "supplements" | "protocols" => "focus".to_string(),
        "lab_import" | "med_import" | "measurement_import" => "insight".to_string(),
        _ => "glimpse".to_string(),
    }
}

fn agent_label(agent_type: &str) -> &str {
    match agent_type {
        "general" => "Dr. Alex",
        "trends" => "Trend Analysis",
        "labs" => "Lab Explanation",
        "diet" => "Diet & Nutrition",
        "supplements" => "Supplement Review",
        "protocols" => "Protocol Comparison",
        "lab_import" => "Lab Import",
        "med_import" => "Medication Import",
        "measurement_import" => "Measurement Import",
        _ => "This feature",
    }
}

fn upgrade_message(feature: &str, required: &str) -> String {
    let tier_name = match required {
        "focus" => "Focus",
        "insight" => "Insight",
        "clarity" => "Clarity",
        "horizon" => "Horizon",
        _ => "a higher tier",
    };
    match feature {
        "csv_export" => format!(
            "CSV export is available on {} and above. Upgrade to take full control of your data.",
            tier_name
        ),
        "json_export" => format!("JSON export is available on {} and above.", tier_name),
        "custom_thresholds" => format!(
            "Custom thresholds are available on {} and above. Upgrade to personalize your targets.",
            tier_name
        ),
        "marker_access" => format!(
            "Unlock all markers with {}. Upgrade to track everything that matters.",
            tier_name
        ),
        _ => format!("This feature is available on {} and above.", tier_name),
    }
}

fn unlimited_tier(slug: &str) -> TierLimits {
    let is_admin = slug == "admin";
    TierLimits {
        tier_slug: slug.to_string(),
        tier_name: if is_admin {
            "Admin".to_string()
        } else {
            "Core".to_string()
        },
        max_markers: None,
        max_history_days: None,
        max_calculated_markers: None,
        max_templates: None,
        max_medications: None,
        chat_general_monthly: None,
        chat_trends_monthly: None,
        chat_labs_monthly: None,
        chat_diet_monthly: None,
        chat_supplements_monthly: None,
        chat_protocols_monthly: None,
        chat_lab_import_monthly: None,
        chat_med_import_monthly: None,
        chat_measurement_import_monthly: None,
        pdf_reports_monthly: None,
        max_measurements: None,
        is_grace_period: false,
        grace_period_ends: None,
        previous_tier_slug: None,
    }
}

// ── SSoT: tier_features-based enforcement (Design 029) ─────────────────────

/// A feature entry from the tier_features table.
#[derive(Debug, Clone)]
struct TierFeatureEntry {
    included: bool,
    limit_value: Option<i32>,
}

/// All tier_features for a given tier, loaded in one query for O(1) lookups.
#[derive(Debug, Clone)]
pub struct TierFeatureSet {
    pub tier_slug: String,
    features: std::collections::HashMap<String, TierFeatureEntry>,
}

impl TierFeatureSet {
    /// Whether a boolean feature is included in this tier.
    pub fn is_included(&self, feature_key: &str) -> bool {
        self.features
            .get(feature_key)
            .map(|e| e.included)
            .unwrap_or(false)
    }

    /// Numeric limit for a feature. None = unlimited (or feature not found).
    pub fn get_limit(&self, feature_key: &str) -> Option<i32> {
        self.features
            .get(feature_key)
            .and_then(|e| if e.included { e.limit_value } else { Some(0) })
    }

    /// Returns true if the tier is unlimited (core, admin, clarity, horizon).
    fn is_unlimited(&self) -> bool {
        matches!(
            self.tier_slug.as_str(),
            "core" | "admin" | "clarity" | "horizon"
        )
    }
}

/// Load all tier_features for a tier slug in one query.
pub async fn load_tier_features(
    pool: &PgPool,
    tier_slug: &str,
) -> Result<TierFeatureSet, AppError> {
    // For admin/core unlimited tiers, return a synthetic set with everything included.
    if tier_slug == "admin" || tier_slug == "core" {
        return Ok(TierFeatureSet {
            tier_slug: tier_slug.to_string(),
            features: std::collections::HashMap::new(), // is_unlimited() handles this
        });
    }

    // Sprint 044 #539: query brickos.tier_features (canonical SSoT) instead of
    // the legacy public.product_features JOIN public.tier_features.
    // Strip 'shi.' prefix so downstream callers keep using short keys (e.g. "csv_export").
    let rows = sqlx::query(
        r#"SELECT feature_slug, included, limit_value
           FROM brickos.tier_features
           WHERE tier_slug = $1 AND feature_slug LIKE 'shi.%'"#,
    )
    .bind(tier_slug)
    .fetch_all(pool)
    .await?;

    let mut features = std::collections::HashMap::new();
    for row in rows {
        let slug: String = row.try_get("feature_slug").unwrap_or_default();
        let key = slug.strip_prefix("shi.").unwrap_or(&slug).to_string();
        let included: bool = row.try_get("included").unwrap_or(false);
        let limit_value: Option<i32> = row
            .try_get::<Option<i64>, _>("limit_value")
            .ok()
            .flatten()
            .map(|v| v as i32);
        features.insert(
            key,
            TierFeatureEntry {
                included,
                limit_value,
            },
        );
    }

    Ok(TierFeatureSet {
        tier_slug: tier_slug.to_string(),
        features,
    })
}

/// Lightweight: resolve user → tier slug only (no 30-column load).
/// Note: admin role does NOT bypass tier enforcement -- admin is for
/// panel access, not license tiers. Only SHI_MODE=oss bypasses.
pub async fn get_user_tier_slug(pool: &PgPool, user_id: Uuid) -> Result<String, AppError> {
    // OSS mode -- unlimited for self-hosted
    if std::env::var("SHI_MODE").unwrap_or_default() == "oss" {
        return Ok("core".to_string());
    }

    let row = sqlx::query(
        r#"SELECT lt.slug, ul.status, ul.grace_period_ends, ul.previous_tier_slug,
                  COALESCE(ul.payment_method, 'stripe') as payment_method, ul.admin_override
           FROM user_licenses ul
           JOIN license_tiers lt ON lt.id = ul.tier_id
           WHERE ul.user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    let row = match row {
        Some(r) => r,
        None => return Ok("glimpse".to_string()),
    };

    let slug: String = row
        .try_get("slug")
        .unwrap_or_else(|_| "glimpse".to_string());
    let status: String = row
        .try_get("status")
        .unwrap_or_else(|_| "active".to_string());

    // Grace period: use previous tier
    let grace_ends: Option<chrono::DateTime<Utc>> = row.try_get("grace_period_ends").ok().flatten();
    let prev_slug: Option<String> = row.try_get("previous_tier_slug").ok().flatten();
    let is_grace = status == "downgrade_grace" && grace_ends.is_some_and(|g| Utc::now() < g);

    if is_grace {
        if let Some(ref prev) = prev_slug {
            return Ok(prev.clone());
        }
    }

    // BTC prepaid check
    let payment_method: String = row
        .try_get("payment_method")
        .unwrap_or_else(|_| "stripe".to_string());
    let admin_override: bool = row.try_get("admin_override").unwrap_or(false);

    if payment_method == "strike_btc" && !admin_override {
        let btc_active: bool = sqlx::query_scalar(
            r#"SELECT EXISTS(
                SELECT 1 FROM btc_payments
                WHERE user_id = $1 AND status = 'paid' AND prepaid_until > NOW()
            )"#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if !btc_active {
            return Ok("glimpse".to_string());
        }
    }

    Ok(slug)
}

/// Load full TierFeatureSet for a user (resolves slug + loads features).
pub async fn load_user_features(pool: &PgPool, user_id: Uuid) -> Result<TierFeatureSet, AppError> {
    let slug = get_user_tier_slug(pool, user_id).await?;
    load_tier_features(pool, &slug).await
}

/// Check a boolean feature via tier_features SSoT.
pub async fn check_tier_feature(
    pool: &PgPool,
    user_id: Uuid,
    feature_key: &str,
) -> Result<(), AppError> {
    let fs = load_user_features(pool, user_id).await?;

    if fs.is_unlimited() || fs.is_included(feature_key) {
        return Ok(());
    }

    // Find the lowest tier that includes this feature
    let required = find_required_tier(pool, feature_key).await?;
    let msg = upgrade_message(feature_key, &required);
    Err(AppError::UpgradeRequired(Box::new(
        TierError::upgrade_required(feature_key, &fs.tier_slug, &required, &msg),
    )))
}

/// Check a numeric limit via tier_features SSoT.
pub async fn check_tier_limit(
    pool: &PgPool,
    user_id: Uuid,
    feature_key: &str,
    current_count: i64,
) -> Result<(), AppError> {
    let fs = load_user_features(pool, user_id).await?;

    if fs.is_unlimited() {
        return Ok(());
    }

    let limit = fs.get_limit(feature_key);

    match limit {
        None => Ok(()), // unlimited for this tier
        Some(max) if (current_count as i32) < max => Ok(()),
        Some(max) => {
            let required = find_required_tier(pool, feature_key).await?;
            let msg = format!(
                "You've reached your {} limit ({}/{}). Upgrade for more.",
                feature_key, current_count, max
            );
            Err(AppError::UpgradeRequired(Box::new(
                TierError::upgrade_required(feature_key, &fs.tier_slug, &required, &msg),
            )))
        }
    }
}

/// Find the lowest tier that includes a feature (dynamic, no hardcoded mapping).
/// Sprint 044 #539: queries brickos.tier_features with shi. prefix.
async fn find_required_tier(pool: &PgPool, feature_key: &str) -> Result<String, AppError> {
    let namespaced = format!("shi.{}", feature_key);
    let slug: Option<String> = sqlx::query_scalar(
        r#"SELECT tier_slug
           FROM brickos.tier_features
           WHERE feature_slug = $1 AND included = true
           ORDER BY array_position(ARRAY['glimpse','focus','insight','clarity','horizon'], tier_slug)
           LIMIT 1"#,
    )
    .bind(&namespaced)
    .fetch_optional(pool)
    .await?;

    Ok(slug.unwrap_or_else(|| "focus".to_string()))
}

// ── AI Credit Pool (Design 029, Decision 3) ────────────────────────────────

/// AI credit pool status for the current billing period.
#[derive(Debug, Clone, Serialize)]
pub struct AiCreditStatus {
    pub used: i32,
    pub limit: Option<i32>,
    pub remaining: Option<i32>,
    pub resets_at: String,
}

/// Credit costs per action type.
fn ai_credit_cost(agent_type: &str) -> i32 {
    match agent_type {
        "lab_import" | "med_import" | "measurement_import" => 2,
        _ => 1, // general, trends, labs, diet, supplements, protocols
    }
}

/// Get AI credit pool status without enforcement (for display).
pub async fn get_ai_credit_status(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<AiCreditStatus, AppError> {
    let fs = load_user_features(pool, user_id).await?;

    let limit = if fs.is_unlimited() {
        None
    } else {
        let chat_keys = [
            "chat_general",
            "chat_trends",
            "chat_labs",
            "chat_diet",
            "chat_supplements",
            "chat_protocols",
        ];
        let total: i32 = chat_keys.iter().filter_map(|k| fs.get_limit(k)).sum();
        Some(total)
    };

    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());
    let resets_at = next_month_reset();

    let used: i32 = sqlx::query_scalar(
        "SELECT COALESCE(used_credits, 0) FROM ai_credit_usage WHERE user_id = $1 AND month_year = $2",
    )
    .bind(user_id)
    .bind(&month_year)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    let remaining = limit.map(|l| (l - used).max(0));

    Ok(AiCreditStatus {
        used,
        limit,
        remaining,
        resets_at,
    })
}

/// Check if user has enough AI credits for an action.
pub async fn check_ai_credits(
    pool: &PgPool,
    user_id: Uuid,
    agent_type: &str,
) -> Result<AiCreditStatus, AppError> {
    let fs = load_user_features(pool, user_id).await?;
    let cost = ai_credit_cost(agent_type);

    // Derive pool limit: sum of all chat_* limits for this tier,
    // or use chat_general as the pool indicator.
    // For unlimited tiers, limit = None.
    let limit = if fs.is_unlimited() {
        None
    } else {
        // Sum all chat-related feature limits as the total pool
        let chat_keys = [
            "chat_general",
            "chat_trends",
            "chat_labs",
            "chat_diet",
            "chat_supplements",
            "chat_protocols",
        ];
        let total: i32 = chat_keys.iter().filter_map(|k| fs.get_limit(k)).sum();
        if total == 0 {
            Some(0)
        } else {
            Some(total)
        }
    };

    // Agent disabled at this tier? (limit_value = 0 or not included)
    if limit == Some(0) {
        let required = find_required_tier(pool, &format!("chat_{}", agent_type)).await?;
        let msg = format!(
            "{} is available on {} and above.",
            agent_label(agent_type),
            required
        );
        return Err(AppError::UpgradeRequired(Box::new(
            TierError::upgrade_required(
                &format!("chat_{}", agent_type),
                &fs.tier_slug,
                &required,
                &msg,
            ),
        )));
    }

    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());
    let resets_at = next_month_reset();

    let used: i32 = sqlx::query_scalar(
        "SELECT COALESCE(used_credits, 0) FROM ai_credit_usage WHERE user_id = $1 AND month_year = $2",
    )
    .bind(user_id)
    .bind(&month_year)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    let remaining = limit.map(|l| (l - used).max(0));

    if let Some(rem) = remaining {
        if rem < cost {
            return Err(AppError::QuotaExceeded);
        }
    }

    Ok(AiCreditStatus {
        used,
        limit,
        remaining,
        resets_at,
    })
}

/// Consume AI credits + dual-write to chat_agent_quota for analytics.
pub async fn consume_ai_credits(
    pool: &PgPool,
    user_id: Uuid,
    agent_type: &str,
) -> Result<AiCreditStatus, AppError> {
    let cost = ai_credit_cost(agent_type);
    let now = Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());

    // Upsert AI credit pool usage
    sqlx::query(
        r#"INSERT INTO ai_credit_usage (user_id, month_year, used_credits)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, month_year)
           DO UPDATE SET used_credits = ai_credit_usage.used_credits + $3"#,
    )
    .bind(user_id)
    .bind(&month_year)
    .bind(cost)
    .execute(pool)
    .await?;

    // Dual-write to chat_agent_quota for per-agent analytics
    sqlx::query(
        r#"INSERT INTO chat_agent_quota (user_id, month_year, agent_type, used_count)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (user_id, month_year, agent_type)
           DO UPDATE SET used_count = chat_agent_quota.used_count + 1"#,
    )
    .bind(user_id)
    .bind(&month_year)
    .bind(agent_type)
    .execute(pool)
    .await?;

    // Return updated status
    let fs = load_user_features(pool, user_id).await?;
    let limit = if fs.is_unlimited() {
        None
    } else {
        let chat_keys = [
            "chat_general",
            "chat_trends",
            "chat_labs",
            "chat_diet",
            "chat_supplements",
            "chat_protocols",
        ];
        let total: i32 = chat_keys.iter().filter_map(|k| fs.get_limit(k)).sum();
        if total == 0 {
            Some(0)
        } else {
            Some(total)
        }
    };

    let used: i32 = sqlx::query_scalar(
        "SELECT COALESCE(used_credits, 0) FROM ai_credit_usage WHERE user_id = $1 AND month_year = $2",
    )
    .bind(user_id)
    .bind(&month_year)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    let remaining = limit.map(|l| (l - used).max(0));

    Ok(AiCreditStatus {
        used,
        limit,
        remaining,
        resets_at: next_month_reset(),
    })
}

// ── Legacy helpers (kept for backward compat) ──────────────────────────────

fn default_glimpse_tier() -> TierLimits {
    TierLimits {
        tier_slug: "glimpse".to_string(),
        tier_name: "Glimpse".to_string(),
        max_markers: Some(8),
        max_history_days: Some(30),
        max_calculated_markers: Some(1),
        max_templates: Some(1),
        max_medications: Some(2),
        chat_general_monthly: Some(1),
        chat_trends_monthly: Some(0),
        chat_labs_monthly: Some(0),
        chat_diet_monthly: Some(0),
        chat_supplements_monthly: Some(0),
        chat_protocols_monthly: Some(0),
        chat_lab_import_monthly: Some(0),
        chat_med_import_monthly: Some(0),
        chat_measurement_import_monthly: Some(0),
        pdf_reports_monthly: Some(0),
        max_measurements: Some(100),
        is_grace_period: false,
        grace_period_ends: None,
        previous_tier_slug: None,
    }
}
