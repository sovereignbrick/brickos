// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use sqlx::PgPool;
use uuid::Uuid;

/// Determines status ("green", "orange", "red") for a value given a marker + user + protocol.
/// Lookup order:
///   1. user-specific range for specific protocol (e.g., user + fasting_48h)
///   2. user-specific range for "standard"
///   3. system default for specific protocol
///   4. system default for "standard"
///
/// Returns None if no range found or all range values are NULL (weight, waist_circumference).
pub async fn calculate_status(
    pool: &PgPool,
    marker_id: Uuid,
    user_id: Uuid,
    value: f64,
    protocol_context: &str,
) -> Result<Option<String>, sqlx::Error> {
    // Build protocol fallback list
    let protocol_list: Vec<String> = if protocol_context == "standard" {
        vec!["standard".to_string()]
    } else {
        vec![protocol_context.to_string(), "standard".to_string()]
    };

    // Try user-specific first, then system default
    for try_user_id in [Some(user_id), None] {
        for protocol in &protocol_list {
            let row = match try_user_id {
                Some(uid) => {
                    sqlx::query(
                        "SELECT orange_min::float8, green_min::float8, green_max::float8, orange_max::float8
                         FROM reference_ranges
                         WHERE marker_id = $1 AND user_id = $2 AND protocol_context = $3
                         LIMIT 1",
                    )
                    .bind(marker_id)
                    .bind(uid)
                    .bind(protocol.as_str())
                    .fetch_optional(pool)
                    .await?
                }
                None => {
                    sqlx::query(
                        "SELECT orange_min::float8, green_min::float8, green_max::float8, orange_max::float8
                         FROM reference_ranges
                         WHERE marker_id = $1 AND user_id IS NULL AND protocol_context = $2
                         LIMIT 1",
                    )
                    .bind(marker_id)
                    .bind(protocol.as_str())
                    .fetch_optional(pool)
                    .await?
                }
            };

            if let Some(row) = row {
                use sqlx::Row;
                let orange_min: Option<f64> = row.try_get("orange_min").ok().flatten();
                let green_min: Option<f64> = row.try_get("green_min").ok().flatten();
                let green_max: Option<f64> = row.try_get("green_max").ok().flatten();
                let orange_max: Option<f64> = row.try_get("orange_max").ok().flatten();

                // All NULL → no universal range (weight/waist)
                if orange_min.is_none()
                    && green_min.is_none()
                    && green_max.is_none()
                    && orange_max.is_none()
                {
                    return Ok(None);
                }

                let status = compute_status(value, orange_min, green_min, green_max, orange_max);
                return Ok(Some(status));
            }
        }
    }

    Ok(None)
}

fn compute_status(
    value: f64,
    orange_min: Option<f64>,
    green_min: Option<f64>,
    green_max: Option<f64>,
    orange_max: Option<f64>,
) -> String {
    // Check if outside orange bounds → red
    if let Some(omin) = orange_min {
        if value < omin {
            return "red".to_string();
        }
    }
    if let Some(omax) = orange_max {
        if value > omax {
            return "red".to_string();
        }
    }
    // Check green bounds
    let in_green =
        green_min.is_none_or(|gmin| value >= gmin) && green_max.is_none_or(|gmax| value <= gmax);
    if in_green {
        "green".to_string()
    } else {
        "orange".to_string()
    }
}
