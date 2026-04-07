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

/// Embed a BrickOS brick logo in the center of the QR SVG.
fn embed_logo_in_svg(svg: &str) -> String {
    // Parse viewBox to find center
    let (width, height) = parse_svg_dimensions(svg);
    let logo_size = (width.min(height) as f64 * 0.22) as u32; // 22% of QR size
    let x = (width - logo_size) / 2;
    let y = (height - logo_size) / 2;
    let pad = 2;

    // BrickOS brick: a rounded rectangle with 4 studs on top
    let logo = format!(
        r##"<g transform="translate({x},{y})">
  <rect x="0" y="0" width="{w}" height="{h}" rx="4" fill="#09090b"/>
  <rect x="{p}" y="{p}" width="{wi}" height="{hi}" rx="3" fill="#f97316"/>
  <circle cx="{c1x}" cy="{cy}" r="{sr}" fill="#fb923c"/>
  <circle cx="{c2x}" cy="{cy}" r="{sr}" fill="#fb923c"/>
  <circle cx="{c3x}" cy="{cy}" r="{sr}" fill="#fb923c"/>
  <circle cx="{c4x}" cy="{cy}" r="{sr}" fill="#fb923c"/>
</g>"##,
        x = x,
        y = y,
        w = logo_size,
        h = logo_size,
        p = pad,
        wi = logo_size - pad * 2,
        hi = logo_size - pad * 2,
        sr = logo_size / 10,
        cy = logo_size / 3,
        c1x = logo_size / 5,
        c2x = logo_size * 2 / 5,
        c3x = logo_size * 3 / 5,
        c4x = logo_size * 4 / 5,
    );

    // Insert logo before closing </svg>
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
