//! vCard 4.0 import/export handlers.

use std::sync::Arc;

use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "vcf".to_string()
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub vcf_data: String,
}

#[derive(Debug, Serialize)]
pub struct ImportResponse {
    pub imported: u32,
    pub skipped: u32,
    pub errors: u32,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Resolve the org_id from the JWT or fall back to a platform DB lookup.
async fn resolve_org_id(
    req: &HttpRequest,
    platform_pool: &PlatformPool,
) -> Result<(Uuid, Uuid), AppError> {
    let auth = extract_auth(req)?;
    let org_id = match auth.org_id {
        Some(id) => id,
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden)?,
    };
    Ok((auth.user_id, org_id))
}

/// Escape special characters for vCard field values.
fn vcard_escape(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace(',', "\\,")
        .replace(';', "\\;")
        .replace('\n', "\\n")
}

/// Build a vCard 4.0 string for a single contact.
fn build_vcard(
    name: &str,
    email: Option<&str>,
    phone: Option<&str>,
    company: Option<&str>,
    role: Option<&str>,
    notes: Option<&str>,
) -> String {
    let mut lines = Vec::with_capacity(10);
    lines.push("BEGIN:VCARD".to_string());
    lines.push("VERSION:4.0".to_string());
    lines.push(format!("FN:{}", vcard_escape(name)));
    if let Some(e) = email {
        lines.push(format!("EMAIL:{}", vcard_escape(e)));
    }
    if let Some(p) = phone {
        lines.push(format!("TEL:{}", vcard_escape(p)));
    }
    if let Some(c) = company {
        lines.push(format!("ORG:{}", vcard_escape(c)));
    }
    if let Some(r) = role {
        lines.push(format!("TITLE:{}", vcard_escape(r)));
    }
    if let Some(n) = notes {
        lines.push(format!("NOTE:{}", vcard_escape(n)));
    }
    lines.push("END:VCARD".to_string());
    lines.join("\r\n")
}

/// Parsed vCard fields.
struct ParsedVcard {
    name: String,
    email: Option<String>,
    phone: Option<String>,
    org: Option<String>,
    title: Option<String>,
    note: Option<String>,
}

/// Parse a vCard block into structured fields.
fn parse_vcard(block: &str) -> Option<ParsedVcard> {
    let mut name = None;
    let mut email = None;
    let mut phone = None;
    let mut org = None;
    let mut title = None;
    let mut note = None;

    for line in block.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("FN:") {
            name = Some(val.to_string());
        } else if let Some(val) = line.strip_prefix("EMAIL:").or_else(|| {
            // Handle EMAIL;TYPE=...:value
            if line.starts_with("EMAIL;") {
                line.split_once(':').map(|(_, v)| v)
            } else {
                None
            }
        }) {
            email = Some(val.to_string());
        } else if let Some(val) = line.strip_prefix("TEL:").or_else(|| {
            if line.starts_with("TEL;") {
                line.split_once(':').map(|(_, v)| v)
            } else {
                None
            }
        }) {
            phone = Some(val.to_string());
        } else if let Some(val) = line.strip_prefix("ORG:") {
            org = Some(val.to_string());
        } else if let Some(val) = line.strip_prefix("TITLE:") {
            title = Some(val.to_string());
        } else if let Some(val) = line.strip_prefix("NOTE:") {
            note = Some(val.to_string());
        }
    }

    name.map(|n| ParsedVcard {
        name: n,
        email,
        phone,
        org,
        title,
        note,
    })
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/export
// ---------------------------------------------------------------------------

