// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::services::encryption::Encryptor;

/// All marker slugs used as inputs to calculated marker formulas.
const CALC_INPUT_SLUGS: &[&str] = &[
    "glucose",
    "ketones",
    "waist_circumference",
    "weight",
    "hematocrit",
    "hemoglobin",
    "insulin",
    "triglycerides",
    "hdl",
];

/// Enrich a values map with the user's latest measurement for each calculated
/// marker input slug that is NOT already present in the map.
/// This ensures calculated markers fire even when input markers were entered
/// in separate submissions (different forms, imports, or dates).
pub async fn enrich_with_latest_values(
    pool: &PgPool,
    user_id: Uuid,
    values: &mut std::collections::HashMap<String, f64>,
    enc: &Encryptor,
) -> Result<(), sqlx::Error> {
    let missing: Vec<&str> = CALC_INPUT_SLUGS
        .iter()
        .filter(|s| !values.contains_key(**s))
        .copied()
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    // Fetch the latest measurement for each missing input marker in one query.
    // Uses DISTINCT ON to get only the most recent value per marker.
    let rows = sqlx::query(
        r#"SELECT DISTINCT ON (m.marker_slug)
               m.marker_slug, ms.value_canonical
           FROM measurements ms
           JOIN markers m ON m.id = ms.marker_id
           WHERE ms.user_id = $1
             AND m.marker_slug = ANY($2)
             AND ms.is_deleted = false
           ORDER BY m.marker_slug, ms.timestamp DESC"#,
    )
    .bind(user_id)
    .bind(missing.iter().map(|s| s.to_string()).collect::<Vec<_>>())
    .fetch_all(pool)
    .await?;

    for row in rows {
        use sqlx::Row;
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        let enc_val: String = row.try_get("value_canonical").unwrap_or_default();
        if !enc_val.is_empty() {
            values.insert(slug, enc.decrypt_f64(&enc_val));
        }
    }

    Ok(())
}

/// Given a set of measured values (slug → value) and user profile height,
/// compute all applicable calculated markers.
/// Returns Vec of (calculated_marker_id, value, status)
#[allow(clippy::too_many_arguments)]
pub async fn compute_calculated_markers(
    pool: &PgPool,
    _user_id: Uuid,
    values: &std::collections::HashMap<String, f64>,
    height_cm: Option<f64>,
    protocol_tag: &str,
    fasting_protocol: Option<&str>,
    diet_protocol: Option<&str>,
    _measured_at: DateTime<Utc>,
) -> Result<Vec<(Uuid, f64, Option<String>)>, sqlx::Error> {
    let mut results = vec![];

    // Resolve protocol context string for threshold lookup
    let protocol_context = resolve_protocol_context(protocol_tag, fasting_protocol, diet_protocol);

    // Fetch calculated marker definitions
    let rows = sqlx::query(
        "SELECT id, marker_slug, default_thresholds, protocol_overrides FROM calculated_markers ORDER BY display_order",
    )
    .fetch_all(pool)
    .await?;

    let cms: Vec<(Uuid, String, serde_json::Value, serde_json::Value)> = rows
        .into_iter()
        .map(|r| {
            use sqlx::Row;
            let id: Uuid = r.try_get("id").unwrap_or_default();
            let slug: String = r.try_get("marker_slug").unwrap_or_default();
            let dt: serde_json::Value = r
                .try_get("default_thresholds")
                .unwrap_or(serde_json::json!({}));
            let po: serde_json::Value = r
                .try_get("protocol_overrides")
                .unwrap_or(serde_json::json!({}));
            (id, slug, dt, po)
        })
        .collect();

    for (cm_id, slug, default_thresholds, protocol_overrides) in cms {
        let computed_value: Option<f64> = match slug.as_str() {
            "gki" => {
                let g = values.get("glucose").copied();
                let k = values.get("ketones").copied();
                match (g, k) {
                    (Some(glucose), Some(ketones)) if ketones > 0.0 => Some(glucose / ketones),
                    _ => None,
                }
            }
            "dr_boz_ratio" => {
                let g = values.get("glucose").copied();
                let k = values.get("ketones").copied();
                match (g, k) {
                    (Some(glucose), Some(ketones)) if ketones > 0.0 => {
                        Some((glucose * 18.0) / ketones)
                    }
                    _ => None,
                }
            }
            "whtr" => {
                let w = values.get("waist_circumference").copied();
                match (w, height_cm) {
                    (Some(waist), Some(height)) if height > 0.0 => Some(waist / height),
                    _ => None,
                }
            }
            "bmi" => {
                let w = values.get("weight").copied();
                match (w, height_cm) {
                    (Some(weight), Some(height)) if height > 0.0 => {
                        let h_m = height / 100.0;
                        Some(weight / (h_m * h_m))
                    }
                    _ => None,
                }
            }
            "hct_hb_ratio" => {
                let hct = values.get("hematocrit").copied();
                let hb = values.get("hemoglobin").copied();
                match (hct, hb) {
                    (Some(hematocrit), Some(hemoglobin)) if hemoglobin > 0.0 => {
                        let hb_gdl = hemoglobin * 1.61;
                        Some(hematocrit / hb_gdl)
                    }
                    _ => None,
                }
            }
            "homa_ir" => {
                let g = values.get("glucose").copied();
                let i = values.get("insulin").copied();
                match (g, i) {
                    (Some(glucose), Some(insulin)) => Some((glucose * 18.018 * insulin) / 405.0),
                    _ => None,
                }
            }
            "tg_hdl_ratio" => {
                let tg = values.get("triglycerides").copied();
                let hdl = values.get("hdl").copied();
                match (tg, hdl) {
                    (Some(tg_val), Some(hdl_val)) if hdl_val > 0.0 => Some(tg_val / hdl_val),
                    _ => None,
                }
            }
            _ => None,
        };

        if let Some(value) = computed_value {
            // Get thresholds: check protocol_overrides first, then default_thresholds
            let thresholds = if protocol_context != "standard" {
                protocol_overrides
                    .get(&protocol_context)
                    .cloned()
                    .unwrap_or_else(|| default_thresholds.clone())
            } else {
                default_thresholds.clone()
            };

            let status = compute_calculated_status(value, &thresholds);
            results.push((cm_id, value, status));
        }
    }

    Ok(results)
}

