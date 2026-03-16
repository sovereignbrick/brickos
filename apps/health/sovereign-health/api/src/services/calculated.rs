// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

/// Given a set of measured values (slug → value) and user profile height,
/// compute all applicable calculated markers.
/// Returns Vec of (calculated_marker_id, value, status)
pub async fn compute_calculated_markers(
    pool: &PgPool,
    _user_id: Uuid,
    values: &std::collections::HashMap<String, f64>,
    height_cm: Option<f64>,
    protocol_tag: &str,
    fasting_protocol: Option<&str>,
    _measured_at: DateTime<Utc>,
) -> Result<Vec<(Uuid, f64, Option<String>)>, sqlx::Error> {
    let mut results = vec![];

    // Resolve protocol context string for threshold lookup
    let protocol_context = resolve_protocol_context(protocol_tag, fasting_protocol);

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

pub fn resolve_protocol_context(protocol_tag: &str, fasting_protocol: Option<&str>) -> String {
    if protocol_tag == "fasting" {
        match fasting_protocol {
            Some("16_8") | Some("omad") => "fasting_16_8".to_string(),
            Some("36h") | Some("48h") => "fasting_48h".to_string(),
            Some("72h") | Some("extended") => "fasting_extended".to_string(),
            _ => "fasting_16_8".to_string(), // default fasting
        }
    } else {
        "standard".to_string()
    }
}
