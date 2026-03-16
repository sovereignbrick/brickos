// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use genpdf::elements::{Break, LinearLayout, Paragraph, TableLayout};
use genpdf::fonts;
use genpdf::style::{Color, Style};
use genpdf::{Document, Element, Margins, SimplePageDecorator};

/// A single marker data point for the report.
#[derive(Debug, Clone)]
pub struct ReportMarker {
    pub zone_name: String,
    pub marker_name: String,
    pub latest_value: f64,
    pub unit: String,
    pub status: String,
    pub trend: String,
    pub range_text: String,
    pub change_text: String,
}

/// A device entry for the report.
#[derive(Debug, Clone)]
pub struct ReportDevice {
    pub name: String,
    pub device_type: String,
    pub markers: Vec<String>,
}

/// An ingredient within an influence factor.
#[derive(Debug, Clone)]
pub struct ReportIngredient {
    pub name: String,
    pub amount: String,
    pub role: String,
}

/// An influence factor (medication or supplement) for the report.
#[derive(Debug, Clone)]
pub struct ReportInfluenceFactor {
    pub name: String,
    pub factor_type: String,
    pub brand: String,
    pub dosage: String,
    pub frequency: String,
    pub ingredients: Vec<ReportIngredient>,
}

/// Report parameters.
#[derive(Debug)]
pub struct ReportParams {
    pub user_name: String,
    pub user_email: String,
    pub user_age: Option<i32>,
    pub user_gender: Option<String>,
    pub user_country: Option<String>,
    pub user_height_cm: Option<f64>,
    pub user_weight_kg: Option<f64>,
    pub user_waist_cm: Option<f64>,
    pub date_from: DateTime<Utc>,
    pub date_to: DateTime<Utc>,
    pub total_markers: usize,
    pub measurement_count: i64,
    pub zones: Vec<String>,
    pub diet_protocol: String,
    pub fasting_protocol: String,
    pub markers: Vec<ReportMarker>,
    pub devices: Vec<ReportDevice>,
    pub influence_factors: Vec<ReportInfluenceFactor>,
    pub is_demo: bool,
}

fn status_color(status: &str) -> Color {
    match status {
        "green" => Color::Rgb(34, 139, 34),
        "yellow" | "orange" => Color::Rgb(200, 150, 0),
        "red" => Color::Rgb(200, 30, 30),
        _ => Color::Rgb(100, 100, 100),
    }
}

fn status_label(status: &str) -> &str {
    match status {
        "green" => "Normal",
        "yellow" | "orange" => "Monitor",
        "red" => "Action needed",
        _ => "N/A",
    }
}

fn period_label(from: DateTime<Utc>, to: DateTime<Utc>) -> String {
    let days = (to - from).num_days();
    if days <= 7 {
        "7 days".to_string()
    } else if days <= 30 {
        "1 month".to_string()
    } else if days <= 93 {
        "3 months".to_string()
    } else if days <= 186 {
        "6 months".to_string()
    } else if days <= 370 {
        "1 year".to_string()
    } else {
        format!("{} days", days)
    }
}

fn gray_style(size: u8) -> Style {
    Style::new()
        .with_font_size(size)
        .with_color(Color::Rgb(120, 120, 120))
}

