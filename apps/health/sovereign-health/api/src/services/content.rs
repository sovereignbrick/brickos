// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use sqlx::PgPool;
use uuid::Uuid;

use crate::models::content::*;

/// Resolve locale: use provided locale, fall back to Accept-Language, then "en"
pub fn resolve_locale(query_locale: Option<&str>, accept_language: Option<&str>) -> String {
    if let Some(loc) = query_locale {
        let loc = loc.trim();
        if !loc.is_empty() {
            return loc[..2.min(loc.len())].to_lowercase();
        }
    }
    if let Some(al) = accept_language {
        // Parse first language from Accept-Language header
        if let Some(first) = al.split(',').next() {
            let lang = first.split(';').next().unwrap_or("en").trim();
            if lang.len() >= 2 {
                return lang[..2].to_lowercase();
            }
        }
    }
    "en".to_string()
}

// ---------------------------------------------------------------------------
// Public content queries (with locale fallback to English)
// ---------------------------------------------------------------------------

pub async fn get_zones(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<ZoneWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, ZoneWithTranslation>(
        r#"SELECT z.id, z.zone_slug, z.zone_icon, z.zone_color, z.display_order,
                  COALESCE(t.name, te.name, z.zone_name) AS name,
                  COALESCE(t.description, te.description) AS description,
                  COALESCE(t.short_description, te.short_description) AS short_description
           FROM zones z
           LEFT JOIN zone_translations t ON t.zone_id = z.id AND t.locale = $1
           LEFT JOIN zone_translations te ON te.zone_id = z.id AND te.locale = 'en'
           ORDER BY z.display_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_markers(
    pool: &PgPool,
    locale: &str,
    zone_slug: Option<&str>,
) -> Result<Vec<MarkerWithTranslation>, sqlx::Error> {
    if let Some(zone) = zone_slug {
        sqlx::query_as::<_, MarkerWithTranslation>(
            r#"SELECT m.id, m.marker_slug, m.unit_canonical, m.display_order,
                      z.zone_slug,
                      CASE WHEN m.source_type = 'calculated' THEN true ELSE false END AS is_calculated,
                      COALESCE(t.name, te.name, m.marker_name) AS name,
                      COALESCE(t.description, te.description) AS description,
                      COALESCE(t.tooltip, te.tooltip) AS tooltip,
                      COALESCE(t.why_it_matters, te.why_it_matters) AS why_it_matters,
                      COALESCE(t.when_to_worry, te.when_to_worry) AS when_to_worry
               FROM markers m
               JOIN zones z ON z.id = m.zone_id
               LEFT JOIN marker_translations t ON t.marker_id = m.id AND t.locale = $1
               LEFT JOIN marker_translations te ON te.marker_id = m.id AND te.locale = 'en'
               WHERE z.zone_slug = $2

               UNION ALL

               SELECT cm.id, cm.marker_slug, NULL AS unit_canonical, 1000 + cm.display_order,
                      z.zone_slug,
                      true AS is_calculated,
                      cm.marker_name AS name,
                      cm.formula_description AS description,
                      NULL AS tooltip,
                      NULL AS why_it_matters,
                      NULL AS when_to_worry
               FROM calculated_markers cm
               JOIN zones z ON z.id = cm.zone_id
               WHERE z.zone_slug = $2

               ORDER BY display_order"#,
        )
        .bind(locale)
        .bind(zone)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query_as::<_, MarkerWithTranslation>(
            r#"SELECT m.id, m.marker_slug, m.unit_canonical, m.display_order,
                      z.zone_slug,
                      CASE WHEN m.source_type = 'calculated' THEN true ELSE false END AS is_calculated,
                      COALESCE(t.name, te.name, m.marker_name) AS name,
                      COALESCE(t.description, te.description) AS description,
                      COALESCE(t.tooltip, te.tooltip) AS tooltip,
                      COALESCE(t.why_it_matters, te.why_it_matters) AS why_it_matters,
                      COALESCE(t.when_to_worry, te.when_to_worry) AS when_to_worry
               FROM markers m
               JOIN zones z ON z.id = m.zone_id
               LEFT JOIN marker_translations t ON t.marker_id = m.id AND t.locale = $1
               LEFT JOIN marker_translations te ON te.marker_id = m.id AND te.locale = 'en'

               UNION ALL

               SELECT cm.id, cm.marker_slug, NULL AS unit_canonical, 1000 + cm.display_order,
                      z.zone_slug,
                      true AS is_calculated,
                      cm.marker_name AS name,
                      cm.formula_description AS description,
                      NULL AS tooltip,
                      NULL AS why_it_matters,
                      NULL AS when_to_worry
               FROM calculated_markers cm
               JOIN zones z ON z.id = cm.zone_id

               ORDER BY display_order"#,
        )
        .bind(locale)
        .fetch_all(pool)
        .await
    }
}

pub async fn get_marker_by_slug(
    pool: &PgPool,
    locale: &str,
    slug: &str,
) -> Result<Option<MarkerWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, MarkerWithTranslation>(
        r#"SELECT m.id, m.marker_slug, m.unit_canonical, m.display_order,
                  z.zone_slug,
                  CASE WHEN m.source_type = 'calculated' THEN true ELSE false END AS is_calculated,
                  COALESCE(t.name, te.name, m.marker_name) AS name,
                  COALESCE(t.description, te.description) AS description,
                  COALESCE(t.tooltip, te.tooltip) AS tooltip,
                  COALESCE(t.why_it_matters, te.why_it_matters) AS why_it_matters,
                  COALESCE(t.when_to_worry, te.when_to_worry) AS when_to_worry
           FROM markers m
           JOIN zones z ON z.id = m.zone_id
           LEFT JOIN marker_translations t ON t.marker_id = m.id AND t.locale = $1
           LEFT JOIN marker_translations te ON te.marker_id = m.id AND te.locale = 'en'
           WHERE m.marker_slug = $2

           UNION ALL

           SELECT cm.id, cm.marker_slug, NULL AS unit_canonical, cm.display_order,
                  z.zone_slug,
                  true AS is_calculated,
                  cm.marker_name AS name,
                  cm.formula_description AS description,
                  NULL AS tooltip,
                  NULL AS why_it_matters,
                  NULL AS when_to_worry
           FROM calculated_markers cm
           JOIN zones z ON z.id = cm.zone_id
           WHERE cm.marker_slug = $2

           LIMIT 1"#,
    )
    .bind(locale)
    .bind(slug)
    .fetch_optional(pool)
    .await
}

pub async fn get_tiers(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<TierWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, TierWithTranslation>(
        r#"SELECT lt.id, lt.slug, lt.price_monthly_eur::float8 AS price_monthly_eur, lt.price_annual_eur::float8 AS price_annual_eur,
                  lt.display_order, lt.is_active, lt.highlight,
                  COALESCE(t.name, te.name, lt.name) AS name,
                  COALESCE(t.tagline, te.tagline, lt.tagline) AS tagline,
                  COALESCE(t.description, te.description, lt.description) AS description,
                  COALESCE(t.features_summary, te.features_summary) AS features_summary
           FROM license_tiers lt
           LEFT JOIN license_tier_translations t ON t.tier_id = lt.id AND t.locale = $1
           LEFT JOIN license_tier_translations te ON te.tier_id = lt.id AND te.locale = 'en'
           WHERE lt.is_active = true
           ORDER BY lt.display_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_diet_protocols(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<DietProtocolWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, DietProtocolWithTranslation>(
        r#"SELECT dp.id, dp.slug, dp.category, dp.sort_order, dp.is_active,
                  COALESCE(t.name, te.name, dp.slug) AS name,
                  COALESCE(t.category_label, te.category_label) AS category_label,
                  COALESCE(t.short_description, te.short_description) AS short_description
           FROM diet_protocols dp
           LEFT JOIN diet_protocol_translations t ON t.protocol_id = dp.id AND t.locale = $1
           LEFT JOIN diet_protocol_translations te ON te.protocol_id = dp.id AND te.locale = 'en'
           WHERE dp.is_active = true
           ORDER BY dp.sort_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_eating_patterns(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<EatingPatternWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, EatingPatternWithTranslation>(
        r#"SELECT ep.id, ep.slug, ep.sort_order, ep.is_active,
                  COALESCE(t.name, te.name, ep.slug) AS name,
                  COALESCE(t.description, te.description) AS description
           FROM eating_patterns ep
           LEFT JOIN eating_pattern_translations t ON t.pattern_id = ep.id AND t.locale = $1
           LEFT JOIN eating_pattern_translations te ON te.pattern_id = ep.id AND te.locale = 'en'
           WHERE ep.is_active = true
           ORDER BY ep.sort_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_food_categories(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<FoodCategoryWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, FoodCategoryWithTranslation>(
        r#"SELECT fc.id, fc.slug, fc.icon, fc.sort_order,
                  COALESCE(t.name, te.name, fc.slug) AS name
           FROM food_categories fc
           LEFT JOIN food_category_translations t ON t.category_id = fc.id AND t.locale = $1
           LEFT JOIN food_category_translations te ON te.category_id = fc.id AND te.locale = 'en'
           ORDER BY fc.sort_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_medication_categories(
    pool: &PgPool,
    locale: &str,
) -> Result<Vec<MedicationCategoryWithTranslation>, sqlx::Error> {
    sqlx::query_as::<_, MedicationCategoryWithTranslation>(
        r#"SELECT mc.id, mc.slug, mc.sort_order,
                  COALESCE(t.name, te.name, mc.slug) AS name,
                  COALESCE(t.description, te.description) AS description
           FROM medication_categories mc
           LEFT JOIN medication_category_translations t ON t.category_id = mc.id AND t.locale = $1
           LEFT JOIN medication_category_translations te ON te.category_id = mc.id AND te.locale = 'en'
           ORDER BY mc.sort_order"#,
    )
    .bind(locale)
    .fetch_all(pool)
    .await
}

pub async fn get_ui_strings(
    pool: &PgPool,
    locale: &str,
    context: Option<&str>,
) -> Result<Vec<UiStringWithTranslation>, sqlx::Error> {
    if let Some(ctx) = context {
        sqlx::query_as::<_, UiStringWithTranslation>(
            r#"SELECT us.key, us.context,
                      COALESCE(t.value, te.value, us.key) AS value
               FROM ui_strings us
               LEFT JOIN ui_string_translations t ON t.string_id = us.id AND t.locale = $1
               LEFT JOIN ui_string_translations te ON te.string_id = us.id AND te.locale = 'en'
               WHERE us.context = $2
               ORDER BY us.key"#,
        )
        .bind(locale)
        .bind(ctx)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query_as::<_, UiStringWithTranslation>(
            r#"SELECT us.key, us.context,
                      COALESCE(t.value, te.value, us.key) AS value
               FROM ui_strings us
               LEFT JOIN ui_string_translations t ON t.string_id = us.id AND t.locale = $1
               LEFT JOIN ui_string_translations te ON te.string_id = us.id AND te.locale = 'en'
               ORDER BY us.key"#,
        )
        .bind(locale)
        .fetch_all(pool)
        .await
    }
}

// ---------------------------------------------------------------------------
// Translation completeness
// ---------------------------------------------------------------------------

pub async fn get_translation_completeness(
    pool: &PgPool,
    locale: &str,
) -> Result<TranslationCompleteness, sqlx::Error> {
    let mut missing_tables = Vec::new();
    let mut total: i64 = 0;
    let mut translated: i64 = 0;

    // Zone translations
    let zone_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM zones")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let zone_translated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM zone_translations WHERE locale = $1")
            .bind(locale)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    total += zone_total;
    translated += zone_translated;
    if zone_total > zone_translated {
        missing_tables.push(MissingByTable {
            table_name: "zones".to_string(),
            missing_count: zone_total - zone_translated,
        });
    }

    // Marker translations
    let marker_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markers")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let marker_translated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM marker_translations WHERE locale = $1")
            .bind(locale)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    total += marker_total;
    translated += marker_translated;
    if marker_total > marker_translated {
        missing_tables.push(MissingByTable {
            table_name: "markers".to_string(),
            missing_count: marker_total - marker_translated,
        });
    }

    // Tier translations
    let tier_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM license_tiers WHERE is_active = true")
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    let tier_translated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM license_tier_translations ltt JOIN license_tiers lt ON lt.id = ltt.tier_id WHERE ltt.locale = $1 AND lt.is_active = true"
    ).bind(locale).fetch_one(pool).await.unwrap_or(0);
    total += tier_total;
    translated += tier_translated;
    if tier_total > tier_translated {
        missing_tables.push(MissingByTable {
            table_name: "tiers".to_string(),
            missing_count: tier_total - tier_translated,
        });
    }

    // UI strings
    let ui_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ui_strings")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let ui_translated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM ui_string_translations WHERE locale = $1")
            .bind(locale)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    total += ui_total;
    translated += ui_translated;
    if ui_total > ui_translated {
        missing_tables.push(MissingByTable {
            table_name: "ui_strings".to_string(),
            missing_count: ui_total - ui_translated,
        });
    }

    // Diet protocols
    let dp_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM diet_protocols WHERE is_active = true")
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    let dp_translated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM diet_protocol_translations dpt JOIN diet_protocols dp ON dp.id = dpt.protocol_id WHERE dpt.locale = $1 AND dp.is_active = true"
    ).bind(locale).fetch_one(pool).await.unwrap_or(0);
    total += dp_total;
    translated += dp_translated;
    if dp_total > dp_translated {
        missing_tables.push(MissingByTable {
            table_name: "diet_protocols".to_string(),
            missing_count: dp_total - dp_translated,
        });
    }

    // Food categories
    let fc_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM food_categories")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let fc_translated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM food_category_translations WHERE locale = $1")
            .bind(locale)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    total += fc_total;
    translated += fc_translated;
    if fc_total > fc_translated {
        missing_tables.push(MissingByTable {
            table_name: "food_categories".to_string(),
            missing_count: fc_total - fc_translated,
        });
    }

    let percentage = if total > 0 {
        (translated as f64 / total as f64) * 100.0
    } else {
        100.0
    };

    Ok(TranslationCompleteness {
        locale: locale.to_string(),
        total,
        translated,
        percentage,
        missing_by_table: missing_tables,
    })
}

// ---------------------------------------------------------------------------
// Admin: update translation
// ---------------------------------------------------------------------------

pub async fn update_zone_translation(
    pool: &PgPool,
    zone_id: Uuid,
    locale: &str,
    fields: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    let name = fields.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let description = fields.get("description").and_then(|v| v.as_str());
    let short_description = fields.get("short_description").and_then(|v| v.as_str());

    sqlx::query(
        r#"INSERT INTO zone_translations (zone_id, locale, name, description, short_description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (zone_id, locale) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             short_description = EXCLUDED.short_description,
             updated_at = NOW()"#,
    )
    .bind(zone_id)
    .bind(locale)
    .bind(name)
    .bind(description)
    .bind(short_description)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_marker_translation(
    pool: &PgPool,
    marker_id: Uuid,
    locale: &str,
    fields: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    let name = fields.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let description = fields.get("description").and_then(|v| v.as_str());
    let tooltip = fields.get("tooltip").and_then(|v| v.as_str());
    let why_it_matters = fields.get("why_it_matters").and_then(|v| v.as_str());
    let when_to_worry = fields.get("when_to_worry").and_then(|v| v.as_str());

    sqlx::query(
        r#"INSERT INTO marker_translations (marker_id, locale, name, description, tooltip, why_it_matters, when_to_worry)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (marker_id, locale) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             tooltip = EXCLUDED.tooltip,
             why_it_matters = EXCLUDED.why_it_matters,
             when_to_worry = EXCLUDED.when_to_worry,
             updated_at = NOW()"#,
    )
    .bind(marker_id)
    .bind(locale)
    .bind(name)
    .bind(description)
    .bind(tooltip)
    .bind(why_it_matters)
    .bind(when_to_worry)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_tier_translation(
    pool: &PgPool,
    tier_id: Uuid,
    locale: &str,
    fields: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    let name = fields.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let tagline = fields.get("tagline").and_then(|v| v.as_str());
    let description = fields.get("description").and_then(|v| v.as_str());
    let features_summary = fields.get("features_summary").and_then(|v| v.as_str());

    sqlx::query(
        r#"INSERT INTO license_tier_translations (tier_id, locale, name, tagline, description, features_summary)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tier_id, locale) DO UPDATE SET
             name = EXCLUDED.name,
             tagline = EXCLUDED.tagline,
             description = EXCLUDED.description,
             features_summary = EXCLUDED.features_summary,
             updated_at = NOW()"#,
    )
    .bind(tier_id)
    .bind(locale)
    .bind(name)
    .bind(tagline)
    .bind(description)
    .bind(features_summary)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_ui_string_translation(
    pool: &PgPool,
    string_id: Uuid,
    locale: &str,
    value: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO ui_string_translations (string_id, locale, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (string_id, locale) DO UPDATE SET
             value = EXCLUDED.value,
             updated_at = NOW()"#,
    )
    .bind(string_id)
    .bind(locale)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

pub async fn log_content_change(
    pool: &PgPool,
    admin_user_id: Uuid,
    table_name: &str,
    record_id: Uuid,
    locale: Option<&str>,
    action: &str,
    changes: Option<&serde_json::Value>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO content_audit_log (admin_user_id, table_name, record_id, locale, action, changes)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(admin_user_id)
    .bind(table_name)
    .bind(record_id)
    .bind(locale)
    .bind(action)
    .bind(changes)
    .execute(pool)
    .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Admin: list content with all translations
// ---------------------------------------------------------------------------

pub async fn admin_list_zones(pool: &PgPool) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    use sqlx::Row;

    let zones = sqlx::query("SELECT id, zone_slug, zone_name, zone_icon, zone_color, display_order FROM zones ORDER BY display_order")
        .fetch_all(pool)
        .await?;

    let mut result = Vec::new();
    for z in &zones {
        let zone_id: Uuid = z.try_get("id")?;
        let translations = sqlx::query(
            "SELECT locale, name, description, short_description FROM zone_translations WHERE zone_id = $1 ORDER BY locale"
        )
        .bind(zone_id)
        .fetch_all(pool)
        .await?;

        let mut trans_map = serde_json::Map::new();
        for t in &translations {
            let locale: String = t.try_get("locale")?;
            trans_map.insert(locale, serde_json::json!({
                "name": t.try_get::<String, _>("name").unwrap_or_default(),
                "description": t.try_get::<Option<String>, _>("description").ok().flatten(),
                "short_description": t.try_get::<Option<String>, _>("short_description").ok().flatten(),
            }));
        }

        result.push(serde_json::json!({
            "id": zone_id,
            "slug": z.try_get::<String, _>("zone_slug")?,
            "name": z.try_get::<String, _>("zone_name")?,
            "icon": z.try_get::<String, _>("zone_icon")?,
            "color": z.try_get::<String, _>("zone_color")?,
            "display_order": z.try_get::<i32, _>("display_order")?,
            "translations": trans_map,
        }));
    }

    Ok(result)
}

pub async fn admin_list_markers(pool: &PgPool) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    use sqlx::Row;

    let markers = sqlx::query(
        r#"SELECT m.id, m.marker_slug, m.marker_name, m.unit_canonical, m.display_order,
                  z.zone_slug, m.source_type
           FROM markers m JOIN zones z ON z.id = m.zone_id
           ORDER BY m.display_order"#,
    )
    .fetch_all(pool)
    .await?;

    let mut result = Vec::new();
    for m in &markers {
        let marker_id: Uuid = m.try_get("id")?;
        let translations = sqlx::query(
            "SELECT locale, name, description, tooltip, why_it_matters, when_to_worry FROM marker_translations WHERE marker_id = $1 ORDER BY locale"
        )
        .bind(marker_id)
        .fetch_all(pool)
        .await?;

        let mut trans_map = serde_json::Map::new();
        for t in &translations {
            let locale: String = t.try_get("locale")?;
            trans_map.insert(locale, serde_json::json!({
                "name": t.try_get::<String, _>("name").unwrap_or_default(),
                "description": t.try_get::<Option<String>, _>("description").ok().flatten(),
                "tooltip": t.try_get::<Option<String>, _>("tooltip").ok().flatten(),
                "why_it_matters": t.try_get::<Option<String>, _>("why_it_matters").ok().flatten(),
                "when_to_worry": t.try_get::<Option<String>, _>("when_to_worry").ok().flatten(),
            }));
        }

        let source_type: String = m.try_get::<String, _>("source_type").unwrap_or_default();
        result.push(serde_json::json!({
            "id": marker_id,
            "slug": m.try_get::<String, _>("marker_slug")?,
            "name": m.try_get::<String, _>("marker_name")?,
            "unit": m.try_get::<String, _>("unit_canonical")?,
            "zone": m.try_get::<String, _>("zone_slug")?,
            "is_calculated": source_type == "calculated",
            "display_order": m.try_get::<i32, _>("display_order")?,
            "translations": trans_map,
        }));
    }

    Ok(result)
}

pub async fn admin_list_tiers(pool: &PgPool) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    use sqlx::Row;

    let tiers = sqlx::query(
        "SELECT id, slug, name, tagline, description, price_monthly_eur::float8 AS price_monthly_eur, price_annual_eur::float8 AS price_annual_eur, display_order, is_active, highlight FROM license_tiers ORDER BY display_order"
    )
    .fetch_all(pool)
    .await?;

    let mut result = Vec::new();
    for lt in &tiers {
        let tier_id: Uuid = lt.try_get("id")?;
        let translations = sqlx::query(
            "SELECT locale, name, tagline, description, features_summary FROM license_tier_translations WHERE tier_id = $1 ORDER BY locale"
        )
        .bind(tier_id)
        .fetch_all(pool)
        .await?;

        let mut trans_map = serde_json::Map::new();
        for t in &translations {
            let locale: String = t.try_get("locale")?;
            trans_map.insert(locale, serde_json::json!({
                "name": t.try_get::<String, _>("name").unwrap_or_default(),
                "tagline": t.try_get::<Option<String>, _>("tagline").ok().flatten(),
                "description": t.try_get::<Option<String>, _>("description").ok().flatten(),
                "features_summary": t.try_get::<Option<String>, _>("features_summary").ok().flatten(),
            }));
        }

        result.push(serde_json::json!({
            "id": tier_id,
            "slug": lt.try_get::<String, _>("slug")?,
            "name": lt.try_get::<String, _>("name")?,
            "price_monthly": lt.try_get::<Option<f64>, _>("price_monthly_eur").ok().flatten(),
            "price_annual": lt.try_get::<Option<f64>, _>("price_annual_eur").ok().flatten(),
            "display_order": lt.try_get::<i32, _>("display_order")?,
            "is_active": lt.try_get::<bool, _>("is_active").unwrap_or(true),
            "highlight": lt.try_get::<bool, _>("highlight").unwrap_or(false),
            "translations": trans_map,
        }));
    }

    Ok(result)
}

pub async fn admin_list_ui_strings(pool: &PgPool) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    use sqlx::Row;

    let strings = sqlx::query("SELECT id, key, context FROM ui_strings ORDER BY key")
        .fetch_all(pool)
        .await?;

    let mut result = Vec::new();
    for s in &strings {
        let string_id: Uuid = s.try_get("id")?;
        let translations = sqlx::query(
            "SELECT locale, value FROM ui_string_translations WHERE string_id = $1 ORDER BY locale",
        )
        .bind(string_id)
        .fetch_all(pool)
        .await?;

        let mut trans_map = serde_json::Map::new();
        for t in &translations {
            let locale: String = t.try_get("locale")?;
            trans_map.insert(
                locale,
                serde_json::json!({
                    "value": t.try_get::<String, _>("value").unwrap_or_default(),
                }),
            );
        }

        result.push(serde_json::json!({
            "id": string_id,
            "key": s.try_get::<String, _>("key")?,
            "context": s.try_get::<Option<String>, _>("context").ok().flatten(),
            "translations": trans_map,
        }));
    }

    Ok(result)
}

// ---------------------------------------------------------------------------
// Admin: medication categories
// ---------------------------------------------------------------------------

pub async fn admin_list_medication_categories(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    use sqlx::Row;

    let categories = sqlx::query(
        "SELECT id, slug, sort_order, created_at FROM medication_categories ORDER BY sort_order",
    )
    .fetch_all(pool)
    .await?;

    let mut result = Vec::new();
    for c in &categories {
        let cat_id: Uuid = c.try_get("id")?;
        let translations = sqlx::query(
            "SELECT locale, name, description FROM medication_category_translations WHERE category_id = $1 ORDER BY locale",
        )
        .bind(cat_id)
        .fetch_all(pool)
        .await?;

        let mut trans_map = serde_json::Map::new();
        for t in &translations {
            let locale: String = t.try_get("locale")?;
            trans_map.insert(
                locale,
                serde_json::json!({
                    "name": t.try_get::<String, _>("name").unwrap_or_default(),
                    "description": t.try_get::<Option<String>, _>("description").ok().flatten(),
                }),
            );
        }

        result.push(serde_json::json!({
            "id": cat_id,
            "slug": c.try_get::<String, _>("slug")?,
            "sort_order": c.try_get::<i32, _>("sort_order").unwrap_or(0),
            "translations": trans_map,
        }));
    }

    Ok(result)
}

pub async fn update_medication_category_translation(
    pool: &PgPool,
    category_id: Uuid,
    locale: &str,
    fields: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    let name = fields.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let description = fields.get("description").and_then(|v| v.as_str());

    sqlx::query(
        r#"INSERT INTO medication_category_translations (category_id, locale, name, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (category_id, locale) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description"#,
    )
    .bind(category_id)
    .bind(locale)
    .bind(name)
    .bind(description)
    .execute(pool)
    .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Content strings (next-intl managed strings)
// ---------------------------------------------------------------------------

pub async fn get_content_strings_flat(
    pool: &PgPool,
    section: &str,
    lang: &str,
) -> Result<Vec<(String, String)>, sqlx::Error> {
    // sqlx doesn't support dynamic column names, so we use two queries
    if lang == "de" {
        let rows = sqlx::query_as::<_, (String, String)>(
            "SELECT key, COALESCE(value_de, value_en) AS value FROM content_strings WHERE section = $1 ORDER BY key"
        )
        .bind(section)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    } else {
        let rows = sqlx::query_as::<_, (String, String)>(
            "SELECT key, value_en AS value FROM content_strings WHERE section = $1 ORDER BY key",
        )
        .bind(section)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }
}

pub async fn admin_list_content_strings(
    pool: &PgPool,
    section: Option<&str>,
    search: Option<&str>,
    page: i64,
    per_page: i64,
) -> Result<(Vec<ContentString>, i64), sqlx::Error> {
    let offset = (page - 1) * per_page;

    let (items, total): (Vec<ContentString>, i64) = if let Some(s) = search {
        let pattern = format!("%{}%", s.to_lowercase());
        if let Some(sec) = section {
            let total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM content_strings WHERE section = $1 AND (LOWER(key) LIKE $2 OR LOWER(value_en) LIKE $2 OR LOWER(COALESCE(value_de,'')) LIKE $2)"
            ).bind(sec).bind(&pattern).fetch_one(pool).await.unwrap_or(0);
            let items = sqlx::query_as::<_, ContentString>(
                "SELECT id, section, key, value_en, value_de, description, updated_at, updated_by FROM content_strings WHERE section = $1 AND (LOWER(key) LIKE $2 OR LOWER(value_en) LIKE $2 OR LOWER(COALESCE(value_de,'')) LIKE $2) ORDER BY key LIMIT $3 OFFSET $4"
            ).bind(sec).bind(&pattern).bind(per_page).bind(offset).fetch_all(pool).await?;
            (items, total)
        } else {
            let total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM content_strings WHERE LOWER(key) LIKE $1 OR LOWER(value_en) LIKE $1 OR LOWER(COALESCE(value_de,'')) LIKE $1"
            ).bind(&pattern).fetch_one(pool).await.unwrap_or(0);
            let items = sqlx::query_as::<_, ContentString>(
                "SELECT id, section, key, value_en, value_de, description, updated_at, updated_by FROM content_strings WHERE LOWER(key) LIKE $1 OR LOWER(value_en) LIKE $1 OR LOWER(COALESCE(value_de,'')) LIKE $1 ORDER BY key LIMIT $2 OFFSET $3"
            ).bind(&pattern).bind(per_page).bind(offset).fetch_all(pool).await?;
            (items, total)
        }
    } else if let Some(sec) = section {
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM content_strings WHERE section = $1")
                .bind(sec)
                .fetch_one(pool)
                .await
                .unwrap_or(0);
        let items = sqlx::query_as::<_, ContentString>(
            "SELECT id, section, key, value_en, value_de, description, updated_at, updated_by FROM content_strings WHERE section = $1 ORDER BY key LIMIT $2 OFFSET $3"
        ).bind(sec).bind(per_page).bind(offset).fetch_all(pool).await?;
        (items, total)
    } else {
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM content_strings")
            .fetch_one(pool)
            .await
            .unwrap_or(0);
        let items = sqlx::query_as::<_, ContentString>(
            "SELECT id, section, key, value_en, value_de, description, updated_at, updated_by FROM content_strings ORDER BY key LIMIT $1 OFFSET $2"
        ).bind(per_page).bind(offset).fetch_all(pool).await?;
        (items, total)
    };

    Ok((items, total))
}

pub async fn admin_update_content_string(
    pool: &PgPool,
    id: Uuid,
    value_en: Option<&str>,
    value_de: Option<&str>,
    description: Option<&str>,
    admin_id: Uuid,
) -> Result<(), sqlx::Error> {
    // Build dynamic update
    let mut query = String::from("UPDATE content_strings SET updated_at = NOW(), updated_by = $1");
    let mut param_idx = 2u32;
    let mut binds: Vec<String> = Vec::new();

    if let Some(v) = value_en {
        query.push_str(&format!(", value_en = ${param_idx}"));
        binds.push(v.to_string());
        param_idx += 1;
    }
    if let Some(v) = value_de {
        query.push_str(&format!(", value_de = ${param_idx}"));
        binds.push(v.to_string());
        param_idx += 1;
    }
    if let Some(v) = description {
        query.push_str(&format!(", description = ${param_idx}"));
        binds.push(v.to_string());
        param_idx += 1;
    }

    query.push_str(&format!(" WHERE id = ${param_idx}"));

    let mut q = sqlx::query(&query).bind(admin_id);
    for b in &binds {
        q = q.bind(b);
    }
    q = q.bind(id);
    q.execute(pool).await?;
    Ok(())
}

pub async fn admin_create_content_string(
    pool: &PgPool,
    section: &str,
    key: &str,
    value_en: &str,
    value_de: Option<&str>,
    description: Option<&str>,
) -> Result<ContentString, sqlx::Error> {
    sqlx::query_as::<_, ContentString>(
        r#"INSERT INTO content_strings (id, section, key, value_en, value_de, description)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
           RETURNING id, section, key, value_en, value_de, description, updated_at, updated_by"#,
    )
    .bind(section)
    .bind(key)
    .bind(value_en)
    .bind(value_de)
    .bind(description)
    .fetch_one(pool)
    .await
}

pub async fn get_content_strings_export(
    pool: &PgPool,
    section: &str,
) -> Result<Vec<ContentString>, sqlx::Error> {
    sqlx::query_as::<_, ContentString>(
        "SELECT id, section, key, value_en, value_de, description, updated_at, updated_by FROM content_strings WHERE section = $1 ORDER BY key"
    )
    .bind(section)
    .fetch_all(pool)
    .await
}

// ---------------------------------------------------------------------------
// Admin: update user locale preference
// ---------------------------------------------------------------------------

pub async fn update_user_locale(
    pool: &PgPool,
    user_id: Uuid,
    locale: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET locale = $1, updated_at = NOW() WHERE id = $2")
        .bind(locale)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}