pub async fn export_contacts(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<ExportQuery>,
) -> Result<HttpResponse, AppError> {
    if query.format != "vcf" {
        return Err(AppError::Validation("only vcf format is supported".into()));
    }

    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let rows = sqlx::query(
        "SELECT c.name, c.email, c.phone, c.role, c.notes, \
                (SELECT co.name FROM crm_contact_company cc \
                 JOIN crm_companies co ON co.id = cc.company_id \
                 WHERE cc.contact_id = c.id LIMIT 1) AS company_name \
         FROM crm_contacts c \
         WHERE c.org_id = $1 \
         ORDER BY c.name ASC",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let mut vcards = Vec::with_capacity(rows.len());
    for row in &rows {
        let name: String = row.get("name");
        let email_enc: Option<String> = row.get("email");
        let phone_enc: Option<String> = row.get("phone");
        let notes_enc: Option<String> = row.get("notes");
        let role: Option<String> = row.get("role");
        let company: Option<String> = row.get("company_name");

        vcards.push(build_vcard(
            &name,
            encryptor.decrypt_opt(email_enc).as_deref(),
            encryptor.decrypt_opt(phone_enc).as_deref(),
            company.as_deref(),
            role.as_deref(),
            encryptor.decrypt_opt(notes_enc).as_deref(),
        ));
    }

    let body = vcards.join("\r\n");

    Ok(HttpResponse::Ok()
        .content_type("text/vcard; charset=utf-8")
        .insert_header(ContentDisposition {
            disposition: DispositionType::Attachment,
            parameters: vec![DispositionParam::Filename("contacts.vcf".to_string())],
        })
        .body(body))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/{id}/export
// ---------------------------------------------------------------------------

pub async fn export_single_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    query: web::Query<ExportQuery>,
) -> Result<HttpResponse, AppError> {
    if query.format != "vcf" {
        return Err(AppError::Validation("only vcf format is supported".into()));
    }

    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    let row = sqlx::query(
        "SELECT c.name, c.email, c.phone, c.role, c.notes, co.name AS company_name \
         FROM crm_contacts c \
         LEFT JOIN crm_companies co ON c.company_id = co.id \
         WHERE c.id = $1 AND c.org_id = $2",
    )
    .bind(contact_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let name: String = row.get("name");
    let email_enc: Option<String> = row.get("email");
    let phone_enc: Option<String> = row.get("phone");
    let notes_enc: Option<String> = row.get("notes");
    let role: Option<String> = row.get("role");
    let company: Option<String> = row.get("company_name");

    let vcard = build_vcard(
        &name,
        encryptor.decrypt_opt(email_enc).as_deref(),
        encryptor.decrypt_opt(phone_enc).as_deref(),
        company.as_deref(),
        role.as_deref(),
        encryptor.decrypt_opt(notes_enc).as_deref(),
    );

    let filename = format!("{}.vcf", name.replace(' ', "_"));

    Ok(HttpResponse::Ok()
        .content_type("text/vcard; charset=utf-8")
        .insert_header(ContentDisposition {
            disposition: DispositionType::Attachment,
            parameters: vec![DispositionParam::Filename(filename)],
        })
        .body(vcard))
}

// ---------------------------------------------------------------------------
// POST /api/v1/contacts/import
// ---------------------------------------------------------------------------

pub async fn import_contacts(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<ImportRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    if body.vcf_data.trim().is_empty() {
        return Err(AppError::Validation("vcf_data is required".into()));
    }

    // Split on BEGIN:VCARD to get individual cards
    let blocks: Vec<&str> = body
        .vcf_data
        .split("BEGIN:VCARD")
        .filter(|b| !b.trim().is_empty())
        .collect();

    let mut imported: u32 = 0;
    let mut skipped: u32 = 0;
    let mut errors: u32 = 0;

    for block in blocks {
        let parsed = match parse_vcard(block) {
            Some(p) => p,
            None => {
                errors += 1;
                continue;
            }
        };

        let ParsedVcard {
            name,
            email,
            phone,
            org: org_name,
            title,
            note,
        } = parsed;

        // Dedup by email: skip if a contact with same email already exists
        if let Some(ref email_val) = email {
            let email_enc = encryptor.encrypt_opt(Some(email_val.as_str()));
            let existing =
                sqlx::query("SELECT id FROM crm_contacts WHERE org_id = $1 AND email = $2")
                    .bind(org_id)
                    .bind(&email_enc)
                    .fetch_optional(pool.get_ref())
                    .await;

            match existing {
                Ok(Some(_)) => {
                    skipped += 1;
                    continue;
                }
                Err(_) => {
                    errors += 1;
                    continue;
                }
                Ok(None) => {}
            }
        }

        // Create company from ORG if provided and not existing
        let company_id: Option<Uuid> = if let Some(ref company_name) = org_name {
            let existing_company =
                sqlx::query("SELECT id FROM crm_companies WHERE org_id = $1 AND name = $2")
                    .bind(org_id)
                    .bind(company_name)
                    .fetch_optional(pool.get_ref())
                    .await;

            match existing_company {
                Ok(Some(row)) => Some(row.get("id")),
                Ok(None) => {
                    let result = sqlx::query(
                        "INSERT INTO crm_companies (org_id, name) VALUES ($1, $2) \
                         RETURNING id",
                    )
                    .bind(org_id)
                    .bind(company_name)
                    .fetch_optional(pool.get_ref())
                    .await;

                    match result {
                        Ok(Some(row)) => Some(row.get("id")),
                        _ => None,
                    }
                }
                Err(_) => None,
            }
        } else {
            None
        };

        // Create the contact
        let email_enc = encryptor.encrypt_opt(email.as_deref());
        let phone_enc = encryptor.encrypt_opt(phone.as_deref());
        let notes_enc = encryptor.encrypt_opt(note.as_deref());

        let result = sqlx::query(
            "INSERT INTO crm_contacts (org_id, name, email, phone, role, notes, company_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(org_id)
        .bind(name.trim())
        .bind(&email_enc)
        .bind(&phone_enc)
        .bind(title.as_deref())
        .bind(&notes_enc)
        .bind(company_id)
        .execute(pool.get_ref())
        .await;

        match result {
            Ok(_) => imported += 1,
            Err(e) => {
                tracing::warn!("vCard import error for contact: {e}");
                errors += 1;
            }
        }
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(ImportResponse {
        imported,
        skipped,
        errors,
    })))
}