/// Generate a PDF health report, returning the raw bytes.
pub fn generate_health_report(params: &ReportParams) -> anyhow::Result<Vec<u8>> {
    // Use built-in font (Liberation Sans family ships with genpdf)
    let font_family = fonts::from_files(".", "LiberationSans", None).unwrap_or_else(|_| {
        // Fallback: use default font
        fonts::from_files(
            "/usr/share/fonts/truetype/liberation",
            "LiberationSans",
            None,
        )
        .unwrap_or_else(|_| {
            fonts::from_files("/usr/share/fonts", "LiberationSans", None).unwrap_or_else(|_| {
                genpdf::fonts::from_files(".", "LiberationSans", None).expect("No fonts available")
            })
        })
    });

    let mut doc = Document::new(font_family);
    doc.set_title("Health Report");
    doc.set_paper_size((210, 297)); // A4
    doc.set_minimal_conformance();

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(Margins::trbl(20, 15, 20, 15));
    doc.set_page_decorator(decorator);

    // ── Page 1: Cover ────────────────────────────────────────────

    // Logo
    if let Ok(img_data) = std::fs::read("assets/logo.png") {
        if let Ok(img_element) =
            genpdf::elements::Image::from_reader(std::io::Cursor::new(img_data))
        {
            doc.push(img_element.with_scale(genpdf::Scale::new(0.08, 0.08)));
        }
    }

    doc.push(Break::new(1.0));
    doc.push(
        Paragraph::new("Sovereign Health Intelligence")
            .styled(Style::new().bold().with_font_size(22)),
    );
    doc.push(Break::new(0.5));
    doc.push(Paragraph::new("Health Report").styled(Style::new().bold().with_font_size(18)));
    doc.push(Break::new(2.0));

    if !params.user_name.is_empty() {
        doc.push(
            Paragraph::new(format!("Prepared for: {}", params.user_name))
                .styled(Style::new().with_font_size(12)),
        );
    }
    if !params.user_email.is_empty() {
        doc.push(
            Paragraph::new(format!("Email: {}", params.user_email))
                .styled(Style::new().with_font_size(12)),
        );
    }
    let plabel = period_label(params.date_from, params.date_to);
    doc.push(
        Paragraph::new(format!(
            "Period: {} to {} ({})",
            params.date_from.format("%Y-%m-%d"),
            params.date_to.format("%Y-%m-%d"),
            plabel,
        ))
        .styled(Style::new().with_font_size(12)),
    );
    doc.push(
        Paragraph::new(format!(
            "Generated: {}",
            Utc::now().format("%Y-%m-%d %H:%M UTC")
        ))
        .styled(gray_style(10)),
    );

    if params.is_demo {
        doc.push(Break::new(1.0));
        doc.push(
            Paragraph::new("DEMO REPORT").styled(
                Style::new()
                    .bold()
                    .with_font_size(16)
                    .with_color(Color::Rgb(200, 100, 0)),
            ),
        );
    }

    doc.push(Break::new(3.0));
    doc.push(
        Paragraph::new(
            "This report is for informational purposes only. It is not medical advice. \
             Consult a qualified healthcare provider before making any medical decisions.",
        )
        .styled(
            Style::new()
                .italic()
                .with_font_size(9)
                .with_color(Color::Rgb(120, 120, 120)),
        ),
    );

    // ── Patient Profile ──────────────────────────────────────────
    doc.push(Break::new(2.0));
    doc.push(Paragraph::new("Patient Profile").styled(Style::new().bold().with_font_size(16)));
    doc.push(Break::new(0.5));

    let mut profile_line1_parts: Vec<String> = Vec::new();
    if let Some(age) = params.user_age {
        profile_line1_parts.push(format!("Age: {}", age));
    }
    if let Some(ref gender) = params.user_gender {
        if !gender.is_empty() {
            profile_line1_parts.push(format!("Gender: {}", gender));
        }
    }
    if let Some(ref country) = params.user_country {
        if !country.is_empty() {
            profile_line1_parts.push(format!("Country: {}", country));
        }
    }
    if !profile_line1_parts.is_empty() {
        doc.push(
            Paragraph::new(profile_line1_parts.join("    "))
                .styled(Style::new().with_font_size(10)),
        );
    }

    let mut profile_line2_parts: Vec<String> = Vec::new();
    if let Some(height) = params.user_height_cm {
        if height > 0.0 {
            profile_line2_parts.push(format!("Height: {:.0} cm", height));
        }
    }
    if let Some(weight) = params.user_weight_kg {
        if weight > 0.0 {
            profile_line2_parts.push(format!("Weight: {:.1} kg", weight));
        }
    }
    if let Some(waist) = params.user_waist_cm {
        if waist > 0.0 {
            profile_line2_parts.push(format!("Waist: {:.1} cm", waist));
        }
    }
    if !profile_line2_parts.is_empty() {
        doc.push(
            Paragraph::new(profile_line2_parts.join("    "))
                .styled(Style::new().with_font_size(10)),
        );
    }

    let mut protocol_parts: Vec<String> = Vec::new();
    if !params.diet_protocol.is_empty() {
        protocol_parts.push(format!("Diet Protocol: {}", params.diet_protocol));
    }
    if !params.fasting_protocol.is_empty() {
        protocol_parts.push(format!("Fasting: {}", params.fasting_protocol));
    }
    if !protocol_parts.is_empty() {
        doc.push(
            Paragraph::new(protocol_parts.join("    ")).styled(Style::new().with_font_size(10)),
        );
    }

    doc.push(Break::new(1.0));

    // ── Health Overview ─────────────────────────────────────────
    doc.push(Paragraph::new("Health Overview").styled(Style::new().bold().with_font_size(16)));
    doc.push(Break::new(0.5));

    let summary = format!(
        "Markers tracked: {}  |  Measurements: {}  |  Protocol: {}",
        params.total_markers,
        params.measurement_count,
        if params.diet_protocol.is_empty() {
            "Standard"
        } else {
            &params.diet_protocol
        },
    );
    doc.push(Paragraph::new(summary).styled(Style::new().with_font_size(10)));

    if !params.zones.is_empty() {
        doc.push(
            Paragraph::new(format!("Active zones: {}", params.zones.join(", ")))
                .styled(Style::new().with_font_size(10)),
        );
    }
    doc.push(Break::new(1.0));

    // ── Traffic Light Summary Table ─────────────────────────────
    doc.push(Paragraph::new("Marker Summary").styled(Style::new().bold().with_font_size(13)));
    doc.push(Break::new(0.3));

    let mut table = TableLayout::new(vec![4, 3, 2, 2, 2]);
    table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
        false, false, false,
    ));

    // Header
    let mut header = table.row();
    header.push_element(Paragraph::new("Marker").styled(Style::new().bold().with_font_size(9)));
    header
        .push_element(Paragraph::new("Latest Value").styled(Style::new().bold().with_font_size(9)));
    header.push_element(Paragraph::new("Unit").styled(Style::new().bold().with_font_size(9)));
    header.push_element(Paragraph::new("Status").styled(Style::new().bold().with_font_size(9)));
    header.push_element(Paragraph::new("Trend").styled(Style::new().bold().with_font_size(9)));
    header.push().expect("header row");

    for m in &params.markers {
        let color = status_color(&m.status);
        let mut row = table.row();
        row.push_element(Paragraph::new(&m.marker_name).styled(Style::new().with_font_size(9)));
        row.push_element(
            Paragraph::new(format!("{:.2}", m.latest_value)).styled(Style::new().with_font_size(9)),
        );
        row.push_element(Paragraph::new(&m.unit).styled(Style::new().with_font_size(9)));
        row.push_element(
            Paragraph::new(status_label(&m.status))
                .styled(Style::new().with_font_size(9).with_color(color)),
        );
        row.push_element(Paragraph::new(&m.trend).styled(Style::new().with_font_size(9)));
        row.push().expect("marker row");
    }
    doc.push(table);
    doc.push(Break::new(1.0));

    // ── Per-Zone Sections ───────────────────────────────────────
    let mut zones_seen: Vec<String> = Vec::new();
    for m in &params.markers {
        if !zones_seen.contains(&m.zone_name) {
            zones_seen.push(m.zone_name.clone());
        }
    }

    for zone in &zones_seen {
        doc.push(Paragraph::new(zone).styled(Style::new().bold().with_font_size(12)));
        doc.push(Break::new(0.2));

        let zone_markers: Vec<&ReportMarker> = params
            .markers
            .iter()
            .filter(|m| &m.zone_name == zone)
            .collect();

        let mut zt = TableLayout::new(vec![3, 2, 2, 3, 2]);
        zt.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(
            false, false, false,
        ));

        let mut zh = zt.row();
        zh.push_element(Paragraph::new("Marker").styled(Style::new().bold().with_font_size(8)));
        zh.push_element(Paragraph::new("Value").styled(Style::new().bold().with_font_size(8)));
        zh.push_element(Paragraph::new("Unit").styled(Style::new().bold().with_font_size(8)));
        zh.push_element(Paragraph::new("Range").styled(Style::new().bold().with_font_size(8)));
        zh.push_element(Paragraph::new("Change").styled(Style::new().bold().with_font_size(8)));
        zh.push().expect("zone header");

        for m in zone_markers {
            let color = status_color(&m.status);
            let mut zr = zt.row();
            zr.push_element(Paragraph::new(&m.marker_name).styled(Style::new().with_font_size(8)));
            zr.push_element(
                Paragraph::new(format!("{:.2}", m.latest_value))
                    .styled(Style::new().with_font_size(8).with_color(color)),
            );
            zr.push_element(Paragraph::new(&m.unit).styled(Style::new().with_font_size(8)));
            zr.push_element(Paragraph::new(&m.range_text).styled(Style::new().with_font_size(8)));
            zr.push_element(Paragraph::new(&m.change_text).styled(Style::new().with_font_size(8)));
            zr.push().expect("zone row");
        }
        doc.push(zt);
        doc.push(Break::new(0.5));
    }

    // ── Measurement Devices ─────────────────────────────────────
    if !params.devices.is_empty() {
        doc.push(Break::new(0.5));
        doc.push(
            Paragraph::new("Measurement Devices").styled(Style::new().bold().with_font_size(13)),
        );
        doc.push(Break::new(0.3));

        for dev in &params.devices {
            let markers_str = if dev.markers.is_empty() {
                String::new()
            } else {
                format!(" - measures: {}", dev.markers.join(", "))
            };
            let dev_type = if dev.device_type.is_empty() {
                String::new()
            } else {
                format!(" ({})", dev.device_type)
            };
            doc.push(
                Paragraph::new(format!("  {} {}{}", dev.name, dev_type, markers_str))
                    .styled(Style::new().with_font_size(9)),
            );
        }
        doc.push(Break::new(0.5));
    }

    // ── Influence Factors ───────────────────────────────────────
    let medications: Vec<&ReportInfluenceFactor> = params
        .influence_factors
        .iter()
        .filter(|f| f.factor_type == "medication")
        .collect();
    let supplements: Vec<&ReportInfluenceFactor> = params
        .influence_factors
        .iter()
        .filter(|f| f.factor_type != "medication")
        .collect();

    if !medications.is_empty() {
        doc.push(Break::new(0.5));
        doc.push(Paragraph::new("Medications").styled(Style::new().bold().with_font_size(13)));
        doc.push(Break::new(0.3));
        render_influence_factors(&mut doc, &medications);
    }

    if !supplements.is_empty() {
        doc.push(Break::new(0.5));
        doc.push(Paragraph::new("Supplements").styled(Style::new().bold().with_font_size(13)));
        doc.push(Break::new(0.3));
        render_influence_factors(&mut doc, &supplements);
    }

    // ── Footer ──────────────────────────────────────────────────
    doc.push(Break::new(2.0));

    let mut footer = LinearLayout::vertical();
    footer.push(
        Paragraph::new("Generated by Sovereign Health Intelligence").styled(
            Style::new()
                .with_font_size(8)
                .with_color(Color::Rgb(120, 120, 120)),
        ),
    );
    let website_url =
        std::env::var("WEBSITE_URL").unwrap_or_else(|_| "https://sovereignhealth.io".to_string());
    footer.push(
        Paragraph::new(&website_url).styled(
            Style::new()
                .with_font_size(8)
                .with_color(Color::Rgb(120, 120, 120)),
        ),
    );
    footer.push(Break::new(0.3));
    footer.push(
        Paragraph::new(
            "This report does not constitute medical advice. Consult a qualified healthcare provider for medical decisions.",
        )
        .styled(Style::new().italic().with_font_size(7).with_color(Color::Rgb(140, 140, 140))),
    );
    doc.push(footer);

    // Render to bytes
    let mut buf = Vec::new();
    doc.render(&mut buf)
        .map_err(|e| anyhow::anyhow!("PDF render failed: {e}"))?;
    Ok(buf)
}

