use actix_web::{web, HttpResponse};
use qrcode::render::svg;
use qrcode::QrCode;
#[cfg(feature = "platform")]
use sqlx::PgPool;
use std::sync::Arc;

use crate::db::LinkStore;
#[cfg(feature = "platform")]
use crate::models::*;

/// Inner QR handler -- called from the redirect dispatcher when code ends with .qr (platform mode)
#[cfg(feature = "platform")]
pub async fn handle_qr_inner(
    code: &str,
    store: &web::Data<Arc<dyn LinkStore>>,
    _pool: &web::Data<PgPool>,
) -> HttpResponse {
    let short_url = format!("https://brickos.io/r/{}", code);

    // Verify the code exists (either as prefix-based or DB-based)
    let exists = if code.len() == AUTO_CODE_LEN {
        let prefix = &code[..PREFIX_LEN];
        store.get_prefix(prefix).await.ok().flatten().is_some()
    } else {
        store.get_by_code(code).await.ok().flatten().is_some()
    };

    render_qr_response(exists, &short_url)
}

/// Inner QR handler -- standalone mode (no PgPool)
#[cfg(feature = "standalone")]
pub async fn handle_qr_inner(
    code: &str,
    store: &web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let short_url = format!("https://brickos.io/r/{}", code);
    let exists = store.get_by_code(code).await.ok().flatten().is_some();
    render_qr_response(exists, &short_url)
}

fn render_qr_response(exists: bool, short_url: &str) -> HttpResponse {
    if !exists {
        return HttpResponse::NotFound()
            .content_type("text/plain")
            .body("Link not found");
    }

    match QrCode::new(short_url.as_bytes()) {
        Ok(qr) => {
            let svg_str = qr
                .render::<svg::Color>()
                .min_dimensions(200, 200)
                .dark_color(svg::Color("#fafafa"))
                .light_color(svg::Color("#09090b"))
                .build();

            HttpResponse::Ok()
                .content_type("image/svg+xml")
                .insert_header(("Cache-Control", "public, max-age=86400"))
                .body(svg_str)
        }
        Err(_) => HttpResponse::InternalServerError()
            .content_type("text/plain")
            .body("Failed to generate QR code"),
    }
}
