// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #481 -- per-org invoice CRUD + Stripe sync.
//
// Endpoints (mounted under /admin):
//   GET    /admin/organizations/{id}/invoices            -- list draft+sent+paid
//   POST   /admin/organizations/{id}/invoices            -- create draft (local)
//   POST   /admin/organizations/{id}/invoices/{inv}/sync -- push to Stripe
//   GET    /admin/invoice-products                       -- the canonical 7
//                                                         (so the form dropdown
//                                                         is server-driven)
//
// design 022 §3.9 -- the manual invoice flow lives here. The product slugs
// match what brickos staff configures in Stripe (one-time setup) but the
// names + EUR prices are owned by this server-side constant so the frontend
// dropdown is consistent and doesn't fall out of sync with Stripe overrides.

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;
use crate::PlatformPool;

/// The seven canonical SHI Horizon line items per design 022 §3.9. The
/// `unit_amount_cents` is the operator-facing default; per-invoice overrides
/// are still possible by editing the line item before sync. The `slug`
/// matches the Stripe Product slug created during one-time ops setup.
const INVOICE_PRODUCTS: &[(&str, &str, i64)] = &[
    ("shi-horizon-base", "SHI Horizon Practice Base", 49900),
    (
        "shi-horizon-patients-10",
        "Additional patient seats (block of 10)",
        8900,
    ),
    (
        "shi-horizon-practitioner-1",
        "Additional practitioner seat",
        3900,
    ),
    ("shi-horizon-domain", "Custom domain (per month)", 4900),
    ("shi-horizon-me", "M&E (calculated)", 0),
    ("shi-horizon-onboarding", "Onboarding", 150000),
    (
        "shi-horizon-priority",
        "Priority support SLA (per year)",
        19900,
    ),
];

#[derive(Deserialize)]
pub struct LineItemInput {
    pub product_slug: String,
    pub name: String,
    pub quantity: i64,
    pub unit_amount_cents: i64,
}

#[derive(Deserialize)]
pub struct CreateInvoiceRequest {
    pub currency: String,
    pub line_items: Vec<LineItemInput>,
    pub due_days: Option<i32>,
    pub memo: Option<String>,
}

// ---------------------------------------------------------------------------
// GET /admin/invoice-products
// ---------------------------------------------------------------------------

pub async fn list_invoice_products(_admin: AdminUser) -> Result<HttpResponse, AppError> {
    let products: Vec<serde_json::Value> = INVOICE_PRODUCTS
        .iter()
        .map(|(slug, name, cents)| {
            json!({
                "slug": slug,
                "name": name,
                "default_unit_amount_cents": cents,
            })
        })
        .collect();
    Ok(HttpResponse::Ok().json(json!({ "data": products, "error": null })))
}

// ---------------------------------------------------------------------------
// GET /admin/organizations/{id}/invoices
// ---------------------------------------------------------------------------

pub async fn list_org_invoices(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT id, stripe_invoice_id, currency, status, line_items,
                  total_amount_cents, due_days, memo,
                  created_at, sent_at, paid_at
           FROM org_invoices
           WHERE org_id = $1
           ORDER BY created_at DESC"#,
    )
    .bind(org_id)
    .fetch_all(&platform_pool.0)
    .await?;

    let invoices: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "stripe_invoice_id": r.try_get::<Option<String>, _>("stripe_invoice_id").ok().flatten(),
                "currency": r.try_get::<String, _>("currency").unwrap_or_else(|_| "eur".to_string()),
                "status": r.try_get::<String, _>("status").unwrap_or_else(|_| "draft".to_string()),
                "line_items": r.try_get::<serde_json::Value, _>("line_items").unwrap_or(json!([])),
                "total_amount_cents": r.try_get::<i64, _>("total_amount_cents").unwrap_or(0),
                "due_days": r.try_get::<i32, _>("due_days").unwrap_or(30),
                "memo": r.try_get::<Option<String>, _>("memo").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                "sent_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("sent_at").ok().flatten(),
                "paid_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("paid_at").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": invoices, "error": null })))
}

// ---------------------------------------------------------------------------
// POST /admin/organizations/{id}/invoices  -- create local draft
// ---------------------------------------------------------------------------

