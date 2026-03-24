// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SyncChangesQuery {
    pub since_version: i64,
    pub tables: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SyncChangesResponse {
    pub measurements: Vec<SyncMeasurement>,
    pub measurement_templates: Vec<SyncTemplate>,
    pub user_medications: Vec<SyncMedication>,
    pub current_version: i64,
}

#[derive(Debug, Serialize)]
pub struct SyncMeasurement {
    pub id: Uuid,
    pub marker_slug: String,
    pub marker_name: String,
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub unit: String,
    pub status: Option<String>,
    pub protocol_tag: String,
    pub fasting_protocol: Option<String>,
    pub fasting_hours: Option<i32>,
    pub diet_protocol: Option<String>,
    pub meal_timing_tag: String,
    pub exercise_activity: Option<String>,
    pub sleep_hours: Option<f64>,
    pub sleep_quality: Option<String>,
    pub stress_level: Option<i32>,
    pub device_id: Option<Uuid>,
    pub client_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub sync_version: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncTemplate {
    pub id: Uuid,
    pub name: String,
    pub marker_slugs: Vec<String>,
    pub is_default: bool,
    pub display_order: i32,
    pub client_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub sync_version: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncMedication {
    pub id: Uuid,
    pub name: String,
    pub generic_name: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub is_active: bool,
    pub client_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub sync_version: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncVersionResponse {
    pub current_version: i64,
}
