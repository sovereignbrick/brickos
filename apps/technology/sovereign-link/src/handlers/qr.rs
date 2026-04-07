use actix_web::{web, HttpResponse};
use qrcode::render::svg;
use qrcode::QrCode;
#[cfg(feature = "platform")]
use sqlx::PgPool;
use std::sync::Arc;

use crate::db::LinkStore;
#[cfg(feature = "platform")]
use crate::models::*;

/// BrickOS cube logo (blockos-cube-dark-512.png) as base64 PNG.
/// Embedded directly in SVG QR codes for the center logo.
const BRICKOS_CUBE_B64: &str = include_str!("../assets/brickos-cube.b64");

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
                .quiet_zone(true)
                .dark_color(svg::Color("#000000"))
                .light_color(svg::Color("#ffffff"))
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

/// Embed the actual BrickOS cube PNG as a base64 image in the center of the QR SVG.
/// White circle background, actual brand asset embedded.
fn embed_logo_in_svg(svg: &str) -> String {
    let (width, height) = parse_svg_dimensions(svg);
    let r = (width.min(height) as f64 * 0.13) as u32;
    let cx = width / 2;
    let cy = height / 2;
    let img_size = (r as f64 * 1.6) as u32;
    let img_x = cx - img_size / 2;
    let img_y = cy - img_size / 2;

    let logo = format!(
        r##"<g>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="#fafafa"/>
  <image x="{ix}" y="{iy}" width="{iw}" height="{ih}" href="data:image/png;base64,{b64}"/>
</g>"##,
        cx = cx,
        cy = cy,
        r = r + 3,
        ix = img_x,
        iy = img_y,
        iw = img_size,
        ih = img_size,
        b64 = BRICKOS_CUBE_B64,
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
