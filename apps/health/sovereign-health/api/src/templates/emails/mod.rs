// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use serde_json::Value;
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Simple {{var}} template engine
// ---------------------------------------------------------------------------

pub fn render(template: &str, vars: &HashMap<&str, String>) -> String {
    let mut result = template.to_string();
    for (key, value) in vars {
        result = result.replace(&format!("{{{{{}}}}}", key), value);
    }
    result
}

// ---------------------------------------------------------------------------
// Template pairs (HTML + plain text)
// ---------------------------------------------------------------------------

pub struct EmailTemplate {
    pub subject: &'static str,
    pub html: &'static str,
    pub text: &'static str,
}

// ---------------------------------------------------------------------------
// Shared HTML wrapper - light theme, dark mode support, WCAG 2.1 AA
// ---------------------------------------------------------------------------

const HTML_WRAPPER_START: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{subject}}</title>
<style>
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) {
  .email-body { background-color: #1a1a1a !important; }
  .email-card { background-color: #2a2a2a !important; border-color: #3a3a3a !important; }
  .email-heading { color: #ffffff !important; }
  .email-text { color: #e0e0e0 !important; }
  .email-subtext { color: #aaaaaa !important; }
  .email-footer { color: #888888 !important; }
  .email-footer a { color: #888888 !important; }
  .email-info-box { background-color: #1a2e1a !important; border-color: #2d4a2d !important; }
  .email-info-text { color: #86efac !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
<div class="email-body" style="background-color: #f5f5f5; padding: 32px 16px;">
<div style="max-width: 560px; margin: 0 auto;">

<!-- Logo -->
<div style="text-align: center; padding: 24px 0 16px;">
  <img src="{{org_logo_url}}" alt="{{org_name}}" width="180" style="max-width: 180px; height: auto;" />
</div>

<!-- Card -->
<div class="email-card" style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
"#;

const HTML_WRAPPER_END: &str = r#"
</div>

<!-- Footer -->
<div class="email-footer" style="text-align: center; padding: 24px 0; font-size: 13px; color: #666666; line-height: 1.5;">
  <p style="margin: 0;">{{org_name}}</p>
  <p style="margin: 4px 0 0;"><a href="{{org_website}}" style="color: #666666; text-decoration: none;">{{org_website_label}}</a></p>
  <p style="margin: 12px 0 0; font-size: 11px; color: #999999;">&copy; 2026 {{org_name}}. All rights reserved.</p>
  <p style="margin: 4px 0 0; font-size: 11px;">
    <a href="https://sovereignhealth.io/terms" style="color: #999999; text-decoration: none;">Terms</a> &nbsp;|&nbsp;
    <a href="https://sovereignhealth.io/privacy" style="color: #999999; text-decoration: none;">Privacy</a> &nbsp;|&nbsp;
    <a href="https://sovereignhealth.io/impressum" style="color: #999999; text-decoration: none;">Impressum</a>
  </p>
  {{unsubscribe_block}}
</div>

</div>
</div>
</body>
</html>"#;

fn wrap_html(body: &str) -> String {
    format!("{}{}{}", HTML_WRAPPER_START, body, HTML_WRAPPER_END)
}

// ---------------------------------------------------------------------------
// German wrapper
// ---------------------------------------------------------------------------

const HTML_WRAPPER_START_DE: &str = r#"<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{subject}}</title>
<style>
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) {
  .email-body { background-color: #1a1a1a !important; }
  .email-card { background-color: #2a2a2a !important; border-color: #3a3a3a !important; }
  .email-heading { color: #ffffff !important; }
  .email-text { color: #e0e0e0 !important; }
  .email-subtext { color: #aaaaaa !important; }
  .email-footer { color: #888888 !important; }
  .email-footer a { color: #888888 !important; }
  .email-info-box { background-color: #1a2e1a !important; border-color: #2d4a2d !important; }
  .email-info-text { color: #86efac !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
<div class="email-body" style="background-color: #f5f5f5; padding: 32px 16px;">
<div style="max-width: 560px; margin: 0 auto;">

<!-- Logo -->
<div style="text-align: center; padding: 24px 0 16px;">
  <img src="{{org_logo_url}}" alt="{{org_name}}" width="180" style="max-width: 180px; height: auto;" />
</div>

<!-- Card -->
<div class="email-card" style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
"#;

const HTML_WRAPPER_END_DE: &str = r#"
</div>

<!-- Footer -->
<div class="email-footer" style="text-align: center; padding: 24px 0; font-size: 13px; color: #666666; line-height: 1.5;">
  <p style="margin: 0;">{{org_name}}</p>
  <p style="margin: 4px 0 0;"><a href="{{org_website}}" style="color: #666666; text-decoration: none;">{{org_website_label}}</a></p>
  <p style="margin: 12px 0 0; font-size: 11px; color: #999999;">&copy; 2026 {{org_name}}. Alle Rechte vorbehalten.</p>
  <p style="margin: 4px 0 0; font-size: 11px;">
    <a href="https://sovereignhealth.io/terms" style="color: #999999; text-decoration: none;">Nutzungsbedingungen</a> &nbsp;|&nbsp;
    <a href="https://sovereignhealth.io/privacy" style="color: #999999; text-decoration: none;">Datenschutz</a> &nbsp;|&nbsp;
    <a href="https://sovereignhealth.io/impressum" style="color: #999999; text-decoration: none;">Impressum</a>
  </p>
  <p style="margin: 8px 0 0; font-size: 11px;">
    <a href="{{unsubscribe_url}}" style="color: #999999; text-decoration: underline;">Abmelden</a>
  </p>
</div>

</div>
</div>
</body>
</html>"#;

fn wrap_html_de(body: &str) -> String {
    format!("{}{}{}", HTML_WRAPPER_START_DE, body, HTML_WRAPPER_END_DE)
}

// ---------------------------------------------------------------------------
// Sprint 044 #551: org email branding variables
// ---------------------------------------------------------------------------

/// Default SHI branding for emails (no org context).
pub fn default_email_vars() -> HashMap<&'static str, String> {
    let mut vars = HashMap::new();
    vars.insert(
        "org_logo_url",
        "https://sovereignhealth.io/logo.png".to_string(),
    );
    vars.insert("org_name", "Sovereign Health Intelligence".to_string());
    vars.insert("org_website", "https://sovereignhealth.io".to_string());
    vars.insert("org_website_label", "sovereignhealth.io".to_string());
    vars
}

/// Build email template vars from org branding JSONB.
/// Falls back to SHI defaults for missing fields.
pub fn org_email_vars(
    branding: Option<&Value>,
    org_name: Option<&str>,
    org_slug: Option<&str>,
) -> HashMap<&'static str, String> {
    let mut vars = default_email_vars();

    if let Some(name) = org_name {
        vars.insert("org_name", name.to_string());
    }

    if let Some(slug) = org_slug {
        let website = format!("https://{}.brickos.io", slug);
        vars.insert("org_website", website.clone());
        vars.insert("org_website_label", format!("{}.brickos.io", slug));
    }

    if let Some(branding) = branding {
        if let Some(logo) = branding.get("logo_url").and_then(|v| v.as_str()) {
            if !logo.is_empty() {
                vars.insert("org_logo_url", logo.to_string());
            }
        }
    }

    vars
}

// ---------------------------------------------------------------------------
// brickos.io HTML wrapper -- Sprint 040 #473
//
// Per design 022 §1.3, billing/license transactional emails carry brickos.io
// branding (NOT Sovereign Health branding) because the customer's contract is
// with Sovereign Brick the platform, not with the SHI app. SHI continues to
// brand its own clinical emails. The split is:
//   - billing & license = brickos.io
//   - clinical = app brand
//
// Wrapper differences from the SHI version:
//   - Logo: brickos.io
//   - Footer brand name: BrickOS / Sovereign Brick
//   - Footer links to brickos.io (not sovereignhealth.io)
//   - Same dark-mode + WCAG 2.1 AA structure as the SHI wrapper
// ---------------------------------------------------------------------------

const HTML_WRAPPER_START_BRICKOS: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{subject}}</title>
<style>
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) {
  .email-body { background-color: #0f1115 !important; }
  .email-card { background-color: #1a1d24 !important; border-color: #2a2e38 !important; }
  .email-heading { color: #ffffff !important; }
  .email-text { color: #e0e0e0 !important; }
  .email-subtext { color: #a8a8a8 !important; }
  .email-footer { color: #888888 !important; }
  .email-footer a { color: #888888 !important; }
  .email-info-box { background-color: #1a2638 !important; border-color: #2d3f5a !important; }
  .email-info-text { color: #93c5fd !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
<div class="email-body" style="background-color: #f5f6f8; padding: 32px 16px;">
<div style="max-width: 560px; margin: 0 auto;">

<!-- Logo -->
<div style="text-align: center; padding: 24px 0 16px;">
  <img src="https://brickos.io/logo.png" alt="BrickOS" width="160" style="max-width: 160px; height: auto;" />
</div>

<!-- Card -->
<div class="email-card" style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
"#;

const HTML_WRAPPER_END_BRICKOS: &str = r#"
</div>

<!-- Footer -->
<div class="email-footer" style="text-align: center; padding: 24px 0; font-size: 13px; color: #666666; line-height: 1.5;">
  <p style="margin: 0;">BrickOS &mdash; the sovereign suite</p>
  <p style="margin: 4px 0 0;"><a href="https://brickos.io" style="color: #666666; text-decoration: none;">brickos.io</a></p>
  <p style="margin: 12px 0 0; font-size: 11px; color: #999999;">&copy; 2026 Sovereign Brick. All rights reserved.</p>
  <p style="margin: 4px 0 0; font-size: 11px;">
    <a href="https://brickos.io/terms" style="color: #999999; text-decoration: none;">Terms</a> &nbsp;|&nbsp;
    <a href="https://brickos.io/privacy" style="color: #999999; text-decoration: none;">Privacy</a> &nbsp;|&nbsp;
    <a href="https://brickos.io/impressum" style="color: #999999; text-decoration: none;">Impressum</a>
  </p>
  <p style="margin: 8px 0 0; font-size: 11px; color: #999999;">
    This is a billing notice from your BrickOS account. You cannot opt out of billing notices while you have an active subscription or grace period.
  </p>
  {{unsubscribe_block}}
</div>

</div>
</div>
</body>
</html>"#;

fn wrap_html_brickos(body: &str) -> String {
    format!(
        "{}{}{}",
        HTML_WRAPPER_START_BRICKOS, body, HTML_WRAPPER_END_BRICKOS
    )
}

const HTML_WRAPPER_START_BRICKOS_DE: &str = r#"<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{subject}}</title>
<style>
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) {
  .email-body { background-color: #0f1115 !important; }
  .email-card { background-color: #1a1d24 !important; border-color: #2a2e38 !important; }
  .email-heading { color: #ffffff !important; }
  .email-text { color: #e0e0e0 !important; }
  .email-subtext { color: #a8a8a8 !important; }
  .email-footer { color: #888888 !important; }
  .email-footer a { color: #888888 !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
<div class="email-body" style="background-color: #f5f6f8; padding: 32px 16px;">
<div style="max-width: 560px; margin: 0 auto;">

<!-- Logo -->
<div style="text-align: center; padding: 24px 0 16px;">
  <img src="https://brickos.io/logo.png" alt="BrickOS" width="160" style="max-width: 160px; height: auto;" />
</div>

<!-- Card -->
<div class="email-card" style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
"#;

const HTML_WRAPPER_END_BRICKOS_DE: &str = r#"
</div>

<!-- Footer -->
<div class="email-footer" style="text-align: center; padding: 24px 0; font-size: 13px; color: #666666; line-height: 1.5;">
  <p style="margin: 0;">BrickOS &mdash; die souveraene Suite</p>
  <p style="margin: 4px 0 0;"><a href="https://brickos.io" style="color: #666666; text-decoration: none;">brickos.io</a></p>
  <p style="margin: 12px 0 0; font-size: 11px; color: #999999;">&copy; 2026 Sovereign Brick. Alle Rechte vorbehalten.</p>
  <p style="margin: 4px 0 0; font-size: 11px;">
    <a href="https://brickos.io/terms" style="color: #999999; text-decoration: none;">Nutzungsbedingungen</a> &nbsp;|&nbsp;
    <a href="https://brickos.io/privacy" style="color: #999999; text-decoration: none;">Datenschutz</a> &nbsp;|&nbsp;
    <a href="https://brickos.io/impressum" style="color: #999999; text-decoration: none;">Impressum</a>
  </p>
  <p style="margin: 8px 0 0; font-size: 11px; color: #999999;">
    Dies ist eine Abrechnungs-Mitteilung Ihres BrickOS-Kontos. Solange Ihr Abonnement oder die Schonfrist aktiv ist, koennen Sie diese Benachrichtigungen nicht abbestellen.
  </p>
  {{unsubscribe_block}}
</div>

</div>
</div>
</body>
</html>"#;

fn wrap_html_brickos_de(body: &str) -> String {
    format!(
        "{}{}{}",
        HTML_WRAPPER_START_BRICKOS_DE, body, HTML_WRAPPER_END_BRICKOS_DE
    )
}

// ---------------------------------------------------------------------------
// 1. Email Verification (EN)
// ---------------------------------------------------------------------------

pub fn verification() -> EmailTemplate {
    EmailTemplate {
        subject: "Verify your email - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Welcome!</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Thanks for joining Sovereign Health Intelligence. Please verify your email to get started:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{verification_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Verify Email Address</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>"#,
        ),
        text: concat!(
            "Welcome!\n\n",
            "Thanks for joining Sovereign Health Intelligence. Please verify your email to get started:\n\n",
            "{{verification_url}}\n\n",
            "This link expires in 24 hours.\n\n",
            "If you didn't create this account, you can safely ignore this email.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 2. Password Reset (EN)
// ---------------------------------------------------------------------------

pub fn password_reset() -> EmailTemplate {
    EmailTemplate {
        subject: "Reset your password - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Password Reset</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">We received a request to reset your Sovereign Health password.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">Click the button below to choose a new password:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reset_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">This link expires in 1 hour. If you did not request this, no action is needed - your account is safe.</p>"#,
        ),
        text: concat!(
            "Password Reset\n\n",
            "We received a request to reset your Sovereign Health password.\n\n",
            "Reset here: {{reset_url}}\n\n",
            "This link expires in 1 hour. If you did not request this, no action is needed.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 3. Welcome (EN)
// ---------------------------------------------------------------------------

pub fn welcome() -> EmailTemplate {
    EmailTemplate {
        subject: "Welcome to Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Welcome to Sovereign Health Intelligence</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Your account is verified and ready to go. Here is how to get started:</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">1. Record your first measurement</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Open the app, tap New Measurement, and log your morning fasting values.</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">2. Explore your Health Zones</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Eight zones organize your markers from metabolic health to hormones. See what each zone tracks and why it matters.</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">3. Ask Dr. Alex</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Your AI health assistant can explain your numbers, analyze trends, and suggest what to focus on next.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Go to Dashboard</a></div>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Questions? Visit <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a></p>"#,
        ),
        text: concat!(
            "Welcome to Sovereign Health Intelligence\n\n",
            "Your account is verified and ready to go. Here is how to get started:\n\n",
            "1. Record your first measurement\n",
            "   Open the app, tap New Measurement, and log your morning fasting values.\n\n",
            "2. Explore your Health Zones\n",
            "   Eight zones organize your markers from metabolic health to hormones.\n\n",
            "3. Ask Dr. Alex\n",
            "   Your AI health assistant can explain your numbers, analyze trends,\n",
            "   and suggest what to focus on next.\n\n",
            "Go to Dashboard: {{frontend_url}}\n\n",
            "Questions? Visit https://sovereignhealth.io/contact\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 4. Tier Change (EN)
// ---------------------------------------------------------------------------

pub fn tier_change() -> EmailTemplate {
    EmailTemplate {
        subject: "Your plan has changed - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Plan Updated</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Your plan has been changed from <strong>{{from_tier}}</strong> to <strong>{{to_tier}}</strong>.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">{{tier_message}}</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}/billing" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">View Plan Details</a></div>"#,
        ),
        text: concat!(
            "Plan Updated\n\n",
            "Hi {{display_name}},\n\n",
            "Your plan has been changed from {{from_tier}} to {{to_tier}}.\n\n",
            "{{tier_message}}\n\n",
            "View details: {{frontend_url}}/billing\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 5. Payment Confirmation (EN)
// ---------------------------------------------------------------------------

pub fn payment_confirmation() -> EmailTemplate {
    EmailTemplate {
        subject: "Payment received - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Payment Confirmed</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">We received your payment for the <strong>{{tier_name}}</strong> plan.</p>"#,
            r#"<div class="email-info-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">"#,
            r#"<p class="email-info-text" style="margin: 0; font-size: 15px; color: #166534;"><strong>Plan:</strong> {{tier_name}}</p>"#,
            r#"<p class="email-info-text" style="margin: 8px 0 0; font-size: 15px; color: #166534;"><strong>Amount:</strong> {{amount}}</p>"#,
            r#"<p class="email-info-text" style="margin: 8px 0 0; font-size: 15px; color: #166534;"><strong>Active until:</strong> {{period_end}}</p>"#,
            r#"</div>"#,
            r#"<p class="email-text" style="margin: 16px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Thank you for supporting privacy-first health tracking.</p>"#,
        ),
        text: concat!(
            "Payment Confirmed\n\n",
            "Hi {{display_name}},\n\n",
            "We received your payment for the {{tier_name}} plan.\n\n",
            "  Plan: {{tier_name}}\n",
            "  Amount: {{amount}}\n",
            "  Active until: {{period_end}}\n\n",
            "Thank you for supporting privacy-first health tracking.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 6. Payment Failed (EN)
// ---------------------------------------------------------------------------

pub fn payment_failed() -> EmailTemplate {
    EmailTemplate {
        subject: "Payment failed - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Payment Issue</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">We couldn't process your latest payment for the <strong>{{tier_name}}</strong> plan.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">Please update your payment method to keep your features active:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}/billing" style="background-color: #dc2626; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Update Payment Method</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">If your payment isn't updated within 7 days, your account will be downgraded to the free plan.</p>"#,
        ),
        text: concat!(
            "Payment Issue\n\n",
            "Hi {{display_name}},\n\n",
            "We couldn't process your latest payment for the {{tier_name}} plan.\n",
            "Please update your payment method to keep your features active.\n\n",
            "Update payment: {{frontend_url}}/billing\n\n",
            "If your payment isn't updated within 7 days, your account will be downgraded to the free plan.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 7. Subscription Cancelled (EN)
// ---------------------------------------------------------------------------

pub fn subscription_cancelled() -> EmailTemplate {
    EmailTemplate {
        subject: "Subscription cancelled - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Subscription Cancelled</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your <strong>{{tier_name}}</strong> subscription has been cancelled.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">You will retain access to your current plan features until <strong>{{access_until}}</strong>.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">After that, your account will move to the free Glimpse plan. Your data will not be deleted.</p>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">You can resubscribe at any time from your billing settings.</p>"#,
        ),
        text: concat!(
            "Subscription Cancelled\n\n",
            "Hi {{display_name}},\n\n",
            "Your {{tier_name}} subscription has been cancelled.\n",
            "You will retain access until {{access_until}}.\n\n",
            "After that, your account will move to the free Glimpse plan. Your data will not be deleted.\n\n",
            "You can resubscribe at any time from your billing settings.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 8. Account Deletion (EN)
// ---------------------------------------------------------------------------

pub fn account_deletion() -> EmailTemplate {
    EmailTemplate {
        subject: "Account deleted - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Account Deleted</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your Sovereign Health account and all associated data have been permanently deleted.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">If this was a mistake, contact us within 30 days via <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a> and we may be able to assist.</p>"#,
            r#"<p class="email-text" style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">Thank you for being part of Sovereign Health.</p>"#,
        ),
        text: concat!(
            "Account Deleted\n\n",
            "Your Sovereign Health account and all associated data have been permanently deleted.\n\n",
            "If this was a mistake, contact us within 30 days via https://sovereignhealth.io/contact\n\n",
            "Thank you for being part of Sovereign Health.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 9. Newsletter (EN) - marketing, so unsubscribe IS included in wrapper
// ---------------------------------------------------------------------------

pub fn newsletter() -> EmailTemplate {
    EmailTemplate {
        subject: "{{subject}}",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">{{subject}}</h2>"#,
            r#"{{content}}"#,
        ),
        text: "{{subject}}\n\n{{content_text}}\n",
    }
}

// ---------------------------------------------------------------------------
// 10. Early Access Welcome (EN)
// ---------------------------------------------------------------------------

pub fn early_access_welcome() -> EmailTemplate {
    EmailTemplate {
        subject: "You're on the Sovereign Health early access list!",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">You're in!</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Thanks for signing up for early access to Sovereign Health Intelligence.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">We're building the most comprehensive health intelligence platform - protocol-aware, privacy-first, and powered by AI.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">We'll notify you as soon as early access opens. In the meantime, check out what's coming:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="https://sovereignhealth.io/features" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Explore Features</a></div>"#,
        ),
        text: concat!(
            "You're in!\n\n",
            "Thanks for signing up for early access to Sovereign Health Intelligence.\n\n",
            "We're building the most comprehensive health intelligence platform -\n",
            "protocol-aware, privacy-first, and powered by AI.\n\n",
            "We'll notify you as soon as early access opens.\n\n",
            "Explore features: https://sovereignhealth.io/features\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 10. Early Access Welcome (DE)
// ---------------------------------------------------------------------------

pub fn early_access_welcome_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Sie sind auf der Sovereign Health Early-Access-Liste!",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Sie sind dabei!</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Vielen Dank für Ihre Anmeldung zum Early Access von Sovereign Health Intelligence.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Wir entwickeln die umfassendste Gesundheits-Intelligenz-Plattform - protokollbewusst, datenschutzorientiert und KI-gestützt.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">Wir benachrichtigen Sie, sobald der Early Access verfügbar ist.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="https://sovereignhealth.io/features" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Features entdecken</a></div>"#,
        ),
        text: concat!(
            "Sie sind dabei!\n\n",
            "Vielen Dank für Ihre Anmeldung zum Early Access von Sovereign Health Intelligence.\n\n",
            "Wir entwickeln die umfassendste Gesundheits-Intelligenz-Plattform -\n",
            "protokollbewusst, datenschutzorientiert und KI-gestützt.\n\n",
            "Wir benachrichtigen Sie, sobald der Early Access verfügbar ist.\n\n",
            "Features entdecken: https://sovereignhealth.io/features\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ===========================================================================
// German email templates (formal "Sie")
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Email Verification (DE)
// ---------------------------------------------------------------------------

pub fn verification_de() -> EmailTemplate {
    EmailTemplate {
        subject: "E-Mail bestätigen - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Willkommen!</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Vielen Dank für Ihre Registrierung bei Sovereign Health Intelligence. Bitte bestätigen Sie Ihre E-Mail-Adresse:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{verification_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">E-Mail bestätigen</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Dieser Link ist 24 Stunden gültig. Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.</p>"#,
        ),
        text: concat!(
            "Willkommen!\n\n",
            "Vielen Dank für Ihre Registrierung bei Sovereign Health Intelligence.\n",
            "Bitte bestätigen Sie Ihre E-Mail-Adresse:\n\n",
            "{{verification_url}}\n\n",
            "Dieser Link ist 24 Stunden gültig.\n\n",
            "Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 2. Password Reset (DE)
// ---------------------------------------------------------------------------

pub fn password_reset_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Passwort zurücksetzen - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Passwort zurücksetzen</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Wir haben eine Anfrage erhalten, Ihr Sovereign Health Passwort zurückzusetzen.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">Klicken Sie auf die Schaltfläche, um ein neues Passwort zu wählen:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reset_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Passwort zurücksetzen</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Dieser Link ist 1 Stunde gültig. Falls Sie dies nicht angefordert haben, ist keine Aktion erforderlich - Ihr Konto ist sicher.</p>"#,
        ),
        text: concat!(
            "Passwort zurücksetzen\n\n",
            "Wir haben eine Anfrage erhalten, Ihr Sovereign Health Passwort zurückzusetzen.\n\n",
            "Hier zurücksetzen: {{reset_url}}\n\n",
            "Dieser Link ist 1 Stunde gültig. Falls Sie dies nicht angefordert haben, ist keine Aktion erforderlich.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 3. Welcome (DE)
// ---------------------------------------------------------------------------

pub fn welcome_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Willkommen bei Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Willkommen bei Sovereign Health Intelligence</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Ihr Konto ist verifiziert und einsatzbereit. So legen Sie los:</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">1. Erfassen Sie Ihre erste Messung</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Öffnen Sie die App, tippen Sie auf Neue Messung und erfassen Sie Ihre morgendlichen Nüchternwerte.</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">2. Erkunden Sie Ihre Gesundheitszonen</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Acht Zonen organisieren Ihre Marker von Stoffwechselgesundheit bis Hormone. Sehen Sie, was jede Zone verfolgt und warum es wichtig ist.</p>"#,
            r#"<h3 class="email-heading" style="margin: 20px 0 8px; font-size: 16px; font-weight: 600; color: #1a1a1a;">3. Fragen Sie Dr. Alex</h3>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Ihr KI-Gesundheitsassistent kann Ihre Werte erklären, Trends analysieren und vorschlagen, worauf Sie sich als nächstes konzentrieren sollten.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Zum Dashboard</a></div>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Fragen? Besuchen Sie <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a></p>"#,
        ),
        text: concat!(
            "Willkommen bei Sovereign Health Intelligence\n\n",
            "Ihr Konto ist verifiziert und einsatzbereit. So legen Sie los:\n\n",
            "1. Erfassen Sie Ihre erste Messung\n",
            "   Öffnen Sie die App, tippen Sie auf Neue Messung und erfassen Sie Ihre morgendlichen Nüchternwerte.\n\n",
            "2. Erkunden Sie Ihre Gesundheitszonen\n",
            "   Acht Zonen organisieren Ihre Marker von Stoffwechselgesundheit bis Hormone.\n\n",
            "3. Fragen Sie Dr. Alex\n",
            "   Ihr KI-Gesundheitsassistent kann Ihre Werte erklären, Trends analysieren,\n",
            "   und vorschlagen, worauf Sie sich als nächstes konzentrieren sollten.\n\n",
            "Zum Dashboard: {{frontend_url}}\n\n",
            "Fragen? Besuchen Sie https://sovereignhealth.io/contact\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 4. Tier Change (DE)
// ---------------------------------------------------------------------------

pub fn tier_change_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Ihr Plan wurde geändert - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Plan aktualisiert</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Ihr Plan wurde von <strong>{{from_tier}}</strong> auf <strong>{{to_tier}}</strong> geändert.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">{{tier_message}}</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}/billing" style="background-color: #16a34a; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Plandetails ansehen</a></div>"#,
        ),
        text: concat!(
            "Plan aktualisiert\n\n",
            "Hallo {{display_name}},\n\n",
            "Ihr Plan wurde von {{from_tier}} auf {{to_tier}} geändert.\n\n",
            "{{tier_message}}\n\n",
            "Details ansehen: {{frontend_url}}/billing\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 5. Payment Confirmation (DE)
// ---------------------------------------------------------------------------

pub fn payment_confirmation_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Zahlung erhalten - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Zahlung bestätigt</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Wir haben Ihre Zahlung für den <strong>{{tier_name}}</strong>-Plan erhalten.</p>"#,
            r#"<div class="email-info-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">"#,
            r#"<p class="email-info-text" style="margin: 0; font-size: 15px; color: #166534;"><strong>Plan:</strong> {{tier_name}}</p>"#,
            r#"<p class="email-info-text" style="margin: 8px 0 0; font-size: 15px; color: #166534;"><strong>Betrag:</strong> {{amount}}</p>"#,
            r#"<p class="email-info-text" style="margin: 8px 0 0; font-size: 15px; color: #166534;"><strong>Aktiv bis:</strong> {{period_end}}</p>"#,
            r#"</div>"#,
            r#"<p class="email-text" style="margin: 16px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Vielen Dank für Ihre Unterstützung von datenschutzorientiertem Gesundheitstracking.</p>"#,
        ),
        text: concat!(
            "Zahlung bestätigt\n\n",
            "Hallo {{display_name}},\n\n",
            "Wir haben Ihre Zahlung für den {{tier_name}}-Plan erhalten.\n\n",
            "  Plan: {{tier_name}}\n",
            "  Betrag: {{amount}}\n",
            "  Aktiv bis: {{period_end}}\n\n",
            "Vielen Dank für Ihre Unterstützung von datenschutzorientiertem Gesundheitstracking.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 6. Payment Failed (DE)
// ---------------------------------------------------------------------------

pub fn payment_failed_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Zahlung fehlgeschlagen - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Zahlungsproblem</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Wir konnten Ihre letzte Zahlung für den <strong>{{tier_name}}</strong>-Plan nicht verarbeiten.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">Bitte aktualisieren Sie Ihre Zahlungsmethode, um Ihre Funktionen beizubehalten:</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{frontend_url}}/billing" style="background-color: #dc2626; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Zahlungsmethode aktualisieren</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Wenn Ihre Zahlung nicht innerhalb von 7 Tagen aktualisiert wird, wird Ihr Konto auf den kostenlosen Plan herabgestuft.</p>"#,
        ),
        text: concat!(
            "Zahlungsproblem\n\n",
            "Hallo {{display_name}},\n\n",
            "Wir konnten Ihre letzte Zahlung für den {{tier_name}}-Plan nicht verarbeiten.\n",
            "Bitte aktualisieren Sie Ihre Zahlungsmethode, um Ihre Funktionen beizubehalten.\n\n",
            "Zahlungsmethode aktualisieren: {{frontend_url}}/billing\n\n",
            "Wenn Ihre Zahlung nicht innerhalb von 7 Tagen aktualisiert wird, wird Ihr Konto auf den kostenlosen Plan herabgestuft.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 7. Subscription Cancelled (DE)
// ---------------------------------------------------------------------------

pub fn subscription_cancelled_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Abonnement gekündigt - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Abonnement gekündigt</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihr <strong>{{tier_name}}</strong>-Abonnement wurde gekündigt.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Sie behalten Zugriff auf Ihre aktuellen Planfunktionen bis <strong>{{access_until}}</strong>.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Danach wechselt Ihr Konto zum kostenlosen Glimpse-Plan. Ihre Daten werden nicht gelöscht.</p>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Sie können jederzeit in Ihren Abrechnungseinstellungen erneut abonnieren.</p>"#,
        ),
        text: concat!(
            "Abonnement gekündigt\n\n",
            "Hallo {{display_name}},\n\n",
            "Ihr {{tier_name}}-Abonnement wurde gekündigt.\n",
            "Sie behalten Zugriff bis {{access_until}}.\n\n",
            "Danach wechselt Ihr Konto zum kostenlosen Glimpse-Plan. Ihre Daten werden nicht gelöscht.\n\n",
            "Sie können jederzeit in Ihren Abrechnungseinstellungen erneut abonnieren.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 8. Account Deletion (DE)
// ---------------------------------------------------------------------------

pub fn account_deletion_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Konto gelöscht - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Konto gelöscht</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihr Sovereign Health Konto und alle zugehörigen Daten wurden dauerhaft gelöscht.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Falls dies ein Fehler war, kontaktieren Sie uns innerhalb von 30 Tagen über <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a> und wir können möglicherweise helfen.</p>"#,
            r#"<p class="email-text" style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">Vielen Dank, dass Sie Teil von Sovereign Health waren.</p>"#,
        ),
        text: concat!(
            "Konto gelöscht\n\n",
            "Ihr Sovereign Health Konto und alle zugehörigen Daten wurden dauerhaft gelöscht.\n\n",
            "Falls dies ein Fehler war, kontaktieren Sie uns innerhalb von 30 Tagen über https://sovereignhealth.io/contact\n\n",
            "Vielen Dank, dass Sie Teil von Sovereign Health waren.\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 9. Contact Form - Notification to admin
// ---------------------------------------------------------------------------

pub fn contact_notification() -> EmailTemplate {
    EmailTemplate {
        subject: "New Contact Form Submission - {{subject}}",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">New Contact Submission</h2>"#,
            r#"<div style="margin: 0 0 16px; padding: 12px 16px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">"#,
            r#"<p style="margin: 0 0 4px; font-size: 14px; color: #333;"><strong>From:</strong> {{name}} &lt;{{email}}&gt;</p>"#,
            r#"<p style="margin: 0; font-size: 14px; color: #333;"><strong>Subject:</strong> {{subject}}</p>"#,
            r#"</div>"#,
            r#"<div style="margin: 0 0 16px; padding: 16px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px;">"#,
            r#"<p class="email-text" style="margin: 0; font-size: 15px; line-height: 1.6; color: #333333; white-space: pre-wrap;">{{message}}</p>"#,
            r#"</div>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 13px; color: #666;">Reply directly to this email to respond to {{name}} at {{email}}.</p>"#,
        ),
        text: concat!(
            "New Contact Form Submission\n\n",
            "From: {{name}} <{{email}}>\n",
            "Subject: {{subject}}\n\n",
            "Message:\n{{message}}\n\n",
            "Reply to: {{email}}\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 10. Contact Form - Confirmation to submitter
// ---------------------------------------------------------------------------

pub fn contact_confirmation() -> EmailTemplate {
    EmailTemplate {
        subject: "We received your message - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Message Received</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Thank you for reaching out. We have received your message and will get back to you within 48 hours.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">You can track updates at <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a>.</p>"#,
        ),
        text: concat!(
            "Message Received\n\n",
            "Hi {{name}},\n\n",
            "Thank you for reaching out. We have received your message and will get back to you within 48 hours.\n\n",
            "You can track updates at https://sovereignhealth.io/contact\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// 10b. Contact Form - Confirmation to submitter (DE)
// ---------------------------------------------------------------------------

pub fn contact_confirmation_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Wir haben Ihre Nachricht erhalten - Sovereign Health",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Nachricht erhalten</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Vielen Dank für Ihre Nachricht. Wir haben sie erhalten und werden uns innerhalb von 48 Stunden bei Ihnen melden.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Weitere Informationen finden Sie unter <a href="https://sovereignhealth.io/contact" style="color: #3b82f6;">sovereignhealth.io/contact</a>.</p>"#,
        ),
        text: concat!(
            "Nachricht erhalten\n\n",
            "Hallo {{name}},\n\n",
            "Vielen Dank für Ihre Nachricht. Wir haben sie erhalten und werden uns innerhalb von 48 Stunden bei Ihnen melden.\n\n",
            "Weitere Informationen: https://sovereignhealth.io/contact\n\n",
            "- Sovereign Health Intelligence\n",
            "  sovereignhealth.io\n",
        ),
    }
}

// ---------------------------------------------------------------------------
// Language-aware template selector
// ---------------------------------------------------------------------------

/// Get template for a given name and language code (e.g. "en", "de").
/// Falls back to English for unknown languages.
pub fn get_template(name: &str, lang: &str) -> EmailTemplate {
    match (name, lang) {
        ("verification", "de") => verification_de(),
        ("password_reset", "de") => password_reset_de(),
        ("welcome", "de") => welcome_de(),
        ("tier_change", "de") => tier_change_de(),
        ("payment_confirmation", "de") => payment_confirmation_de(),
        ("payment_failed", "de") => payment_failed_de(),
        ("subscription_cancelled", "de") => subscription_cancelled_de(),
        ("account_deletion", "de") => account_deletion_de(),
        ("verification", _) => verification(),
        ("password_reset", _) => password_reset(),
        ("welcome", _) => welcome(),
        ("tier_change", _) => tier_change(),
        ("payment_confirmation", _) => payment_confirmation(),
        ("payment_failed", _) => payment_failed(),
        ("subscription_cancelled", _) => subscription_cancelled(),
        ("account_deletion", _) => account_deletion(),
        ("newsletter", _) => newsletter(),
        ("early_access_welcome", "de") => early_access_welcome_de(),
        ("early_access_welcome", _) => early_access_welcome(),
        ("contact_notification", _) => contact_notification(),
        ("contact_confirmation", "de") => contact_confirmation_de(),
        ("contact_confirmation", _) => contact_confirmation(),
        _ => verification(), // fallback
    }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

/// Minify HTML to stay well under Gmail's 102 KB clipping limit.
fn minify_html(html: &str) -> String {
    html.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("")
}

pub fn render_template(
    template: &EmailTemplate,
    vars: &HashMap<&str, String>,
) -> (String, String, String) {
    let mut vars = vars.clone();
    // Build unsubscribe block: only shown if unsubscribe_url is provided (marketing emails).
    // Transactional emails (verification, password reset) don't set it → block is empty.
    let unsub_block = if let Some(url) = vars.get("unsubscribe_url") {
        if url.is_empty() {
            String::new()
        } else {
            format!(
                r#"<p style="margin: 8px 0 0; font-size: 11px;"><a href="{}" style="color: #999999; text-decoration: underline;">Unsubscribe</a></p>"#,
                url
            )
        }
    } else {
        String::new()
    };
    vars.insert("unsubscribe_block", unsub_block);
    let subject = render(template.subject, &vars);
    let html_body = render(template.html, &vars);
    let html = minify_html(&render(&wrap_html(&html_body), &vars));
    let text = render(template.text, &vars);
    (subject, html, text)
}

pub fn render_template_localized(
    template: &EmailTemplate,
    vars: &HashMap<&str, String>,
    lang: &str,
) -> (String, String, String) {
    // Sprint 044 #551: merge default org email vars (SHI branding) as fallback.
    // Callers can override with org-specific vars via org_email_vars().
    let mut vars = {
        let mut base = default_email_vars();
        for (k, v) in vars {
            base.insert(k, v.clone());
        }
        base
    };
    let unsub_url = vars.get("unsubscribe_url").cloned().unwrap_or_default();
    let unsub_label = if lang == "de" {
        "Abmelden"
    } else {
        "Unsubscribe"
    };
    let unsub_block = if unsub_url.is_empty() {
        String::new()
    } else {
        format!(
            r#"<p style="margin: 8px 0 0; font-size: 11px;"><a href="{}" style="color: #999999; text-decoration: underline;">{}</a></p>"#,
            unsub_url, unsub_label
        )
    };
    vars.insert("unsubscribe_block", unsub_block);
    let subject = render(template.subject, &vars);
    let html_body = render(template.html, &vars);
    let wrapper = if lang == "de" {
        wrap_html_de(&html_body)
    } else {
        wrap_html(&html_body)
    };
    let html = minify_html(&render(&wrapper, &vars));
    let text = render(template.text, &vars);
    (subject, html, text)
}

// ---------------------------------------------------------------------------
// Brickos.io render helper -- Sprint 040 #473
//
// Use this for ALL billing / license / org-lifecycle templates that should
// carry brickos.io branding instead of Sovereign Health branding. The
// template body is the same shape as the SHI templates (HTML body fragment
// + plain text); only the outer chrome differs.
// ---------------------------------------------------------------------------

pub fn render_template_brickos(
    template: &EmailTemplate,
    vars: &HashMap<&str, String>,
    lang: &str,
) -> (String, String, String) {
    let mut vars = vars.clone();
    // Billing emails have NO unsubscribe link -- the user agreed to billing
    // notices in the T&C. The unsubscribe_block is rendered empty.
    vars.insert("unsubscribe_block", String::new());
    let subject = render(template.subject, &vars);
    let html_body = render(template.html, &vars);
    let wrapper = if lang == "de" {
        wrap_html_brickos_de(&html_body)
    } else {
        wrap_html_brickos(&html_body)
    };
    let html = minify_html(&render(&wrapper, &vars));
    let text = render(template.text, &vars);
    (subject, html, text)
}

// ===========================================================================
// Sprint 040 #473 -- Payment failure cadence templates (brickos.io branded)
//
// Three-step reminder cadence per design 022 §2.5:
//   - Day 0: payment failed (the existing payment_failed() template; will
//     be re-rendered with the brickos wrapper via render_template_brickos)
//   - Day 7: still no payment, half the grace period elapsed
//   - Day 13: last warning, downgrade tomorrow
//
// All templates use {{display_name}}, {{tier_name}}, {{grace_days_remaining}},
// {{update_payment_url}} for variable substitution. The grace_days_remaining
// is computed by the scheduled job (#475), not hardcoded in the template.
// ===========================================================================

/// Day 7: midpoint reminder. The user has had a week to update their payment.
pub fn payment_failure_day_7() -> EmailTemplate {
    EmailTemplate {
        subject: "Payment update needed -- {{grace_days_remaining}} days until downgrade",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Reminder: Payment Update Needed</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">A week ago we couldn't process your payment for the <strong>{{tier_name}}</strong> plan, and we still haven't been able to charge your card.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">You have <strong>{{grace_days_remaining}} days</strong> until your account is moved to the free Glimpse plan. Your data is safe -- nothing is deleted.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{update_payment_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Update Payment Method</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Need help? Reply to this email and a human will get back to you.</p>"#,
        ),
        text: concat!(
            "Reminder: Payment Update Needed\n\n",
            "Hi {{display_name}},\n\n",
            "A week ago we couldn't process your payment for the {{tier_name}} plan, and we still haven't been able to charge your card.\n\n",
            "You have {{grace_days_remaining}} days until your account is moved to the free Glimpse plan. Your data is safe -- nothing is deleted.\n\n",
            "Update payment: {{update_payment_url}}\n\n",
            "Need help? Reply to this email and a human will get back to you.\n\n",
            "-- BrickOS\n",
            "   brickos.io\n",
        ),
    }
}

pub fn payment_failure_day_7_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Zahlung erforderlich -- noch {{grace_days_remaining}} Tage",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Erinnerung: Zahlung erforderlich</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Vor einer Woche konnten wir Ihre Zahlung fuer den <strong>{{tier_name}}</strong>-Plan nicht verarbeiten, und wir koennen Ihre Karte bis heute nicht belasten.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Sie haben noch <strong>{{grace_days_remaining}} Tage</strong>, bis Ihr Konto auf den kostenlosen Glimpse-Plan umgestellt wird. Ihre Daten bleiben erhalten -- nichts wird geloescht.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{update_payment_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Zahlungsmethode aktualisieren</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Brauchen Sie Hilfe? Antworten Sie auf diese E-Mail, ein Mensch meldet sich bei Ihnen.</p>"#,
        ),
        text: concat!(
            "Erinnerung: Zahlung erforderlich\n\n",
            "Hallo {{display_name}},\n\n",
            "Vor einer Woche konnten wir Ihre Zahlung fuer den {{tier_name}}-Plan nicht verarbeiten, und wir koennen Ihre Karte bis heute nicht belasten.\n\n",
            "Sie haben noch {{grace_days_remaining}} Tage, bis Ihr Konto auf den kostenlosen Glimpse-Plan umgestellt wird. Ihre Daten bleiben erhalten -- nichts wird geloescht.\n\n",
            "Zahlungsmethode aktualisieren: {{update_payment_url}}\n\n",
            "Brauchen Sie Hilfe? Antworten Sie auf diese E-Mail, ein Mensch meldet sich bei Ihnen.\n\n",
            "-- BrickOS\n",
            "   brickos.io\n",
        ),
    }
}

/// Day 13: last warning. The user has 1 day until downgrade.
pub fn payment_failure_day_13() -> EmailTemplate {
    EmailTemplate {
        subject: "Last warning: account downgrades tomorrow",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #dc2626;">Last Warning</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">This is the last reminder. Your <strong>{{tier_name}}</strong> subscription has been in grace period for 13 days. Tomorrow your account will be moved to the free Glimpse plan.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">If you update your payment method in the next 24 hours, nothing will change for you.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{update_payment_url}}" style="background-color: #dc2626; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Update Payment Method</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">After the downgrade your data stays safe -- you keep read access to everything. You can re-subscribe at any time and get your full plan back.</p>"#,
        ),
        text: concat!(
            "LAST WARNING\n\n",
            "Hi {{display_name}},\n\n",
            "This is the last reminder. Your {{tier_name}} subscription has been in grace period for 13 days. Tomorrow your account will be moved to the free Glimpse plan.\n\n",
            "If you update your payment method in the next 24 hours, nothing will change for you.\n\n",
            "Update payment: {{update_payment_url}}\n\n",
            "After the downgrade your data stays safe -- you keep read access to everything. You can re-subscribe at any time and get your full plan back.\n\n",
            "-- BrickOS\n",
            "   brickos.io\n",
        ),
    }
}

pub fn payment_failure_day_13_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Letzte Warnung: Konto wird morgen herabgestuft",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #dc2626;">Letzte Warnung</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Dies ist die letzte Erinnerung. Ihr <strong>{{tier_name}}</strong>-Abonnement ist seit 13 Tagen in der Schonfrist. Morgen wird Ihr Konto auf den kostenlosen Glimpse-Plan umgestellt.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Wenn Sie Ihre Zahlungsmethode in den naechsten 24 Stunden aktualisieren, aendert sich fuer Sie nichts.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{update_payment_url}}" style="background-color: #dc2626; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Zahlungsmethode aktualisieren</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Nach der Herabstufung bleiben Ihre Daten erhalten -- Sie behalten Lesezugriff auf alles. Sie koennen jederzeit ein neues Abonnement abschliessen und Ihren vollen Plan zurueckbekommen.</p>"#,
        ),
        text: concat!(
            "LETZTE WARNUNG\n\n",
            "Hallo {{display_name}},\n\n",
            "Dies ist die letzte Erinnerung. Ihr {{tier_name}}-Abonnement ist seit 13 Tagen in der Schonfrist. Morgen wird Ihr Konto auf den kostenlosen Glimpse-Plan umgestellt.\n\n",
            "Wenn Sie Ihre Zahlungsmethode in den naechsten 24 Stunden aktualisieren, aendert sich fuer Sie nichts.\n\n",
            "Zahlungsmethode aktualisieren: {{update_payment_url}}\n\n",
            "Nach der Herabstufung bleiben Ihre Daten erhalten -- Sie behalten Lesezugriff auf alles. Sie koennen jederzeit ein neues Abonnement abschliessen und Ihren vollen Plan zurueckbekommen.\n\n",
            "-- BrickOS\n",
            "   brickos.io\n",
        ),
    }
}

// ===========================================================================
// Sprint 040 #474 -- Org termination, downgrade, renewal, expiring,
//                    inactivity warning templates (brickos.io branded)
//
// Six templates × 2 languages = 12 functions. All use render_template_brickos
// for the brickos.io chrome.
//
// Variable conventions:
//   {{display_name}}    -- recipient name
//   {{tier_name}}       -- e.g. "Focus"
//   {{org_name}}        -- e.g. "Acme Clinic"
//   {{access_until}}    -- ISO date string
//   {{reactivate_url}}  -- 1-click re-subscribe link
//   {{individual_url}}  -- 1-click switch-to-individual link
//   {{export_url}}      -- data export link
//   {{renewal_amount}}  -- e.g. "EUR 99.99"
//   {{expires_at}}      -- ISO date string
// ===========================================================================

// ----- 1. Downgraded to Glimpse (after grace expires) -----------------------

pub fn downgraded_to_glimpse() -> EmailTemplate {
    EmailTemplate {
        subject: "Your subscription ended -- you're now on Glimpse",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">You're now on Glimpse</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your <strong>{{tier_name}}</strong> grace period ended and your account has moved to the free Glimpse plan.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your data is safe -- nothing was deleted. You keep read access to everything you tracked. The 10 most recent biomarkers stay active; the rest are preserved (read-only) until you reactivate them.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reactivate_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Reactivate {{tier_name}}</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">One click and you're back to where you were.</p>"#,
        ),
        text: concat!(
            "You're now on Glimpse\n\n",
            "Hi {{display_name}},\n\n",
            "Your {{tier_name}} grace period ended and your account has moved to the free Glimpse plan.\n\n",
            "Your data is safe -- nothing was deleted. You keep read access to everything you tracked.\n\n",
            "Reactivate {{tier_name}}: {{reactivate_url}}\n\n",
            "-- BrickOS\n",
            "   brickos.io\n",
        ),
    }
}

pub fn downgraded_to_glimpse_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Ihr Abonnement endete -- Sie sind jetzt auf Glimpse",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Sie sind jetzt auf Glimpse</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihre Schonfrist fuer den <strong>{{tier_name}}</strong>-Plan ist abgelaufen und Ihr Konto wurde auf den kostenlosen Glimpse-Plan umgestellt.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihre Daten bleiben erhalten -- nichts wurde geloescht. Sie behalten Lesezugriff auf alles. Die 10 zuletzt verfolgten Biomarker bleiben aktiv; die uebrigen werden archiviert.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reactivate_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">{{tier_name}} reaktivieren</a></div>"#,
        ),
        text: concat!(
            "Sie sind jetzt auf Glimpse\n\n",
            "Hallo {{display_name}},\n\n",
            "Ihre Schonfrist fuer den {{tier_name}}-Plan ist abgelaufen.\n\n",
            "{{tier_name}} reaktivieren: {{reactivate_url}}\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

// ----- 2. Org terminated -- member notification ----------------------------

pub fn org_terminated_for_member() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}'s subscription has ended -- your data is yours",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">{{org_name}} has ended their subscription</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;"><strong>{{org_name}}</strong>'s subscription has ended. Your health data is yours, and you have <strong>30 days</strong> to choose what to do next.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;"><strong>Option 1:</strong> Continue with a free Glimpse account. Same data, same login, no charge.</p>"#,
            r#"<div style="text-align: center; margin: 16px 0;"><a href="{{individual_url}}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Switch to individual now</a></div>"#,
            r#"<p class="email-text" style="margin: 16px 0 12px; font-size: 16px; line-height: 1.6; color: #333333;"><strong>Option 2:</strong> Download your data and close your account.</p>"#,
            r#"<div style="text-align: center; margin: 16px 0;"><a href="{{export_url}}" style="background-color: #6b7280; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Export and delete</a></div>"#,
            r#"<p class="email-subtext" style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Either way, no surprises. Your data, your choice.</p>"#,
        ),
        text: concat!(
            "{{org_name}} has ended their subscription\n\n",
            "Hi {{display_name}},\n\n",
            "{{org_name}}'s subscription has ended. You have 30 days to choose:\n\n",
            "Option 1: Continue with a free Glimpse account.\n  Switch: {{individual_url}}\n\n",
            "Option 2: Download your data and close your account.\n  Export: {{export_url}}\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

pub fn org_terminated_for_member_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Das Abonnement von {{org_name}} ist beendet -- Ihre Daten gehoeren Ihnen",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">{{org_name}} hat das Abonnement beendet</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Das Abonnement von <strong>{{org_name}}</strong> ist beendet. Ihre Gesundheitsdaten gehoeren Ihnen, und Sie haben <strong>30 Tage</strong>, um zu entscheiden.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;"><strong>Option 1:</strong> Mit einem kostenlosen Glimpse-Konto weitermachen.</p>"#,
            r#"<div style="text-align: center; margin: 16px 0;"><a href="{{individual_url}}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Jetzt zu Individual wechseln</a></div>"#,
            r#"<p class="email-text" style="margin: 16px 0 12px; font-size: 16px; line-height: 1.6; color: #333333;"><strong>Option 2:</strong> Daten herunterladen und Konto schliessen.</p>"#,
            r#"<div style="text-align: center; margin: 16px 0;"><a href="{{export_url}}" style="background-color: #6b7280; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Exportieren und loeschen</a></div>"#,
        ),
        text: concat!(
            "{{org_name}} hat das Abonnement beendet\n\n",
            "Hallo {{display_name}},\n\n",
            "Sie haben 30 Tage, um zu entscheiden:\n\n",
            "Option 1: Mit Glimpse weitermachen. {{individual_url}}\n\n",
            "Option 2: Daten exportieren. {{export_url}}\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

// ----- 3. Org terminated -- staff notification ----------------------------

pub fn org_terminated_for_staff() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}'s subscription has ended -- what changes for you",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">{{org_name}} subscription ended</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">The <strong>{{org_name}}</strong> subscription has ended. As a staff member of that org, here's what changes for you:</p>"#,
            r#"<ul class="email-text" style="margin: 0 0 16px; padding-left: 20px; font-size: 16px; line-height: 1.6; color: #333333;">"#,
            r#"<li>Your access to {{org_name}} patient data ends on <strong>{{access_until}}</strong>.</li>"#,
            r#"<li>If you're a member of other orgs, your work there continues unchanged.</li>"#,
            r#"<li>If you have a personal subscription, that continues unchanged too.</li>"#,
            r#"<li>If you have neither, your account moves to the free Glimpse plan.</li>"#,
            r#"</ul>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Questions about your specific situation? Reply to this email and we'll sort it out.</p>"#,
        ),
        text: concat!(
            "{{org_name}} subscription ended\n\n",
            "Hi {{display_name}},\n\n",
            "  - Your access to {{org_name}} patient data ends on {{access_until}}.\n",
            "  - Other org memberships continue unchanged.\n",
            "  - Personal subscriptions continue unchanged.\n",
            "  - Otherwise your account moves to the free Glimpse plan.\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

pub fn org_terminated_for_staff_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Das Abonnement von {{org_name}} ist beendet -- was sich fuer Sie aendert",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">{{org_name}}-Abonnement beendet</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Das Abonnement von <strong>{{org_name}}</strong> ist beendet. Was sich fuer Sie aendert:</p>"#,
            r#"<ul class="email-text" style="margin: 0 0 16px; padding-left: 20px; font-size: 16px; line-height: 1.6; color: #333333;">"#,
            r#"<li>Ihr Zugriff auf die Patientendaten von {{org_name}} endet am <strong>{{access_until}}</strong>.</li>"#,
            r#"<li>Andere Org-Mitgliedschaften bleiben unveraendert.</li>"#,
            r#"<li>Persoenliche Abonnements bleiben unveraendert.</li>"#,
            r#"<li>Andernfalls wechselt Ihr Konto auf den kostenlosen Glimpse-Plan.</li>"#,
            r#"</ul>"#,
        ),
        text: concat!(
            "{{org_name}}-Abonnement beendet\n\n",
            "Hallo {{display_name}},\n\n",
            "  - Zugriff endet am {{access_until}}.\n",
            "  - Andere Mitgliedschaften unveraendert.\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

// ----- 4. License renewed (org owner notification) -------------------------

pub fn license_renewed() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}: license renewed for another year",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">License renewed</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your <strong>{{org_name}}</strong> license has been renewed for another year. Renewal amount: <strong>{{renewal_amount}}</strong>. Valid until <strong>{{access_until}}</strong>.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">The new license file is attached and uploaded to your admin panel. No action needed unless you self-host -- in that case, drop the new <code>license.jwt</code> into your installation directory at your next maintenance window.</p>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Thanks for being a BrickOS customer.</p>"#,
        ),
        text: concat!(
            "License renewed\n\n",
            "Hi {{display_name}},\n\n",
            "Your {{org_name}} license has been renewed.\n",
            "  Amount: {{renewal_amount}}\n",
            "  Valid until: {{access_until}}\n\n",
            "Thanks for being a BrickOS customer.\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

pub fn license_renewed_de() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}: Lizenz fuer ein weiteres Jahr verlaengert",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Lizenz verlaengert</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihre <strong>{{org_name}}</strong>-Lizenz wurde fuer ein weiteres Jahr verlaengert. Betrag: <strong>{{renewal_amount}}</strong>. Gueltig bis <strong>{{access_until}}</strong>.</p>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Vielen Dank, dass Sie BrickOS-Kunde sind.</p>"#,
        ),
        text: concat!(
            "Lizenz verlaengert\n\n",
            "Hallo {{display_name}},\n\n",
            "Betrag: {{renewal_amount}}\n",
            "Gueltig bis: {{access_until}}\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

// ----- 5. License expiring soon (30 days warning) --------------------------

pub fn license_expiring_soon() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}: license expires in 30 days",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">License expires in 30 days</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Your <strong>{{org_name}}</strong> license expires on <strong>{{expires_at}}</strong> -- 30 days from today.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">If you'd like to renew, reply to this email and we'll send you the renewal invoice. If you don't renew, your org's seats will be moved to individual plans on the expiry date.</p>"#,
        ),
        text: concat!(
            "License expires in 30 days\n\n",
            "Hi {{display_name}},\n\n",
            "Your {{org_name}} license expires on {{expires_at}}.\n\n",
            "Reply to renew.\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

pub fn license_expiring_soon_de() -> EmailTemplate {
    EmailTemplate {
        subject: "{{org_name}}: Lizenz laeuft in 30 Tagen ab",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Lizenz laeuft in 30 Tagen ab</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Ihre <strong>{{org_name}}</strong>-Lizenz laeuft am <strong>{{expires_at}}</strong> ab.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Antworten Sie auf diese E-Mail, um zu verlaengern.</p>"#,
        ),
        text: concat!(
            "Lizenz laeuft in 30 Tagen ab\n\n",
            "Hallo {{display_name}},\n\n",
            "Ablauf: {{expires_at}}.\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

// ----- 6. Inactivity warning (dormant flag) --------------------------------

pub fn inactivity_warning() -> EmailTemplate {
    EmailTemplate {
        subject: "We haven't seen you in a year",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">We haven't seen you in a year</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hi {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">It's been 365 days since you last used your BrickOS account. We're not deleting anything yet -- this is just a check-in.</p>"#,
            r#"<p class="email-text" style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">Your data is yours and is still here. If you want to come back, just log in. If you'd rather close the account, you can export your data and delete it on your terms.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reactivate_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Log in</a></div>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Per our T&C, free accounts that stay dormant may be archived. We will give you separate notice before any deletion.</p>"#,
        ),
        text: concat!(
            "We haven't seen you in a year\n\n",
            "Hi {{display_name}},\n\n",
            "365 days since your last visit. Your data is still here.\n\n",
            "Log in: {{reactivate_url}}\n\n",
            "Per our T&C, dormant free accounts may be archived. Separate notice before any deletion.\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

pub fn inactivity_warning_de() -> EmailTemplate {
    EmailTemplate {
        subject: "Wir haben Sie ein Jahr lang nicht gesehen",
        html: concat!(
            r#"<h2 class="email-heading" style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a1a;">Wir haben Sie ein Jahr lang nicht gesehen</h2>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Hallo {{display_name}},</p>"#,
            r#"<p class="email-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #333333;">Es ist 365 Tage her, seit Sie Ihr BrickOS-Konto zuletzt genutzt haben. Wir loeschen noch nichts -- das ist nur eine Erinnerung.</p>"#,
            r#"<div style="text-align: center; margin: 24px 0;"><a href="{{reactivate_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Anmelden</a></div>"#,
            r#"<p class="email-subtext" style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">Gemaess AGB koennen kostenlose Konten, die zu lange inaktiv bleiben, archiviert werden.</p>"#,
        ),
        text: concat!(
            "Wir haben Sie ein Jahr lang nicht gesehen\n\n",
            "Hallo {{display_name}},\n\n",
            "Anmelden: {{reactivate_url}}\n\n",
            "-- BrickOS\n   brickos.io\n",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_replaces_vars() {
        let mut vars = HashMap::new();
        vars.insert("name", "Alice".to_string());
        vars.insert("url", "https://example.com".to_string());
        let result = render("Hello {{name}}, visit {{url}}", &vars);
        assert_eq!(result, "Hello Alice, visit https://example.com");
    }

    #[test]
    fn test_render_template_welcome() {
        let tmpl = welcome();
        let mut vars = HashMap::new();
        vars.insert("frontend_url", "https://app.sovereignhealth.io".to_string());
        vars.insert("subject", "Welcome to Sovereign Health".to_string());
        let (subject, html, text) = render_template(&tmpl, &vars);
        assert_eq!(subject, "Welcome to Sovereign Health");
        assert!(html.contains("Health Zones"));
        assert!(html.contains("Dr. Alex"));
        assert!(text.contains("Dr. Alex"));
    }

    #[test]
    fn test_no_tracking_pixels() {
        let tmpl = welcome();
        let mut vars = HashMap::new();
        vars.insert("frontend_url", "https://app.sovereignhealth.io".to_string());
        vars.insert("subject", "Welcome".to_string());
        let (_, html, _) = render_template(&tmpl, &vars);
        assert!(!html.contains("1x1"));
        assert!(!html.contains("pixel"));
    }

    #[test]
    fn test_no_raw_urls_in_verification() {
        let tmpl = verification();
        assert!(!tmpl.html.contains("<code>"));
        assert!(!tmpl.html.contains("copy this link"));
    }

    #[test]
    fn test_no_unsubscribe_in_transactional() {
        let tmpl = verification();
        let mut vars = HashMap::new();
        vars.insert("verification_url", "https://example.com/verify".to_string());
        vars.insert("subject", "Verify".to_string());
        let (_, html, _) = render_template(&tmpl, &vars);
        assert!(!html.contains("Unsubscribe"));
        assert!(!html.contains("unsubscribe"));
        assert!(!html.contains("Abmelden"));
    }

    #[test]
    fn test_no_gmbh_in_footer() {
        let tmpl = verification();
        let mut vars = HashMap::new();
        vars.insert("verification_url", "https://example.com/verify".to_string());
        vars.insert("subject", "Verify".to_string());
        let (_, html, _) = render_template(&tmpl, &vars);
        assert!(!html.contains("GmbH"));
    }

    #[test]
    fn test_logo_present() {
        let tmpl = verification();
        let mut vars = HashMap::new();
        vars.insert("verification_url", "https://example.com/verify".to_string());
        vars.insert("subject", "Verify".to_string());
        let (_, html, _) = render_template(&tmpl, &vars);
        assert!(html.contains("logo.png"));
        assert!(html.contains("alt=\"Sovereign Health\""));
    }

    #[test]
    fn test_german_formal_sie() {
        let tmpl = verification_de();
        assert!(tmpl.html.contains("Ihre"));
        assert!(!tmpl.html.contains("deine"));
    }

    // ===============================================================
    // Sprint 040 #473 -- payment failure cadence + brickos branding
    // ===============================================================

    fn sample_brickos_vars() -> HashMap<&'static str, String> {
        let mut vars = HashMap::new();
        vars.insert("display_name", "Jane".to_string());
        vars.insert("tier_name", "Focus".to_string());
        vars.insert("grace_days_remaining", "7".to_string());
        vars.insert(
            "update_payment_url",
            "https://app.brickos.io/billing".to_string(),
        );
        vars.insert("subject", "test".to_string());
        vars
    }

    #[test]
    fn payment_failure_day_7_renders_with_brickos_branding() {
        let tmpl = payment_failure_day_7();
        let vars = sample_brickos_vars();
        let (subject, html, text) = render_template_brickos(&tmpl, &vars, "en");

        // Subject substitution
        assert!(subject.contains("7"), "subject must include grace days");

        // Body substitution
        assert!(html.contains("Jane"));
        assert!(html.contains("Focus"));
        assert!(html.contains("https://app.brickos.io/billing"));

        // Brickos branding (NOT Sovereign Health)
        assert!(
            html.contains("brickos.io"),
            "html must reference brickos.io"
        );
        assert!(
            html.contains("BrickOS"),
            "html must contain BrickOS brand name"
        );
        assert!(
            !html.contains("Sovereign Health"),
            "billing emails must NOT carry SHI branding"
        );
        assert!(
            !html.contains("sovereignhealth.io"),
            "billing emails must NOT link to sovereignhealth.io"
        );

        // Text version
        assert!(text.contains("Jane"));
        assert!(text.contains("BrickOS"));
        assert!(text.contains("brickos.io"));
        assert!(!text.contains("sovereignhealth.io"));
    }

    #[test]
    fn payment_failure_day_13_emphasizes_last_warning() {
        let tmpl = payment_failure_day_13();
        let vars = sample_brickos_vars();
        let (subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");

        assert!(
            subject.to_lowercase().contains("last warning")
                || subject.to_lowercase().contains("downgrades tomorrow"),
            "subject must convey urgency"
        );
        assert!(html.contains("Last Warning"));
        // Red CTA color for urgency
        assert!(html.contains("#dc2626"));
    }

    #[test]
    fn payment_failure_day_7_de_uses_formal_sie() {
        let tmpl = payment_failure_day_7_de();
        let vars = sample_brickos_vars();
        let (_subject, html, text) = render_template_brickos(&tmpl, &vars, "de");

        // Formal "Sie" address (not informal "du"/"dein")
        assert!(html.contains("Ihre") || html.contains("Sie"));
        assert!(!html.contains(" deine "));
        assert!(!html.contains(" dein "));

        // German wrapper
        assert!(html.contains("souveraene") || html.contains("Schonfrist"));
        assert!(text.contains("Schonfrist") || text.contains("Glimpse"));
    }

    #[test]
    fn payment_failure_day_13_de_uses_formal_sie() {
        let tmpl = payment_failure_day_13_de();
        let vars = sample_brickos_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("Sie"));
        assert!(!html.contains(" deine "));
    }

    #[test]
    fn brickos_render_helper_omits_unsubscribe_link() {
        let tmpl = payment_failure_day_7();
        let mut vars = sample_brickos_vars();
        // Even if a caller passes an unsubscribe_url, billing emails MUST NOT
        // render an unsubscribe link (per design 022 §1.3 + the brickos
        // wrapper notice text).
        vars.insert("unsubscribe_url", "https://example.com/unsub".to_string());
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(!html.contains("Unsubscribe"));
        assert!(!html.contains("unsubscribe"));
        assert!(!html.contains("Abmelden"));
    }

    #[test]
    fn brickos_wrapper_includes_billing_notice_text() {
        // The wrapper footer notes that billing notices cannot be opted out
        let tmpl = payment_failure_day_7();
        let vars = sample_brickos_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(html.contains("billing notice"));
    }

    #[test]
    fn brickos_branded_html_has_brickos_logo() {
        let tmpl = payment_failure_day_7();
        let vars = sample_brickos_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(html.contains("brickos.io/logo.png"));
        assert!(html.contains("alt=\"BrickOS\""));
    }

    // ===============================================================
    // Sprint 040 #474 -- org termination, downgrade, renewal,
    //                    expiring, inactivity warning templates
    // ===============================================================

    fn sample_lifecycle_vars() -> HashMap<&'static str, String> {
        let mut vars = HashMap::new();
        vars.insert("display_name", "Jane".to_string());
        vars.insert("tier_name", "Focus".to_string());
        vars.insert("org_name", "Acme Clinic".to_string());
        vars.insert("access_until", "2026-05-15".to_string());
        vars.insert("expires_at", "2026-05-15".to_string());
        vars.insert(
            "reactivate_url",
            "https://app.brickos.io/billing/reactivate".to_string(),
        );
        vars.insert(
            "individual_url",
            "https://app.brickos.io/switch-to-individual".to_string(),
        );
        vars.insert(
            "export_url",
            "https://app.brickos.io/data/export".to_string(),
        );
        vars.insert("renewal_amount", "EUR 99.99".to_string());
        vars.insert("subject", "test".to_string());
        vars
    }

    #[test]
    fn downgraded_to_glimpse_renders() {
        let tmpl = downgraded_to_glimpse();
        let vars = sample_lifecycle_vars();
        let (subject, html, text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(subject.contains("Glimpse"));
        assert!(html.contains("Jane"));
        assert!(html.contains("Focus"));
        assert!(html.contains("brickos.io"));
        assert!(!html.contains("Sovereign Health"));
        assert!(text.contains("data is safe"));
    }

    #[test]
    fn downgraded_to_glimpse_de_uses_formal_sie() {
        let tmpl = downgraded_to_glimpse_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("Ihre"));
        assert!(!html.contains(" deine "));
    }

    #[test]
    fn org_terminated_for_member_offers_two_options() {
        let tmpl = org_terminated_for_member();
        let vars = sample_lifecycle_vars();
        let (subject, html, text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(subject.contains("Acme Clinic"));
        assert!(html.contains("Acme Clinic"));
        assert!(html.contains("Option 1"));
        assert!(html.contains("Option 2"));
        assert!(html.contains("https://app.brickos.io/switch-to-individual"));
        assert!(html.contains("https://app.brickos.io/data/export"));
        assert!(text.contains("Option 1"));
        assert!(text.contains("Option 2"));
    }

    #[test]
    fn org_terminated_for_member_de_offers_two_options() {
        let tmpl = org_terminated_for_member_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("Option 1"));
        assert!(html.contains("Option 2"));
        assert!(html.contains("Sie") || html.contains("Ihre"));
    }

    #[test]
    fn org_terminated_for_staff_explains_4_cases() {
        let tmpl = org_terminated_for_staff();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        // The 4 bullets in the explanation
        assert!(html.contains("ends on"));
        assert!(html.contains("other orgs"));
        assert!(html.contains("personal subscription"));
        assert!(html.contains("Glimpse"));
    }

    #[test]
    fn org_terminated_for_staff_de_uses_formal() {
        let tmpl = org_terminated_for_staff_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("Sie") || html.contains("Ihre"));
    }

    #[test]
    fn license_renewed_includes_amount_and_date() {
        let tmpl = license_renewed();
        let vars = sample_lifecycle_vars();
        let (subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(subject.contains("Acme Clinic"));
        assert!(html.contains("EUR 99.99"));
        assert!(html.contains("2026-05-15"));
        assert!(html.contains("license.jwt"));
    }

    #[test]
    fn license_renewed_de_includes_amount_and_date() {
        let tmpl = license_renewed_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("EUR 99.99"));
        assert!(html.contains("2026-05-15"));
    }

    #[test]
    fn license_expiring_soon_includes_expiry_date() {
        let tmpl = license_expiring_soon();
        let vars = sample_lifecycle_vars();
        let (subject, html, _text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(subject.contains("30 days"));
        assert!(html.contains("2026-05-15"));
    }

    #[test]
    fn license_expiring_soon_de_includes_expiry_date() {
        let tmpl = license_expiring_soon_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("2026-05-15"));
    }

    #[test]
    fn inactivity_warning_does_not_threaten_immediate_deletion() {
        let tmpl = inactivity_warning();
        let vars = sample_lifecycle_vars();
        let (subject, html, text) = render_template_brickos(&tmpl, &vars, "en");
        assert!(subject.contains("year"));
        // Reassures: "We're not deleting anything yet"
        assert!(html.contains("not deleting") || html.contains("yet"));
        // Notes T&C clause
        assert!(html.contains("T&C") || html.contains("dormant"));
        assert!(text.contains("data is yours") || text.contains("still here"));
    }

    #[test]
    fn inactivity_warning_de_uses_formal() {
        let tmpl = inactivity_warning_de();
        let vars = sample_lifecycle_vars();
        let (_subject, html, _text) = render_template_brickos(&tmpl, &vars, "de");
        assert!(html.contains("Sie") || html.contains("Ihr"));
    }

    #[test]
    fn all_lifecycle_templates_use_brickos_branding() {
        // Sweep test: every #474 template should have brickos branding
        // and never mention Sovereign Health.
        let templates = [
            ("downgraded_to_glimpse", downgraded_to_glimpse()),
            ("downgraded_to_glimpse_de", downgraded_to_glimpse_de()),
            ("org_terminated_for_member", org_terminated_for_member()),
            (
                "org_terminated_for_member_de",
                org_terminated_for_member_de(),
            ),
            ("org_terminated_for_staff", org_terminated_for_staff()),
            ("org_terminated_for_staff_de", org_terminated_for_staff_de()),
            ("license_renewed", license_renewed()),
            ("license_renewed_de", license_renewed_de()),
            ("license_expiring_soon", license_expiring_soon()),
            ("license_expiring_soon_de", license_expiring_soon_de()),
            ("inactivity_warning", inactivity_warning()),
            ("inactivity_warning_de", inactivity_warning_de()),
        ];
        let vars = sample_lifecycle_vars();
        for (name, tmpl) in templates {
            let lang = if name.ends_with("_de") { "de" } else { "en" };
            let (_subject, html, text) = render_template_brickos(&tmpl, &vars, lang);
            assert!(
                html.contains("BrickOS") || html.contains("brickos.io"),
                "{name}: html missing brickos branding"
            );
            assert!(
                !html.contains("Sovereign Health"),
                "{name}: html must not contain 'Sovereign Health'"
            );
            assert!(
                !html.contains("sovereignhealth.io"),
                "{name}: html must not link sovereignhealth.io"
            );
            assert!(
                text.contains("BrickOS") || text.contains("brickos.io"),
                "{name}: text missing brickos branding"
            );
        }
    }
}