pub async fn create_org_invoice(
    platform_pool: web::Data<PlatformPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<CreateInvoiceRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();
    let req = body.into_inner();

    if req.line_items.is_empty() {
        return Err(AppError::Validation("line_items must not be empty".into()));
    }

    let total: i64 = req
        .line_items
        .iter()
        .map(|li| li.quantity.max(0) * li.unit_amount_cents.max(0))
        .sum();

    let line_items_json = serde_json::to_value(
        req.line_items
            .iter()
            .map(|li| {
                json!({
                    "product_slug": li.product_slug,
                    "name": li.name,
                    "quantity": li.quantity,
                    "unit_amount_cents": li.unit_amount_cents,
                })
            })
            .collect::<Vec<_>>(),
    )
    .map_err(|e| AppError::Validation(format!("line_items serialize: {e}")))?;

    let row: (Uuid,) = sqlx::query_as(
        r#"INSERT INTO org_invoices
             (org_id, currency, status, line_items, total_amount_cents,
              due_days, memo, created_by)
           VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7)
           RETURNING id"#,
    )
    .bind(org_id)
    .bind(req.currency.to_lowercase())
    .bind(&line_items_json)
    .bind(total)
    .bind(req.due_days.unwrap_or(30))
    .bind(req.memo.as_deref())
    .bind(admin.user_id)
    .fetch_one(&platform_pool.0)
    .await?;

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "id": row.0,
            "status": "draft",
            "total_amount_cents": total,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /admin/organizations/{id}/invoices/{inv}/sync -- push to Stripe
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SyncInvoiceRequest {
    pub stripe_customer_id: String,
}

pub async fn sync_org_invoice_to_stripe(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<brickos_billing::stripe::StripeService>>,
    _admin: AdminUser,
    path: web::Path<(Uuid, Uuid)>,
    body: web::Json<SyncInvoiceRequest>,
) -> Result<HttpResponse, AppError> {
    let (org_id, invoice_id) = path.into_inner();

    let stripe = stripe.ok_or_else(|| {
        AppError::Validation("Stripe is not enabled on this server (set STRIPE_SECRET_KEY)".into())
    })?;
    let stripe: Arc<brickos_billing::stripe::StripeService> = Arc::new(stripe.get_ref().clone());

    let row = sqlx::query(
        r#"SELECT id, currency, status, line_items, due_days, memo
           FROM org_invoices
           WHERE id = $1 AND org_id = $2"#,
    )
    .bind(invoice_id)
    .bind(org_id)
    .fetch_optional(&platform_pool.0)
    .await?
    .ok_or(AppError::NotFound)?;

    let status: String = row
        .try_get("status")
        .unwrap_or_else(|_| "draft".to_string());
    if status != "draft" {
        return Err(AppError::Validation(format!(
            "invoice is not a draft (status={status})"
        )));
    }
    let currency: String = row
        .try_get("currency")
        .unwrap_or_else(|_| "eur".to_string());
    let due_days: i32 = row.try_get("due_days").unwrap_or(30);
    let memo: Option<String> = row.try_get("memo").ok().flatten();
    let line_items: serde_json::Value = row.try_get("line_items").unwrap_or(json!([]));

    let stripe_invoice_id = stripe
        .create_draft_invoice(
            &body.stripe_customer_id,
            &currency,
            due_days,
            memo.as_deref(),
        )
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "stripe create_draft_invoice failed");
            AppError::Internal
        })?;

    if let Some(items) = line_items.as_array() {
        for li in items {
            let name = li
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Line item");
            let qty = li.get("quantity").and_then(|v| v.as_i64()).unwrap_or(1);
            let unit = li
                .get("unit_amount_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            stripe
                .add_invoice_item(
                    &body.stripe_customer_id,
                    &stripe_invoice_id,
                    &currency,
                    name,
                    qty,
                    unit,
                )
                .await
                .map_err(|e| {
                    tracing::error!(error = ?e, "stripe add_invoice_item failed");
                    AppError::Internal
                })?;
        }
    }

    stripe
        .finalize_invoice(&stripe_invoice_id)
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "stripe finalize_invoice failed");
            AppError::Internal
        })?;

    stripe.send_invoice(&stripe_invoice_id).await.map_err(|e| {
        tracing::error!(error = ?e, "stripe send_invoice failed");
        AppError::Internal
    })?;

    sqlx::query(
        "UPDATE org_invoices SET stripe_invoice_id = $1, status = 'sent',
         sent_at = NOW(), updated_at = NOW() WHERE id = $2",
    )
    .bind(&stripe_invoice_id)
    .bind(invoice_id)
    .execute(&platform_pool.0)
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "id": invoice_id,
            "stripe_invoice_id": stripe_invoice_id,
            "status": "sent",
        },
        "error": null
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invoice_products_has_seven() {
        assert_eq!(INVOICE_PRODUCTS.len(), 7);
    }

    #[test]
    fn invoice_product_slugs_match_design_022() {
        let slugs: Vec<&str> = INVOICE_PRODUCTS.iter().map(|(s, _, _)| *s).collect();
        for expected in [
            "shi-horizon-base",
            "shi-horizon-patients-10",
            "shi-horizon-practitioner-1",
            "shi-horizon-domain",
            "shi-horizon-me",
            "shi-horizon-onboarding",
            "shi-horizon-priority",
        ] {
            assert!(
                slugs.contains(&expected),
                "missing product slug: {expected}"
            );
        }
    }
}
