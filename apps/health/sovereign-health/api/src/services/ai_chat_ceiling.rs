// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #472 -- AI chat hard daily ceiling.
//
// Defense-in-depth safety net for AI chat calls. Runs in parallel with the
// existing tier::check_ai_credits gate. Even if the tier gate fails open
// due to a refactor bug, config issue, or schema drift, this ceiling stops
// a single user from burning through the Anthropic budget.
//
// Ceiling values per design 022 §13.5 M5 -- deliberately set 5-10x the tier
// monthly limit so legitimate users never hit them. The ceiling only fires
// for runaway scenarios (script attacks, infinite loops, gate failures).
//
// Counter resets at midnight UTC. Storage is a per-user per-day row in
// ai_chat_daily_count with INSERT ... ON CONFLICT upsert.

use crate::error::AppError;
use crate::services::tier;
use sqlx::PgPool;
use uuid::Uuid;

/// Hard daily ceiling per tier slug. These are deliberately HIGH so they
/// only fire on runaway behavior. Per design 022 §13.5 M5 (locked).
fn ceiling_for_tier(tier_slug: &str) -> i32 {
    match tier_slug {
        "glimpse" => 20,
        "focus" => 50,
        "insight" => 100,
        "clarity" => 500,
        "horizon" => 1000,
        // Self-hosted Core: no ceiling (the operator pays their own bills)
        "core" => i32::MAX,
        // Unknown tier: lowest ceiling as a safety default
        _ => 20,
    }
}

/// Check the user's daily count against their tier ceiling, then increment.
/// Returns Ok if the user is below the ceiling (and increments the counter).
/// Returns AppError::RateLimited if the user has hit or exceeded the ceiling.
///
/// Call this BEFORE every Claude API call. The increment happens atomically
/// with the check via INSERT ... ON CONFLICT ... DO UPDATE RETURNING.
pub async fn check_and_increment(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    let tier_slug = tier::get_user_tier_slug(pool, user_id).await?;
    let ceiling = ceiling_for_tier(&tier_slug);

    // Atomic upsert + return the new count.
    let row: (i32,) = sqlx::query_as(
        r#"INSERT INTO ai_chat_daily_count (user_id, day_utc, count, updated_at)
           VALUES ($1, (NOW() AT TIME ZONE 'UTC')::date, 1, NOW())
           ON CONFLICT (user_id, day_utc) DO UPDATE
             SET count = ai_chat_daily_count.count + 1,
                 updated_at = NOW()
           RETURNING count"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let new_count = row.0;

    if new_count > ceiling {
        tracing::warn!(
            user_id = %user_id,
            tier = %tier_slug,
            count = new_count,
            ceiling = ceiling,
            "AI chat hard daily ceiling exceeded -- defense-in-depth blocked further calls"
        );
        // Decrement back so we don't permanently inflate the count past the ceiling
        let _ = sqlx::query(
            "UPDATE ai_chat_daily_count SET count = count - 1
             WHERE user_id = $1 AND day_utc = (NOW() AT TIME ZONE 'UTC')::date",
        )
        .bind(user_id)
        .execute(pool)
        .await;
        return Err(AppError::RateLimited);
    }

    if new_count >= ceiling.saturating_sub(5) && new_count <= ceiling {
        tracing::info!(
            user_id = %user_id,
            tier = %tier_slug,
            count = new_count,
            ceiling = ceiling,
            "AI chat daily ceiling near limit"
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ceiling_values_match_design_022() {
        // Locked decision per design 022 §13.5 M5
        assert_eq!(ceiling_for_tier("glimpse"), 20);
        assert_eq!(ceiling_for_tier("focus"), 50);
        assert_eq!(ceiling_for_tier("insight"), 100);
        assert_eq!(ceiling_for_tier("clarity"), 500);
        assert_eq!(ceiling_for_tier("horizon"), 1000);
    }

    #[test]
    fn core_self_hosted_has_no_ceiling() {
        assert_eq!(ceiling_for_tier("core"), i32::MAX);
    }

    #[test]
    fn unknown_tier_defaults_to_lowest_ceiling() {
        assert_eq!(ceiling_for_tier("nonexistent"), 20);
        assert_eq!(ceiling_for_tier(""), 20);
    }
}
