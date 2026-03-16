// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::services::calculated::compute_calculated_markers;
use crate::services::reference::calculate_status;
use crate::{error::AppError, middleware::auth::AuthenticatedUser};

/// GET /settings -- returns profile, units, lifestyle defaults, and reference ranges
pub async fn get_settings(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Fetch profile + country_code
    let profile_row = sqlx::query(
        "SELECT gender, age, height_cm, default_waist_cm, default_weight_kg, country_code \
         FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let profile = match profile_row {
        Some(row) => json!({
            "gender": enc.decrypt_opt(row.try_get::<Option<String>, _>("gender").ok().flatten()),
            "age": row.try_get::<Option<String>, _>("age").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "height_cm": row.try_get::<Option<String>, _>("height_cm").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "default_waist_cm": row.try_get::<Option<String>, _>("default_waist_cm").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "default_weight_kg": row.try_get::<Option<String>, _>("default_weight_kg").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "country_code": row.try_get::<Option<String>, _>("country_code").ok().flatten(),
        }),
        None => json!({
            "gender": null,
            "age": null,
            "height_cm": null,
            "default_waist_cm": null,
            "default_weight_kg": null,
            "country_code": null,
        }),
    };

    // Fetch email + display_name from users
    let user_row = sqlx::query("SELECT email, display_name, tier, locale FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_optional(pool.get_ref())
        .await?;
    let display_name: Option<String> = user_row
        .as_ref()
        .and_then(|r| r.try_get("display_name").ok())
        .flatten();
    let email: String = user_row
        .as_ref()
        .and_then(|r| r.try_get("email").ok())
        .unwrap_or_default();
    let locale: String = user_row
        .as_ref()
        .and_then(|r| r.try_get("locale").ok())
        .unwrap_or_else(|| "en".to_string());

    // Read canonical tier from user_licenses (source of truth), fall back to users.tier
    let license_tier_row = sqlx::query(
        "SELECT lt.slug FROM user_licenses ul JOIN license_tiers lt ON lt.id = ul.tier_id WHERE ul.user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;
    let tier: String = license_tier_row
        .and_then(|r| r.try_get("slug").ok())
        .unwrap_or_else(|| {
            user_row
                .as_ref()
                .and_then(|r| r.try_get("tier").ok())
                .unwrap_or_else(|| "glimpse".to_string())
        });

    // Fetch unit preferences + lifestyle defaults
    let units_row = sqlx::query(
        "SELECT date_format, time_format, glucose_unit, ketones_unit, cholesterol_unit, \
         uric_acid_unit, hemoglobin_unit, weight_unit, height_unit, bp_unit, waist_unit, \
         extended_entry_enabled, \
         show_extended_lifestyle, default_diet_protocol, default_fasting_protocol, \
         default_exercise, default_sleep_hours::float8 as default_sleep_hours, default_sleep_quality, default_stress_level, \
         COALESCE(share_anonymous_data, true) as share_anonymous_data \
         FROM user_preferences WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let share_anonymous_data = units_row
        .as_ref()
        .and_then(|r| r.try_get::<bool, _>("share_anonymous_data").ok())
        .unwrap_or(true);

    let (units, lifestyle) = match units_row {
        Some(row) => {
            let u = json!({
                "date_format": row.try_get::<String, _>("date_format").unwrap_or_else(|_| "DD/MM/YYYY".to_string()),
                "time_format": row.try_get::<String, _>("time_format").unwrap_or_else(|_| "24h".to_string()),
                "glucose_unit": row.try_get::<String, _>("glucose_unit").unwrap_or_else(|_| "mmol/L".to_string()),
                "ketones_unit": row.try_get::<String, _>("ketones_unit").unwrap_or_else(|_| "mmol/L".to_string()),
                "cholesterol_unit": row.try_get::<String, _>("cholesterol_unit").unwrap_or_else(|_| "mmol/L".to_string()),
                "uric_acid_unit": row.try_get::<String, _>("uric_acid_unit").unwrap_or_else(|_| "\u{00b5}mol/L".to_string()),
                "hemoglobin_unit": row.try_get::<String, _>("hemoglobin_unit").unwrap_or_else(|_| "mmol/L".to_string()),
                "weight_unit": row.try_get::<String, _>("weight_unit").unwrap_or_else(|_| "kg".to_string()),
                "height_unit": row.try_get::<String, _>("height_unit").unwrap_or_else(|_| "cm".to_string()),
                "bp_unit": row.try_get::<String, _>("bp_unit").unwrap_or_else(|_| "mmHg".to_string()),
                "waist_unit": row.try_get::<String, _>("waist_unit").unwrap_or_else(|_| "cm".to_string()),
                "extended_entry_enabled": row.try_get::<bool, _>("extended_entry_enabled").unwrap_or(false),
            });
            let l = json!({
                "show_extended_lifestyle": row.try_get::<bool, _>("show_extended_lifestyle").unwrap_or(true),
                "default_diet_protocol": row.try_get::<Option<String>, _>("default_diet_protocol").ok().flatten(),
                "default_fasting_protocol": row.try_get::<Option<String>, _>("default_fasting_protocol").ok().flatten(),
                "default_exercise": row.try_get::<Option<String>, _>("default_exercise").ok().flatten(),
                "default_sleep_hours": row.try_get::<Option<f64>, _>("default_sleep_hours").ok().flatten(),
                "default_sleep_quality": row.try_get::<Option<String>, _>("default_sleep_quality").ok().flatten(),
                "default_stress_level": row.try_get::<Option<i32>, _>("default_stress_level").ok().flatten(),
            });
            (u, l)
        }
        None => {
            let u = json!({
                "date_format": "DD/MM/YYYY",
                "time_format": "24h",
                "glucose_unit": "mmol/L",
                "ketones_unit": "mmol/L",
                "cholesterol_unit": "mmol/L",
                "uric_acid_unit": "\u{00b5}mol/L",
                "hemoglobin_unit": "mmol/L",
                "weight_unit": "kg",
                "height_unit": "cm",
                "bp_unit": "mmHg",
                "waist_unit": "cm",
                "extended_entry_enabled": false,
            });
            let l = json!({
                "show_extended_lifestyle": true,
                "default_diet_protocol": null,
                "default_fasting_protocol": null,
                "default_exercise": null,
                "default_sleep_hours": null,
                "default_sleep_quality": null,
                "default_stress_level": null,
            });
            (u, l)
        }
    };

    // Fetch user's custom reference ranges
    let range_rows = sqlx::query(
        r#"SELECT
            mk.marker_slug, mk.marker_name, mk.unit_canonical,
            rr.protocol_context,
            rr.orange_min::float8 as orange_min,
            rr.green_min::float8 as green_min,
            rr.green_max::float8 as green_max,
            rr.orange_max::float8 as orange_max
        FROM reference_ranges rr
        JOIN markers mk ON mk.id = rr.marker_id
        WHERE rr.user_id = $1
        ORDER BY mk.marker_name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let custom_ranges: Vec<serde_json::Value> = range_rows
        .iter()
        .map(|row| {
            json!({
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "unit": row.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "protocol_context": row.try_get::<String, _>("protocol_context").unwrap_or_else(|_| "standard".to_string()),
                "orange_min": row.try_get::<Option<f64>, _>("orange_min").ok().flatten(),
                "green_min": row.try_get::<Option<f64>, _>("green_min").ok().flatten(),
                "green_max": row.try_get::<Option<f64>, _>("green_max").ok().flatten(),
                "orange_max": row.try_get::<Option<f64>, _>("orange_max").ok().flatten(),
            })
        })
        .collect();

    // Fetch ALL system default reference ranges (for thresholds tab)
    let sys_range_rows = sqlx::query(
        r#"SELECT
            mk.marker_slug, mk.marker_name, mk.unit_canonical,
            rr.protocol_context,
            rr.orange_min::float8 as orange_min,
            rr.green_min::float8 as green_min,
            rr.green_max::float8 as green_max,
            rr.orange_max::float8 as orange_max
        FROM reference_ranges rr
        JOIN markers mk ON mk.id = rr.marker_id
        WHERE rr.user_id IS NULL AND rr.protocol_context = 'standard'
        ORDER BY mk.marker_name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let system_ranges: Vec<serde_json::Value> = sys_range_rows
        .iter()
        .map(|row| {
            json!({
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "unit": row.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "protocol_context": row.try_get::<String, _>("protocol_context").unwrap_or_else(|_| "standard".to_string()),
                "orange_min": row.try_get::<Option<f64>, _>("orange_min").ok().flatten(),
                "green_min": row.try_get::<Option<f64>, _>("green_min").ok().flatten(),
                "green_max": row.try_get::<Option<f64>, _>("green_max").ok().flatten(),
                "orange_max": row.try_get::<Option<f64>, _>("orange_max").ok().flatten(),
            })
        })
        .collect();

    // Fetch all markers with zone info, display names, and what_is snippets
    // Filter marker_content by user locale (with 'en' fallback) to avoid duplicates
    let marker_rows = sqlx::query(
        r#"SELECT m.marker_slug, m.marker_name, m.unit_canonical, m.display_order,
            m.display_name, m.abbreviation,
            z.zone_slug, z.zone_name, z.zone_icon, z.zone_color, z.display_order as zone_order,
            COALESCE(mc_loc.body_text, mc_en.body_text) as what_is
        FROM markers m
        LEFT JOIN zone_markers zm ON zm.marker_slug = m.marker_slug
        LEFT JOIN zones z ON z.zone_slug = zm.zone_slug
        LEFT JOIN marker_content mc_loc ON mc_loc.marker_id = m.marker_slug AND mc_loc.content_type = 'what_is' AND mc_loc.language = $1
        LEFT JOIN marker_content mc_en  ON mc_en.marker_id  = m.marker_slug AND mc_en.content_type  = 'what_is' AND mc_en.language  = 'en'
        ORDER BY z.display_order NULLS LAST, m.display_order, m.marker_name"#,
    )
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    let all_markers: Vec<serde_json::Value> = marker_rows
        .iter()
        .map(|row| {
            // Extract first sentence from what_is for tooltip
            let what_is_full: Option<String> = row.try_get("what_is").ok().flatten();
            let what_is_short = what_is_full.map(|s| {
                // Take first sentence (up to first period followed by space, or first 150 chars)
                if let Some(idx) = s.find(". ") {
                    s[..=idx].to_string()
                } else if s.len() > 150 {
                    format!("{}...", &s[..147])
                } else {
                    s
                }
            });

            json!({
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "display_name": row.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "abbreviation": row.try_get::<Option<String>, _>("abbreviation").ok().flatten(),
                "what_is": what_is_short,
                "unit_canonical": row.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "display_order": row.try_get::<Option<i32>, _>("display_order").ok().flatten().unwrap_or(999),
                "zone_slug": row.try_get::<Option<String>, _>("zone_slug").ok().flatten(),
                "zone_name": row.try_get::<Option<String>, _>("zone_name").ok().flatten(),
                "zone_icon": row.try_get::<Option<String>, _>("zone_icon").ok().flatten(),
                "zone_color": row.try_get::<Option<String>, _>("zone_color").ok().flatten(),
                "zone_order": row.try_get::<Option<i32>, _>("zone_order").ok().flatten().unwrap_or(999),
            })
        })
        .collect();

    // Fetch calculated markers with their default thresholds
    let calc_rows = sqlx::query(
        r#"SELECT cm.marker_slug, cm.marker_name,
            cm.default_thresholds,
            z.zone_slug, z.zone_name, z.zone_icon, z.zone_color, z.display_order as zone_order
        FROM calculated_markers cm
        LEFT JOIN zones z ON z.id = cm.zone_id
        ORDER BY cm.display_order"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let calculated_markers: Vec<serde_json::Value> = calc_rows
        .iter()
        .map(|row| {
            json!({
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "default_thresholds": row.try_get::<serde_json::Value, _>("default_thresholds").unwrap_or(json!({})),
                "zone_slug": row.try_get::<Option<String>, _>("zone_slug").ok().flatten(),
                "zone_name": row.try_get::<Option<String>, _>("zone_name").ok().flatten(),
                "zone_icon": row.try_get::<Option<String>, _>("zone_icon").ok().flatten(),
                "zone_color": row.try_get::<Option<String>, _>("zone_color").ok().flatten(),
                "zone_order": row.try_get::<Option<i32>, _>("zone_order").ok().flatten().unwrap_or(999),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "profile": {
                "display_name": display_name,
                "email": email,
                "tier": tier,
                "locale": locale,
                "gender": profile["gender"],
                "age": profile["age"],
                "height_cm": profile["height_cm"],
                "default_waist_cm": profile["default_waist_cm"],
                "default_weight_kg": profile["default_weight_kg"],
                "country_code": profile["country_code"],
            },
            "units": units,
            "lifestyle_defaults": lifestyle,
            "custom_reference_ranges": custom_ranges,
            "system_reference_ranges": system_ranges,
            "all_markers": all_markers,
            "calculated_markers": calculated_markers,
            "share_anonymous_data": share_anonymous_data,
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct ProfileUpdate {
    pub display_name: Option<String>,
    pub gender: Option<String>,
    pub age: Option<f64>,
    pub height_cm: Option<f64>,
    pub default_waist_cm: Option<f64>,
    pub default_weight_kg: Option<f64>,
    pub country_code: Option<String>,
    pub locale: Option<String>,
}

/// PUT /settings/profile
pub async fn update_profile(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<ProfileUpdate>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    // Validate gender if provided
    if let Some(ref gender) = body.gender {
        if !["male", "female", "other"].contains(&gender.as_str()) {
            return Err(AppError::Validation(
                "gender must be male, female, or other".to_string(),
            ));
        }
    }

    // Validate country_code (2-letter ISO 3166-1)
    if let Some(ref cc) = body.country_code {
        if cc.len() != 2 || !cc.chars().all(|c| c.is_ascii_uppercase()) {
            return Err(AppError::Validation(
                "country_code must be a 2-letter ISO 3166-1 code (e.g. US, AT, DE)".to_string(),
            ));
        }
    }

    // Validate numeric ranges
    if let Some(age) = body.age {
        if !(1.0..=150.0).contains(&age) {
            return Err(AppError::Validation(
                "age must be between 1 and 150".to_string(),
            ));
        }
    }
    if let Some(h) = body.height_cm {
        if !(50.0..=300.0).contains(&h) {
            return Err(AppError::Validation(
                "height_cm must be between 50 and 300".to_string(),
            ));
        }
    }
    if let Some(w) = body.default_waist_cm {
        if !(30.0..=250.0).contains(&w) {
            return Err(AppError::Validation(
                "default_waist_cm must be between 30 and 250".to_string(),
            ));
        }
    }
    if let Some(wt) = body.default_weight_kg {
        if !(10.0..=500.0).contains(&wt) {
            return Err(AppError::Validation(
                "default_weight_kg must be between 10 and 500".to_string(),
            ));
        }
    }

    // Fetch old profile values for comparison (to detect changes)
    let old_row = sqlx::query(
        "SELECT height_cm, default_waist_cm, default_weight_kg \
         FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let (old_height, old_waist, old_weight) = if let Some(ref row) = old_row {
        use sqlx::Row;
        let h: Option<f64> = row
            .try_get::<Option<String>, _>("height_cm")
            .ok()
            .flatten()
            .map(|v| enc.decrypt_f64(&v));
        let w: Option<f64> = row
            .try_get::<Option<String>, _>("default_waist_cm")
            .ok()
            .flatten()
            .map(|v| enc.decrypt_f64(&v));
        let wt: Option<f64> = row
            .try_get::<Option<String>, _>("default_weight_kg")
            .ok()
            .flatten()
            .map(|v| enc.decrypt_f64(&v));
        (h, w, wt)
    } else {
        (None, None, None)
    };

    // Update display_name on users table
    if let Some(ref name) = body.display_name {
        sqlx::query("UPDATE users SET display_name = $1, updated_at = now() WHERE id = $2")
            .bind(name)
            .bind(auth.user_id)
            .execute(pool.get_ref())
            .await?;
    }

    // Update locale on users table
    if let Some(ref locale) = body.locale {
        if ["en", "de"].contains(&locale.as_str()) {
            sqlx::query("UPDATE users SET locale = $1, updated_at = now() WHERE id = $2")
                .bind(locale)
                .bind(auth.user_id)
                .execute(pool.get_ref())
                .await?;
        }
    }

    // Encrypt and update profile fields
    let gender_enc = body.gender.as_deref().map(|v| enc.encrypt(v));
    let age_enc = body.age.map(|v| enc.encrypt_f64(v));
    let height_enc = body.height_cm.map(|v| enc.encrypt_f64(v));
    let waist_enc = body.default_waist_cm.map(|v| enc.encrypt_f64(v));
    let weight_enc = body.default_weight_kg.map(|v| enc.encrypt_f64(v));

    sqlx::query(
        "UPDATE user_profile SET \
         gender = COALESCE($1, gender), \
         age = COALESCE($2, age), \
         height_cm = COALESCE($3, height_cm), \
         default_waist_cm = COALESCE($4, default_waist_cm), \
         default_weight_kg = COALESCE($5, default_weight_kg), \
         country_code = COALESCE($6, country_code), \
         updated_at = now() \
         WHERE user_id = $7",
    )
    .bind(&gender_enc)
    .bind(&age_enc)
    .bind(&height_enc)
    .bind(&waist_enc)
    .bind(&weight_enc)
    .bind(&body.country_code)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    // Auto-create measurements when body values change
    let now = Utc::now();
    let height_changed = body.height_cm.is_some() && body.height_cm != old_height;
    let waist_changed = body.default_waist_cm.is_some() && body.default_waist_cm != old_waist;
    let weight_changed = body.default_weight_kg.is_some() && body.default_weight_kg != old_weight;

    // Current effective values (new if changed, else old)
    let current_height = body.height_cm.or(old_height);
    let current_waist = body.default_waist_cm.or(old_waist);
    let current_weight = body.default_weight_kg.or(old_weight);

    if weight_changed || height_changed || waist_changed {
        // Helper: insert a measurement for a given marker slug
        async fn insert_auto_measurement(
            pool: &PgPool,
            enc: &crate::services::encryption::Encryptor,
            user_id: Uuid,
            marker_slug: &str,
            value: f64,
            now: chrono::DateTime<Utc>,
        ) -> Result<(), AppError> {
            let marker_row =
                sqlx::query("SELECT id, unit_canonical FROM markers WHERE marker_slug = $1")
                    .bind(marker_slug)
                    .fetch_optional(pool)
                    .await?;

            let Some(marker_row) = marker_row else {
                return Ok(());
            };

            use sqlx::Row;
            let marker_id: Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;

            let status = calculate_status(pool, marker_id, user_id, value, "standard").await?;

            sqlx::query(
                r#"INSERT INTO measurements (
                    user_id, marker_id, timestamp, value_canonical, unit_canonical, status,
                    protocol_tag, meal_timing_tag
                ) VALUES ($1, $2, $3, $4, $5, $6, 'standard', 'unspecified')"#,
            )
            .bind(user_id)
            .bind(marker_id)
            .bind(now)
            .bind(enc.encrypt_f64(value))
            .bind(
                marker_row
                    .try_get::<String, _>("unit_canonical")
                    .unwrap_or_default(),
            )
            .bind(&status)
            .execute(pool)
            .await?;

            Ok(())
        }

        if weight_changed {
            if let Some(w) = body.default_weight_kg {
                insert_auto_measurement(pool.get_ref(), &enc, auth.user_id, "weight", w, now)
                    .await?;
            }
        }
        // height is not a standard marker (stored only in user_profile), skip measurement insert
        if waist_changed {
            if let Some(wc) = body.default_waist_cm {
                insert_auto_measurement(
                    pool.get_ref(),
                    &enc,
                    auth.user_id,
                    "waist_circumference",
                    wc,
                    now,
                )
                .await?;
            }
        }

        // Recalculate BMI and WHtR via compute_calculated_markers
        let mut values_map = std::collections::HashMap::new();
        if let Some(w) = current_weight {
            values_map.insert("weight".to_string(), w);
        }
        if let Some(wc) = current_waist {
            values_map.insert("waist_circumference".to_string(), wc);
        }

        let computed = compute_calculated_markers(
            pool.get_ref(),
            auth.user_id,
            &values_map,
            current_height,
            "standard",
            None,
            now,
        )
        .await?;

        // Store calculated marker values
        for (cm_id, value, status) in &computed {
            sqlx::query(
                r#"INSERT INTO calculated_marker_values (
                    user_id, calculated_marker_id, value, status, protocol_tag, measured_at
                ) VALUES ($1, $2, $3, $4, 'standard', $5)"#,
            )
            .bind(auth.user_id)
            .bind(cm_id)
            .bind(value)
            .bind(status)
            .bind(now)
            .execute(pool.get_ref())
            .await?;
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct UnitsUpdate {
    pub date_format: Option<String>,
    pub time_format: Option<String>,
    pub glucose_unit: Option<String>,
    pub ketones_unit: Option<String>,
    pub cholesterol_unit: Option<String>,
    pub uric_acid_unit: Option<String>,
    pub hemoglobin_unit: Option<String>,
    pub weight_unit: Option<String>,
    pub height_unit: Option<String>,
    pub bp_unit: Option<String>,
    pub waist_unit: Option<String>,
    pub extended_entry_enabled: Option<bool>,
}

/// PUT /settings/units
pub async fn update_units(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<UnitsUpdate>,
) -> Result<HttpResponse, AppError> {
    // Validate allowed values
    if let Some(ref df) = body.date_format {
        if !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].contains(&df.as_str()) {
            return Err(AppError::Validation(
                "date_format must be DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD".to_string(),
            ));
        }
    }
    if let Some(ref tf) = body.time_format {
        if !["24h", "12h"].contains(&tf.as_str()) {
            return Err(AppError::Validation(
                "time_format must be 24h or 12h".to_string(),
            ));
        }
    }

    // Validate unit values
    let unit_pairs = [
        (&body.glucose_unit, &["mmol/L", "mg/dL"][..]),
        (&body.ketones_unit, &["mmol/L"][..]),
        (&body.cholesterol_unit, &["mmol/L", "mg/dL"][..]),
        (&body.uric_acid_unit, &["\u{00b5}mol/L", "mg/dL"][..]),
        (&body.hemoglobin_unit, &["mmol/L", "g/dL"][..]),
        (&body.weight_unit, &["kg", "lbs"][..]),
        (&body.height_unit, &["cm", "in"][..]),
        (&body.bp_unit, &["mmHg"][..]),
        (&body.waist_unit, &["cm", "in"][..]),
    ];
    for (val, allowed) in &unit_pairs {
        if let Some(ref v) = val {
            if !allowed.contains(&v.as_str()) {
                return Err(AppError::Validation(format!("Invalid unit value: {}", v)));
            }
        }
    }

    sqlx::query(
        "UPDATE user_preferences SET \
         date_format = COALESCE($1, date_format), \
         time_format = COALESCE($2, time_format), \
         glucose_unit = COALESCE($3, glucose_unit), \
         ketones_unit = COALESCE($4, ketones_unit), \
         cholesterol_unit = COALESCE($5, cholesterol_unit), \
         uric_acid_unit = COALESCE($6, uric_acid_unit), \
         hemoglobin_unit = COALESCE($7, hemoglobin_unit), \
         weight_unit = COALESCE($8, weight_unit), \
         height_unit = COALESCE($9, height_unit), \
         bp_unit = COALESCE($10, bp_unit), \
         waist_unit = COALESCE($11, waist_unit), \
         extended_entry_enabled = COALESCE($12, extended_entry_enabled), \
         updated_at = now() \
         WHERE user_id = $13",
    )
    .bind(&body.date_format)
    .bind(&body.time_format)
    .bind(&body.glucose_unit)
    .bind(&body.ketones_unit)
    .bind(&body.cholesterol_unit)
    .bind(&body.uric_acid_unit)
    .bind(&body.hemoglobin_unit)
    .bind(&body.weight_unit)
    .bind(&body.height_unit)
    .bind(&body.bp_unit)
    .bind(&body.waist_unit)
    .bind(body.extended_entry_enabled)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct LifestyleDefaultsUpdate {
    pub show_extended_lifestyle: Option<bool>,
    pub default_diet_protocol: Option<String>,
    pub default_fasting_protocol: Option<String>,
    pub default_exercise: Option<String>,
    pub default_sleep_hours: Option<f64>,
    pub default_sleep_quality: Option<String>,
    pub default_stress_level: Option<i32>,
}

/// PUT /settings/lifestyle
pub async fn update_lifestyle(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<LifestyleDefaultsUpdate>,
) -> Result<HttpResponse, AppError> {
    // Validate sleep hours
    if let Some(h) = body.default_sleep_hours {
        if !(0.0..=24.0).contains(&h) {
            return Err(AppError::Validation("sleep hours must be 0-24".to_string()));
        }
    }
    // Validate stress level
    if let Some(s) = body.default_stress_level {
        if !(1..=10).contains(&s) {
            return Err(AppError::Validation(
                "stress level must be 1-10".to_string(),
            ));
        }
    }

    sqlx::query(
        "UPDATE user_preferences SET \
         show_extended_lifestyle = COALESCE($1, show_extended_lifestyle), \
         default_diet_protocol = COALESCE($2, default_diet_protocol), \
         default_fasting_protocol = COALESCE($3, default_fasting_protocol), \
         default_exercise = COALESCE($4, default_exercise), \
         default_sleep_hours = COALESCE($5, default_sleep_hours), \
         default_sleep_quality = COALESCE($6, default_sleep_quality), \
         default_stress_level = COALESCE($7, default_stress_level), \
         updated_at = now() \
         WHERE user_id = $8",
    )
    .bind(body.show_extended_lifestyle)
    .bind(&body.default_diet_protocol)
    .bind(&body.default_fasting_protocol)
    .bind(&body.default_exercise)
    .bind(body.default_sleep_hours)
    .bind(&body.default_sleep_quality)
    .bind(body.default_stress_level)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct ReferenceRangeUpdate {
    pub protocol_context: Option<String>,
    pub orange_min: Option<f64>,
    pub green_min: Option<f64>,
    pub green_max: Option<f64>,
    pub orange_max: Option<f64>,
}

/// PUT /settings/reference-ranges/{marker_slug}
pub async fn update_reference_range(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    body: web::Json<ReferenceRangeUpdate>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Tier check: custom_thresholds
    crate::services::tier::check_feature(pool.get_ref(), auth.user_id, "custom_thresholds").await?;

    let marker_slug = path.into_inner();
    let protocol = body.protocol_context.as_deref().unwrap_or("standard");

    // Validate: green must be within orange
    if let (Some(gmin), Some(gmax)) = (body.green_min, body.green_max) {
        if gmin > gmax {
            return Err(AppError::Validation(
                "green_min must be <= green_max".to_string(),
            ));
        }
    }
    if let (Some(omin), Some(omax)) = (body.orange_min, body.orange_max) {
        if omin > omax {
            return Err(AppError::Validation(
                "orange_min must be <= orange_max".to_string(),
            ));
        }
    }

    // Look up marker
    let marker_row = sqlx::query("SELECT id FROM markers WHERE marker_slug = $1")
        .bind(&marker_slug)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let marker_id: uuid::Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;

    // Upsert custom reference range
    sqlx::query(
        r#"INSERT INTO reference_ranges (user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max, is_custom)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (user_id, marker_id, protocol_context) WHERE user_id IS NOT NULL
        DO UPDATE SET
            orange_min = $4, green_min = $5, green_max = $6, orange_max = $7,
            updated_at = now()"#,
    )
    .bind(auth.user_id)
    .bind(marker_id)
    .bind(protocol)
    .bind(body.orange_min)
    .bind(body.green_min)
    .bind(body.green_max)
    .bind(body.orange_max)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct BulkRangeItem {
    pub marker_slug: String,
    pub protocol_context: Option<String>,
    pub orange_min: Option<f64>,
    pub green_min: Option<f64>,
    pub green_max: Option<f64>,
    pub orange_max: Option<f64>,
}

#[derive(Deserialize)]
pub struct BulkRangeUpdate {
    pub ranges: Vec<BulkRangeItem>,
}

/// PUT /settings/reference-ranges/bulk
pub async fn update_reference_ranges_bulk(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<BulkRangeUpdate>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Tier check: custom_thresholds
    crate::services::tier::check_feature(pool.get_ref(), auth.user_id, "custom_thresholds").await?;

    if body.ranges.len() > 100 {
        return Err(AppError::Validation(
            "Maximum 100 ranges per bulk update".to_string(),
        ));
    }

    let mut updated = 0;
    for item in &body.ranges {
        let protocol = item.protocol_context.as_deref().unwrap_or("standard");

        let marker_row = sqlx::query("SELECT id FROM markers WHERE marker_slug = $1")
            .bind(&item.marker_slug)
            .fetch_optional(pool.get_ref())
            .await?;

        if let Some(row) = marker_row {
            let marker_id: uuid::Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

            sqlx::query(
                r#"INSERT INTO reference_ranges (user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max, is_custom)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                ON CONFLICT (user_id, marker_id, protocol_context) WHERE user_id IS NOT NULL
                DO UPDATE SET
                    orange_min = $4, green_min = $5, green_max = $6, orange_max = $7,
                    updated_at = now()"#,
            )
            .bind(auth.user_id)
            .bind(marker_id)
            .bind(protocol)
            .bind(item.orange_min)
            .bind(item.green_min)
            .bind(item.green_max)
            .bind(item.orange_max)
            .execute(pool.get_ref())
            .await?;

            updated += 1;
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": updated },
        "error": null
    })))
}

/// DELETE /settings/reference-ranges/{marker_slug} -- reset to system defaults
pub async fn delete_reference_range(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    query: web::Query<ProtocolQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let marker_slug = path.into_inner();
    let protocol = query.protocol_context.as_deref().unwrap_or("standard");

    let marker_row = sqlx::query("SELECT id FROM markers WHERE marker_slug = $1")
        .bind(&marker_slug)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let marker_id: uuid::Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;

    sqlx::query(
        "DELETE FROM reference_ranges WHERE user_id = $1 AND marker_id = $2 AND protocol_context = $3",
    )
    .bind(auth.user_id)
    .bind(marker_id)
    .bind(protocol)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "deleted": true },
        "error": null
    })))
}

/// DELETE /settings/reference-ranges -- reset ALL custom ranges
pub async fn delete_all_reference_ranges(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    sqlx::query("DELETE FROM reference_ranges WHERE user_id = $1")
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "deleted": true },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct ProtocolQuery {
    pub protocol_context: Option<String>,
}

/// POST /settings/export-all -- full JSON export of all user data
pub async fn export_all(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // User info
    let user_row =
        sqlx::query("SELECT email, display_name, role, tier, created_at FROM users WHERE id = $1")
            .bind(auth.user_id)
            .fetch_optional(pool.get_ref())
            .await?
            .ok_or(AppError::NotFound)?;

    let user = json!({
        "email": user_row.try_get::<String, _>("email").unwrap_or_default(),
        "display_name": user_row.try_get::<Option<String>, _>("display_name").ok().flatten(),
        "role": user_row.try_get::<String, _>("role").unwrap_or_default(),
        "tier": user_row.try_get::<String, _>("tier").unwrap_or_default(),
        "created_at": user_row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
    });

    // Profile
    let profile_row = sqlx::query(
        "SELECT gender, age, height_cm, default_waist_cm, default_weight_kg, country_code FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let profile = match profile_row {
        Some(row) => json!({
            "gender": enc.decrypt_opt(row.try_get::<Option<String>, _>("gender").ok().flatten()),
            "age": row.try_get::<Option<String>, _>("age").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "height_cm": row.try_get::<Option<String>, _>("height_cm").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "default_waist_cm": row.try_get::<Option<String>, _>("default_waist_cm").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "default_weight_kg": row.try_get::<Option<String>, _>("default_weight_kg").ok().flatten().map(|v| enc.decrypt_f64(&v)),
            "country_code": row.try_get::<Option<String>, _>("country_code").ok().flatten(),
        }),
        None => json!(null),
    };

    // Preferences
    let prefs_row = sqlx::query(
        "SELECT date_format, time_format, glucose_unit, ketones_unit, cholesterol_unit, \
         uric_acid_unit, hemoglobin_unit, weight_unit, height_unit, bp_unit, waist_unit, \
         extended_entry_enabled, show_extended_lifestyle, default_diet_protocol, \
         default_fasting_protocol, default_exercise, default_sleep_hours, \
         default_sleep_quality, default_stress_level FROM user_preferences WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let preferences = match prefs_row {
        Some(row) => json!({
            "date_format": row.try_get::<String, _>("date_format").unwrap_or_default(),
            "time_format": row.try_get::<String, _>("time_format").unwrap_or_default(),
            "glucose_unit": row.try_get::<String, _>("glucose_unit").unwrap_or_default(),
            "ketones_unit": row.try_get::<String, _>("ketones_unit").unwrap_or_default(),
            "cholesterol_unit": row.try_get::<String, _>("cholesterol_unit").unwrap_or_default(),
            "uric_acid_unit": row.try_get::<String, _>("uric_acid_unit").unwrap_or_default(),
            "hemoglobin_unit": row.try_get::<String, _>("hemoglobin_unit").unwrap_or_default(),
            "weight_unit": row.try_get::<String, _>("weight_unit").unwrap_or_default(),
            "height_unit": row.try_get::<String, _>("height_unit").unwrap_or_default(),
            "bp_unit": row.try_get::<String, _>("bp_unit").unwrap_or_default(),
            "waist_unit": row.try_get::<String, _>("waist_unit").unwrap_or_default(),
            "extended_entry_enabled": row.try_get::<bool, _>("extended_entry_enabled").unwrap_or(false),
            "show_extended_lifestyle": row.try_get::<bool, _>("show_extended_lifestyle").unwrap_or(true),
            "default_diet_protocol": row.try_get::<Option<String>, _>("default_diet_protocol").ok().flatten(),
            "default_fasting_protocol": row.try_get::<Option<String>, _>("default_fasting_protocol").ok().flatten(),
            "default_exercise": row.try_get::<Option<String>, _>("default_exercise").ok().flatten(),
            "default_sleep_hours": row.try_get::<Option<f64>, _>("default_sleep_hours").ok().flatten(),
            "default_sleep_quality": row.try_get::<Option<String>, _>("default_sleep_quality").ok().flatten(),
            "default_stress_level": row.try_get::<Option<i32>, _>("default_stress_level").ok().flatten(),
        }),
        None => json!(null),
    };

    // Measurements
    let meas_rows = sqlx::query(
        r#"SELECT m.timestamp, mk.marker_slug, mk.marker_name,
            m.value_canonical as value, m.unit_canonical as unit,
            m.status, m.protocol_tag, m.lifestyle_note
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        WHERE m.user_id = $1 AND m.is_deleted = false
        ORDER BY m.timestamp DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let measurements: Vec<serde_json::Value> = meas_rows
        .iter()
        .map(|row| {
            json!({
                "timestamp": row.try_get::<chrono::DateTime<Utc>, _>("timestamp").ok(),
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "value": enc.decrypt_f64(&row.try_get::<String, _>("value").unwrap_or_default()),
                "unit": row.try_get::<String, _>("unit").unwrap_or_default(),
                "status": row.try_get::<Option<String>, _>("status").ok().flatten(),
                "protocol_tag": row.try_get::<Option<String>, _>("protocol_tag").ok().flatten(),
                "lifestyle_note": enc.decrypt_opt(row.try_get::<Option<String>, _>("lifestyle_note").ok().flatten()),
            })
        })
        .collect();

    // Calculated marker values
    let calc_rows = sqlx::query(
        r#"SELECT cmv.measured_at, cm.marker_slug, cm.marker_name,
            cmv.value::float8 as value, cmv.status, cmv.protocol_tag
        FROM calculated_marker_values cmv
        JOIN calculated_markers cm ON cm.id = cmv.calculated_marker_id
        WHERE cmv.user_id = $1 AND cmv.is_deleted = false
        ORDER BY cmv.measured_at DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let calculated: Vec<serde_json::Value> = calc_rows
        .iter()
        .map(|row| {
            json!({
                "measured_at": row.try_get::<chrono::DateTime<Utc>, _>("measured_at").ok(),
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "value": row.try_get::<Option<f64>, _>("value").ok().flatten(),
                "status": row.try_get::<Option<String>, _>("status").ok().flatten(),
                "protocol_tag": row.try_get::<Option<String>, _>("protocol_tag").ok().flatten(),
            })
        })
        .collect();

    // Custom reference ranges
    let range_rows = sqlx::query(
        r#"SELECT mk.marker_slug, rr.protocol_context,
            rr.orange_min::float8 as orange_min, rr.green_min::float8 as green_min,
            rr.green_max::float8 as green_max, rr.orange_max::float8 as orange_max
        FROM reference_ranges rr
        JOIN markers mk ON mk.id = rr.marker_id
        WHERE rr.user_id = $1"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let custom_ranges: Vec<serde_json::Value> = range_rows
        .iter()
        .map(|row| {
            json!({
                "marker_slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "protocol_context": row.try_get::<String, _>("protocol_context").unwrap_or_default(),
                "orange_min": row.try_get::<Option<f64>, _>("orange_min").ok().flatten(),
                "green_min": row.try_get::<Option<f64>, _>("green_min").ok().flatten(),
                "green_max": row.try_get::<Option<f64>, _>("green_max").ok().flatten(),
                "orange_max": row.try_get::<Option<f64>, _>("orange_max").ok().flatten(),
            })
        })
        .collect();

    let export = json!({
        "exported_at": Utc::now().to_rfc3339(),
        "user": user,
        "profile": profile,
        "preferences": preferences,
        "measurements": measurements,
        "calculated_markers": calculated,
        "custom_reference_ranges": custom_ranges,
    });

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let filename = format!("sovereign-health-full-export-{}.json", today);

    Ok(HttpResponse::Ok()
        .content_type("application/json; charset=utf-8")
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", filename),
        ))
        .json(export))
}

/// DELETE /settings/account -- soft-delete user account with 30-day grace period
pub async fn delete_account(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    // Soft delete: set is_deleted = true, deleted_at = now()
    sqlx::query(
        "UPDATE users SET is_deleted = true, deleted_at = now(), updated_at = now() WHERE id = $1",
    )
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    // Revoke all refresh tokens
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1")
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "deleted": true,
            "message": "Account scheduled for deletion. You have 30 days to recover it by contacting support."
        },
        "error": null
    })))
}

/// PUT /settings/anonymous-data -- toggle anonymous data sharing
pub async fn update_anonymous_data(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let enabled = body
        .get("share_anonymous_data")
        .and_then(|v| v.as_bool())
        .ok_or_else(|| {
            AppError::Validation("share_anonymous_data (boolean) is required".to_string())
        })?;

    sqlx::query("UPDATE user_preferences SET share_anonymous_data = $1 WHERE user_id = $2")
        .bind(enabled)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Consent management (Task 6)
// ---------------------------------------------------------------------------

/// GET /settings/consent
pub async fn get_consent(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let row = sqlx::query(
        "SELECT consent_product_updates, consent_newsletter, consent_partner_offers \
         FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let (product_updates, newsletter, partner_offers) = match row {
        Some(r) => (
            r.try_get::<bool, _>("consent_product_updates")
                .unwrap_or(true),
            r.try_get::<bool, _>("consent_newsletter").unwrap_or(false),
            r.try_get::<bool, _>("consent_partner_offers")
                .unwrap_or(false),
        ),
        None => (true, false, false),
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "product_updates": product_updates,
            "newsletter": newsletter,
            "partner_offers": partner_offers,
        },
        "error": null
    })))
}