fn render_influence_factors(doc: &mut Document, factors: &[&ReportInfluenceFactor]) {
    for factor in factors {
        let brand_str = if factor.brand.is_empty() {
            String::new()
        } else {
            format!(" ({})", factor.brand)
        };
        let details = [&factor.dosage, &factor.frequency]
            .iter()
            .filter(|s| !s.is_empty())
            .map(|s| s.as_str())
            .collect::<Vec<&str>>()
            .join(", ");
        let details_str = if details.is_empty() {
            String::new()
        } else {
            format!(", {}", details)
        };
        doc.push(
            Paragraph::new(format!("  {}{}{}", factor.name, brand_str, details_str))
                .styled(Style::new().with_font_size(9)),
        );

        if !factor.ingredients.is_empty() {
            let ingr_strs: Vec<String> = factor
                .ingredients
                .iter()
                .map(|i| {
                    let amount_str = if i.amount.is_empty() {
                        String::new()
                    } else {
                        format!(" {}", i.amount)
                    };
                    let role_str = if i.role.is_empty() {
                        String::new()
                    } else {
                        format!(" ({})", i.role)
                    };
                    format!("{}{}{}", i.name, amount_str, role_str)
                })
                .collect();
            doc.push(
                Paragraph::new(format!("    Ingredients: {}", ingr_strs.join(", ")))
                    .styled(gray_style(8)),
            );
        }
    }
}
