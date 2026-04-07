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
pub async fn handle_qr_inner(code: &str, store: &web::Data<Arc<dyn LinkStore>>) -> HttpResponse {
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

    match QrCode::with_error_correction_level(short_url.as_bytes(), qrcode::EcLevel::H) {
        Ok(qr) => {
            let svg_str = qr
                .render::<svg::Color>()
                .min_dimensions(300, 300)
                .dark_color(svg::Color("#fafafa"))
                .light_color(svg::Color("#09090b"))
                .build();

            // Embed BrickOS brick logo in the center of the QR code.
            // EcLevel::H (30% error correction) allows up to 30% of the QR
            // to be obscured while remaining scannable.
            let branded = embed_logo_in_svg(&svg_str);

            HttpResponse::Ok()
                .content_type("image/svg+xml")
                .insert_header(("Cache-Control", "public, max-age=86400"))
                .body(branded)
        }
        Err(_) => HttpResponse::InternalServerError()
            .content_type("text/plain")
            .body("Failed to generate QR code"),
    }
}

/// Embed the BrickOS isometric cube logo in the center of the QR SVG.
/// White circle background for contrast, isometric cube in the center.
fn embed_logo_in_svg(svg: &str) -> String {
    let (width, height) = parse_svg_dimensions(svg);
    let r = (width.min(height) as f64 * 0.14) as u32; // circle radius = 14% of QR
    let cx = width / 2;
    let cy = height / 2;

    // Isometric cube dimensions (relative to circle radius)
    let s = r as f64 * 0.55; // half-width of cube top face
    let h = s * 0.7; // cube height

    // Cube center offsets from (cx, cy)
    let ccx = cx as f64;
    let ccy = cy as f64 - h * 0.1; // shift up slightly

    // Isometric cube: 3 faces (top, left, right)
    let logo = format!(
        r##"<g>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="#fafafa"/>
  <path d="M{ccx},{ty} L{rx},{rm} L{ccx},{by} L{lx},{rm} Z" fill="#d4d4d4"/>
  <path d="M{lx},{rm} L{ccx},{by} L{ccx},{bby} L{lx},{lm} Z" fill="#1a1a1a"/>
  <path d="M{ccx},{by} L{rx},{rm} L{rx},{lm} L{ccx},{bby} Z" fill="#2a2a2a"/>
</g>"##,
        cx = cx,
        cy = cy,
        r = r + 2, // slight padding
        ccx = ccx,
        ty = ccy - h,          // top point
        rm = ccy,              // right-middle y
        by = ccy + h * 0.5,    // bottom of top face
        lx = ccx - s,          // left x
        rx = ccx + s,          // right x
        bby = ccy + h * 1.2,   // bottom of cube
        lm = ccy + h * 0.7,    // left-bottom y
    );

    if let Some(pos) = svg.rfind("</svg>") {
        format!("{}{}{}", &svg[..pos], logo, &svg[pos..])
    } else {
        svg.to_string()
    }
}

fn parse_svg_dimensions(svg: &str) -> (u32, u32) {
    // Try viewBox first, fall back to width/height
    if let Some(vb) = svg
        .find("viewBox=\"")
        .map(|i| &svg[i + 9..])
        .and_then(|s| s.find('"').map(|e| &s[..e]))
    {
        let parts: Vec<f64> = vb
            .split_whitespace()
            .filter_map(|p| p.parse().ok())
            .collect();
        if parts.len() == 4 {
            return (parts[2] as u32, parts[3] as u32);
        }
    }
    (300, 300)
}