fn compute_calculated_status(value: f64, thresholds: &serde_json::Value) -> Option<String> {
    let get_f64 = |key: &str| -> Option<f64> { thresholds.get(key)?.as_f64() };
    let orange_min = get_f64("orange_min");
    let green_min = get_f64("green_min");
    let green_max = get_f64("green_max");
    let orange_max = get_f64("orange_max");

    if orange_min.is_none() && green_min.is_none() && green_max.is_none() && orange_max.is_none() {
        return None;
    }

    if let Some(omin) = orange_min {
        if value < omin {
            return Some("red".to_string());
        }
    }
    if let Some(omax) = orange_max {
        if value > omax {
            return Some("red".to_string());
        }
    }

    let in_green =
        green_min.is_none_or(|gmin| value >= gmin) && green_max.is_none_or(|gmax| value <= gmax);

    if in_green {
        Some("green".to_string())
    } else {
        Some("orange".to_string())
    }
}

/// Like `enrich_with_latest_values` but fetches the most recent value
/// at or before a specific date, so historical calculated markers use
/// the correct input values for their point in time.
pub async fn enrich_with_values_at_date(
    pool: &PgPool,
    user_id: Uuid,
    values: &mut std::collections::HashMap<String, f64>,
    enc: &Encryptor,
    at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    let missing: Vec<&str> = CALC_INPUT_SLUGS
        .iter()
        .filter(|s| !values.contains_key(**s))
        .copied()
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    let rows = sqlx::query(
        r#"SELECT DISTINCT ON (m.marker_slug)
               m.marker_slug, ms.value_canonical
           FROM measurements ms
           JOIN markers m ON m.id = ms.marker_id
           WHERE ms.user_id = $1
             AND m.marker_slug = ANY($2)
             AND ms.timestamp <= $3
             AND ms.is_deleted = false
           ORDER BY m.marker_slug, ms.timestamp DESC"#,
    )
    .bind(user_id)
    .bind(missing.iter().map(|s| s.to_string()).collect::<Vec<_>>())
    .bind(at)
    .fetch_all(pool)
    .await?;

    for row in rows {
        use sqlx::Row;
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        let enc_val: String = row.try_get("value_canonical").unwrap_or_default();
        if !enc_val.is_empty() {
            values.insert(slug, enc.decrypt_f64(&enc_val));
        }
    }

    Ok(())
}

pub fn resolve_protocol_context(
    protocol_tag: &str,
    fasting_protocol: Option<&str>,
    diet_protocol: Option<&str>,
) -> String {
    if protocol_tag == "fasting" {
        match fasting_protocol {
            Some("16_8") | Some("omad") => "fasting_16_8".to_string(),
            Some("36h") | Some("48h") => "fasting_48h".to_string(),
            Some("72h") | Some("extended") => "fasting_extended".to_string(),
            _ => "fasting_16_8".to_string(), // default fasting
        }
    } else {
        match diet_protocol {
            Some("vegan") => "standard_vegan".to_string(),
            Some("mediterranean") => "standard_mediterranean".to_string(),
            Some("keto") | Some("carnivore") => "standard_keto".to_string(),
            _ => "standard".to_string(),
        }
    }
}
