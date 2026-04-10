// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #475 -- thin send helpers for the lifecycle email templates.
//
// Each function takes the recipient + template variables, renders via
// render_template_brickos, and dispatches through the EmailProvider trait.
// Used by services::lifecycle_jobs and (in #476) by the manual-send admin
// handler.

use crate::templates::emails::{
    downgraded_to_glimpse, downgraded_to_glimpse_de, inactivity_warning, inactivity_warning_de,
    license_expiring_soon, license_expiring_soon_de, license_renewed, license_renewed_de,
    org_terminated_for_member, org_terminated_for_member_de, org_terminated_for_staff,
    org_terminated_for_staff_de, payment_failure_day_13, payment_failure_day_13_de,
    payment_failure_day_7, payment_failure_day_7_de, render_template_brickos, EmailTemplate,
};
use brickos_email::EmailProvider;
use std::collections::HashMap;

fn lang_code(locale: &str) -> &'static str {
    if locale.starts_with("de") {
        "de"
    } else {
        "en"
    }
}

async fn send(
    provider: &dyn EmailProvider,
    to: &str,
    template: &EmailTemplate,
    vars: HashMap<&str, String>,
    locale: &str,
) -> anyhow::Result<()> {
    let lang = lang_code(locale);
    let (subject, html, text) = render_template_brickos(template, &vars, lang);
    provider.send(to, &subject, &html, &text).await
}

/// Day 7 or day 13 payment failure reminder.
/// `day` must be 7 or 13; other values default to day 7.
#[allow(clippy::too_many_arguments)]
pub async fn send_payment_failure_reminder(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    tier_name: &str,
    days_remaining: i64,
    frontend_url: &str,
    locale: &str,
    day: u8,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("tier_name", tier_name.to_string());
    vars.insert("grace_days_remaining", days_remaining.to_string());
    vars.insert(
        "update_payment_url",
        format!("{}/billing", frontend_url.trim_end_matches('/')),
    );
    vars.insert("subject", String::new());

    let template = match (day, lang_code(locale)) {
        (13, "de") => payment_failure_day_13_de(),
        (13, _) => payment_failure_day_13(),
        (_, "de") => payment_failure_day_7_de(),
        (_, _) => payment_failure_day_7(),
    };
    send(provider, to, &template, vars, locale).await
}

/// Sent when grace expires and a user is downgraded to Glimpse.
pub async fn send_downgraded_to_glimpse(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    tier_name: &str,
    frontend_url: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("tier_name", tier_name.to_string());
    vars.insert(
        "reactivate_url",
        format!("{}/billing/reactivate", frontend_url.trim_end_matches('/')),
    );
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        downgraded_to_glimpse_de()
    } else {
        downgraded_to_glimpse()
    };
    send(provider, to, &template, vars, locale).await
}

pub async fn send_org_terminated_for_member(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    org_name: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("org_name", org_name.to_string());
    vars.insert(
        "individual_url",
        "https://brickos.io/account/switch-to-individual".to_string(),
    );
    vars.insert(
        "export_url",
        "https://brickos.io/account/export".to_string(),
    );
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        org_terminated_for_member_de()
    } else {
        org_terminated_for_member()
    };
    send(provider, to, &template, vars, locale).await
}

pub async fn send_org_terminated_for_staff(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    org_name: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("org_name", org_name.to_string());
    vars.insert(
        "access_until",
        chrono::Utc::now().format("%Y-%m-%d").to_string(),
    );
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        org_terminated_for_staff_de()
    } else {
        org_terminated_for_staff()
    };
    send(provider, to, &template, vars, locale).await
}

pub async fn send_license_renewed(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    org_name: &str,
    renewal_amount: &str,
    access_until: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("org_name", org_name.to_string());
    vars.insert("renewal_amount", renewal_amount.to_string());
    vars.insert("access_until", access_until.to_string());
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        license_renewed_de()
    } else {
        license_renewed()
    };
    send(provider, to, &template, vars, locale).await
}

pub async fn send_license_expiring_soon(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    org_name: &str,
    expires_at: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert("org_name", org_name.to_string());
    vars.insert("expires_at", expires_at.to_string());
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        license_expiring_soon_de()
    } else {
        license_expiring_soon()
    };
    send(provider, to, &template, vars, locale).await
}

pub async fn send_inactivity_warning(
    provider: &dyn EmailProvider,
    to: &str,
    display_name: &str,
    frontend_url: &str,
    locale: &str,
) -> anyhow::Result<()> {
    let mut vars = HashMap::new();
    vars.insert("display_name", display_name.to_string());
    vars.insert(
        "reactivate_url",
        format!("{}/login", frontend_url.trim_end_matches('/')),
    );
    vars.insert("subject", String::new());

    let template = if lang_code(locale) == "de" {
        inactivity_warning_de()
    } else {
        inactivity_warning()
    };
    send(provider, to, &template, vars, locale).await
}
