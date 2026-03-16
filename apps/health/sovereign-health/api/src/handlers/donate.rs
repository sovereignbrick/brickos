// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::services::strike::{CreateInvoiceRequest, InvoiceAmount, StrikeService};

#[derive(Deserialize)]
pub struct DonationRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub message: Option<String>,
}

// ---------------------------------------------------------------------------
// POST /donate/invoice (public — no auth)
// ---------------------------------------------------------------------------

pub async fn create_donation_invoice(
    strike: Option<web::Data<StrikeService>>,
    body: web::Json<DonationRequest>,
) -> HttpResponse {
    let strike = match strike {
        Some(s) => s,
        None => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "BTC_DISABLED", "message": "Bitcoin payments are not configured." }
        })),
    };

    if body.amount < 1.0 || body.amount > 1000.0 {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_AMOUNT", "message": "Amount must be between 1.00 and 1000.00 EUR." }
        }));
    }

    let correlation_id = format!("sh-don-{}", Uuid::new_v4().as_simple());

    let msg_suffix = body
        .message
        .as_ref()
        .filter(|m| !m.trim().is_empty())
        .map(|m| {
            let trimmed = if m.len() > 100 { &m[..100] } else { m.as_str() };
            format!(" \u{2014} {}", trimmed)
        })
        .unwrap_or_default();

    let description = format!("Donation to Sovereign Health{}", msg_suffix);

    let invoice_req = CreateInvoiceRequest {
        correlation_id: correlation_id.clone(),
        description,
        amount: InvoiceAmount {
            amount: format!("{:.2}", body.amount),
            currency: "EUR".to_string(),
        },
        is_reusable: false,
    };

    let invoice = match strike.create_invoice(invoice_req).await {
        Ok(inv) => inv,
        Err(e) => {
            tracing::error!("Strike donation invoice failed: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIKE_ERROR", "message": "Could not create donation invoice." }
            }));
        }
    };

    let quote = match strike.create_invoice_quote(&invoice.invoice_id).await {
        Ok(q) => q,
        Err(e) => {
            tracing::error!("Strike donation quote failed: {}", e);
            let _ = strike.cancel_invoice(&invoice.invoice_id).await;
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIKE_ERROR", "message": "Could not generate Lightning invoice." }
            }));
        }
    };

    let btc_amount: Option<f64> = quote
        .source_amount
        .as_ref()
        .and_then(|a| a.amount.parse::<f64>().ok());
    let sats: Option<i64> = btc_amount.map(|btc| (btc * 100_000_000.0) as i64);

    let expires_at = quote
        .expiration
        .as_ref()
        .and_then(|e| chrono::DateTime::parse_from_rfc3339(e).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(|| chrono::Utc::now() + chrono::Duration::minutes(15));

    let qr_data = match (&quote.onchain_address, &quote.ln_invoice) {
        (Some(addr), Some(ln)) => {
            let btc_str = btc_amount.map_or("0".to_string(), |b| format!("{:.8}", b));
            format!("bitcoin:{}?amount={}&lightning={}", addr, btc_str, ln)
        }
        (None, Some(ln)) => ln.clone(),
        (Some(addr), None) => {
            let btc_str = btc_amount.map_or("0".to_string(), |b| format!("{:.8}", b));
            format!("bitcoin:{}?amount={}", addr, btc_str)
        }
        (None, None) => String::new(),
    };

    HttpResponse::Ok().json(json!({
        "data": {
            "invoice_id": invoice.invoice_id,
            "amount_eur": body.amount,
            "amount_btc": btc_amount,
            "amount_sats": sats,
            "lightning_invoice": quote.ln_invoice,
            "on_chain_address": quote.onchain_address,
            "qr_data": qr_data,
            "expires_at": expires_at.to_rfc3339(),
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// GET /donate/status/{invoice_id} (public — no auth)
// ---------------------------------------------------------------------------

pub async fn get_donation_status(
    strike: Option<web::Data<StrikeService>>,
    path: web::Path<String>,
) -> HttpResponse {
    let strike = match strike {
        Some(s) => s,
        None => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "BTC_DISABLED", "message": "Bitcoin payments are not configured." }
        })),
    };

    let invoice_id = path.into_inner();

    match strike.get_invoice(&invoice_id).await {
        Ok(inv) => HttpResponse::Ok().json(json!({
            "data": { "status": inv.state.to_lowercase() },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Strike get donation invoice failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIKE_ERROR", "message": "Could not check donation status." }
            }))
        }
    }
}
