// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

/// Recompute segment values for a user based on their current data.
/// Called after signup, profile update, measurement submission, tier change.
pub async fn update_user_segments(pool: &PgPool, user_id: Uuid) -> Result<()> {
    // Diet protocol: check most recent protocol_tag on measurements
    let diet_protocol: Option<String> = sqlx::query_scalar(
        r#"SELECT CASE
            WHEN protocol_tag IS NULL OR protocol_tag = 'standard' THEN 'standard'
            WHEN protocol_tag LIKE 'fasting%' THEN 'fasting'
            ELSE protocol_tag
        END
        FROM measurements
        WHERE user_id = $1 AND is_deleted = false
        ORDER BY measured_at DESC
        LIMIT 1"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    // Age bracket: from user_profile (encrypted, so we read raw text)
    // We store bracket as text since age is encrypted -- fallback to NULL
    let age_bracket: Option<String> = None; // age is encrypted; set via profile update hook

    // Measurement frequency: count measurements in last 30 days
    let measurement_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false AND measured_at > now() - interval '30 days'",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let measurement_frequency = match measurement_count {
        0 => "rare",
        1..=4 => "monthly",
        5..=14 => "weekly",
        _ => "daily",
    };

    // Marker count bracket: distinct markers measured
    let marker_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT marker_slug) FROM measurements WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let marker_count_bracket = match marker_count {
        0 => "0",
        1..=5 => "1-5",
        6..=15 => "6-15",
        _ => "16+",
    };

    // Onboarding: check if profile is set up (height_cm not null)
    let has_profile: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM user_profile WHERE user_id = $1 AND height_cm IS NOT NULL)",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    let onboarding = if has_profile && measurement_count > 0 {
        "complete"
    } else {
        "incomplete"
    };

    // Engagement: based on last measurement date
    let days_since_last: Option<i64> = sqlx::query_scalar(
        "SELECT EXTRACT(DAY FROM now() - MAX(measured_at))::bigint FROM measurements WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    let engagement = match days_since_last {
        Some(d) if d <= 7 => "active",
        Some(d) if d <= 30 => "moderate",
        _ => "dormant",
    };

    sqlx::query(
        r#"INSERT INTO user_segments (user_id, diet_protocol, age_bracket, health_goal,
            engagement, onboarding, measurement_frequency, marker_count_bracket)
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
            diet_protocol = EXCLUDED.diet_protocol,
            age_bracket = COALESCE(EXCLUDED.age_bracket, user_segments.age_bracket),
            engagement = EXCLUDED.engagement,
            onboarding = EXCLUDED.onboarding,
            measurement_frequency = EXCLUDED.measurement_frequency,
            marker_count_bracket = EXCLUDED.marker_count_bracket,
            updated_at = now()"#,
    )
    .bind(user_id)
    .bind(diet_protocol.as_deref().unwrap_or("standard"))
    .bind(age_bracket)
    .bind(engagement)
    .bind(onboarding)
    .bind(measurement_frequency)
    .bind(marker_count_bracket)
    .execute(pool)
    .await?;

    Ok(())
}

/// Query users matching segment filters. Returns (user_id, email) pairs.
pub async fn get_users_by_segments(
    pool: &PgPool,
    filters: &serde_json::Value,
) -> Result<Vec<(Uuid, String)>> {
    let mut conditions = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(diet) = filters.get("diet_protocol").and_then(|v| v.as_str()) {
        params.push(diet.to_string());
        conditions.push(format!("us.diet_protocol = ${}", params.len()));
    }
    if let Some(age) = filters.get("age_bracket").and_then(|v| v.as_str()) {
        params.push(age.to_string());
        conditions.push(format!("us.age_bracket = ${}", params.len()));
    }
    if let Some(eng) = filters.get("engagement").and_then(|v| v.as_str()) {
        params.push(eng.to_string());
        conditions.push(format!("us.engagement = ${}", params.len()));
    }
    if let Some(onb) = filters.get("onboarding").and_then(|v| v.as_str()) {
        params.push(onb.to_string());
        conditions.push(format!("us.onboarding = ${}", params.len()));
    }
    if let Some(freq) = filters
        .get("measurement_frequency")
        .and_then(|v| v.as_str())
    {
        params.push(freq.to_string());
        conditions.push(format!("us.measurement_frequency = ${}", params.len()));
    }
    if let Some(bracket) = filters.get("marker_count_bracket").and_then(|v| v.as_str()) {
        params.push(bracket.to_string());
        conditions.push(format!("us.marker_count_bracket = ${}", params.len()));
    }

    // Also filter by consent
    let consent_type = filters
        .get("consent")
        .and_then(|v| v.as_str())
        .unwrap_or("product_updates");

    let consent_col = match consent_type {
        "newsletter" => "up.consent_newsletter",
        "partner_offers" => "up.consent_partner_offers",
        _ => "up.consent_product_updates",
    };

    let where_clause = if conditions.is_empty() {
        format!("WHERE u.is_deleted = false AND {} = true", consent_col)
    } else {
        format!(
            "WHERE u.is_deleted = false AND {} = true AND {}",
            consent_col,
            conditions.join(" AND ")
        )
    };

    let query = format!(
        r#"SELECT u.id, u.email
        FROM users u
        JOIN user_profile up ON up.user_id = u.id
        LEFT JOIN user_segments us ON us.user_id = u.id
        {}
        ORDER BY u.created_at ASC"#,
        where_clause
    );

    // We need dynamic query binding. Use sqlx::query with raw SQL.
    let mut q = sqlx::query_as::<_, (Uuid, String)>(&query);
    for param in &params {
        q = q.bind(param);
    }

    let rows = q.fetch_all(pool).await?;
    Ok(rows)
}
