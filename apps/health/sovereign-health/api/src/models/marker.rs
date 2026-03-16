// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Marker {
    pub id: Uuid,
    pub marker_slug: String,
    pub marker_name: String,
    pub zone_id: Uuid,
    pub unit_canonical: String,
    pub display_order: i32,
}

#[derive(Debug, sqlx::FromRow)]
pub struct CalculatedMarkerDef {
    pub id: Uuid,
    pub marker_slug: String,
    pub marker_name: String,
    pub formula_description: String,
    pub default_thresholds: serde_json::Value,
    pub protocol_overrides: serde_json::Value,
    pub display_order: i32,
}
