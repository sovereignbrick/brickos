// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// For POST /measurements body
#[derive(Debug, Deserialize)]
pub struct CreateMeasurementRequest {
    pub measured_at: DateTime<Utc>,
    pub values: Vec<MeasurementValue>,
    pub device_id: Option<Uuid>,
    pub protocol_tag: Option<String>, // "standard" | "fasting" - defaults to "standard"
    pub fasting_protocol: Option<String>, // "16_8" | "omad" | "36h" | "48h" | "72h" | "extended" | "custom"
    pub fast_start_datetime: Option<DateTime<Utc>>,
    pub diet_protocol: Option<String>,
    pub meal_timing_tag: Option<String>,
    pub exercise_activity: Option<String>,
    pub sleep_hours: Option<f64>,
    pub sleep_quality: Option<String>,
    pub stress_level: Option<i32>, // INT 1-10
    pub lifestyle_note: Option<String>,
    pub client_id: Option<String>, // PWA: multi-device identification
    pub idempotency_key: Option<String>, // PWA: replay-safe offline writes
}

#[derive(Debug, Deserialize)]
pub struct MeasurementValue {
    pub marker_slug: String,
    pub value: f64,
    /// Sprint 042 #531: optional input unit. When the frontend sends what
    /// the user actually typed in (mg/dL vs mmol/L for glucose, % vs
    /// mmol/mol for HbA1c), the backend can range-check in the user's
    /// unit and produce error messages with the user's numbers instead of
    /// the converted-to-canonical value the user never saw. Backward
    /// compatible: clients that don't send `unit` (mobile app, lab
    /// import) still work via the canonical-unit fallback.
    #[serde(default)]
    pub unit: Option<String>,
}

// DB row struct
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Measurement {
    pub id: Uuid,
    pub user_id: Uuid,
    pub marker_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub value_canonical: f64,
    pub unit_canonical: String,
    pub status: Option<String>,
    pub protocol_tag: String,
    pub diet_protocol: Option<String>,
    pub fasting_protocol: Option<String>,
    pub fast_start_datetime: Option<DateTime<Utc>>,
    pub fasting_hours: Option<i32>,
    pub meal_timing_tag: String,
    pub exercise_activity: Option<String>,
    pub sleep_hours: Option<f64>,
    pub sleep_quality: Option<String>,
    pub stress_level: Option<i32>,
    pub lifestyle_note: Option<String>,
    pub is_deleted: bool,
    pub created_at: DateTime<Utc>,
}

// Response struct (adds marker info)
#[derive(Debug, Serialize)]
pub struct MeasurementResponse {
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
    pub lifestyle_note: Option<String>,
    pub device_id: Option<Uuid>,
    pub device_name: Option<String>,
    pub lab_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

// For PUT /measurements/:id body
#[derive(Debug, Deserialize)]
pub struct UpdateMeasurementRequest {
    pub value: Option<f64>,
    pub measured_at: Option<DateTime<Utc>>,
    pub protocol_tag: Option<String>,
    pub fasting_protocol: Option<String>,
    pub fast_start_datetime: Option<DateTime<Utc>>,
    pub diet_protocol: Option<String>,
    pub meal_timing_tag: Option<String>,
    pub exercise_activity: Option<String>,
    pub sleep_hours: Option<f64>,
    pub sleep_quality: Option<String>,
    pub stress_level: Option<i32>,
    pub lifestyle_note: Option<String>,
}

// Calculated marker response
#[derive(Debug, Serialize)]
pub struct CalculatedMarkerResponse {
    pub marker_slug: String,
    pub marker_name: String,
    pub formula: String,
    pub latest_value: Option<f64>,
    pub status: Option<String>,
    pub measured_at: Option<DateTime<Utc>>,
    pub protocol_tag: Option<String>,
}

// Trend data
#[derive(Debug, Serialize)]
pub struct TrendResponse {
    pub marker_slug: String,
    pub marker_name: String,
    pub unit: String,
    pub points: Vec<TrendPoint>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TrendPoint {
    pub measured_at: DateTime<Utc>,
    pub value: f64,
    pub status: Option<String>,
    pub protocol_tag: String,
}

// Measurement Templates
#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct MeasurementTemplate {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub marker_slugs: Vec<String>,
    pub is_default: bool,
    pub display_order: i32,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub defaults: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub marker_slugs: Vec<String>,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub display_order: i32,
    pub defaults: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub marker_slugs: Option<Vec<String>>,
    pub is_default: Option<bool>,
    pub display_order: Option<i32>,
    pub defaults: Option<serde_json::Value>,
}
