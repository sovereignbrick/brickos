// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

#[derive(serde::Deserialize)]
pub struct ExportQuery {
    pub from: Option<chrono::DateTime<Utc>>,
    pub to: Option<chrono::DateTime<Utc>>,
    pub markers: Option<String>, // comma-separated marker slugs
    pub device_id: Option<Uuid>,
    pub source_type: Option<String>,
    pub protocol_tag: Option<String>,
    pub period: Option<String>, // 7d, 30d, 3m, 6m, 1y, all
    pub zones: Option<String>,  // comma-separated zone slugs
}

pub async fn export_csv(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<ExportQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Tier check: csv_export
    crate::services::tier::check_tier_feature(pool.get_ref(), auth.user_id, "csv_export").await?;

    // Resolve period to from/to if period is set (period takes precedence)
    let (effective_from, effective_to) = if let Some(ref period) = query.period {
        let from = super::reports::period_to_from_public(period);
        (Some(from), Some(Utc::now()))
    } else {
        (query.from, query.to)
    };

    let zone_slugs: Option<Vec<String>> = query
        .zones
        .as_ref()
        .map(|z| z.split(',').map(|s| s.trim().to_string()).collect());

    let marker_slugs: Option<Vec<String>> = query
        .markers
        .as_ref()
        .map(|m| m.split(',').map(|s| s.trim().to_string()).collect());

    // Build dynamic query
    let mut sql = String::from(
        r#"SELECT
            m.timestamp,
            mk.marker_name,
            mk.marker_slug,
            m.value_canonical as value,
            m.unit_canonical as unit,
            m.status,
            m.protocol_tag,
            m.diet_protocol,
            m.fasting_hours,
            m.exercise_activity,
            m.sleep_hours,
            m.sleep_quality,
            m.stress_level,
            m.lifestyle_note,
            d.device_name
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        JOIN zones z ON z.id = mk.zone_id
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.user_id = $1 AND m.is_deleted = false"#,
    );

    let mut bind_idx = 2u32;

    if effective_from.is_some() {
        sql.push_str(&format!(" AND m.timestamp >= ${}", bind_idx));
        bind_idx += 1;
    }
    if effective_to.is_some() {
        sql.push_str(&format!(" AND m.timestamp <= ${}", bind_idx));
        bind_idx += 1;
    }
    if let Some(ref zone_list) = zone_slugs {
        let placeholders: Vec<String> = zone_list
            .iter()
            .enumerate()
            .map(|(i, _)| format!("${}", bind_idx + i as u32))
            .collect();
        sql.push_str(&format!(" AND z.zone_slug IN ({})", placeholders.join(",")));
        bind_idx += zone_list.len() as u32;
    }
    if let Some(ref slugs) = marker_slugs {
        let placeholders: Vec<String> = slugs
            .iter()
            .enumerate()
            .map(|(i, _)| format!("${}", bind_idx + i as u32))
            .collect();
        sql.push_str(&format!(
            " AND mk.marker_slug IN ({})",
            placeholders.join(",")
        ));
        bind_idx += slugs.len() as u32;
    }
    if query.device_id.is_some() {
        sql.push_str(&format!(" AND m.device_id = ${}", bind_idx));
        bind_idx += 1;
    }
    if query.source_type.is_some() {
        sql.push_str(&format!(" AND mk.source_type = ${}", bind_idx));
        bind_idx += 1;
    }
    if query.protocol_tag.is_some() {
        sql.push_str(&format!(" AND m.protocol_tag = ${}", bind_idx));
        let _ = bind_idx; // suppress unused warning
    }

    sql.push_str(" ORDER BY m.timestamp DESC, mk.marker_name ASC");

    // Execute with dynamic binds
    let mut q = sqlx::query(&sql).bind(auth.user_id);

    if let Some(from) = effective_from {
        q = q.bind(from);
    }
    if let Some(to) = effective_to {
        q = q.bind(to);
    }
    if let Some(ref zone_list) = zone_slugs {
        for z in zone_list {
            q = q.bind(z.clone());
        }
    }
    if let Some(ref slugs) = marker_slugs {
        for slug in slugs {
            q = q.bind(slug.clone());
        }
    }
    if let Some(device_id) = query.device_id {
        q = q.bind(device_id);
    }
    if let Some(ref source_type) = query.source_type {
        q = q.bind(source_type.clone());
    }
    if let Some(ref protocol_tag) = query.protocol_tag {
        q = q.bind(protocol_tag.clone());
    }

    let rows = q.fetch_all(pool.get_ref()).await?;

    // Also fetch calculated marker values
    let calc_rows = sqlx::query(
        r#"SELECT
            cmv.measured_at as timestamp,
            cm.marker_name,
            cm.marker_slug,
            cmv.value::float8 as value,
            'ratio' as unit,
            cmv.status,
            cmv.protocol_tag,
            NULL::text as diet_protocol,
            NULL::real as fasting_hours,
            NULL::text as exercise_activity,
            NULL::real as sleep_hours,
            NULL::text as sleep_quality,
            NULL::integer as stress_level,
            NULL::text as lifestyle_note,
            'Calculated' as device_name
        FROM calculated_marker_values cmv
        JOIN calculated_markers cm ON cm.id = cmv.calculated_marker_id
        WHERE cmv.user_id = $1 AND cmv.is_deleted = false
        ORDER BY cmv.measured_at DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Build CSV
    let mut csv = String::from("date,time,marker_name,marker_slug,value,unit,status,protocol_tag,diet_protocol,fasting_hours,exercise_activity,sleep_hours,sleep_quality,stress_level,note,device_name\n");

    let format_row = |row: &sqlx::postgres::PgRow,
                      enc: &crate::services::encryption::Encryptor|
     -> String {
        let ts: chrono::DateTime<Utc> = row.try_get("timestamp").unwrap_or_else(|_| Utc::now());
        let date = ts.format("%Y-%m-%d").to_string();
        let time = ts.format("%H:%M:%S").to_string();
        let marker_name: String = row.try_get("marker_name").unwrap_or_default();
        let marker_slug: String = row.try_get("marker_slug").unwrap_or_default();
        let value: f64 = enc.decrypt_f64(&row.try_get::<String, _>("value").unwrap_or_default());
        let unit: String = row.try_get("unit").unwrap_or_default();
        let status: Option<String> = row.try_get("status").ok().flatten();
        let protocol_tag: Option<String> = row.try_get("protocol_tag").ok().flatten();
        let diet_protocol: Option<String> = row.try_get("diet_protocol").ok().flatten();
        let fasting_hours: Option<f32> = row.try_get("fasting_hours").ok().flatten();
        let exercise: Option<String> = row.try_get("exercise_activity").ok().flatten();
        let sleep_hours: Option<f32> = row.try_get("sleep_hours").ok().flatten();
        let sleep_quality: Option<String> = row.try_get("sleep_quality").ok().flatten();
        let stress_level: Option<i32> = row.try_get("stress_level").ok().flatten();
        let note: Option<String> = enc.decrypt_opt(row.try_get("lifestyle_note").ok().flatten());
        let device: Option<String> = row.try_get("device_name").ok().flatten();

        let escape_csv = |s: &str| -> String {
            if s.contains(',') || s.contains('"') || s.contains('\n') {
                format!("\"{}\"", s.replace('"', "\"\""))
            } else {
                s.to_string()
            }
        };

        format!(
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            date,
            time,
            escape_csv(&marker_name),
            marker_slug,
            value,
            escape_csv(&unit),
            status.as_deref().unwrap_or(""),
            protocol_tag.as_deref().unwrap_or("standard"),
            diet_protocol.as_deref().unwrap_or(""),
            fasting_hours.map(|v| v.to_string()).unwrap_or_default(),
            exercise.as_deref().unwrap_or(""),
            sleep_hours.map(|v| v.to_string()).unwrap_or_default(),
            sleep_quality.as_deref().unwrap_or(""),
            stress_level.map(|v| v.to_string()).unwrap_or_default(),
            escape_csv(note.as_deref().unwrap_or("")),
            escape_csv(device.as_deref().unwrap_or("")),
        )
    };

    for row in &rows {
        csv.push_str(&format_row(row, enc.get_ref()));
        csv.push('\n');
    }
    for row in &calc_rows {
        csv.push_str(&format_row(row, enc.get_ref()));
        csv.push('\n');
    }

    // Medications section (GDPR Art.20 portability - PRV-004)
    let med_rows = sqlx::query(
        r#"SELECT medication_slug, custom_name, dosage, frequency, timing,
            start_date, end_date, notes, is_active, created_at
        FROM user_medications
        WHERE user_id = $1 AND is_deleted = false
        ORDER BY created_at DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    if !med_rows.is_empty() {
        csv.push_str("\n\nMEDICATIONS\n");
        csv.push_str("medication_slug,custom_name,dosage,frequency,timing,start_date,end_date,notes,is_active,created_at\n");

        let escape_csv = |s: &str| -> String {
            if s.contains(',') || s.contains('"') || s.contains('\n') {
                format!("\"{}\"", s.replace('"', "\"\""))
            } else {
                s.to_string()
            }
        };

        for row in &med_rows {
            let medication_slug: String = row.try_get("medication_slug").unwrap_or_default();
            let custom_name: Option<String> = row.try_get("custom_name").ok().flatten();
            let dosage: Option<String> = row.try_get("dosage").ok().flatten();
            let frequency: Option<String> = row.try_get("frequency").ok().flatten();
            let timing: Option<String> = row.try_get("timing").ok().flatten();
            let start_date: Option<String> = row
                .try_get::<Option<chrono::NaiveDate>, _>("start_date")
                .ok()
                .flatten()
                .map(|d| d.to_string());
            let end_date: Option<String> = row
                .try_get::<Option<chrono::NaiveDate>, _>("end_date")
                .ok()
                .flatten()
                .map(|d| d.to_string());
            let notes: Option<String> = row.try_get("notes").ok().flatten();
            let is_active: bool = row.try_get("is_active").unwrap_or(true);
            let created_at: chrono::DateTime<Utc> =
                row.try_get("created_at").unwrap_or_else(|_| Utc::now());

            csv.push_str(&format!(
                "{},{},{},{},{},{},{},{},{},{}\n",
                escape_csv(&medication_slug),
                escape_csv(custom_name.as_deref().unwrap_or("")),
                escape_csv(dosage.as_deref().unwrap_or("")),
                escape_csv(frequency.as_deref().unwrap_or("")),
                escape_csv(timing.as_deref().unwrap_or("")),
                start_date.as_deref().unwrap_or(""),
                end_date.as_deref().unwrap_or(""),
                escape_csv(notes.as_deref().unwrap_or("")),
                is_active,
                created_at.format("%Y-%m-%d %H:%M:%S"),
            ));
        }
    }

    // Doctor Chat conversations (GDPR Art.15/20 portability - GDPR-F001)
    let chat_rows = sqlx::query(
        r#"SELECT c.title, c.agent_type, c.created_at as conv_created,
            msg.role, msg.content, msg.created_at as msg_created
        FROM doctor_chat_conversations c
        JOIN doctor_chat_messages msg ON msg.conversation_id = c.id
        WHERE c.user_id = $1
        ORDER BY c.created_at ASC, msg.created_at ASC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    if !chat_rows.is_empty() {
        csv.push_str("\n\nDOCTOR CHAT CONVERSATIONS\n");
        csv.push_str("conversation_title,agent_type,conversation_date,role,message,message_date\n");

        let escape_csv_chat = |s: &str| -> String {
            if s.contains(',') || s.contains('"') || s.contains('\n') {
                format!("\"{}\"", s.replace('"', "\"\""))
            } else {
                s.to_string()
            }
        };

        for row in &chat_rows {
            let title: String = row.try_get("title").unwrap_or_default();
            let agent_type: String = row.try_get("agent_type").unwrap_or_default();
            let conv_created: chrono::DateTime<Utc> =
                row.try_get("conv_created").unwrap_or_else(|_| Utc::now());
            let role: String = row.try_get("role").unwrap_or_default();
            let content_raw: String = row.try_get("content").unwrap_or_default();
            let content: String = enc.decrypt(&content_raw).unwrap_or(content_raw);
            let msg_created: chrono::DateTime<Utc> =
                row.try_get("msg_created").unwrap_or_else(|_| Utc::now());

            csv.push_str(&format!(
                "{},{},{},{},{},{}\n",
                escape_csv_chat(&title),
                escape_csv_chat(&agent_type),
                conv_created.format("%Y-%m-%d %H:%M:%S"),
                role,
                escape_csv_chat(&content),
                msg_created.format("%Y-%m-%d %H:%M:%S"),
            ));
        }
    }

    let has_filters = effective_from.is_some()
        || effective_to.is_some()
        || query.markers.is_some()
        || query.device_id.is_some()
        || query.source_type.is_some()
        || query.protocol_tag.is_some()
        || query.zones.is_some()
        || query.period.is_some();
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let suffix = if has_filters { "-filtered" } else { "" };

    // Log data access (GDPR audit trail)
    crate::services::access_log::log_self_access(
        pool.get_ref(),
        auth.user_id,
        "export_csv",
        "measurements",
    )
    .await;

    // Record export history
    let size = csv.len() as i32;
    let period_label = query.period.as_deref().unwrap_or("all");
    let _ = super::reports::record_history(
        pool.get_ref(),
        auth.user_id,
        "csv_export",
        period_label,
        size,
    )
    .await;

    let filename = format!("sovereign-health-export-{}{}.csv", today, suffix);
    Ok(HttpResponse::Ok()
        .content_type("text/csv; charset=utf-8")
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", filename),
        ))
        .body(csv))
}