/// PUT /settings/consent
pub async fn update_consent(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    email_provider: web::Data<std::sync::Arc<dyn crate::services::email::EmailProvider>>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let product_updates = body.get("product_updates").and_then(|v| v.as_bool());
    let newsletter = body.get("newsletter").and_then(|v| v.as_bool());
    let partner_offers = body.get("partner_offers").and_then(|v| v.as_bool());

    if product_updates.is_none() && newsletter.is_none() && partner_offers.is_none() {
        return Err(AppError::Validation(
            "At least one consent field required".to_string(),
        ));
    }

    // Build dynamic update
    let mut sets = Vec::new();
    let mut idx = 2; // $1 = user_id

    if product_updates.is_some() {
        sets.push(format!("consent_product_updates = ${idx}"));
        idx += 1;
    }
    if newsletter.is_some() {
        sets.push(format!("consent_newsletter = ${idx}"));
        idx += 1;
    }
    if partner_offers.is_some() {
        sets.push(format!("consent_partner_offers = ${idx}"));
    }

    sets.push("updated_at = now()".to_string());

    let sql = format!(
        "UPDATE user_profile SET {} WHERE user_id = $1",
        sets.join(", ")
    );

    let mut q = sqlx::query(&sql).bind(auth.user_id);
    if let Some(v) = product_updates {
        q = q.bind(v);
    }
    if let Some(v) = newsletter {
        q = q.bind(v);
    }
    if let Some(v) = partner_offers {
        q = q.bind(v);
    }

    q.execute(pool.get_ref()).await?;

    // Sync consent tags to Mailgun (safe tags only)
    let mut add_tags = Vec::new();
    let mut remove_tags = Vec::new();

    if let Some(v) = product_updates {
        if v {
            add_tags.push("consent:product_updates".to_string());
        } else {
            remove_tags.push("consent:product_updates".to_string());
        }
    }
    if let Some(v) = newsletter {
        if v {
            add_tags.push("consent:newsletter".to_string());
        } else {
            remove_tags.push("consent:newsletter".to_string());
        }
    }
    if let Some(v) = partner_offers {
        if v {
            add_tags.push("consent:partner_offers".to_string());
        } else {
            remove_tags.push("consent:partner_offers".to_string());
        }
    }

    // Fetch user email for Mailgun tag sync
    let email: Option<String> = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_optional(pool.get_ref())
        .await?;

    if let Some(email) = email {
        if !add_tags.is_empty() || !remove_tags.is_empty() {
            if let Err(e) = email_provider
                .update_tags(&email, &add_tags, &remove_tags)
                .await
            {
                tracing::warn!(user_id = %auth.user_id, "Failed to sync consent tags to Mailgun: {e}");
            }
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}
