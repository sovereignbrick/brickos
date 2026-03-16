// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Zone with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ZoneWithTranslation {
    pub id: Uuid,
    pub zone_slug: String,
    pub zone_icon: String,
    pub zone_color: String,
    pub display_order: i32,
    pub name: String,
    pub description: Option<String>,
    pub short_description: Option<String>,
}

// ---------------------------------------------------------------------------
// Marker with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MarkerWithTranslation {
    pub id: Uuid,
    pub marker_slug: String,
    pub unit_canonical: Option<String>,
    pub display_order: i32,
    pub zone_slug: Option<String>,
    pub is_calculated: Option<bool>,
    pub name: String,
    pub description: Option<String>,
    pub tooltip: Option<String>,
    pub why_it_matters: Option<String>,
    pub when_to_worry: Option<String>,
}

// ---------------------------------------------------------------------------
// Tier with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct TierWithTranslation {
    pub id: Uuid,
    pub slug: String,
    pub price_monthly_eur: Option<f64>,
    pub price_annual_eur: Option<f64>,
    pub display_order: i32,
    pub is_active: bool,
    pub highlight: bool,
    pub name: String,
    pub tagline: Option<String>,
    pub description: Option<String>,
    pub features_summary: Option<String>,
}

// ---------------------------------------------------------------------------
// Diet protocol with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct DietProtocolWithTranslation {
    pub id: Uuid,
    pub slug: String,
    pub category: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub name: String,
    pub category_label: Option<String>,
    pub short_description: Option<String>,
}

// ---------------------------------------------------------------------------
// Eating pattern with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct EatingPatternWithTranslation {
    pub id: Uuid,
    pub slug: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub name: String,
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// Food category with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct FoodCategoryWithTranslation {
    pub id: Uuid,
    pub slug: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub name: String,
}

// ---------------------------------------------------------------------------
// Medication category with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MedicationCategoryWithTranslation {
    pub id: Uuid,
    pub slug: String,
    pub sort_order: i32,
    pub name: String,
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// UI string with translation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct UiStringWithTranslation {
    pub key: String,
    pub context: Option<String>,
    pub value: String,
}

// ---------------------------------------------------------------------------
// Admin: item with all translations
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct TranslationSet {
    pub locale: String,
    pub fields: serde_json::Value,
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ContentQuery {
    pub locale: Option<String>,
    pub zone: Option<String>,
    pub context: Option<String>,
    pub marker: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdminContentQuery {
    pub search: Option<String>,
    pub active_only: Option<bool>,
}

// ---------------------------------------------------------------------------
// Content strings (next-intl static strings managed via admin)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ContentString {
    pub id: Uuid,
    pub section: String,
    pub key: String,
    pub value_en: String,
    pub value_de: Option<String>,
    pub description: Option<String>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_by: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ContentStringQuery {
    pub section: Option<String>,
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdminContentStringQuery {
    pub section: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ContentStringUpdateBody {
    pub value_en: Option<String>,
    pub value_de: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ContentStringCreateBody {
    pub section: String,
    pub key: String,
    pub value_en: String,
    pub value_de: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ContentStringExportQuery {
    pub section: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TranslationUpdateBody {
    pub fields: serde_json::Value,
}

// ---------------------------------------------------------------------------
// Translation completeness
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct TranslationCompleteness {
    pub locale: String,
    pub total: i64,
    pub translated: i64,
    pub percentage: f64,
    pub missing_by_table: Vec<MissingByTable>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MissingByTable {
    pub table_name: String,
    pub missing_count: i64,
}
