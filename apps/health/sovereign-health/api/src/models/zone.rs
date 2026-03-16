// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Zone {
    pub id: Uuid,
    pub zone_slug: String,
    pub zone_name: String,
    pub zone_icon: String,
    pub zone_color: String,
    pub display_order: i32,
}

#[derive(Debug, Serialize)]
pub struct StatusSummary {
    pub green: i64,
    pub orange: i64,
    pub red: i64,
}

#[derive(Debug, Serialize)]
pub struct ZoneSummary {
    pub zone_slug: String,
    pub zone_name: String,
    pub zone_icon: String,
    pub zone_color: String,
    pub display_order: i32,
    pub marker_count: i64,
    pub markers_with_data: i64,
    pub status_summary: StatusSummary,
}

#[derive(Debug, Serialize)]
pub struct MarkerLatest {
    pub marker_slug: String,
    pub marker_name: String,
    pub latest_value: Option<f64>,
    pub unit: String,
    pub status: Option<String>,
    pub measured_at: Option<DateTime<Utc>>,
    pub source_type: String,
    pub device_name: Option<String>,
    pub marker_type: String,
}

#[derive(Debug, Serialize)]
pub struct ZoneDetail {
    pub zone_slug: String,
    pub zone_name: String,
    pub zone_icon: String,
    pub zone_color: String,
    pub markers: Vec<MarkerLatest>,
    pub markers_total: usize,
    pub markers_with_data: usize,
}
